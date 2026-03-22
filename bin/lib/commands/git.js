const {
  parseArgs,
  clientOptions,
  requireArg,
  loadBody,
  parseKeyValueArgs,
  printResult,
  defaultProjectPath,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'project-path': { type: 'string' },
    revision: { type: 'string' },
    limit: { type: 'string' },
    branch: { type: 'string' },
  });

  const [subcommand, ...rest] = args;
  if (!subcommand) {
    handleApiError(new Error('Usage: claude-ws git <status|log|stage|commit|push|pull|branches|checkout|diff|show-file-diff|generate-message|discard>'));
    return;
  }

  const projectPath = defaultProjectPath(flags);

  try {
    switch (subcommand) {
      case 'status':
      case 'log':
      case 'branches':
      case 'diff': {
        const query = { projectPath };
        if (subcommand === 'log' && flags.limit) {
          query.limit = flags.limit;
        }
        const result = await request({
          method: 'GET',
          path: `/api/git/${subcommand}`,
          query,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'show-file-diff': {
        const filePath = requireArg(rest[0], 'file path');
        const result = await request({
          method: 'GET',
          path: '/api/git/show-file-diff',
          query: {
            projectPath,
            filePath,
            revision: flags.revision,
          },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'stage':
      case 'discard': {
        const files = rest;
        const result = await request({
          method: 'POST',
          path: `/api/git/${subcommand}`,
          body: { projectPath, files },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'commit': {
        const message = rest.join(' ') || loadBody(flags)?.message;
        const result = await request({
          method: 'POST',
          path: '/api/git/commit',
          body: { projectPath, message: requireArg(message, 'commit message') },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'push': {
        const branch = rest[0] || flags.branch;
        const result = await request({
          method: 'POST',
          path: '/api/git/push',
          body: { projectPath, branch },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'pull': {
        const result = await request({
          method: 'POST',
          path: '/api/git/pull',
          body: { projectPath },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'checkout': {
        const branch = requireArg(rest[0] || flags.branch, 'branch');
        const result = await request({
          method: 'POST',
          path: '/api/git/checkout',
          body: { projectPath, branch },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'generate-message': {
        const body = loadBody(flags) || {};
        const result = await request({
          method: 'POST',
          path: '/api/git/generate-message',
          body: { projectPath, ...body },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown git subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
