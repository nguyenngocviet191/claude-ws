# CLI Unit Tests

This directory contains unit tests for the CLI modules.

## Test Structure

```
bin/lib/__tests__/
├── README.md           # This file
├── db.test.js         # Database access module tests
├── cli-parser.test.js # CLI argument parser tests
├── commands.test.js   # Command modules tests (create, projects, add-task, tasks, git)
├── open.test.js       # Open command tests
└── run-task.test.js   # Run-task command tests
```

## Running Tests

```bash
# Run all CLI tests
pnpm run test:cli

# Run tests in watch mode
pnpm run test:cli:watch

# Run tests with coverage report
pnpm run test:cli:coverage
```

## Test Coverage

The tests aim for 70% coverage across all CLI modules.

- **db.test.js**: Tests for database operations (projects, tasks, attempts, checkpoints)
- **cli-parser.test.js**: Tests for the argument parser

## Writing New Tests

When adding new CLI modules, create a corresponding test file:

```javascript
/**
 * Unit tests for bin/lib/your-module.js
 */

const yourModule = require('../your-module');

describe('yourModule', () => {
  describe('functionName', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = yourModule.functionName(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

## Mocking

The tests use Jest for mocking:

```javascript
jest.mock('../dependency', () => ({
  someFunction: jest.fn(() => 'mocked value'),
}));
```

## Database Tests

Database tests create a temporary database for each test suite:

```javascript
const testDataDir = path.join(__dirname, 'test-data');

beforeEach(() => {
  // Clean up and initialize fresh database
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true });
  }
  db.init();
});

afterEach(() => {
  db.close();
  if (fs.existsSync(testDataDir)) {
    fs.rmSync(testDataDir, { recursive: true });
  }
});
```
