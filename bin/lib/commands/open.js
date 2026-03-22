const { exec } = require('child_process');
const { resolveBaseUrl } = require('../api-client');

function openUrl(url) {
  const platform = process.platform;
  let cmd;

  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }

  exec(cmd, (error) => {
    if (error) {
      console.log(url);
    }
  });
}

async function run(argv) {
  const url = argv[0] || resolveBaseUrl();
  openUrl(url);
}

module.exports = { run, openUrl };
