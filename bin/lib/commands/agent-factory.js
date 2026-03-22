const {
  parseArgs,
  clientOptions,
  requireArg,
  loadBody,
  parseKeyValueArgs,
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
        const result = await request({
          method: 'GET',
          path: '/api/agent-factory/plugins',
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'get': {
        const id = requireArg(rest[0], 'plugin id');
        const result = await request({
          method: 'GET',
          path: `/api/agent-factory/plugins/${id}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'create': {
        const type = requireArg(rest[0], 'plugin type');
        const name = requireArg(rest[1], 'plugin name');
        const description = rest.slice(2).join(' ') || undefined;
        const body = loadBody(flags) || {};
        const result = await request({
          method: 'POST',
          path: '/api/agent-factory/plugins',
          body: { type, name, description, ...body },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'update': {
        const id = requireArg(rest[0], 'plugin id');
        const body = loadBody(flags) || parseKeyValueArgs(rest.slice(1));
        const result = await request({
          method: 'PUT',
          path: `/api/agent-factory/plugins/${id}`,
          body,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'delete': {
        const id = requireArg(rest[0], 'plugin id');
        const result = await request({
          method: 'DELETE',
          path: `/api/agent-factory/plugins/${id}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'dependencies': {
        const id = requireArg(rest[0], 'plugin id');
        const result = await request({
          method: 'GET',
          path: `/api/agent-factory/plugins/${id}/dependencies`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'discover': {
        const discoverPath = requireArg(rest[0], 'path');
        const result = await request({
          method: 'POST',
          path: '/api/agent-factory/discover',
          body: { path: discoverPath },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'project-list': {
        const projectId = requireArg(rest[0], 'project id');
        const result = await request({
          method: 'GET',
          path: `/api/agent-factory/projects/${projectId}/plugins`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'project-add': {
        const projectId = requireArg(rest[0], 'project id');
        const pluginId = requireArg(rest[1], 'plugin id');
        const result = await request({
          method: 'POST',
          path: `/api/agent-factory/projects/${projectId}/plugins`,
          body: { pluginId },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'project-remove': {
        const projectId = requireArg(rest[0], 'project id');
        const pluginId = requireArg(rest[1], 'plugin id');
        const result = await request({
          method: 'DELETE',
          path: `/api/agent-factory/projects/${projectId}/plugins/${pluginId}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown agent-factory subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
