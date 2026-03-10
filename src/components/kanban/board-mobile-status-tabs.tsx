'use client';

import { useDroppable } from '@dnd-kit/core';
import { ArrowDown } from 'lucide-react';
import { TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

interface MobileStatusTabProps {
  status: TaskStatus;
  title: string;
  count: number;
  isActive: boolean;
  isOver: boolean;
  onClick: () => void;
}

export function MobileStatusTab({ status, title, count, isActive, isOver, onClick }: MobileStatusTabProps) {
  const { setNodeRef } = useDroppable({
    id: `status-tab-${status}`,
    data: {
      type: 'status-tab',
      status,
    },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 overflow-hidden',
        isActive
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        isOver && 'bg-accent/50'
      )}
    >
      <span className={cn(
        'transition-opacity duration-200',
        isOver ? 'opacity-30' : ''
      )}>
        {title}
      </span>
      <span className={cn(
        'text-[10px] px-1.5 py-0.5 rounded-full transition-opacity duration-200',
        isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        isOver && 'opacity-30'
      )}>
        {count}
      </span>

      {/* Drop indicator */}
      {isOver && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
          <ArrowDown className="h-4 w-4 text-primary" />
        </div>
      )}
    </button>
  );
}
