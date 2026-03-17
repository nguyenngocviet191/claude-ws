/**
 * Shell Store - Manages background shell state and socket subscriptions
 *
 * Tracks shells per project, handles real-time updates via Socket.io,
 * and provides actions for stopping shells and fetching logs.
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('ShellStore');

export interface ShellInfo {
  shellId: string;
  projectId: string;
  attemptId: string;
  command: string;
  pid: number;
  startedAt: number;
  isRunning: boolean;
  exitCode: number | null;
}

export interface LogEntry {
  type: 'stdout' | 'stderr';
  content: string;
  timestamp: number;
}

interface ShellState {
  shells: Map<string, ShellInfo>;
  shellLogs: Map<string, LogEntry[]>;
  socket: Socket | null;
  subscribedProjectId: string | null;
  loading: boolean;
}

interface ShellActions {
  setShells: (projectId: string, shells: ShellInfo[]) => void;
  addShell: (shell: ShellInfo) => void;
  updateShell: (shellId: string, updates: Partial<ShellInfo>) => void;
  removeShell: (shellId: string) => void;
  subscribeToProject: (projectId: string) => void;
  unsubscribe: () => void;
  stopShell: (shellId: string) => Promise<boolean>;
  getShellLogs: (shellId: string, lines?: number) => Promise<LogEntry[]>;
  addShellLog: (shellId: string, log: LogEntry) => void;
  clearShellLogs: (shellId: string) => void;
  spawnShell: (options: { projectId: string; command: string; cwd: string; attemptId?: string }) => Promise<string | null>;
}

type ShellStore = ShellState & ShellActions;

export const useShellStore = create<ShellStore>((set, get) => ({
  shells: new Map(),
  shellLogs: new Map(),
  socket: null,
  subscribedProjectId: null,
  loading: false,

  setShells: (projectId, projectShells) => {
    set((state) => {
      const newMap = new Map(state.shells);
      // Remove old shells for this specific project first to avoid duplicates/stale data
      for (const [id, shell] of newMap.entries()) {
        if (shell.projectId === projectId) {
          newMap.delete(id);
        }
      }
      // Add new shells for this project
      projectShells.forEach((s) => newMap.set(s.shellId, s));
      return { shells: newMap, loading: false };
    });
  },

  addShell: (shell) => {
    set((state) => {
      const newMap = new Map(state.shells);
      newMap.set(shell.shellId, shell);
      return { shells: newMap };
    });
  },

  updateShell: (shellId, updates) => {
    set((state) => {
      const shell = state.shells.get(shellId);
      if (!shell) return state;
      const newMap = new Map(state.shells);
      newMap.set(shellId, { ...shell, ...updates });
      return { shells: newMap };
    });
  },

  removeShell: (shellId) => {
    set((state) => {
      const newMap = new Map(state.shells);
      newMap.delete(shellId);
      return { shells: newMap };
    });
  },

  subscribeToProject: (projectId) => {
    const state = get();

    // Skip if already subscribed to this project
    if (state.subscribedProjectId === projectId && state.socket) {
      return;
    }

    // Unsubscribe from previous project
    if (state.subscribedProjectId && state.socket) {
      state.socket.emit('shell:unsubscribe', {
        projectId: state.subscribedProjectId,
      });
    }

    // Create socket if needed
    let socket = state.socket;
    if (!socket) {
      socket = io({ reconnection: true, reconnectionDelay: 1000 });

      // Setup event listeners once
      socket.on(
        'shell:started',
        (data: {
          shellId: string;
          projectId: string;
          pid: number;
          command: string;
        }) => {
          log.debug({ shellId: data.shellId }, 'Shell started');
          get().addShell({
            shellId: data.shellId,
            projectId: data.projectId,
            attemptId: '',
            command: data.command,
            pid: data.pid,
            startedAt: Date.now(),
            isRunning: true,
            exitCode: null,
          });
        }
      );

      socket.on(
        'shell:exit',
        (data: {
          shellId: string;
          projectId: string;
          code: number | null;
          signal: string | null;
        }) => {
          log.debug({ shellId: data.shellId, code: data.code }, 'Shell exited');
          get().updateShell(data.shellId, {
            isRunning: false,
            exitCode: data.code,
          });
        }
      );

      // Listen for real-time shell output
      socket.on(
        'shell:output',
        (data: {
          shellId: string;
          projectId: string;
          type: 'stdout' | 'stderr';
          content: string;
        }) => {
          get().addShellLog(data.shellId, {
            type: data.type,
            content: data.content,
            timestamp: Date.now(),
          });
        }
      );

      set({ socket });
    }

    // Subscribe to new project
    socket.emit('shell:subscribe', { projectId });
    set({ subscribedProjectId: projectId, loading: true });

    // Fetch initial shells from API
    fetch(`/api/shells?projectId=${encodeURIComponent(projectId)}`, {
      headers: {
        'x-api-key': localStorage.getItem('claude-kanban:api-key') || '',
      },
    })
      .then((res) => res.json())
      .then((shells: ShellInfo[]) => get().setShells(projectId, shells))
      .catch((err) => {
        log.error({ err, projectId }, 'Failed to fetch shells');
        set({ loading: false });
      });
  },

  unsubscribe: () => {
    const { socket, subscribedProjectId } = get();
    if (socket && subscribedProjectId) {
      socket.emit('shell:unsubscribe', { projectId: subscribedProjectId });
      set({ subscribedProjectId: null });
    }
  },

  stopShell: async (shellId) => {
    const { socket } = get();
    if (!socket) return false;

    return new Promise((resolve) => {
      socket.emit(
        'shell:stop',
        { shellId },
        (result: { success: boolean; error?: string }) => {
          if (result.error) {
            log.error({ error: result.error }, 'Stop shell error');
          }
          resolve(result.success);
        }
      );
    });
  },

  getShellLogs: async (shellId, lines = 100) => {
    const { socket, shellLogs } = get();
    if (!socket) return shellLogs.get(shellId) || [];

    return new Promise((resolve) => {
      socket.emit(
        'shell:getLogs',
        { shellId, lines },
        (result: { logs: LogEntry[]; error?: string }) => {
          if (result.error) {
            log.error({ error: result.error }, 'Get logs error');
            resolve([]);
          } else {
            // Set initial logs
            set((state) => {
              const newLogs = new Map(state.shellLogs);
              newLogs.set(shellId, result.logs);
              return { shellLogs: newLogs };
            });
            resolve(result.logs);
          }
        }
      );
    });
  },

  addShellLog: (shellId, log) => {
    set((state) => {
      const newLogs = new Map(state.shellLogs);
      const existing = newLogs.get(shellId) || [];
      // Keep last 500 logs per shell to prevent memory issues
      const updated = [...existing, log].slice(-500);
      newLogs.set(shellId, updated);
      return { shellLogs: newLogs };
    });
  },

  clearShellLogs: (shellId) => {
    set((state) => {
      const newLogs = new Map(state.shellLogs);
      newLogs.delete(shellId);
      return { shellLogs: newLogs };
    });
  },

  spawnShell: async (options) => {
    try {
      const res = await fetch('/api/shells', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': localStorage.getItem('claude-kanban:api-key') || '',
        },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || res.statusText;
        log.error({ status: res.status, error: errorMessage }, 'Failed to spawn shell');
        return null;
      }

      const data = await res.json();
      
      // Update local state immediately to prevent race conditions in UI
      const newShell: ShellInfo = {
        shellId: data.shellId,
        projectId: options.projectId,
        attemptId: options.attemptId || 'manual',
        command: options.command,
        pid: data.pid,
        startedAt: Date.now(),
        isRunning: true,
        exitCode: null,
      };
      
      get().addShell(newShell);
      
      return data.shellId;
    } catch (err) {
      log.error({ err }, 'Spawn shell error');
      return null;
    }
  },
}));
