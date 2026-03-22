const path = require('path');

const SUBCOMMAND_MODULES = {
  auth: 'auth',
  create: 'create',
  projects: 'projects',
  'add-task': 'add-task',
  tasks: 'tasks',
  'run-task': 'run-task',
  attempts: 'attempts',
  checkpoints: 'checkpoints',
  files: 'files',
  search: 'search',
  git: 'git',
  shells: 'shells',
  uploads: 'uploads',
  'agent-factory': 'agent-factory',
  settings: 'settings',
  tunnel: 'tunnel',
  filesystem: 'filesystem',
  commands: 'commands',
  models: 'models',
  language: 'language',
  code: 'code',
  open: 'open',
};

const SUBCOMMANDS = new Set(Object.keys(SUBCOMMAND_MODULES));

function getSubcommand(argv = process.argv) {
  const command = argv[2];
  return SUBCOMMANDS.has(command) ? command : null;
}

function hasUnknownCommand(argv = process.argv) {
  const command = argv[2];
  return Boolean(command && !command.startsWith('-') && !SUBCOMMANDS.has(command));
}

function runSubcommand(argv = process.argv) {
  const command = getSubcommand(argv);
  if (!command) {
    return false;
  }

  const commandModulePath = path.join(__dirname, 'commands', SUBCOMMAND_MODULES[command]);
  require(commandModulePath).run(argv.slice(3));
  return true;
}

module.exports = {
  SUBCOMMANDS,
  getSubcommand,
  hasUnknownCommand,
  runSubcommand,
};
