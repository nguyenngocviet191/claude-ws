'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PreviewDialog } from '@/components/preview/preview-dialog';
import { useProjectStore } from '@/stores/project-store';

export function PreviewButton() {
  const [open, setOpen] = useState(false);
  const { activeProjectId, selectedProjectIds } = useProjectStore();
  
  const projectId = activeProjectId || selectedProjectIds[0];
  
  if (!projectId) return null;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="shrink-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Preview Project</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PreviewDialog 
        open={open} 
        onOpenChange={setOpen} 
        projectId={projectId} 
      />
    </>
  );
}
