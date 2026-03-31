import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { createTaskService } from '@agentic-sdk/services/task-crud-and-reorder-service';
import { removeWorktreeForTask } from '@/lib/git-worktree-manager';

const log = createLogger('TaskWorktree');
const taskService = createTaskService(db);

/**
 * DELETE /api/tasks/[id]/worktree
 * Removes the git worktree associated with a task and updates the task record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check task existence
    const task = await taskService.getById(id);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task uses worktree
    if (!task.useWorktree) {
      return NextResponse.json(
        { error: 'Task does not use a worktree' },
        { status: 400 }
      );
    }

    // Fetch project path from database
    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, task.projectId),
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Remove the worktree
    const worktreeResult = await removeWorktreeForTask(id, project.path);

    if (!worktreeResult.success) {
      log.error({ error: worktreeResult.error, taskId: id }, 'Failed to remove worktree');
      return NextResponse.json(
        { error: worktreeResult.error || 'Failed to remove worktree' },
        { status: 500 }
      );
    }

    // Update task to clear worktree flags
    await taskService.update(id, {
      useWorktree: false,
      worktreePath: null,
    });

    log.info({ taskId: id }, 'Worktree removed successfully');

    return NextResponse.json({
      success: true,
      message: 'Worktree removed successfully',
    });
  } catch (error) {
    log.error({ error }, 'Failed to cleanup worktree');
    return NextResponse.json(
      { error: 'Failed to cleanup worktree' },
      { status: 500 }
    );
  }
}
