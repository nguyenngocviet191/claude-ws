const {
  parseArgs,
  clientOptions,
  requireArg,
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
    'start-line': { type: 'string' },
    'end-line': { type: 'string' },
    replacement: { type: 'string' },
    'replacement-file': { type: 'string' },
  });

  const [subcommand = 'inline-edit', ...rest] = args;

  try {
    if (subcommand !== 'inline-edit') {
      throw new Error(`Unknown code subcommand: ${subcommand}`);
    }

    const projectPath = defaultProjectPath(flags);
    const filePath = requireArg(flags['file-path'] || rest[0], 'file path');
    const startLine = Number(requireArg(flags['start-line'] || rest[1], 'start line'));
    const endLine = Number(requireArg(flags['end-line'] || rest[2], 'end line'));
    const replacement = flags.replacement !== undefined
      ? flags.replacement
      : flags['replacement-file']
        ? readTextFile(flags['replacement-file'])
        : rest.slice(3).join(' ');

    const result = await request({
      method: 'POST',
      path: '/api/code/inline-edit',
      body: {
        projectPath,
        filePath,
        startLine,
        endLine,
        replacement: requireArg(replacement, 'replacement'),
      },
      ...clientOptions(flags),
    });
    printResult(result, flags);
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
