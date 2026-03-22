const {
  parseArgs,
  clientOptions,
  requireArg,
  loadBody,
  printResult,
  defaultProjectPath,
  readTextFile,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'project-path': { type: 'string' },
    'file-path': { type: 'string' },
    'sub-path': { type: 'string' },
    content: { type: 'string' },
    'content-file': { type: 'string' },
  });

  const [subcommand, ...rest] = args;
  if (!subcommand) {
    handleApiError(new Error('Usage: claude-ws files <list|read|write|delete|metadata|ops>'));
    return;
  }

  const projectPath = defaultProjectPath(flags);

  try {
    switch (subcommand) {
      case 'list': {
        const result = await request({
          method: 'GET',
          path: '/api/files',
          query: {
            projectPath,
            subPath: flags['sub-path'] || rest[0],
          },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'read': {
        const filePath = requireArg(flags['file-path'] || rest[0], 'file path');
        const result = await request({
          method: 'GET',
          path: '/api/files/content',
          query: { projectPath, filePath },
          responseType: 'text',
          ...clientOptions(flags),
        });
        printResult(result, flags, { asText: true });
        return;
      }

      case 'write': {
        const filePath = requireArg(flags['file-path'] || rest[0], 'file path');
        const content = flags.content !== undefined
          ? flags.content
          : flags['content-file']
            ? readTextFile(flags['content-file'])
            : rest.slice(1).join(' ');
        const result = await request({
          method: 'POST',
          path: '/api/files',
          body: {
            projectPath,
            filePath,
            content: requireArg(content, 'content'),
          },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'delete': {
        const filePath = requireArg(flags['file-path'] || rest[0], 'file path');
        const result = await request({
          method: 'DELETE',
          path: '/api/files',
          query: { projectPath, filePath },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'metadata': {
        const filePath = requireArg(flags['file-path'] || rest[0], 'file path');
        const result = await request({
          method: 'GET',
          path: '/api/files/metadata',
          query: { projectPath, filePath },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'ops': {
        const body = loadBody(flags);
        if (!body || !Array.isArray(body.operations)) {
          throw new Error('files ops requires --body or --body-file with { "operations": [...] }');
        }
        const result = await request({
          method: 'POST',
          path: '/api/files/operations',
          body: { projectPath, operations: body.operations },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown files subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
