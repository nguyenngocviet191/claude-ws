const projectsCommand = require('./projects');

async function run(argv) {
  await projectsCommand.run(['create', ...argv]);
}

module.exports = { run };
