const {
  parseArgs,
  clientOptions,
  requireArg,
  loadBody,
  parseKeyValueArgs,
  printResult,
  findCurrentProject,
  handleApiError,
} = require('../command-helpers');
const { request } = require('../api-client');

const TASK_COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Title' },
  { key: 'projectId', label: 'Project' },
];

const SUBCOMMANDS = new Set([
  'list',
  'get',
  'create',
  'update',
  'delete',
  'reorder',
  'attempts',
  'conversation',
  'stats',
  'running-attempt',
  'pending-question',
]);

async function listTasks(flags, positionalStatus) {
  const query = {};

  if (flags['project-id']) {
    query.projectId = flags['project-id'];
  } else if (flags['project-ids']) {
    query.projectIds = flags['project-ids'];
  } else {
    const project = await findCurrentProject(flags);
    if (project) {
      query.projectId = project.id;
    }
  }

  if (flags.status || positionalStatus) {
    query.status = flags.status || positionalStatus;
  }

  const tasks = await request({
    method: 'GET',
    path: '/api/tasks',
    query,
    ...clientOptions(flags),
  });

  printResult(tasks, flags, { columns: TASK_COLUMNS });
}

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'project-id': { type: 'string' },
    'project-ids': { type: 'string' },
    status: { type: 'string' },
  });

  const [firstArg, ...rest] = args;

  try {
    if (!firstArg || !SUBCOMMANDS.has(firstArg)) {
      await listTasks(flags, firstArg);
      return;
    }

    switch (firstArg) {
      case 'list':
        await listTasks(flags);
        return;

      case 'get': {
        const id = requireArg(rest[0], 'task id');
        const task = await request({
          method: 'GET',
          path: `/api/tasks/${id}`,
          ...clientOptions(flags),
        });
        printResult(task, flags);
        return;
      }

      case 'create': {
        const projectId = requireArg(rest[0], 'project id');
        const title = requireArg(rest[1], 'task title');
        const description = rest.slice(2).join(' ') || undefined;
        const task = await request({
          method: 'POST',
          path: '/api/tasks',
          body: {
            projectId,
            title,
            description,
            status: flags.status || undefined,
          },
          ...clientOptions(flags),
        });
        printResult(task, flags);
        return;
      }

      case 'update': {
        const id = requireArg(rest[0], 'task id');
        const body = loadBody(flags) || parseKeyValueArgs(rest.slice(1));
        const task = await request({
          method: 'PUT',
          path: `/api/tasks/${id}`,
          body,
          ...clientOptions(flags),
        });
        printResult(task, flags);
        return;
      }

      case 'delete': {
        const id = requireArg(rest[0], 'task id');
        const result = await request({
          method: 'DELETE',
          path: `/api/tasks/${id}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'reorder': {
        const id = requireArg(rest[0], 'task id');
        const status = requireArg(rest[1], 'status');
        const newPosition = Number(requireArg(rest[2], 'new position'));
        const result = await request({
          method: 'PUT',
          path: `/api/tasks/${id}/compact`,
          body: { status, newPosition },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'attempts':
      case 'conversation':
      case 'stats':
      case 'running-attempt':
      case 'pending-question': {
        const id = requireArg(rest[0], 'task id');
        const suffixMap = {
          attempts: 'attempts',
          conversation: 'conversation',
          stats: 'stats',
          'running-attempt': 'running-attempt',
          'pending-question': 'pending-question',
        };
        const result = await request({
          method: 'GET',
          path: `/api/tasks/${id}/${suffixMap[firstArg]}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown tasks subcommand: ${firstArg}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
