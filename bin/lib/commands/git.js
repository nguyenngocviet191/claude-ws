/**
 * `claude-ws git <subcommand>` — Git checkpoint management.
 *
 * Subcommands:
 *   snapshot    Create a git checkpoint commit for the current project
 *   rewind <id> Reset to a specific checkpoint state
 *   list        Show the history of checkpoints created by claude-ws
 */

const { db } = require('../db');

/**
 * Format a timestamp for display.
 * @param {number} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

/**
 * Truncate text for display.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncate(text, maxLength) {
  if (!text) return '-';
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
}

/**
 * Run the git snapshot subcommand.
 */
async function runSnapshot(options = {}) {
  const { projectId } = options;

  if (!projectId) {
    console.error('[claude-ws] Error: Project ID is required.');
    process.exit(1);
  }

  // Get the latest task for the project
  const tasks = db.getTasks(projectId);
  if (tasks.length === 0) {
    console.error('[claude-ws] Error: No tasks found for this project.');
    process.exit(1);
  }

  // Find the most recent in_progress task
  const activeTask = tasks.find((t) => t.status === 'in_progress') || tasks[0];
  if (!activeTask) {
    console.error('[claude-ws] Error: No active task found for snapshot.');
    process.exit(1);
  }

  // Get the latest attempt
  const attempt = db.getLatestAttempt(activeTask.id);
  if (!attempt) {
    console.error('[claude-ws] Error: No attempts found for task.');
    process.exit(1);
  }

  console.log(`[claude-ws] Creating checkpoint for task: ${activeTask.title}`);
  console.log(`[claude-ws] Attempt ID: ${attempt.id}`);
  console.log('');
  console.log('[claude-ws] Note: Checkpoint creation requires daemon to be running.');
  console.log('[claude-ws] Use the web UI to create checkpoints, or implement API integration.');
  console.log('');
  process.exit(0);
}

/**
 * Run the git rewind subcommand.
 * @param {string} checkpointId
 */
async function runRewind(checkpointId) {
  if (!checkpointId) {
    console.error('[claude-ws] Error: Checkpoint ID is required.');
    console.error('Usage: claude-ws git rewind <checkpoint-id>');
    process.exit(1);
  }

  const checkpoint = db.getCheckpointById(checkpointId);
  if (!checkpoint) {
    console.error(`[claude-ws] Error: Checkpoint not found: ${checkpointId}`);
    console.error('[claude-ws] Use "claude-ws git list" to see available checkpoints.');
    process.exit(1);
  }

  console.log(`[claude-ws] Rewinding to checkpoint: ${checkpointId}`);
  console.log(`[claude-ws] Summary: ${truncate(checkpoint.summary, 50)}`);
  console.log(`[claude-ws] Git commit: ${checkpoint.git_commit_hash || 'N/A'}`);
  console.log('');
  console.log('[claude-ws] Note: Rewinding requires daemon to be running.');
  console.log('[claude-ws] Use the web UI to rewind to checkpoints, or implement API integration.');
  console.log('');
  process.exit(0);
}

/**
 * Run the git list subcommand.
 * @param {object} options
 */
async function runList(options = {}) {
  const { projectId } = options;

  if (!projectId) {
    console.error('[claude-ws] Error: Project ID is required.');
    process.exit(1);
  }

  // Get all tasks for the project
  const tasks = db.getTasks(projectId);
  if (tasks.length === 0) {
    console.log('[claude-ws] No tasks found for this project.');
    console.log('[claude-ws] Checkpoints are created automatically during task execution.');
    process.exit(0);
  }

  // Collect checkpoints from all tasks
  let checkpoints = [];
  for (const task of tasks) {
    const taskCheckpoints = db.getCheckpoints(task.id);
    checkpoints = checkpoints.concat(
      taskCheckpoints.map((cp) => ({ ...cp, taskTitle: task.title }))
    );
  }

  if (checkpoints.length === 0) {
    console.log('[claude-ws] No checkpoints found for this project.');
    console.log('[claude-ws] Checkpoints are created automatically during task execution.');
    process.exit(0);
  }

  // Sort by creation date (newest first)
  checkpoints.sort((a, b) => b.created_at - a.created_at);

  console.log('Checkpoints:');
  console.log('');

  // Find the maximum column widths for formatting
  const idWidth = Math.max(8, ...checkpoints.map((c) => c.id.length));
  const summaryWidth = 50;

  // Print header
  const header = `${'ID'.padEnd(idWidth)}  ${'Summary'.padEnd(summaryWidth)}  ${'Created'.padEnd(12)}  ${'Git Hash'}`;
  console.log(header);
  console.log('='.repeat(header.length));

  // Print checkpoints
  for (const checkpoint of checkpoints) {
    const id = checkpoint.id.padEnd(idWidth);
    const summary = truncate(checkpoint.summary, summaryWidth).padEnd(summaryWidth);
    const created = formatDate(checkpoint.created_at);
    const gitHash = checkpoint.git_commit_hash || '-';
    console.log(`${id}  ${summary}  ${created}  ${gitHash}`);
  }

  console.log('');
  console.log(`Total: ${checkpoints.length} checkpoint(s)`);
  console.log('');
  console.log('[claude-ws] Rewind to a checkpoint:');
  console.log('[claude-ws]   claude-ws git rewind <checkpoint-id>');

  process.exit(0);
}

/**
 * Run the git command.
 * @param {string[]} argv
 */
async function run(argv) {
  const [subcommand, ...args] = argv;

  if (!subcommand) {
    console.error('[claude-ws] Error: Git subcommand is required.');
    console.error('');
    console.error('Usage: claude-ws git <subcommand>');
    console.error('');
    console.error('Subcommands:');
    console.error('  snapshot    Create a git checkpoint commit for the current project');
    console.error('  rewind <id> Reset to a specific checkpoint state');
    console.error('  list        Show the history of checkpoints created by claude-ws');
    process.exit(1);
  }

  // Find the current project
  const project = db.findProjectByDir(process.cwd());

  if (!project) {
    console.error('[claude-ws] Error: No project found for current directory.');
    console.error('[claude-ws] Are you in a registered project directory?');
    process.exit(1);
  }

  switch (subcommand) {
    case 'snapshot':
      await runSnapshot({ projectId: project.id });
      break;
    case 'rewind':
      await runRewind(args[0]);
      break;
    case 'list':
      await runList({ projectId: project.id });
      break;
    default:
      console.error(`[claude-ws] Error: Unknown git subcommand: ${subcommand}`);
      console.error('[claude-ws] Use "claude-ws git" to see available subcommands.');
      process.exit(1);
  }
}

module.exports = { run };
