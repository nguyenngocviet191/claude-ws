'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Eye, ExternalLink, RefreshCw, Globe, Terminal as TerminalIcon, Play, Loader2, Monitor, Smartphone, Tablet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/project-store';
import { useTunnelStore } from '@/stores/tunnel-store';
import { useProjectSettingsStore } from '@/stores/project-settings-store';
import { useShellStore } from '@/stores/shell-store';
import { useTerminalStore } from '@/stores/terminal-store';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import { getFolderName } from '@/lib/utils';
const log = createLogger('PreviewDialog');
const PREVIEW_PREFIX = 'Preview: ';
const DEFAULT_DEV_PORT = 3002;
const POLLING_INTERVAL_MS = 2000;
const SERVER_CHECK_TIMEOUT_MS = 2000;

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

function useServerPolling(open: boolean, isServerRunning: boolean, url: string, onReady: () => void) {
  const [isReady, setIsReady] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const getIframeSrc = useCallback((targetUrl: string) => {
    if (!targetUrl) return '';
    try {
      const urlObj = new URL(targetUrl);
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        const port = urlObj.port || '80';
        return `/api/preview-proxy/${port}${urlObj.pathname}${urlObj.search}`;
      }
      return urlObj.toString();
    } catch {
      return targetUrl;
    }
  }, []);

  useEffect(() => {
    if (isReady) {
      setIsPolling(false);
      return;
    }

    if (!open || !isServerRunning) {
      setIsPolling(false);
      setIsReady(false);
      return;
    }

    setIsPolling(true);

    const checkServerStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SERVER_CHECK_TIMEOUT_MS);

        const response = await fetch(getIframeSrc(url), {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-store'
        });

        clearTimeout(timeoutId);

        if (response.status !== 502) {
          setIsReady(true);
          onReady();
        }
      } catch (err) {
        log.debug({ err }, 'Polling check failed');
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [open, isServerRunning, url, isReady, getIframeSrc, onReady]);

  return { isReady, isPolling, getIframeSrc };
}

interface PreviewHeaderProps {
  project: { name?: string; settings?: { devCommand?: string } } | null;
  url: string;
  onUrlChange: (url: string) => void;
  onRefresh: () => void;
  onOpenExternal: () => void;
  layoutMode: 'mobile' | 'tablet' | 'desktop';
  setLayoutMode: (mode: 'mobile' | 'tablet' | 'desktop') => void;
  onClose: () => void;
}

function PreviewHeader({ project, url, onUrlChange, onRefresh, onOpenExternal, layoutMode, setLayoutMode, onClose }: PreviewHeaderProps) {
  return (
    <div className="p-2 px-3 border-b flex flex-row items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm z-10 min-w-0 gap-2">
      {/* Left: Logo + Project Name */}
      <div className="flex items-center gap-2 shrink-0">
        {/* <div className="bg-primary/10 p-1.5 rounded-md cursor-pointer hover:bg-primary/20" onClick={onClose}>
          <Eye className="h-4 w-4 text-primary" />
        </div> */}
        <h2 className="text-base font-semibold truncate leading-none">{getFolderName(project?.name ?? '')}</h2>
        {/* <div className="hidden sm:flex flex-col">
          
          {project?.settings?.devCommand && (
            <span className="text-[10px] text-muted-foreground mt-1 font-mono">{project.settings.devCommand}</span>
          )}
        </div> */}
      </div>

      {/* Center: URL bar */}
      <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            className="h-8 pl-8 text-xs font-mono w-full"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onOpenExternal}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Mobile: Refresh + External icons */}
      <div className="flex sm:hidden items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenExternal}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div> 

      {/* Right: Device toggles + Close */}
      <div className="flex items-center gap-2 shrink-0">
        <LayoutModeButtons layoutMode={layoutMode} onLayoutModeChange={setLayoutMode} />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface LayoutModeButtonsProps {
  layoutMode: 'mobile' | 'tablet' | 'desktop';
  onLayoutModeChange: (mode: 'mobile' | 'tablet' | 'desktop') => void;
}

function LayoutModeButtons({ layoutMode, onLayoutModeChange }: LayoutModeButtonsProps) {
  const modes: Array<{ mode: 'mobile' | 'tablet' | 'desktop'; icon: any; title: string }> = [
    { mode: 'mobile', icon: Smartphone, title: 'Mobile' },
    { mode: 'tablet', icon: Tablet, title: 'Tablet' },
    { mode: 'desktop', icon: Monitor, title: 'Desktop' }
  ];

  return (
    <div className="flex items-center border rounded-md px-1 h-8 bg-muted/20">
      {modes.map(({ mode, icon: Icon, title }) => (
        <Button
          key={mode}
          variant="ghost"
          size="icon"
          className={cn('h-6 w-6 rounded-sm', layoutMode === mode && 'bg-background shadow-sm')}
          onClick={() => onLayoutModeChange(mode)}
          title={title}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}

interface ServerNotRunningStateProps {
  devCommand?: string;
  defaultPort: number;
  onStart: () => void;
}

function ServerNotRunningState({ devCommand, defaultPort, onStart }: ServerNotRunningStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
      <div className="flex flex-col items-center gap-4 text-center p-8 max-w-md">
        <div className="bg-muted p-4 rounded-full">
          <TerminalIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Dev Server Not Running</h3>
          <p className="text-sm text-muted-foreground">
            The preview requires a dev server running on port {defaultPort}.{' '}
            {devCommand ? ' Click the button to start it.' : ' Please start it manually in the terminal.'}
          </p>
        </div>
        {devCommand && (
          <Button onClick={onStart} className="gap-2">
            <Play className="h-4 w-4 fill-current" />
            Start {devCommand}
          </Button>
        )}
      </div>
    </div>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-all duration-500 animate-in fade-in">
      <div className="relative flex flex-col items-center gap-8 p-12 rounded-3xl border border-white/20 shadow-2xl overflow-hidden glassmorphism">
        <div className="absolute -inset-10 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 blur-3xl animate-pulse" />
        <div className="absolute top-0 left-0 w-24 h-24 bg-primary/5 rounded-full -translate-x-12 -translate-y-12 blur-2xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-full translate-x-16 translate-y-16 blur-2xl" />

        <div className="relative">
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-background border border-primary/20 p-6 rounded-2xl shadow-inner">
            <Loader2 className="h-10 w-10 text-primary animate-spin" strokeWidth={1.5} />
          </div>
        </div>

        <div className="relative space-y-3 text-center max-w-[280px]">
          <h3 className="text-xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            Compiling your vision...
          </h3>
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            The dev server is warming up. We'll show you the magic as soon as it's ready.
          </p>
        </div>

        <div className="relative flex items-center gap-4 py-2 px-4 bg-muted/30 rounded-full border border-white/10">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Auto-refresh enabled
          </span>
        </div>
      </div>

      <style jsx>{`
        .glassmorphism {
          background: rgba(var(--background-start-rgb), 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

interface StatusBadgesProps {
  tunnelStatus: string;
  isServerRunning: boolean;
  isStarting: boolean;
}

function StatusBadges({ tunnelStatus, isServerRunning, isStarting }: StatusBadgesProps) {
  return (
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
  );
}

interface PreviewIframeProps {
  src: string;
  isServerRunning: boolean;
  isReady: boolean;
  layoutMode: 'mobile' | 'tablet' | 'desktop';
}

function PreviewIframe({ src, isServerRunning, isReady, layoutMode }: PreviewIframeProps) {
  const layoutClasses = {
    mobile: 'w-[375px] h-[667px] mt-8 border rounded-lg',
    tablet: 'w-[768px] h-[1024px] mt-4 border rounded-lg',
    desktop: 'w-full h-full border-none'
  };

  return (
    <div className={cn(
      'mx-auto transition-all duration-300 ease-in-out bg-white overflow-hidden shadow-sm relative border-x',
      layoutClasses[layoutMode]
    )}>
      {isServerRunning && !isReady && <LoadingOverlay />}
      <iframe
        src={src}
        className={cn(
          'w-full h-full border-none transition-opacity duration-700 ease-in-out',
          (!isServerRunning || !isReady) ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
        title="Project Preview"
        width="100%"
        height="100%"
      />
    </div>
  );
}

interface UseDevServerProps {
  projectId: string;
  project: { id: string; name: string; path: string } | null;
  projectSettings: { devCommand?: string; devPort?: number; devCwd?: string } | null;
  terminalTabs: Array<{ id: string; projectId: string; title: string; isConnected: boolean }>;
  onStarted?: () => void;
}

function useDevServer({ projectId, project, projectSettings, terminalTabs, onStarted }: UseDevServerProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  const { shells } = useShellStore();
  const { closeTerminal, createTerminalWithCommand, openPanel, setActiveTab } = useTerminalStore();

  const stopOtherProjectPreview = useCallback(async () => {
    const otherPreviewTabs = terminalTabs.filter(
      t => t.title.startsWith(PREVIEW_PREFIX) && t.projectId !== projectId
    );
    for (const tab of otherPreviewTabs) {
      log.info({ tabId: tab.id, projectId: tab.projectId }, 'Closing other project preview terminal');
      closeTerminal(tab.id);
    }

    const otherPreviewShells = Array.from(shells.values()).filter(
      s => s.projectId !== projectId && s.isRunning && s.attemptId === 'preview-autostart'
    );

    if (otherPreviewShells.length > 0) {
      log.info({ count: otherPreviewShells.length }, 'Stopping other projects\' preview shells');
      for (const shell of otherPreviewShells) {
        await useShellStore.getState().stopShell(shell.shellId);
      }
    }
  }, [projectId, terminalTabs, shells, closeTerminal]);

  const restartCurrentPreview = useCallback(async () => {
    const myPreviewTab = terminalTabs.find(
      t => t.title.startsWith(PREVIEW_PREFIX) && t.projectId === projectId
    );
    if (myPreviewTab) {
      closeTerminal(myPreviewTab.id);
    }
  }, [terminalTabs, projectId, closeTerminal]);

  const getTerminalCwd = useCallback(() => {
    if (!project) return undefined;
    if (!projectSettings?.devCwd) return project.path;

    const separator = project.path.includes('\\') ? '\\' : '/';
    const cleanDevCwd = projectSettings.devCwd.replace(/^[\\\/]/, '').replace(/[\\\/]$/, '');
    return `${project.path}${separator}${cleanDevCwd}`;
  }, [project, projectSettings]);

  const startDevServer = useCallback(async () => {
    if (!project || !projectSettings?.devCommand) return;

    setIsStarting(true);
    try {
      await stopOtherProjectPreview();
      await restartCurrentPreview();

      const terminalId = await createTerminalWithCommand(
        projectId,
        projectSettings.devCommand,
        `${PREVIEW_PREFIX}${project.name}`,
        getTerminalCwd(),
        { PORT: String(projectSettings.devPort || DEFAULT_DEV_PORT) }
      );

      if (terminalId) {
        setHasAutoStarted(true);
        openPanel();
        setActiveTab(terminalId);
        onStarted?.();
      }
    } finally {
      setIsStarting(false);
    }
  }, [project, projectSettings, projectId, stopOtherProjectPreview, restartCurrentPreview, getTerminalCwd, createTerminalWithCommand, openPanel, setActiveTab, onStarted]);

  const isPreviewRunning = terminalTabs.some(
    t => t.projectId === projectId && t.title.startsWith(PREVIEW_PREFIX) && t.isConnected
  );

  return { isStarting, startDevServer, isPreviewRunning, hasAutoStarted, setHasAutoStarted };
}

export function PreviewDialog({ open, onOpenChange, projectId }: PreviewDialogProps) {
  const { projects } = useProjectStore();
  const { url: tunnelUrl, status: tunnelStatus } = useTunnelStore();
  const { settings, fetchProjectSettings } = useProjectSettingsStore();
  const { subscribeToProject } = useShellStore();
  const { tabs: terminalTabs } = useTerminalStore();

  const [url, setUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  const project = projects.find(p => p.id === projectId);
  const projectSettings = settings[projectId];
  const defaultPort = projectSettings?.devPort || DEFAULT_DEV_PORT;
  const localUrl = `http://localhost:${defaultPort}`;

  const isServerRunning = terminalTabs.some(
    t => t.projectId === projectId && t.title.startsWith(PREVIEW_PREFIX) && t.isConnected
  );

  const onServerReady = useCallback(() => setIframeKey(k => k + 1), []);
  const { isReady, getIframeSrc } = useServerPolling(open, isServerRunning, url, onServerReady);

  const { isStarting, startDevServer, isPreviewRunning, hasAutoStarted, setHasAutoStarted } =
    useDevServer({ projectId, project: project || null, projectSettings, terminalTabs, onStarted: () => setIframeKey(k => k + 1) });

  useEffect(() => {
    if (open && projectId) {
      fetchProjectSettings(projectId);
      subscribeToProject(projectId);
      setHasAutoStarted(false);
      setIframeKey(k => k + 1);
    }
  }, [open, projectId, fetchProjectSettings, subscribeToProject, setHasAutoStarted]);

  useEffect(() => {
    setUrl(tunnelUrl || localUrl);
  }, [tunnelUrl, localUrl]);

  useEffect(() => {
    if (open && projectSettings?.devCommand && !hasAutoStarted && !isPreviewRunning) {
      setHasAutoStarted(true);
      startDevServer();
    }
  }, [open, projectSettings, hasAutoStarted, isPreviewRunning, startDevServer, setHasAutoStarted]);

  if (!open) return null;

  const refreshPreview = () => setIframeKey(k => k + 1);
  const openExternal = () => window.open(getIframeSrc(url), '_blank');

  const content = (
    <div className="fixed inset-0 z-[1000] bg-background flex flex-col animate-in fade-in duration-200">
      <PreviewHeader
        project={{ ...project, settings: projectSettings }}
        url={url}
        onUrlChange={setUrl}
        onRefresh={refreshPreview}
        onOpenExternal={openExternal}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        onClose={() => onOpenChange(false)}
      />
      <div className="flex-1 bg-background relative overflow-auto">
        {!isStarting && !isPreviewRunning && (
          <ServerNotRunningState
            devCommand={projectSettings?.devCommand}
            defaultPort={defaultPort}
            onStart={startDevServer}
          />
        )}
        <PreviewIframe
          src={getIframeSrc(url)}
          isServerRunning={isServerRunning}
          isReady={isReady}
          layoutMode={layoutMode}
        />
        <StatusBadges tunnelStatus={tunnelStatus} isServerRunning={isServerRunning} isStarting={isStarting} />
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
