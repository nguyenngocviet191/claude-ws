/**
 * Socket.IO client for CLI communication with claude-ws daemon.
 * Handles real-time streaming of task execution output and user questions.
 */

const { io } = require('socket.io-client');
const readline = require('readline');

/**
 * Create a Socket.IO client connected to the claude-ws daemon.
 * @param {string} host - Daemon host (default: localhost)
 * @param {number} port - Daemon port (default: 8556)
 * @returns {Socket}
 */
function connect(host = 'localhost', port = 8556) {
  const url = `http://${host}:${port}`;
  const socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

/**
 * Create a readline interface for user input.
 * @returns {readline.Interface}
 */
function createReadline() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Stream attempt logs to the terminal.
 * @param {Socket} socket
 * @param {string} attemptId
 * @returns {Promise<void>}
 */
async function streamLogs(socket, attemptId) {
  return new Promise((resolve, reject) => {
    // Join the attempt room to receive log updates
    socket.emit('join-attempt', { attemptId });

    // Listen for log messages
    socket.on('attempt-log', (data) => {
      const { type, content } = data;
      if (type === 'stdout') {
        process.stdout.write(content);
      } else if (type === 'stderr') {
        process.stderr.write(content);
      } else if (type === 'json') {
        // JSON logs can be parsed and displayed differently
        try {
          const parsed = JSON.parse(content);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(content);
        }
      }
    });

    // Listen for attempt completion
    socket.on('attempt-complete', (data) => {
      console.log('\n[Claude Workspace] Task completed successfully.');
      socket.off('attempt-log');
      socket.off('attempt-complete');
      socket.off('attempt-failed');
      resolve();
    });

    // Listen for attempt failure
    socket.on('attempt-failed', (data) => {
      console.log('\n[Claude Workspace] Task failed:', data.error || 'Unknown error');
      socket.off('attempt-log');
      socket.off('attempt-complete');
      socket.off('attempt-failed');
      reject(new Error(data.error || 'Task failed'));
    });

    // Handle socket errors
    socket.on('error', (err) => {
      reject(new Error(`Socket error: ${err.message}`));
    });

    socket.on('disconnect', () => {
      reject(new Error('Disconnected from server'));
    });
  });
}

/**
 * Handle interactive user questions during task execution.
 * @param {Socket} socket
 * @param {string} attemptId
 * @returns {Promise<void>}
 */
async function handleQuestions(socket, attemptId) {
  return new Promise((resolve, reject) => {
    const rl = createReadline();

    // Listen for pending questions from the agent
    socket.on('pending-question', async (data) => {
      const { questionId, question, options, multiSelect } = data;

      console.log('\n[Claude Workspace] Question:');
      console.log(question);

      if (options && options.length > 0) {
        options.forEach((opt, idx) => {
          console.log(`  ${idx + 1}. ${opt.label}`);
        });

        const answer = await new Promise((resolveAnswer) => {
          rl.question(
            multiSelect
              ? '\nSelect option(s) (comma-separated numbers): '
              : '\nSelect option (number): ',
            resolveAnswer
          );
        });

        // Parse the answer
        let selected;
        if (multiSelect) {
          const indices = answer.split(',').map((s) => parseInt(s.trim(), 10) - 1);
          selected = indices.map((idx) => options[idx]?.value).filter(Boolean);
        } else {
          const idx = parseInt(answer.trim(), 10) - 1;
          selected = options[idx]?.value;
        }

        // Send the answer back to the daemon
        socket.emit('question-answer', {
          attemptId,
          questionId,
          answer: selected,
        });
      } else {
        // Free-form text input
        const answer = await new Promise((resolveAnswer) => {
          rl.question('\nYour answer: ', resolveAnswer);
        });

        socket.emit('question-answer', {
          attemptId,
          questionId,
          answer,
        });
      }
    });

    // Clean up when attempt is done
    socket.on('attempt-complete', () => {
      rl.close();
      socket.off('pending-question');
      resolve();
    });

    socket.on('attempt-failed', () => {
      rl.close();
      socket.off('pending-question');
      reject(new Error('Task failed'));
    });
  });
}

/**
 * Start a task execution and stream output.
 * @param {object} options
 * @param {string} options.host - Daemon host (default: localhost)
 * @param {number} options.port - Daemon port (default: 8556)
 * @param {string} options.taskId - Task ID to execute
 * @param {string} options.prompt - Optional prompt to use
 * @param {boolean} options.interactive - Enable interactive question handling (default: true)
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function runTask({ host, port, taskId, prompt, interactive = true }) {
  const socket = connect(host, port);

  return new Promise((resolve, reject) => {
    socket.on('connect', async () => {
      console.log('[Claude Workspace] Connected to daemon');

      // Start the attempt
      socket.emit('start-attempt', {
        taskId,
        prompt,
      });

      try {
        // Handle interactive questions if enabled
        if (interactive) {
          await handleQuestions(socket, taskId);
        }

        // Stream logs
        await streamLogs(socket, taskId);

        // Success
        socket.disconnect();
        resolve({ success: true });
      } catch (err) {
        socket.disconnect();
        resolve({ success: false, error: err.message });
      }
    });

    socket.on('connect_error', (err) => {
      reject(new Error(`Failed to connect to daemon: ${err.message}`));
    });
  });
}

/**
 * Check if daemon is running and accessible.
 * @param {string} host - Daemon host (default: localhost)
 * @param {number} port - Daemon port (default: 8556)
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<boolean>}
 */
async function checkHealth(host = 'localhost', port = 8556, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = connect(host, port);
    const timer = setTimeout(() => {
      socket.disconnect();
      resolve(false);
    }, timeout);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(false);
    });
  });
}

module.exports = {
  connect,
  createReadline,
  streamLogs,
  handleQuestions,
  runTask,
  checkHealth,
};
