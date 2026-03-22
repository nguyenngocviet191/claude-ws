const {
  parseArgs,
  clientOptions,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags } = parseArgs(argv);

  try {
    const result = await request({
      method: 'GET',
      path: '/api/models',
      ...clientOptions(flags),
    });
    printResult(result, flags);
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
