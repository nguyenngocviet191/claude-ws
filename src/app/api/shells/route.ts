import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createShellService } from '@agentic-sdk/services/shell-process-db-tracking-service';
import { shellManager } from '@/lib/shell-manager';
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth';

const shellService = createShellService(db);

// GET /api/shells?projectId=xxx - List shells for a project
export async function GET(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const shells = await shellService.list(projectId);

    // Map to frontend format
    const shellInfos = shells.map((s: any) => ({
      shellId: s.id,
      projectId: s.projectId,
      attemptId: s.attemptId || '',
      command: s.command,
      pid: s.pid || 0,
      startedAt: s.createdAt,
      isRunning: s.status === 'running',
      exitCode: s.exitCode,
    }));

    return NextResponse.json(shellInfos);
  } catch (error) {
    console.error('Failed to fetch shells:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shells' },
      { status: 500 }
    );
  }
}

// POST /api/shells - Spawn a new shell process
export async function POST(request: NextRequest) {
  try {
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { projectId, command, cwd, attemptId } = body;

    if (!projectId || !command || !cwd) {
      return NextResponse.json(
        { error: 'projectId, command, and cwd are required' },
        { status: 400 }
      );
    }

    // 1. Spawn the actual process
    const shellId = shellManager.spawn({
      projectId,
      attemptId: attemptId || 'manual',
      command,
      cwd
    });

    const instance = shellManager.getShell(shellId);
    if (!instance) {
      return NextResponse.json({ error: 'Failed to spawn shell' }, { status: 500 });
    }

    // 2. Create DB record for tracking
    await shellService.create({
      projectId,
      attemptId: attemptId || undefined,
      command,
      cwd,
      pid: instance.pid
    });

    return NextResponse.json({
      shellId,
      pid: instance.pid,
      status: 'running'
    });
  } catch (error) {
    console.error('Failed to spawn shell:', error);
    return NextResponse.json(
      { error: 'Failed to spawn shell: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
