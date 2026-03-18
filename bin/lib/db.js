/**
 * Database module for CLI commands
 * Provides a simplified API for SQLite operations using better-sqlite3
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');

let db = null;

/**
 * Initialize the database connection
 */
function init() {
  const { resolve } = require('./config');
  const { dataDir } = resolve();
  const dbPath = path.join(dataDir, 'claude-ws.db');

  db = new Database(dbPath);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled')),
      position INTEGER NOT NULL,
      chat_init INTEGER NOT NULL DEFAULT 0,
      rewind_session_id TEXT,
      rewind_message_uuid TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, status, position);
  `);
}

/**
 * Close the database connection
 */
function close() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Generate a unique 16-character ID
 */
function generateId() {
  return nanoid(16);
}

/**
 * Create a new project
 */
function createProject({ name, path: projectPath }) {
  if (!db) init();

  const id = generateId();
  const createdAt = Date.now();

  const stmt = db.prepare(
    'INSERT INTO projects (id, name, path, created_at) VALUES (?, ?, ?, ?)'
  );

  stmt.run(id, name, projectPath, createdAt);

  return { id, name, path: projectPath, created_at: createdAt };
}

/**
 * Get a project by ID
 */
function getProjectById(id) {
  if (!db) init();

  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * Get a project by path
 */
function getProjectByPath(projectPath) {
  if (!db) init();

  const stmt = db.prepare('SELECT * FROM projects WHERE path = ?');
  return stmt.get(projectPath) || null;
}

/**
 * Get all projects (sorted by created_at DESC)
 */
function getProjects() {
  if (!db) init();

  const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
  return stmt.all();
}

/**
 * Get a project by path (alias for getProjectByPath)
 */
function getProject(projectPath) {
  return getProjectByPath(projectPath);
}

/**
 * Find a project by directory path
 * Returns the project if the path is exactly the project path or a subdirectory
 */
function findProjectByDir(dirPath) {
  if (!db) init();

  const projects = getProjects();

  for (const project of projects) {
    // Exact match
    if (project.path === dirPath) {
      return project;
    }

    // Check if dirPath is a subdirectory of project.path
    // Normalize paths to handle different path separators
    const normalizedProjectPath = project.path.replace(/\\/g, '/');
    const normalizedDirPath = dirPath.replace(/\\/g, '/');

    if (normalizedDirPath.startsWith(normalizedProjectPath + '/')) {
      return project;
    }
  }

  return null;
}

/**
 * Delete a project
 */
function deleteProject(id) {
  if (!db) init();

  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Create a new task
 */
function createTask({ project_id, title, description }) {
  if (!db) init();

  // Get the next position for this project
  const positionStmt = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?');
  const { count } = positionStmt.get(project_id);
  const position = count + 1;

  const id = generateId();
  const createdAt = Date.now();

  const stmt = db.prepare(
    `INSERT INTO tasks (id, project_id, title, description, status, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  stmt.run(id, project_id, title, description, 'todo', position, createdAt, createdAt);

  return {
    id,
    project_id,
    title,
    description,
    status: 'todo',
    position,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

/**
 * Get tasks for a project
 */
function getTasks(projectId, statusFilter = null) {
  if (!db) init();

  let stmt;
  if (statusFilter) {
    stmt = db.prepare(
      'SELECT * FROM tasks WHERE project_id = ? AND status = ? ORDER BY position ASC'
    );
    return stmt.all(projectId, statusFilter);
  } else {
    stmt = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC');
    return stmt.all(projectId);
  }
}

/**
 * Get a task by ID
 */
function getTaskById(id) {
  if (!db) init();

  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * Get a task by title
 */
function getTaskByTitle(projectId, title) {
  if (!db) init();

  const stmt = db.prepare('SELECT * FROM tasks WHERE project_id = ? AND title = ?');
  return stmt.get(projectId, title) || null;
}

/**
 * Update task status
 */
function updateTaskStatus(id, status) {
  if (!db) init();

  const stmt = db.prepare(
    'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?'
  );

  const now = Date.now();
  const result = stmt.run(status, now, id);
  return result.changes > 0;
}

/**
 * Delete a task
 */
function deleteTask(id) {
  if (!db) init();

  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

module.exports = {
  db: {
    init,
    close,
    generateId,
    createProject,
    getProjectById,
    getProjectByPath,
    getProjects,
    getProject,
    findProjectByDir,
    deleteProject,
    createTask,
    getTasks,
    getTaskById,
    getTaskByTitle,
    updateTaskStatus,
    deleteTask,
  },
  init,
  close,
  generateId,
  createProject,
  getProjectById,
  getProjectByPath,
  getProjects,
  getProject,
  findProjectByDir,
  deleteProject,
  createTask,
  getTasks,
  getTaskById,
  getTaskByTitle,
  updateTaskStatus,
  deleteTask,
};
