import { spawn } from 'child_process';

const runWithArgs = (args, timeoutMs = 3000) => new Promise((resolve) => {
  const child = spawn(process.execPath, ['index.js', ...args], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let out = '';
  let resolved = false;

  const finish = () => {
    if (resolved) return;
    resolved = true;
    try { child.kill('SIGTERM'); } catch {}
    resolve(out);
  };

  child.stdout.on('data', (chunk) => {
    out += chunk.toString();
    if (out.includes('kempo-test flags:')) {
      // We only need to see the flags echo. Short delay to capture the full line, then stop.
      setTimeout(finish, 50);
    }
  });
  child.stderr.on('data', (chunk) => { out += chunk.toString(); });
  child.on('error', () => finish());
  child.on('exit', () => finish());

  setTimeout(finish, timeoutMs);
});

export default {
  'maps -l 3 to logLevel 3': async ({ pass, fail }) => {
    const out = await runWithArgs(['-l', '3']);
    out.includes('logLevel: 3') ? pass('ok') : fail(out);
  },
  'maps -l debug to logLevel 4': async ({ pass, fail }) => {
    const out = await runWithArgs(['-l', 'debug']);
    out.includes('logLevel: 4') ? pass('ok') : fail(out);
  },
  'maps -l v to logLevel 3': async ({ pass, fail }) => {
    const out = await runWithArgs(['-l', 'v']);
    out.includes('logLevel: 3') ? pass('ok') : fail(out);
  },
  'passes --delay value as delay flag': async ({ pass, fail }) => {
    const out = await runWithArgs(['--delay', '2000']);
    (out.includes("delay: '2000'") || out.includes('delay: 2000')) ? pass('ok') : fail(out);
  },
  'combines log-level and delay flags': async ({ pass, fail }) => {
    const out = await runWithArgs(['-l', 'minimal', '--delay', '250']);
    const ok = out.includes('logLevel: 1') && (out.includes("delay: '250'") || out.includes('delay: 250'));
    ok ? pass('ok') : fail(out);
  },
};
