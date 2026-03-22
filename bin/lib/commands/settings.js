const {
  parseArgs,
  clientOptions,
  loadBody,
  parseKeyValueArgs,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv);
  const [subcommand = 'get', ...rest] = args;

  try {
    switch (subcommand) {
      case 'get':
        printResult(await request({ method: 'GET', path: '/api/settings', ...clientOptions(flags) }), flags);
        return;
      case 'update':
        printResult(await request({
          method: 'PUT',
          path: '/api/settings',
          body: loadBody(flags) || parseKeyValueArgs(rest),
          ...clientOptions(flags),
        }), flags);
        return;
      case 'api-access-key':
        printResult(await request({ method: 'GET', path: '/api/settings/api-access-key', ...clientOptions(flags) }), flags);
        return;
      case 'provider':
        printResult(await request({ method: 'GET', path: '/api/settings/provider', ...clientOptions(flags) }), flags);
        return;
      default:
        throw new Error(`Unknown settings subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
