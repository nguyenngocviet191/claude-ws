/**
 * `claude-ws add-task <title> [description]` — Add a new task to the current project.
 */

const { db } = require('../db');

/**
 * Run the add-task command.
 * @param {string[]} argv
 */
async function run(argv) {
  const [title, ...descriptionParts] = argv;

  if (!title) {
    console.error('[claude-ws] Error: Task title is required.');
    console.error('Usage: claude-ws add-task <title> [description]');
    process.exit(1);
  }

  const description = descriptionParts.length > 0 ? descriptionParts.join(' ') : null;

  // Find the current project
  const project = db.findProjectByDir(process.cwd());

  if (!project) {
    console.error('[claude-ws] Error: No project found for current directory.');
    console.error('[claude-ws] Are you in a registered project directory?');
    process.exit(1);
  }

  // Create the task
  const task = db.createTask({
    project_id: project.id,
    title,
    description,
  });

  console.log('[claude-ws] Task created successfully.');
  console.log('[claude-ws] Title: ' + task.title);
  console.log('[claude-ws] ID: ' + task.id);
  console.log('[claude-ws] Status: ' + task.status);
  console.log('[claude-ws] Project: ' + project.name);
  console.log('');
  console.log('[claude-ws] Run this task:');
  console.log('[claude-ws]   claude-ws run-task ' + task.id);

  process.exit(0);
}

module.exports = { run };
