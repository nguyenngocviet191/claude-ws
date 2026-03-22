const {
  parseArgs,
  clientOptions,
  requireArg,
  printResult,
  defaultProjectPath,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'project-path': { type: 'string' },
    query: { type: 'string' },
    pattern: { type: 'string' },
  });

  const [subcommand, ...rest] = args;
  if (!subcommand) {
    handleApiError(new Error('Usage: claude-ws search <content|files>'));
    return;
  }

  const projectPath = defaultProjectPath(flags);

  try {
    switch (subcommand) {
      case 'content': {
        const query = requireArg(flags.query || rest.join(' '), 'search query');
        const result = await request({
          method: 'GET',
          path: '/api/search',
          query: { projectPath, query },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'files': {
        const pattern = requireArg(flags.pattern || rest[0], 'glob pattern');
        const result = await request({
          method: 'GET',
          path: '/api/search/files',
          query: { projectPath, pattern },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown search subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
