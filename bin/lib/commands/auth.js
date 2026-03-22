const {
  parseArgs,
  clientOptions,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'api-key-value': { type: 'string' },
  });

  const [subcommand = 'verify'] = args;

  try {
    if (subcommand !== 'verify') {
      throw new Error(`Unknown auth subcommand: ${subcommand}`);
    }

    if (flags['api-key-value']) {
      const result = await request({
        method: 'POST',
        path: '/api/auth/verify',
        body: { apiKey: flags['api-key-value'] },
        ...clientOptions(flags),
      });
      printResult(result, flags);
      return;
    }

    const result = await request({
      method: 'GET',
      path: '/api/auth/verify',
      ...clientOptions(flags),
    });
    printResult(result, flags);
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
