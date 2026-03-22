const readline = require('readline');
const {
  parseArgs,
  clientOptions,
  requireArg,
  loadBody,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request, streamSse } = require('../api-client');

async function promptForAnswer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Answer: ', (value) => {
      rl.close();
      resolve(value);
    });
  });
}

async function streamAttempt(attemptId, flags) {
  await streamSse({
    path: `/api/attempts/${attemptId}/stream`,
    ...clientOptions(flags),
    onEvent: async ({ event, data }) => {
      if (event === 'done') {
        if (flags.json) {
          console.log(JSON.stringify({ event, data }, null, 2));
        } else {
          console.log('\n[claude-ws] Stream completed.');
        }
        return;
      }

      if (flags.json) {
        console.log(JSON.stringify({ event, data }, null, 2));
        return;
      }

      if (data && typeof data === 'object' && data.type && data.content !== undefined) {
        const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
        if (data.type === 'stderr') {
          process.stderr.write(content);
        } else {
          process.stdout.write(content);
        }
      } else {
        console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
      }
    },
  });
}

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    stream: { type: 'boolean', default: false },
    'display-prompt': { type: 'string' },
    'force-create': { type: 'boolean', default: false },
    'project-name': { type: 'string' },
    'task-title': { type: 'string' },
    'project-root-path': { type: 'string' },
    'request-method': { type: 'string' },
    'output-format': { type: 'string' },
    'output-schema': { type: 'string' },
  });

  const [subcommand, ...rest] = args;
  if (!subcommand) {
    handleApiError(new Error('Usage: claude-ws attempts <create|get|status|stream|cancel|answer|alive|workflow|pending-question>'));
    return;
  }

  try {
    switch (subcommand) {
      case 'create': {
        const taskId = requireArg(rest[0], 'task id');
        const prompt = rest.slice(1).join(' ');
        const extraBody = loadBody(flags) || {};
        const body = {
          taskId,
          prompt: prompt || extraBody.prompt,
          displayPrompt: flags['display-prompt'],
          force_create: flags['force-create'] || undefined,
          projectName: flags['project-name'],
          taskTitle: flags['task-title'],
          projectRootPath: flags['project-root-path'],
          request_method: flags['request-method'],
          output_format: flags['output-format'],
          output_schema: flags['output-schema'],
          timeout: flags.timeout ? Number(flags.timeout) : undefined,
          ...extraBody,
        };

        requireArg(body.prompt, 'prompt');

        const attempt = await request({
          method: 'POST',
          path: '/api/attempts',
          body,
          ...clientOptions(flags),
        });

        if (flags.stream) {
          if (!flags.json) {
            console.log(`[claude-ws] Attempt created: ${attempt.id}`);
          }
          await streamAttempt(attempt.id, flags);
        } else {
          printResult(attempt, flags);
        }
        return;
      }

      case 'get':
      case 'status':
      case 'alive':
      case 'workflow':
      case 'pending-question': {
        const id = requireArg(rest[0], 'attempt id');
        const suffix = subcommand === 'get' ? '' : `/${subcommand}`;
        const result = await request({
          method: 'GET',
          path: `/api/attempts/${id}${suffix}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'stream': {
        const id = requireArg(rest[0], 'attempt id');
        await streamAttempt(id, flags);
        return;
      }

      case 'cancel': {
        const id = requireArg(rest[0], 'attempt id');
        const result = await request({
          method: 'POST',
          path: `/api/attempts/${id}/cancel`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'answer': {
        const id = requireArg(rest[0], 'attempt id');
        const answer = rest.slice(1).join(' ') || await promptForAnswer();
        const result = await request({
          method: 'POST',
          path: `/api/attempts/${id}/answer`,
          body: { answer },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown attempts subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
