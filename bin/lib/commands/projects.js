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

const PROJECT_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'path', label: 'Path' },
];

async function run(argv) {
  const { flags, args } = parseArgs(argv);
  const [subcommand = 'list', ...rest] = args;

  try {
    switch (subcommand) {
      case 'list': {
        const projects = await request({
          method: 'GET',
          path: '/api/projects',
          ...clientOptions(flags),
        });
        printResult(projects, flags, { columns: PROJECT_COLUMNS });
        return;
      }

      case 'get': {
        const id = requireArg(rest[0], 'project id');
        const project = await request({
          method: 'GET',
          path: `/api/projects/${id}`,
          ...clientOptions(flags),
        });
        printResult(project, flags);
        return;
      }

      case 'create': {
        const name = requireArg(rest[0], 'project name');
        const projectPath = requireArg(rest[1], 'project path');
        const project = await request({
          method: 'POST',
          path: '/api/projects',
          body: { name, path: projectPath },
          ...clientOptions(flags),
        });
        printResult(project, flags);
        return;
      }

      case 'update': {
        const id = requireArg(rest[0], 'project id');
        const body = loadBody(flags) || parseKeyValueArgs(rest.slice(1));
        const project = await request({
          method: 'PUT',
          path: `/api/projects/${id}`,
          body,
          ...clientOptions(flags),
        });
        printResult(project, flags);
        return;
      }

      case 'delete': {
        const id = requireArg(rest[0], 'project id');
        const result = await request({
          method: 'DELETE',
          path: `/api/projects/${id}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown projects subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
