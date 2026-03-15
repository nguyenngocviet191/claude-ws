'use client';

import { useState, useEffect } from 'react';
import { Eye, ExternalLink, RefreshCw, Globe, Terminal as TerminalIcon } from 'lucide-react';
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

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function PreviewDialog({ open, onOpenChange, projectId }: PreviewDialogProps) {
  const { projects } = useProjectStore();
  const { url: tunnelUrl, status: tunnelStatus } = useTunnelStore();
  const { settings, fetchProjectSettings } = useProjectSettingsStore();
  const { shells } = useShellStore();
  
  const project = projects.find(p => p.id === projectId);
  const projectSettings = settings[projectId];
  
  const defaultPort = projectSettings?.devPort || 3000;
  const localUrl = `http://localhost:${defaultPort}`;
  
  // URL priority: Tunnel > User custom (if we added it to state) > Default Local
  const [url, setUrl] = useState(tunnelUrl || localUrl);
  const [iframeKey, setIframeKey] = useState(0);

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
    }
  }, [open, projectId]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-primary/10 p-1.5 rounded-md">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-base font-semibold truncate">
              Preview: {project?.name}
            </DialogTitle>
            
            <div className="flex items-center gap-2 ml-4 flex-1">
              <div className="relative flex-1">
                <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-8 pl-8 text-xs font-mono w-full"
                />
              </div>
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
          <iframe 
            key={iframeKey}
            src={getIframeSrc(url)}
            className="w-full h-full border-none bg-white"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
