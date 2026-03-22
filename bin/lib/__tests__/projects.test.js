jest.mock('../api-client', () => ({
  request: jest.fn(),
}));

const { run } = require('../commands/projects');
const { request } = require('../api-client');

describe('projects command', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let originalExit;

  beforeEach(() => {
    request.mockReset();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    originalExit = process.exit;
    process.exit = jest.fn();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exit = originalExit;
  });

  it('lists projects by calling GET /api/projects', async () => {
    request.mockResolvedValue([
      { id: 'proj_1', name: 'demo', path: '/tmp/demo' },
    ]);

    await run([]);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      path: '/api/projects',
    }));
  });

  it('creates a project by calling POST /api/projects', async () => {
    request.mockResolvedValue({ id: 'proj_1', name: 'demo', path: '/tmp/demo' });

    await run(['create', 'demo', '/tmp/demo']);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/projects',
      body: { name: 'demo', path: '/tmp/demo' },
    }));
  });
});
