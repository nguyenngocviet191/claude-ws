/**
 * `claude-ws open [path-or-id]` — Open browser to the running instance or a specific project.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { db } = require('../db');

/**
 * Open a URL in the default browser (cross-platform).
 * @param {string} url
 */
function openUrl(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`[claude-ws] Could not open browser. Visit: ${url}`);
    }
  });
}

/**
 * Run the open command.
 * @param {string[]} argv
 */
async function run(argv) {
  const [pathOrId] = argv;

  // If no argument provided, open the main dashboard
  if (!pathOrId) {
    const { running, pid } = require('../daemon').checkRunning();

    if (!running) {
      console.log('[claude-ws] No running daemon found.');
      console.log('[claude-ws] Start one first: claude-ws start');
      process.exit(1);
    }

    const conf = config.resolve();
    const url = `http://${conf.host}:${conf.port}`;

    console.log(`[claude-ws] Opening ${url} (PID ${pid})`);
    openUrl(url);

    process.exit(0);
  }

  // If path or ID is provided, try to open a specific project
  const project = db.getProject(pathOrId);
  if (!project) {
    project = db.getProjectByPath(pathOrId);
  }

  if (!project) {
    console.log(`[claude-ws] No project found for: ${pathOrId}`);
    console.log('[claude-ws] Use "claude-ws git list" to see available projects.');
    process.exit(1);
  }

  const conf = config.resolve();
  const url = `http://${conf.host}:${conf.port}/project/${project.id}`;

  console.log(`[claude-ws] Opening project: ${project.name} (${project.id})`);
  console.log(`[claude-ws] URL: ${url}`);

  // Start daemon if not running
  const { running } = require('../daemon').checkRunning();
  if (!running) {
    console.log('[claude-ws] Daemon not running, starting...');
    const startCmd = require('./start');
    startCmd.run(['--no-open']);
  }

  // Wait a moment for daemon to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  openUrl(url);

  process.exit(0);
}

module.exports = { run, openUrl };
