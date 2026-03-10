'use client';

import { DragOverlay } from '@dnd-kit/core';
import { Task } from '@/types';
import { TaskCard } from '@/components/kanban/task-card';

interface BoardDragOverlayProps {
  activeTask: Task | null;
  attemptCount: number;
  isMobile: boolean;
}

export function BoardDragOverlay({ activeTask, attemptCount, isMobile }: BoardDragOverlayProps) {
  return (
    <DragOverlay>
      {activeTask ? (
        <div className="rotate-3">
          <TaskCard
            task={activeTask}
            attemptCount={attemptCount}
            isMobile={isMobile}
          />
        </div>
      ) : null}
    </DragOverlay>
  );
}
