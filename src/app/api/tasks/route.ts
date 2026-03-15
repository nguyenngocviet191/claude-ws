import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { TaskStatus } from '@/types';
import { createTaskService } from '@agentic-sdk/services/task-crud-and-reorder-service';
import { createWorktreeForTask, removeWorktreeForTask } from '@/lib/git-worktree-manager';

const taskService = createTaskService(db);

// GET /api/tasks - List tasks
// Query params:
//   ?projectId=xxx - Single project (backward compat)
//   ?projectIds=id1,id2,id3 - Multiple projects
//   ?status=in_review - Filter by status (single or comma-separated)
//   No params - All tasks
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const projectIds = searchParams.get('projectIds');
    const statusParam = searchParams.get('status');

    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    let statuses: string[] | undefined;
    if (statusParam) {
      statuses = statusParam.split(',').filter((s): s is TaskStatus => validStatuses.includes(s as TaskStatus));
      if (statuses.length === 0) statuses = undefined;
    }

    let projectIdsList: string[] | undefined;
    if (projectIds) {
      projectIdsList = projectIds.split(',').filter(Boolean);
      if (projectIdsList.length === 0) projectIdsList = undefined;
    }

    const tasks = await taskService.listFiltered({
      projectId: projectIdsList ? undefined : (projectId || undefined),
      projectIds: projectIdsList,
      statuses,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, title, description, status, useWorktree } = body;

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'projectId and title are required' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled'];
    const taskStatus: TaskStatus = status && validStatuses.includes(status) ? status : 'todo';

    // Create task first to get taskId
    let newTask = await taskService.create({ projectId, title, description, status: taskStatus });

    // Handle worktree creation if requested
    if (useWorktree) {
      try {
        // Fetch project path from database
        const project = await db.query.projects.findFirst({
          where: eq(schema.projects.id, projectId),
        });

        if (!project) {
          // Rollback: delete the task we just created
          await taskService.remove(newTask.id);
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
          );
        }

        // Create worktree for the task
        const worktreeResult = await createWorktreeForTask({
          taskId: newTask.id,
          projectPath: project.path,
        });

        if (!worktreeResult.success) {
          // Rollback: delete the task if worktree creation failed
          await taskService.remove(newTask.id);
          console.error('Failed to create worktree:', worktreeResult.error);
          return NextResponse.json(
            { error: worktreeResult.error || 'Failed to create worktree' },
            { status: 500 }
          );
        }

        // Update task with worktree path
        newTask = await taskService.update(newTask.id, {
          useWorktree: true,
          worktreePath: worktreeResult.worktreePath,
        });
      } catch (error) {
        // Rollback: delete the task if any error occurs during worktree creation
        await taskService.remove(newTask.id);
        console.error('Error during worktree creation:', error);
        return NextResponse.json(
          { error: 'Failed to create worktree' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create task:', error);

    // Handle foreign key constraint (invalid projectId)
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
