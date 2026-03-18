/**
 * `claude-ws create <name> [path]` — Register a new project in the workspace.
 */

const { db } = require('../db');
const fs = require('fs');
const path = require('path');

/**
 * Run the create command.
 * @param {string[]} argv
 */
async function run(argv) {
  const [name, givenPath] = argv;

  if (!name) {
    console.error('[claude-ws] Error: Project name is required.');
    console.error('Usage: claude-ws create <name> [path]');
    process.exit(1);
  }

  // Normalize the project path
  const projectPath = path.resolve(givenPath || process.cwd());

  // Check if directory exists
  if (!fs.existsSync(projectPath)) {
    console.error(`[claude-ws] Error: Directory does not exist: ${projectPath}`);
    process.exit(1);
  }

  // Check if CLAUDE.md exists
  const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    console.warn('[claude-ws] Warning: No CLAUDE.md found in ' + projectPath);
    console.warn('[claude-ws] The project will be registered without a CLAUDE.md file.');
  }

  // Check if project already exists
  const existingProject = db.getProjectByPath(projectPath);
  if (existingProject) {
    console.error(`[claude-ws] Error: Project already registered at ${projectPath}`);
    console.error(`[claude-ws] Existing project: ${existingProject.name} (ID: ${existingProject.id})`);
    process.exit(1);
  }

  // Create the project
  const project = db.createProject({ name, path: projectPath });

  console.log('[claude-ws] Project created successfully.');
  console.log('[claude-ws] Name: ' + project.name);
  console.log('[claude-ws] ID: ' + project.id);
  console.log('[claude-ws] Path: ' + project.path);
  console.log('');
  console.log('[claude-ws] Open this project in the browser:');
  console.log('[claude-ws]   claude-ws open ' + project.id);

  process.exit(0);
}

module.exports = { run };
