/**
 * `claude-ws run-task <task-id-or-title> [prompt]` — Start an agent attempt for a task.
 */

const config = require('../config');
const { db } = require('../db');
const socketClient = require('../socket-client');

/**
 * Run the run-task command.
 * @param {string[]} argv
 */
async function run(argv) {
  const [taskIdentifier, ...promptParts] = argv;

  if (!taskIdentifier) {
    console.error('[claude-ws] Error: Task ID or title is required.');
    console.error('Usage: claude-ws run-task <task-id-or-title> [prompt]');
    process.exit(1);
  }

  const prompt = promptParts.length > 0 ? promptParts.join(' ') : null;

  // Find the current project
  const project = db.findProjectByDir(process.cwd());

  if (!project) {
    console.error('[claude-ws] Error: No project found for current directory.');
    console.error('[claude-ws] Are you in a registered project directory?');
    process.exit(1);
  }

  // Find the task by ID or title
  const task = db.getTask(project.id, taskIdentifier);

  if (!task) {
    console.error(`[claude-ws] Error: Task not found: ${taskIdentifier}`);
    console.error('');
    console.error('[claude-ws] List tasks for this project:');
    console.error('[claude-ws]   claude-ws tasks');
    process.exit(1);
  }

  // Check if daemon is running
  const conf = config.resolve();
  const isHealthy = await socketClient.checkHealth(conf.host, conf.port, 5000);

  if (!isHealthy) {
    console.error('[claude-ws] Error: Daemon is not running.');
    console.error('');
    console.error('[claude-ws] Start daemon first:');
    console.error('[claude-ws]   claude-ws start');
    process.exit(1);
  }

  // Run the task
  console.log(`[claude-ws] Running task: ${task.title}`);
  console.log(`[claude-ws] Task ID: ${task.id}`);
  console.log('[claude-ws] Connecting to daemon...');
  console.log('');

  try {
    const result = await socketClient.runTask({
      host: conf.host,
      port: conf.port,
      taskId: task.id,
      prompt,
      interactive: true,
    });

    if (result.success) {
      console.log('');
      console.log('[claude-ws] Task completed successfully.');
      process.exit(0);
    } else {
      console.error(`[claude-ws] Task failed: ${result.error}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[claude-ws] Error running task: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { run };
