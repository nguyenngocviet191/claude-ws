const {
  parseArgs,
  clientOptions,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv);
  const [subcommand = 'status'] = args;

  try {
    switch (subcommand) {
      case 'status':
        printResult(await request({ method: 'GET', path: '/api/tunnel/status', ...clientOptions(flags) }), flags);
        return;
      case 'start':
      case 'stop':
        printResult(await request({ method: 'POST', path: `/api/tunnel/${subcommand}`, ...clientOptions(flags) }), flags);
        return;
      default:
        throw new Error(`Unknown tunnel subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
