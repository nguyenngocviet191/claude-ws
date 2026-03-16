'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, ExternalLink, RefreshCw, Globe, Terminal as TerminalIcon, Play, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/project-store';
import { useTunnelStore } from '@/stores/tunnel-store';
import { useProjectSettingsStore } from '@/stores/project-settings-store';
import { useShellStore } from '@/stores/shell-store';
import { cn } from '@/lib/utils';

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function PreviewDialog({ open, onOpenChange, projectId }: PreviewDialogProps) {
  const { projects } = useProjectStore();
  const { url: tunnelUrl, status: tunnelStatus } = useTunnelStore();
  const { settings, fetchProjectSettings } = useProjectSettingsStore();
  const { shells, subscribeToProject, spawnShell } = useShellStore();
  
  const project = projects.find(p => p.id === projectId);
  const projectSettings = settings[projectId];
  
  const defaultPort = projectSettings?.devPort || 3002;
  const localUrl = `http://localhost:${defaultPort}`;
  
  // URL priority: Tunnel > User custom (if we added it to state) > Default Local
  const [url, setUrl] = useState(tunnelUrl || localUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Helper to get proxied URL for localhost to avoid port conflict/circular preview
  const getIframeSrc = (targetUrl: string) => {
    if (!targetUrl) return '';
    if (targetUrl.startsWith('http://localhost:') || targetUrl.startsWith('http://127.0.0.1:')) {
      try {
        const urlObj = new URL(targetUrl);
        const port = urlObj.port || '80';
        return `/api/preview-proxy/${port}${urlObj.pathname}${urlObj.search}`;
      } catch {
        return targetUrl;
      }
    }
    return targetUrl;
  };

  useEffect(() => {
    if (open && projectId) {
      fetchProjectSettings(projectId);
      subscribeToProject(projectId);
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

  // Check if there are any running shells for this project
  const runningShells = Array.from(shells.values()).filter(
    s => s.projectId === projectId && s.isRunning
  );

  const startDevServer = useCallback(async () => {
    if (!project || !projectSettings?.devCommand) return;
    
    setIsStarting(true);
    try {
      await spawnShell({
        projectId: project.id,
        command: projectSettings.devCommand,
        cwd: project.path,
        attemptId: 'preview-autostart'
      });
    } finally {
      setIsStarting(false);
    }
  }, [project, projectSettings, spawnShell]);

  // Auto-start if command exists and no shells are running
  useEffect(() => {
    if (open && projectSettings?.devCommand && runningShells.length === 0 && !isStarting && !hasAutoStarted) {
      setHasAutoStarted(true);
      startDevServer();
    }
  }, [open, projectSettings, runningShells.length, isStarting, hasAutoStarted, startDevServer]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-primary/10 p-1.5 rounded-md">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-base font-semibold truncate leading-none">
                Preview: {project?.name}
              </DialogTitle>
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
              
              {projectSettings?.devCommand && runningShells.length === 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 text-xs border-primary/20 hover:border-primary/50"
                  onClick={startDevServer}
                  disabled={isStarting}
                >
                  {isStarting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                  {isStarting ? 'Starting...' : 'Start Dev Server'}
                </Button>
              )}

              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refreshPreview}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openExternal}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/30 relative">
          {runningShells.length === 0 && !isStarting ? (
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

          <iframe 
            key={iframeKey}
            src={getIframeSrc(url)}
            className={cn(
              "w-full h-full border-none bg-white transition-opacity duration-300",
              (runningShells.length === 0 && !isStarting) ? "opacity-30" : "opacity-100"
            )}
            title="Project Preview"
          />
          
          {/* Status bar / Info overlay if needed */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            {tunnelStatus === 'connected' && (
              <div className="bg-green-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Live Tunnel
              </div>
            )}
            {runningShells.length > 0 && (
              <div className="bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <TerminalIcon className="h-3 w-3" />
                {runningShells.length} Shells Active
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
      </DialogContent>
    </Dialog>
  );
}
