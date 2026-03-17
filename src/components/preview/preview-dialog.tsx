'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, ExternalLink, RefreshCw, Globe, Terminal as TerminalIcon, Play, Loader2, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import {
  Dialog,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/project-store';
import { useTunnelStore } from '@/stores/tunnel-store';
import { useProjectSettingsStore } from '@/stores/project-settings-store';
import { useShellStore } from '@/stores/shell-store';
import { useTerminalStore } from '@/stores/terminal-store';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';

const log = createLogger('PreviewDialog');

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function PreviewDialog({ open, onOpenChange, projectId }: PreviewDialogProps) {
  const { projects } = useProjectStore();
  const { url: tunnelUrl, status: tunnelStatus } = useTunnelStore();
  const { settings, fetchProjectSettings } = useProjectSettingsStore();
  const { shells, subscribeToProject, spawnShell, loading: shellsLoading } = useShellStore();
  const { 
    tabs: terminalTabs, 
    createTerminalWithCommand, 
    closeTerminal, 
    openPanel, 
    setActiveTab 
  } = useTerminalStore();
  
  const project = projects.find(p => p.id === projectId);
  const projectSettings = settings[projectId];
  
  const defaultPort = projectSettings?.devPort || 3002;
  const localUrl = `http://localhost:${defaultPort}`;
  
  // URL priority: Tunnel > User custom (if we added it to state) > Default Local
  const [url, setUrl] = useState(tunnelUrl || localUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // Helper to get proxied URL for localhost to avoid port conflict/circular preview
  const getIframeSrc = (targetUrl: string) => {
    if (!targetUrl) return '';
    try {
      const urlObj = new URL(targetUrl);
      
      // Use iframeKey as a versioning parameter to force refresh
      if (iframeKey > 0) {
        urlObj.searchParams.set('v', iframeKey.toString());
      }

      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        const port = urlObj.port || '80';
        return `/api/preview-proxy/${port}${urlObj.pathname}${urlObj.search}`;
      }
      return urlObj.toString();
    } catch {
      return targetUrl;
    }
  };

  useEffect(() => {
    if (open && projectId) {
      fetchProjectSettings(projectId);
      subscribeToProject(projectId);
      // Reset auto-start flag and refresh iframe when switching projects
      setHasAutoStarted(false);
      setIframeKey(k => k + 1);
    } else if (!open) {
      setHasAutoStarted(false);
    }
  }, [open, projectId, fetchProjectSettings, subscribeToProject]);

  useEffect(() => {
    if (tunnelUrl) {
      setUrl(tunnelUrl);
    } else {
      setUrl(localUrl);
    }
  }, [tunnelUrl, localUrl]);

  const refreshPreview = () => {
    setIframeKey(prev => prev + 1);
  };

  const openExternal = () => {
    window.open(url, '_blank');
  };

  // Check if there are any running shells or preview terminals for this project
  const isServerRunning = isStarting || terminalTabs.some(t => t.projectId === projectId && t.title.startsWith('Preview: ') && t.isConnected);

  const startDevServer = useCallback(async () => {
    if (!project || !projectSettings?.devCommand) return;
    
    setIsStarting(true);
    try {
      // 1. Find and stop any other projects' preview shells that might be using the same port (3002)
      // Transitioning from background shells to interactive terminals
      const otherPreviewShells = Array.from(shells.values()).filter(
        s => s.projectId !== projectId && s.isRunning && s.attemptId === 'preview-autostart'
      );

      if (otherPreviewShells.length > 0) {
        log.info({ count: otherPreviewShells.length }, 'Stopping other projects\' preview shells');
        for (const shell of otherPreviewShells) {
          await useShellStore.getState().stopShell(shell.shellId);
        }
      }

      // 2. Stop preview terminals of OTHER projects to free up the port
      const previewPrefix = 'Preview: ';
      const otherPreviewTabs = terminalTabs.filter(t => t.title.startsWith(previewPrefix) && t.projectId !== projectId);
      for (const tab of otherPreviewTabs) {
        log.info({ tabId: tab.id, projectId: tab.projectId }, 'Closing other project preview terminal');
        closeTerminal(tab.id);
      }

      // 3. Close existing preview terminal of THIS project if it exists (to restart)
      const myPreviewTab = terminalTabs.find(t => t.title.startsWith(previewPrefix) && t.projectId === projectId);
      if (myPreviewTab) {
        closeTerminal(myPreviewTab.id);
      }

      // 4. Start new dev server in a terminal tab
      const title = `Preview: ${project.name}`;
      
      // Resolve terminal CWD: join project root with devCwd if provided
      let terminalCwd = project.path;
      if (projectSettings.devCwd) {
        // Simple join for now, assuming relative path
        const separator = project.path.includes('\\') ? '\\' : '/';
        const cleanDevCwd = projectSettings.devCwd.replace(/^[\\\/]/, '').replace(/[\\\/]$/, '');
        terminalCwd = `${project.path}${separator}${cleanDevCwd}`;
      }
      
      // Environment variables for the dev server (e.g. PORT for Next.js/Vite)
      const env = {
        PORT: String(projectSettings.devPort || 3002)
      };
      
      const terminalId = await createTerminalWithCommand(projectId, projectSettings.devCommand, title, terminalCwd, env);
      
      if (terminalId) {
        setHasAutoStarted(true);
        setIframeKey(k => k + 1);
        openPanel(); // Ensure terminal panel is visible
        setActiveTab(terminalId); // Focus the preview terminal
      }
    } finally {
      setIsStarting(false);
    }
  }, [project, projectSettings, shells, projectId, terminalTabs, closeTerminal, createTerminalWithCommand, openPanel, setActiveTab]);

  // Auto-start if command exists and no preview terminal is running
  useEffect(() => {
    if (open && projectSettings?.devCommand && !isStarting && !hasAutoStarted) {
      const isActuallyRunning = terminalTabs.some(t => t.projectId === projectId && t.title.startsWith('Preview: ') && t.isConnected);
      if (!isActuallyRunning) {
        setHasAutoStarted(true);
        startDevServer();
      } else {
        setHasAutoStarted(true);
      }
    }
  }, [open, projectSettings, isStarting, hasAutoStarted, startDevServer, terminalTabs, projectId]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[1000] bg-background flex flex-col animate-in fade-in duration-200">
      <div className="p-2 px-4 border-b flex flex-row items-center justify-between space-y-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm z-10">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-primary/10 p-1.5 rounded-md cursor-pointer hover:bg-primary/20" onClick={() => onOpenChange(false)}>
            <Eye className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold truncate leading-none">
              Preview: {project?.name}
            </h2>
            {projectSettings?.devCommand && (
              <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                {projectSettings.devCommand}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4 flex-1">
            <div className="relative flex-1">
              <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 pl-8 text-xs font-mono w-full"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIframeKey(k => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(getIframeSrc(url), '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center border rounded-md px-1 h-8 bg-muted/20">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-6 w-6 rounded-sm", layoutMode === 'mobile' && "bg-background shadow-sm")} 
              onClick={() => setLayoutMode('mobile')}
              title="Mobile"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-6 w-6 rounded-sm", layoutMode === 'tablet' && "bg-background shadow-sm")} 
              onClick={() => setLayoutMode('tablet')}
              title="Tablet"
            >
              <Tablet className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-6 w-6 rounded-sm", layoutMode === 'desktop' && "bg-background shadow-sm")} 
              onClick={() => setLayoutMode('desktop')}
              title="Desktop"
            >
              <Monitor className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>


        <div className="flex-1 bg-background relative overflow-auto">
          {(!isStarting && !terminalTabs.some(t => t.projectId === projectId && t.title.startsWith('Preview: ') && t.isConnected)) ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
                <div className="bg-muted p-4 rounded-full">
                  <TerminalIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Dev Server Not Running</h3>
                  <p className="text-sm text-muted-foreground">
                    The preview requires a dev server running on port {defaultPort}. 
                    {projectSettings?.devCommand ? ' Click the button to start it.' : ' Please start it manually in the terminal.'}
                  </p>
                </div>
                {projectSettings?.devCommand && (
                  <Button onClick={startDevServer} className="gap-2">
                    <Play className="h-4 w-4 fill-current" />
                    Start {projectSettings.devCommand}
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <div className={cn(
            "mx-auto transition-all duration-300 ease-in-out bg-white overflow-hidden shadow-sm relative border-x",
            layoutMode === 'mobile' && "w-[375px] h-[667px] mt-8 border rounded-lg",
            layoutMode === 'tablet' && "w-[768px] h-[1024px] mt-4 border rounded-lg",
            layoutMode === 'desktop' && "w-full h-full border-none"
          )}>
            <iframe 
              key={iframeKey}
              src={getIframeSrc(url)}
              className={cn(
                "w-full h-full border-none transition-opacity duration-300",
                !isServerRunning ? "opacity-30" : "opacity-100"
              )}
              title="Project Preview"
              width="100%"
              height="100%"
            />
          </div>
          
          {/* Status bar / Info overlay if needed */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            {tunnelStatus === 'connected' && (
              <div className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Live Tunnel
              </div>
            )}
            {isServerRunning && !isStarting && (
              <div className="bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <TerminalIcon className="h-3 w-3" />
                Preview Server Active
              </div>
            )}
            {isStarting && (
              <div className="bg-amber-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Starting Server...
              </div>
            )}
          </div>
        </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
