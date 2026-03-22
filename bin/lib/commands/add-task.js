const { parseArgs, findCurrentProject, fail, handleApiError } = require('../command-helpers');
const { request } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    status: { type: 'string' },
  });

  const [title, ...descriptionParts] = args;
  if (!title) {
    fail('Usage: claude-ws add-task <title> [description]');
  }

  try {
    const project = await findCurrentProject(flags);
    if (!project) {
      fail('No project found for current directory.');
    }

    const task = await request({
      method: 'POST',
      path: '/api/tasks',
      body: {
        projectId: project.id,
        title,
        description: descriptionParts.length > 0 ? descriptionParts.join(' ') : undefined,
        status: flags.status || undefined,
      },
      baseUrl: flags['api-url'],
      apiKey: flags['api-key'],
      timeoutMs: flags.timeout ? Number(flags.timeout) : undefined,
    });

    console.log(`[claude-ws] Task created: ${task.id}`);
    console.log(`[claude-ws] Project: ${project.name}`);
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
