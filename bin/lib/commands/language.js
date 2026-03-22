const {
  parseArgs,
  clientOptions,
  requireArg,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv);
  const [subcommand = 'definition', ...rest] = args;

  try {
    if (subcommand !== 'definition') {
      throw new Error(`Unknown language subcommand: ${subcommand}`);
    }

    const lang = requireArg(rest[0], 'language id');
    const result = await request({
      method: 'GET',
      path: '/api/language/definition',
      query: { lang },
      ...clientOptions(flags),
    });
    printResult(result, flags);
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
