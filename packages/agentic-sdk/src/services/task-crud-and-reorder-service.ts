/**
 * Task CRUD service - list, get, create, update, delete, reorder tasks and fetch attempt/conversation data
 */
import { eq, and, desc, inArray } from 'drizzle-orm';
import * as schema from '../db/database-schema';
import { generateId } from '../lib/nanoid-id-generator';
import { createWorktreeForTask } from '../lib/git-worktree-manager';

export function createTaskService(db: any) {
  return {
    async list(projectId?: string) {
      const query = db.select().from(schema.tasks);
      if (projectId) {
        return query.where(eq(schema.tasks.projectId, projectId))
          .orderBy(schema.tasks.status, schema.tasks.position)
          .all();
      }
      return query.orderBy(schema.tasks.status, schema.tasks.position).all();
    },

    async getById(id: string) {
      return db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    },

    async create(data: { projectId: string; title: string; description?: string; status?: string; useWorktree?: boolean; worktreePath?: string }) {
      const status = data.status || 'todo';
      // Get highest position for this status in this project
      const existing = await db.select().from(schema.tasks)
        .where(and(eq(schema.tasks.projectId, data.projectId), eq(schema.tasks.status, status as any)))
        .orderBy(desc(schema.tasks.position))
        .limit(1);
      const position = existing.length > 0 ? existing[0].position + 1 : 0;

      const id = generateId('task');
      const now = Date.now();
      const task = {
        id,
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        status: status as any,
        position,
        useWorktree: data.useWorktree ?? false,
        worktreePath: data.worktreePath || null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(schema.tasks).values(task);
      return task;
    },

    /**
     * Create task with optional worktree creation.
     * If useWorktree is true, creates a git worktree for the task before creating the task record.
     * @param data - Task data including projectId, title, description, status, useWorktree
     * @param projectPath - Path to the project directory (required if useWorktree is true)
     * @returns Created task with worktreePath if worktree was created
     * @throws Error if worktree creation fails
     */
    async createWithWorktree(
      data: { projectId: string; title: string; description?: string; status?: string; useWorktree?: boolean },
      projectPath?: string
    ) {
      // First, create the task to get the taskId
      const newTask = await this.create(data);

      // Handle worktree creation if requested
      if (data.useWorktree) {
        if (!projectPath) {
          // Rollback: delete the task we just created
          await this.remove(newTask.id);
          throw new Error('projectPath is required when useWorktree is true');
        }

        // Create worktree for the task
        const worktreeResult = await createWorktreeForTask({
          taskId: newTask.id,
          projectPath,
        });

        if (!worktreeResult.success) {
          // Rollback: delete the task if worktree creation failed
          await this.remove(newTask.id);
          throw new Error(worktreeResult.error || 'Failed to create worktree');
        }

        // Update task with worktree path
        return await this.update(newTask.id, {
          useWorktree: true,
          worktreePath: worktreeResult.worktreePath,
        });
      }

      return newTask;
    },

    async update(id: string, data: Partial<schema.Task>) {
      const updates = { ...data, updatedAt: Date.now() };
      await db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, id));
      return db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).get();
    },

    async remove(id: string) {
      await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
    },

    async reorder(taskId: string, newPosition: number, newStatus?: string) {
      const updates: any = { position: newPosition, updatedAt: Date.now() };
      if (newStatus) updates.status = newStatus;
      await db.update(schema.tasks).set(updates).where(eq(schema.tasks.id, taskId));
      return db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId)).get();
    },

    async getAttempts(taskId: string) {
      return db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(desc(schema.attempts.createdAt))
        .all();
    },

    async listFiltered(opts?: { projectId?: string; projectIds?: string[]; statuses?: string[] }) {
      const conditions: any[] = [];
      if (opts?.projectIds?.length) {
        conditions.push(inArray(schema.tasks.projectId, opts.projectIds));
      } else if (opts?.projectId) {
        conditions.push(eq(schema.tasks.projectId, opts.projectId));
      }
      if (opts?.statuses?.length) {
        conditions.push(inArray(schema.tasks.status, opts.statuses as any));
      }
      const whereClause = conditions.length > 0
        ? conditions.length === 1 ? conditions[0] : and(...conditions)
        : undefined;
      return db.select().from(schema.tasks)
        .where(whereClause)
        .orderBy(schema.tasks.status, schema.tasks.position)
        .all();
    },

    async getAttemptsAsc(taskId: string) {
      return db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(schema.attempts.createdAt)
        .all();
    },

    async getConversation(taskId: string) {
      const attempts = await db.select().from(schema.attempts)
        .where(eq(schema.attempts.taskId, taskId))
        .orderBy(desc(schema.attempts.createdAt))
        .limit(1);
      if (!attempts.length) return [];
      const attemptId = attempts[0].id;
      return db.select().from(schema.attemptLogs)
        .where(eq(schema.attemptLogs.attemptId, attemptId))
        .orderBy(schema.attemptLogs.createdAt)
        .all();
    },
  };
}
