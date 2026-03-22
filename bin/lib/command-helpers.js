const fs = require('fs');
const path = require('path');
const { parse } = require('./cli-parser');
const { request, ApiError } = require('./api-client');

const COMMON_FLAGS = {
  json: { type: 'boolean', default: false },
  'api-url': { type: 'string' },
  'api-key': { type: 'string' },
  body: { type: 'string' },
  'body-file': { type: 'string' },
  timeout: { type: 'string' },
};

function parseArgs(argv, extraFlags = {}) {
  return parse(argv, {
    flags: {
      ...COMMON_FLAGS,
      ...extraFlags,
    },
  });
}

function clientOptions(flags) {
  return {
    baseUrl: flags['api-url'],
    apiKey: flags['api-key'],
    timeoutMs: flags.timeout ? Number(flags.timeout) : undefined,
  };
}

function fail(message, details) {
  console.error(`[claude-ws] ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function requireArg(value, label) {
  if (!value) {
    fail(`Missing required argument: ${label}`);
  }
  return value;
}

function parseJsonString(raw, label = 'JSON input') {
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid ${label}: ${error.message}`);
  }
}

function loadBody(flags) {
  if (flags.body && flags['body-file']) {
    fail('Use either --body or --body-file, not both.');
  }

  if (flags.body) {
    return parseJsonString(flags.body, 'JSON body');
  }

  if (flags['body-file']) {
    const absolutePath = path.resolve(flags['body-file']);
    const raw = fs.readFileSync(absolutePath, 'utf8');
    return parseJsonString(raw, `JSON body file ${absolutePath}`);
  }

  return undefined;
}

function parseKeyValueArgs(args) {
  const result = {};

  for (const entry of args) {
    const idx = entry.indexOf('=');
    if (idx <= 0) {
      fail(`Expected key=value pair, received: ${entry}`);
    }

    const key = entry.slice(0, idx);
    const rawValue = entry.slice(idx + 1);

    if (rawValue === 'true') {
      result[key] = true;
    } else if (rawValue === 'false') {
      result[key] = false;
    } else if (rawValue === 'null') {
      result[key] = null;
    } else if (/^-?\d+$/.test(rawValue)) {
      result[key] = Number(rawValue);
    } else {
      result[key] = rawValue;
    }
  }

  return result;
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function printTable(rows, columns) {
  if (!rows || rows.length === 0) {
    console.log('[claude-ws] No results.');
    return;
  }

  const widths = columns.map((column) => {
    const headerWidth = column.label.length;
    const cellWidth = Math.max(...rows.map((row) => formatValue(row[column.key]).length));
    return Math.max(headerWidth, cellWidth);
  });

  const header = columns
    .map((column, index) => column.label.padEnd(widths[index]))
    .join('  ');

  console.log(header);
  console.log('='.repeat(header.length));

  for (const row of rows) {
    const line = columns
      .map((column, index) => formatValue(row[column.key]).padEnd(widths[index]))
      .join('  ');
    console.log(line);
  }
}

function printResult(data, flags, options = {}) {
  if (flags.json || options.forceJson) {
    printJson(data);
    return;
  }

  if (options.asText) {
    console.log(typeof data === 'string' ? data : formatValue(data));
    return;
  }

  if (options.columns && Array.isArray(data)) {
    printTable(data, options.columns);
    return;
  }

  printJson(data);
}

function normalizePath(inputPath) {
  return inputPath.replace(/\\/g, '/').replace(/\/+$/, '');
}

function findProjectByDir(projects, dirPath) {
  const normalizedDir = normalizePath(path.resolve(dirPath));

  for (const project of projects) {
    const projectPath = normalizePath(project.path);
    if (normalizedDir === projectPath || normalizedDir.startsWith(`${projectPath}/`)) {
      return project;
    }
  }

  return null;
}

async function findCurrentProject(flags, cwd = process.cwd()) {
  const projects = await request({
    method: 'GET',
    path: '/api/projects',
    ...clientOptions(flags),
  });

  return findProjectByDir(projects, cwd);
}

function defaultProjectPath(flags) {
  return flags['project-path'] ? path.resolve(flags['project-path']) : process.cwd();
}

function readTextFile(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

function handleApiError(error) {
  if (error instanceof ApiError) {
    fail(error.message, error.payload ? JSON.stringify(error.payload, null, 2) : undefined);
  }

  fail(error.message || String(error));
}

module.exports = {
  parseArgs,
  clientOptions,
  fail,
  requireArg,
  loadBody,
  parseKeyValueArgs,
  printResult,
  printTable,
  findProjectByDir,
  findCurrentProject,
  defaultProjectPath,
  readTextFile,
  handleApiError,
};
