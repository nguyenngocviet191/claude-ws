/**
 * Unit tests for bin/lib/db.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');

// Mock config module
jest.mock('../config', () => {
  const mockPath = require('path');
  return {
    resolve: jest.fn(() => ({
      port: 8556,
      host: 'localhost',
      dataDir: mockPath.join(__dirname, 'test-data'),
      logDir: mockPath.join(__dirname, 'test-data', 'logs'),
    })),
  };
});

describe('db module', () => {
  const testDataDir = path.join(__dirname, 'test-data');

  beforeEach(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
    // Initialize fresh database
    db.init();
  });

  afterEach(() => {
    db.close();
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true });
    }
  });

  describe('generateId', () => {
    it('should generate a unique ID of 16 characters', () => {
      const id1 = db.generateId();
      const id2 = db.generateId();

      expect(id1).toHaveLength(16);
      expect(id2).toHaveLength(16);
      expect(id1).not.toBe(id2);
    });

    it('should contain only alphanumeric characters', () => {
      const id = db.generateId();
      expect(id).toMatch(/^[0-9A-Za-z]{16}$/);
    });
  });

  describe('Project operations', () => {
    it('should create a new project', () => {
      const project = db.createProject({
        name: 'test-project',
        path: '/path/to/project',
      });

      expect(project).toBeDefined();
      expect(project.name).toBe('test-project');
      expect(project.path).toBe('/path/to/project');
      expect(project.id).toBeDefined();
      expect(project.created_at).toBeDefined();
    });

    it('should get a project by ID', () => {
      const created = db.createProject({
        name: 'test-project',
        path: '/path/to/project',
      });

      const found = db.getProjectById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.name).toBe('test-project');
    });

    it('should get a project by path', () => {
      const created = db.createProject({
        name: 'test-project',
        path: '/path/to/project',
      });

      const found = db.getProjectByPath('/path/to/project');

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
    });

    it('should get all projects', () => {
      db.createProject({ name: 'project-1', path: '/path/1' });
      db.createProject({ name: 'project-2', path: '/path/2' });

      const projects = db.getProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0].name).toBe('project-2'); // Sorted by created_at DESC
      expect(projects[1].name).toBe('project-1');
    });

    it('should find project by directory path', () => {
      db.createProject({ name: 'test-project', path: '/path/to/project' });

      const found = db.getProject('/path/to/project');

      expect(found).not.toBeNull();
      expect(found.name).toBe('test-project');
    });

    it('should delete a project', () => {
      const created = db.createProject({
        name: 'test-project',
        path: '/path/to/project',
      });

      const deleted = db.deleteProject(created.id);
      const found = db.getProjectById(created.id);

      expect(deleted).toBe(true);
      expect(found).toBeNull();
    });

    it('should return null for non-existent project', () => {
      const found = db.getProjectById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('Task operations', () => {
    let project;

    beforeEach(() => {
      project = db.createProject({ name: 'test-project', path: '/path/to/project' });
    });

    it('should create a new task', () => {
      const task = db.createTask({
        project_id: project.id,
        title: 'Test task',
        description: 'Test description',
      });

      expect(task).toBeDefined();
      expect(task.project_id).toBe(project.id);
      expect(task.title).toBe('Test task');
      expect(task.description).toBe('Test description');
      expect(task.status).toBe('todo');
      expect(task.position).toBe(1);
    });

    it('should get tasks for a project', () => {
      db.createTask({ project_id: project.id, title: 'Task 1' });
      db.createTask({ project_id: project.id, title: 'Task 2' });

      const tasks = db.getTasks(project.id);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    it('should get task by ID', () => {
      const created = db.createTask({ project_id: project.id, title: 'Test task' });

      const found = db.getTaskById(created.id);

      expect(found).not.toBeNull();
      expect(found.id).toBe(created.id);
      expect(found.title).toBe('Test task');
    });

    it('should get task by title', () => {
      db.createTask({ project_id: project.id, title: 'Test task' });

      const found = db.getTaskByTitle(project.id, 'Test task');

      expect(found).not.toBeNull();
      expect(found.title).toBe('Test task');
    });

    it('should filter tasks by status', () => {
      db.createTask({ project_id: project.id, title: 'Task 1' });
      const task2 = db.createTask({ project_id: project.id, title: 'Task 2' });
      db.updateTaskStatus(task2.id, 'in_progress');

      const todoTasks = db.getTasks(project.id, 'todo');
      const inProgressTasks = db.getTasks(project.id, 'in_progress');

      expect(todoTasks).toHaveLength(1);
      expect(todoTasks[0].title).toBe('Task 1');
      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].title).toBe('Task 2');
    });

    it('should delete a task', () => {
      const created = db.createTask({ project_id: project.id, title: 'Test task' });

      const deleted = db.deleteTask(created.id);
      const found = db.getTaskById(created.id);

      expect(deleted).toBe(true);
      expect(found).toBeNull();
    });

    it('should increment task position', () => {
      db.createTask({ project_id: project.id, title: 'Task 1' });
      const task2 = db.createTask({ project_id: project.id, title: 'Task 2' });
      const task3 = db.createTask({ project_id: project.id, title: 'Task 3' });

      expect(task2.position).toBe(2);
      expect(task3.position).toBe(3);
    });
  });

  describe('findProjectByDir', () => {
    it('should find project by exact path', () => {
      db.createProject({ name: 'test-project', path: '/path/to/project' });

      const found = db.findProjectByDir('/path/to/project');

      expect(found).not.toBeNull();
      expect(found.name).toBe('test-project');
    });

    it('should find project by parent path', () => {
      db.createProject({ name: 'test-project', path: '/path/to/project' });

      const found = db.findProjectByDir('/path/to/project/subdir');

      expect(found).not.toBeNull();
      expect(found.name).toBe('test-project');
    });

    it('should return null when no project matches', () => {
      const found = db.findProjectByDir('/non/existent/path');
      expect(found).toBeNull();
    });
  });
});
