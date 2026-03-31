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
 * Creates a branch `worktree/task-{taskId}` and a worktree at the same level as the project:
 * Example: /path/to/my-project -> /path/to/my-project-worktree-{taskId}
 */
export async function createWorktreeForTask(
  options: WorktreeOptions
): Promise<WorktreeResult> {
  const { taskId, projectPath } = options;

  // Create worktree outside the project, at the same level
  // Example: /path/to/my-project -> /path/to/my-project-worktree-task_123
  const projectDirName = path.basename(projectPath);
  const parentDir = path.dirname(projectPath);
  const worktreeDirName = `${projectDirName}-worktree-${taskId}`;
  const worktreePath = path.join(parentDir, worktreeDirName);

  const branch = `worktree/task-${taskId}`;

  try {
    // Check if worktree already exists
    if (await worktreeExists(worktreePath, projectPath)) {
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

  // Calculate worktree path (same as createWorktreeForTask)
  const projectDirName = path.basename(projectPath);
  const parentDir = path.dirname(projectPath);
  const worktreePath = path.join(parentDir, `${projectDirName}-worktree-${taskId}`);

  try {
    // Check if worktree exists
    if (!await worktreeExists(worktreePath, projectPath)) {
      console.log(`[Git Worktree Manager] Worktree for task ${taskId} does not exist, skipping removal`);
      return { success: true };
    }

    // Remove the worktree using --force to handle dirty worktrees
    await execFileAsync(
      'git',
      ['worktree', 'remove', '--force', worktreePath],
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
 * @param worktreePath - The full path to the worktree directory
 * @param projectPath - The path to the main project (for running git commands)
 */
export async function worktreeExists(
  worktreePath: string,
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

    return stdout.includes(`worktree ${worktreePath}`);
  } catch (error: unknown) {
    // If command fails (e.g., not a git repo), assume worktree doesn't exist
    return false;
  }
}
