
const { spawn } = require('child_process');

console.log('Platform:', process.platform);

const command = 'npm --version';
console.log(`Spawning with shell:true: ${command}`);

const child = spawn(command, [], {
  shell: true,
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => console.log('STDOUT:', data.toString()));
child.stderr.on('data', (data) => console.error('STDERR:', data.toString()));

child.on('exit', (code) => {
  console.log('Process exited with code:', code);
});

child.on('error', (err) => {
  console.error('FAILED TO START:', err);
});

setTimeout(() => {
  console.log('Timeout reached. PID:', child.pid);
  child.unref();
}, 2000);
