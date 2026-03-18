/**
 * `claude-ws projects` — List all registered projects.
 */

const { db } = require('../db');

function formatDate(timestamp) {
  return new Date(timestamp).toISOString().split('T')[0];
}

async function run(argv) {
  const projects = db.getProjects();

  if (projects.length === 0) {
    console.log('[claude-ws] No projects registered.');
    console.log('[claude-ws] Use "claude-ws create <name> [path]" to register a project.');
    process.exit(0);
  }

  console.log('Registered Projects:');
  console.log('');

  const idWidth = Math.max(8, ...projects.map((p) => p.id.length));
  const nameWidth = Math.max(10, ...projects.map((p) => p.name.length));

  const header = 'ID'.padEnd(idWidth) + '  ' + 'Name'.padEnd(nameWidth) + '  ' + 'Created'.padEnd(12);
  console.log(header);
  console.log('='.repeat(header.length));

  for (const project of projects) {
    const id = project.id.padEnd(idWidth);
    const name = project.name.padEnd(nameWidth);
    const created = formatDate(project.created_at);
    console.log(id + '  ' + name + '  ' + created);
  }

  console.log('');
  console.log('Total: ' + projects.length + ' project(s)');

  process.exit(0);
}

module.exports = { run };
