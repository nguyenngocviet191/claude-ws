/**
 * `claude-ws tasks [status]` — List tasks for the current project.
 */

const { db } = require('../db');

/**
 * Format task status for display.
 * @param {string} status
 * @returns {string}
 */
function formatStatus(status) {
  const statusMap = {
    todo: 'TODO',
    in_progress: 'IN PROGRESS',
    in_review: 'IN REVIEW',
    done: 'DONE',
    cancelled: 'CANCELLED',
  };
  return statusMap[status] || status.toUpperCase();
}

/**
 * Get a symbol for task status.
 * @param {string} status
 * @returns {string}
 */
function getStatusSymbol(status) {
  const symbolMap = {
    todo: 'o',
    in_progress: 'o',
    in_review: 'o',
    done: 'o',
    cancelled: 'x',
  };
  return symbolMap[status] || '?';
}

/**
 * Format a timestamp for display.
 * @param {number} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

/**
 * Run the tasks command.
 * @param {string[]} argv
 */
async function run(argv) {
  const [statusFilter] = argv;

  // Find the current project
  const project = db.findProjectByDir(process.cwd());

  if (!project) {
    console.error('[claude-ws] Error: No project found for current directory.');
    console.error('[claude-ws] Are you in a registered project directory?');
    process.exit(1);
  }

  // Get tasks for the project
  const tasks = db.getTasks(project.id, statusFilter);

  if (tasks.length === 0) {
    console.log(`[claude-ws] No tasks found${statusFilter ? ' with status: ' + statusFilter : ''} for project: ${project.name}.`);
    console.log('[claude-ws] Add a new task:');
    console.log('[claude-ws]   claude-ws add-task <title> [description]');
    process.exit(0);
  }

  console.log(`Tasks for: ${project.name}`);
  if (statusFilter) {
    console.log(`Status: ${formatStatus(statusFilter)}`);
  }
  console.log('');

  // Find the maximum column widths for formatting
  const idWidth = Math.max(8, ...tasks.map((t) => t.id.length));
  const statusWidth = Math.max(15, ...tasks.map((t) => formatStatus(t.status).length));
  const titleWidth = Math.max(40, ...tasks.map((t) => t.title.length));

  // Print header
  const header = `${'ID'.padEnd(idWidth)}  ${getStatusSymbol(statusFilter) || ''} ${'Status'.padEnd(statusWidth)}  ${'Title'.padEnd(titleWidth)}  ${'Created'.padEnd(12)}`;
  console.log(header);
  console.log('='.repeat(header.length));

  // Print tasks
  for (const task of tasks) {
    const id = task.id.padEnd(idWidth);
    const symbol = getStatusSymbol(task.status);
    const status = formatStatus(task.status).padEnd(statusWidth);
    const title = task.title.length > titleWidth ? task.title.substring(0, titleWidth - 3) + '...' : task.title;
    const created = formatDate(task.created_at);
    console.log(`${id}  ${symbol} ${status}  ${title}  ${created}`);
  }

  console.log('');
  console.log(`Total: ${tasks.length} task(s)`);
  console.log('');
  console.log('[claude-ws] Run a task:');
  console.log('[claude-ws]   claude-ws run-task <task-id>');

  process.exit(0);
}

module.exports = { run };
