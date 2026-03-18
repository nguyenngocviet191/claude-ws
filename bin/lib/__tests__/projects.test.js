/**
 * Unit tests for bin/lib/commands/projects.js
 */

// Mock db module BEFORE requiring the module under test
jest.mock('../db', () => ({
  db: {
    getProjects: jest.fn(),
  },
}));

const { run } = require('../commands/projects');
const { db: mockDb } = require('../db');

// Mock console.log
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock process.exit
let exitCode = null;
const originalExit = process.exit;

beforeAll(() => {
  Object.defineProperty(process, 'exit', {
    value: jest.fn((code) => {
      exitCode = code;
    }),
    writable: true,
  });
});

afterAll(() => {
  process.exit = originalExit;
});

describe('projects command', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
    process.exit.mockClear();
    exitCode = null;
    mockDb.getProjects.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockReset();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  describe('when no projects exist', () => {
    it('should display no projects message', async () => {
      mockDb.getProjects.mockReturnValue([]);

      await run([]);

      expect(mockDb.getProjects).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('[claude-ws] No projects registered.');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[claude-ws] Use "claude-ws create <name> [path]" to register a project.'
      );
      expect(exitCode).toBe(0);
    });
  });

  describe('when projects exist', () => {
    it('should display projects table', async () => {
      const mockProjects = [
        {
          id: 'abc123456789012',
          name: 'test-project',
          path: '/path/to/project',
          created_at: 1640000000000,
        },
      ];

      mockDb.getProjects.mockReturnValue(mockProjects);

      await run([]);

      expect(mockDb.getProjects).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Registered Projects:');
      expect(consoleLogSpy).toHaveBeenCalledWith('');
      expect(consoleLogSpy).toHaveBeenCalledWith('Total: 1 project(s)');
      expect(exitCode).toBe(0);
    });

    it('should adjust column widths based on data', async () => {
      const mockProjects = [
        { id: 'short', name: 'a', path: '/p1', created_at: 1640000000000 },
        { id: 'very-long-id-12345', name: 'very-long-project-name', path: '/p2', created_at: 1640000000000 },
      ];

      mockDb.getProjects.mockReturnValue(mockProjects);

      await run([]);

      expect(consoleLogSpy).toHaveBeenCalledWith('Total: 2 project(s)');
      expect(exitCode).toBe(0);
    });

    it('should format dates as YYYY-MM-DD', async () => {
      const mockProjects = [
        {
          id: 'abc123456789012',
          name: 'test-project',
          path: '/path/to/project',
          created_at: 1640995200000, // 2022-01-01 00:00:00 UTC
        },
      ];

      mockDb.getProjects.mockReturnValue(mockProjects);

      await run([]);

      // Verify the date is formatted
      const dateLog = consoleLogSpy.mock.calls.find(call => call[0].includes('2022'));
      expect(dateLog).toBeDefined();
      expect(exitCode).toBe(0);
    });

    it('should handle multiple projects', async () => {
      const mockProjects = [
        { id: 'id1', name: 'project-1', path: '/path1', created_at: 1640000000000 },
        { id: 'id2', name: 'project-2', path: '/path2', created_at: 1650000000000 },
        { id: 'id3', name: 'project-3', path: '/path3', created_at: 1660000000000 },
      ];

      mockDb.getProjects.mockReturnValue(mockProjects);

      await run([]);

      expect(consoleLogSpy).toHaveBeenCalledWith('Total: 3 project(s)');
      expect(exitCode).toBe(0);
    });
  });
});
