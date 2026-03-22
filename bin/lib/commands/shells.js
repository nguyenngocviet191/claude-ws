const {
  parseArgs,
  clientOptions,
  requireArg,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'project-id': { type: 'string' },
    'exit-code': { type: 'string' },
  });

  const [subcommand = 'list', ...rest] = args;

  try {
    switch (subcommand) {
      case 'list': {
        const result = await request({
          method: 'GET',
          path: '/api/shells',
          query: { projectId: flags['project-id'] || rest[0] },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'create': {
        const projectId = requireArg(flags['project-id'] || rest[0], 'project id');
        const valueOffset = flags['project-id'] ? 0 : 1;
        const command = requireArg(rest[valueOffset], 'command');
        const cwd = requireArg(rest[valueOffset + 1], 'cwd');
        const result = await request({
          method: 'POST',
          path: '/api/shells',
          body: { projectId, command, cwd },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'update': {
        const id = requireArg(rest[0], 'shell id');
        const status = requireArg(rest[1], 'status');
        const exitCode = rest[2] || flags['exit-code'];
        const result = await request({
          method: 'PUT',
          path: `/api/shells/${id}`,
          body: { status, exitCode: exitCode !== undefined ? Number(exitCode) : undefined },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown shells subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
