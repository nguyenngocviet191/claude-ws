/**
 * Shell Cleanup and Stop - Stopping, removing, and cleaning up shell processes
 *
 * Handles graceful termination with force-kill fallback,
 * removal of stopped shells from tracking, and bulk cleanup on shutdown.
 */

import { EventEmitter } from 'events';
import { createLogger } from './logger';
import { isPidAlive } from './shell-process-monitor';
import type { ShellInstance } from './shell-manager';

const log = createLogger('ShellCleanup');

/** Stop a running shell process with graceful termination and force-kill fallback */
export function stopShell(
  shellId: string,
  signal: NodeJS.Signals,
  shells: Map<string, ShellInstance>,
  emitter: EventEmitter,
): boolean {
  const instance = shells.get(shellId);
  if (!instance) {
    log.warn({ shellId }, 'Shell not found');
    return false;
  }

  if (instance.exitCode !== null) {
    log.warn({ shellId }, 'Shell already exited');
    return false;
  }

  // External processes (tracked via BGPID) aren't process group leaders
  // Use direct PID kill for them, process group kill (-pid) for our spawned shells
  const isExternalProcess = !instance.process;
  const killTarget = isExternalProcess ? instance.pid : -instance.pid;

  log.debug({ shellId, pid: instance.pid, isExternalProcess, signal }, 'Stopping shell');

  try {
    process.kill(killTarget, signal);

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (instance.exitCode === null && isPidAlive(instance.pid)) {
        log.debug({ shellId }, 'Force killing shell');
        try {
          process.kill(killTarget, 'SIGKILL');
        } catch {
          // Process might already be dead
        }
      }
    }, 5000);

    // For external/restored shells, manually emit exit event since we can't listen to process events
    if (isExternalProcess) {
      setTimeout(() => {
        if (!isPidAlive(instance.pid)) {
          instance.exitCode = 0;
          instance.exitSignal = signal;
          emitter.emit('exit', {
            shellId,
            projectId: instance.projectId,
            code: 0,
            signal,
          });
        }
      }, 500);
    }

    return true;
  } catch (error) {
    log.error({ shellId, err: error }, 'Failed to stop shell');
    return false;
  }
}

/** Remove a stopped shell from tracking */
export function removeShell(
  shellId: string,
  shells: Map<string, ShellInstance>,
): boolean {
  const shell = shells.get(shellId);
  if (!shell) return false;

  if (shell.exitCode === null) {
    log.warn({ shellId }, 'Cannot remove running shell');
    return false;
  }

  shells.delete(shellId);
  return true;
}

/** Kill all tracked shells (only called for hard cleanup on shutdown) */
export function cleanupAllShells(
  shells: Map<string, ShellInstance>,
): void {
  log.debug({ count: shells.size }, 'Cleaning up shells');
  for (const [shellId, instance] of shells) {
    if (instance.exitCode === null) {
      log.debug({ shellId }, 'Killing shell');
      try {
        instance.process.kill('SIGTERM');
      } catch {
        // Ignore errors during cleanup
      }
    }
  }
}
