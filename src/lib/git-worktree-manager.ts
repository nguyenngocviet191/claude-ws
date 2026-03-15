import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

// Timeout for git worktree operations (10 seconds)
const GIT_WORKTREE_TIMEOUT = 10000;

export interface WorktreeOptions {
  taskId: string;
  projectPath: string;
}

export interface WorktreeResult {
  success: boolean;
  worktreePath: string | null;
  branch: string;
  error?: string;
}

/**
 * Creates a new Git worktree for a task.
 * Creates a branch `worktree/task-{taskId}` and a worktree at `.worktrees/task-{taskId}`.
 */
export async function createWorktreeForTask(
  options: WorktreeOptions
): Promise<WorktreeResult> {
  const { taskId, projectPath } = options;
  const worktreePath = path.join(projectPath, '.worktrees', taskId);
  const branch = `worktree/task-${taskId}`;

  try {
    // Check if worktree already exists
    if (await worktreeExists(taskId, projectPath)) {
      console.log(`[Git Worktree Manager] Worktree for task ${taskId} already exists, reusing it`);
      return {
        success: true,
        worktreePath,
        branch,
      };
    }

    // Create the worktree
    await execFileAsync(
      'git',
      ['worktree', 'add', '-b', branch, worktreePath],
      {
        cwd: projectPath,
        timeout: GIT_WORKTREE_TIMEOUT,
      }
    );

    console.log(`[Git Worktree Manager] Created worktree at ${worktreePath} for branch ${branch}`);
    return {
      success: true,
      worktreePath,
      branch,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };

    // Handle non-git repository case
    if (err.message?.includes('not a git repository')) {
      console.warn(`[Git Worktree Manager] Project at ${projectPath} is not a git repository`);
      return {
        success: false,
        worktreePath: null,
        branch,
        error: 'Not a git repository',
      };
    }

    // Handle timeout
    if (err.code === 'ETIMEDOUT') {
      console.error(`[Git Worktree Manager] Git worktree add timed out for task ${taskId}`);
      return {
        success: false,
        worktreePath: null,
        branch,
        error: 'Git worktree command timed out',
      };
    }

    console.error(`[Git Worktree Manager] Failed to create worktree for task ${taskId}:`, error);
    return {
      success: false,
      worktreePath: null,
      branch,
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Removes a Git worktree for a task.
 * Removes the worktree directory and deletes the associated branch.
 */
export async function removeWorktreeForTask(
  taskId: string,
  projectPath: string
): Promise<{ success: boolean; error?: string }> {
  const branch = `worktree/task-${taskId}`;

  try {
    // Check if worktree exists
    if (!await worktreeExists(taskId, projectPath)) {
      console.log(`[Git Worktree Manager] Worktree for task ${taskId} does not exist, skipping removal`);
      return { success: true };
    }

    // Remove the worktree using --force to handle dirty worktrees
    await execFileAsync(
      'git',
      ['worktree', 'remove', '--force', path.join(projectPath, '.worktrees', taskId)],
      {
        cwd: projectPath,
        timeout: GIT_WORKTREE_TIMEOUT,
      }
    );

    // Delete the branch
    try {
      await execFileAsync(
        'git',
        ['branch', '-D', branch],
        {
          cwd: projectPath,
          timeout: GIT_WORKTREE_TIMEOUT,
        }
      );
    } catch {
      // Branch might already be deleted or not exist, which is fine
      console.log(`[Git Worktree Manager] Branch ${branch} was already deleted or does not exist`);
    }

    console.log(`[Git Worktree Manager] Removed worktree for task ${taskId}`);
    return { success: true };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };

    // Handle non-git repository case
    if (err.message?.includes('not a git repository')) {
      console.warn(`[Git Worktree Manager] Project at ${projectPath} is not a git repository`);
      return { success: true }; // Not an error if not a git repo
    }

    // Handle timeout
    if (err.code === 'ETIMEDOUT') {
      console.error(`[Git Worktree Manager] Git worktree remove timed out for task ${taskId}`);
      return {
        success: false,
        error: 'Git worktree command timed out',
      };
    }

    console.error(`[Git Worktree Manager] Failed to remove worktree for task ${taskId}:`, error);
    return {
      success: false,
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Checks if a worktree exists for the given task.
 */
export async function worktreeExists(
  taskId: string,
  projectPath: string
): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['worktree', 'list', '--porcelain'],
      {
        cwd: projectPath,
        timeout: GIT_WORKTREE_TIMEOUT,
      }
    );

    const worktreePath = path.join(projectPath, '.worktrees', taskId);
    return stdout.includes(`worktree ${worktreePath}`);
  } catch (error: unknown) {
    // If command fails (e.g., not a git repo), assume worktree doesn't exist
    return false;
  }
}
