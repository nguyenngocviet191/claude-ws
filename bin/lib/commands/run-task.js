const attemptsCommand = require('./attempts');

async function run(argv) {
  await attemptsCommand.run(['create', ...argv, '--stream']);
}

module.exports = { run };
