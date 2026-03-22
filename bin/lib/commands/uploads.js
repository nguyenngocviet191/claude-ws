const fs = require('fs');
const path = require('path');
const {
  parseArgs,
  clientOptions,
  requireArg,
  printResult,
  handleApiError,
} = require('../command-helpers');
const { request, createUploadForm } = require('../api-client');

async function run(argv) {
  const { flags, args } = parseArgs(argv, {
    'attempt-id': { type: 'string' },
    output: { type: 'string' },
  });

  const [subcommand = 'list', ...rest] = args;

  try {
    switch (subcommand) {
      case 'list': {
        const attemptId = requireArg(flags['attempt-id'] || rest[0], 'attempt id');
        const result = await request({
          method: 'GET',
          path: '/api/uploads',
          query: { attemptId },
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'upload': {
        const attemptId = requireArg(flags['attempt-id'] || rest[0], 'attempt id');
        const filePath = requireArg(flags['attempt-id'] ? rest[0] : rest[1], 'file path');
        const result = await request({
          method: 'POST',
          path: '/api/uploads',
          body: createUploadForm(filePath, { attemptId }),
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      case 'download': {
        const id = requireArg(rest[0], 'upload id');
        const content = await request({
          method: 'GET',
          path: `/api/uploads/${id}`,
          responseType: 'arrayBuffer',
          ...clientOptions(flags),
        });

        const buffer = Buffer.from(content);
        if (flags.output) {
          const outputPath = path.resolve(flags.output);
          fs.writeFileSync(outputPath, buffer);
          console.log(outputPath);
        } else {
          process.stdout.write(buffer);
        }
        return;
      }

      case 'delete': {
        const id = requireArg(rest[0], 'upload id');
        const result = await request({
          method: 'DELETE',
          path: `/api/uploads/${id}`,
          ...clientOptions(flags),
        });
        printResult(result, flags);
        return;
      }

      default:
        throw new Error(`Unknown uploads subcommand: ${subcommand}`);
    }
  } catch (error) {
    handleApiError(error);
  }
}

module.exports = { run };
