const {
  parseArgs,
  clientOptions,
  requireArg,
  loadBody,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv);
  const [subcommand = 'list', ...rest] = args;

  try {
    switch (subcommand) {
      case 'list': {
        const taskId = requireArg(rest[0], 'task id');
        const result = await request({
          method: 'GET',
          path: `/api/tasks/${taskId}/checkpoints`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'create': {
        const taskId = requireArg(rest[0], 'task id');
        const attemptId = requireArg(rest[1], 'attempt id');
        const messageCount = Number(requireArg(rest[2], 'message count'));
        const summary = rest.slice(3).join(' ') || undefined;
        const result = await request({
          method: 'POST',
          path: `/api/tasks/${taskId}/checkpoints`,
          body: { attemptId, messageCount, summary },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'rewind': {
        const checkpointId = requireArg(rest[0], 'checkpoint id');
        const taskId = requireArg(rest[1], 'task id');
        const result = await request({
          method: 'POST',
          path: `/api/checkpoints/${checkpointId}/rewind`,
          body: { taskId },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'backfill': {
        const taskId = requireArg(rest[0], 'task id');
        const body = loadBody(flags);
        if (!body || !Array.isArray(body.checkpoints)) {
          throw new Error('backfill requires --body or --body-file with { "checkpoints": [...] }');
        }
        const result = await request({
          method: 'POST',
          path: '/api/checkpoints/backfill',
          body: { taskId, checkpoints: body.checkpoints },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown checkpoints subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
