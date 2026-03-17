
const { spawn } = require('child_process');

console.log('Platform:', process.platform);

const command = 'npm --version';
const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
const args = process.platform === 'win32' ? ['/c', command] : ['-c', command];

console.log(`Spawning: ${shell} ${args.join(' ')}`);

const child = spawn(shell, args, {
  shell: false,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => console.log('STDOUT:', data.toString()));
child.stderr.on('data', (data) => console.error('STDERR:', data.toString()));

child.on('exit', (code) => {
  console.log('Process exited with code:', code);
});

setTimeout(() => {
  console.log('Timeout reached. PID:', child.pid);
  child.unref();
}, 2000);
