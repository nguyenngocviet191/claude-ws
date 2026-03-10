/**
 * Shell Process Monitor - External process tracking, restoration, and health monitoring
 *
 * Handles tracking processes spawned externally (e.g., via nohup),
 * restoring shells from database records after server restart,
 * and polling PIDs to detect process exit.
 */

import { type ChildProcess } from 'child_process';
import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import { createLogBuffer } from './circular-buffer';
import { createLogger } from './logger';
import type { ShellInstance } from './shell-manager';

const log = createLogger('ShellProcessMonitor');

/** Check if a PID is still running (signal 0 checks existence without killing) */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Poll an external process and emit exit event when it dies */
export function monitorExternalProcess(
  shellId: string,
  pid: number,
  shells: Map<string, ShellInstance>,
  emitter: EventEmitter,
): void {
  const checkInterval = setInterval(() => {
    const instance = shells.get(shellId);
    if (!instance || instance.exitCode !== null) {
      clearInterval(checkInterval);
      return;
    }

    if (!isPidAlive(pid)) {
      log.debug({ shellId, pid }, 'External process has exited');
      instance.exitCode = 0;
      emitter.emit('exit', {
        shellId,
        projectId: instance.projectId,
        code: 0,
        signal: null,
      });
      clearInterval(checkInterval);
    }
  }, 5000);
}

/** Track an external process by PID (e.g., from nohup background command) */
export function trackExternalProcess(
  options: {
    projectId: string;
    attemptId: string;
    command: string;
    cwd: string;
    pid: number;
    logFile?: string;
  },
  shells: Map<string, ShellInstance>,
  emitter: EventEmitter,
): string | null {
  const { projectId, attemptId, command, cwd, pid, logFile } = options;

  if (!isPidAlive(pid)) {
    log.debug({ pid }, 'Cannot track PID: not running');
    return null;
  }

  const shellId = nanoid();
  log.debug({ shellId, pid }, 'Tracking external process');

  const instance: ShellInstance = {
    shellId,
    projectId,
    attemptId,
    command,
    args: ['-c', command],
    cwd,
    process: null as unknown as ChildProcess,
    pid,
    logBuffer: createLogBuffer(1000),
    startedAt: Date.now(),
    exitCode: null,
    exitSignal: null,
    logFile,
  };

  shells.set(shellId, instance);
  emitter.emit('started', { shellId, projectId, pid, command });
  monitorExternalProcess(shellId, pid, shells, emitter);

  return shellId;
}

/** Restore a shell from a database record (for server restart recovery) */
export function restoreFromDb(
  shellRecord: {
    id: string;
    projectId: string;
    attemptId: string | null;
    command: string;
    cwd: string;
    pid: number | null;
  },
  shells: Map<string, ShellInstance>,
): boolean {
  if (!shellRecord.pid) {
    log.debug({ shellId: shellRecord.id }, 'Cannot restore shell: no PID');
    return false;
  }

  if (!isPidAlive(shellRecord.pid)) {
    log.debug({ shellId: shellRecord.id, pid: shellRecord.pid }, 'Shell PID is no longer running');
    return false;
  }

  if (shells.has(shellRecord.id)) {
    return true;
  }

  log.debug({ shellId: shellRecord.id, pid: shellRecord.pid }, 'Restoring shell');

  const instance: ShellInstance = {
    shellId: shellRecord.id,
    projectId: shellRecord.projectId,
    attemptId: shellRecord.attemptId || '',
    command: shellRecord.command,
    args: ['-c', shellRecord.command],
    cwd: shellRecord.cwd,
    process: null as unknown as ChildProcess,
    pid: shellRecord.pid,
    logBuffer: createLogBuffer(1000),
    startedAt: Date.now(),
    exitCode: null,
    exitSignal: null,
  };

  shells.set(shellRecord.id, instance);
  return true;
}
