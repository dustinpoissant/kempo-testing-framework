import { spawn } from 'child_process';

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/*
  Resolves with { out, timedOut }. The distinction matters: this used to resolve with whatever had
  been printed so far when the timer fired, so a run that was merely slow failed as though the CLI
  had printed the wrong thing. Callers can now tell "did not finish" apart from "finished and said
  something unexpected", and only retry the former.
*/
const run = (args, timeoutMs = 25000) => new Promise((resolve) => {
  const child = spawn(process.execPath, ['index.js', ...args], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let out = '';
  let settled = false;
  const finish = (timedOut) => {
    if(settled) return;
    settled = true;
    clearTimeout(timer);
    try { child.kill('SIGTERM'); } catch {}
    resolve({ out, timedOut });
  };
  const timer = setTimeout(() => finish(true), timeoutMs);
  child.stdout.on('data', c => { out += c.toString(); });
  child.stderr.on('data', c => { out += c.toString(); });
  child.on('exit', () => finish(false));
});

export default {
  /*
    The post-test log only prints once the in-page run has reported results, so this depends on a
    headful Chromium completing a full round trip. That normally takes ~2.5s but occasionally
    stalls past the runner's own 30s page timeout, at which point the CLI legitimately never gets
    there. One retry covers that, and only when the run did not finish — output that came back
    wrong is a real failure and is never retried.
  */
  'passes delay to browser runner and prints delay logs in verbose': async ({ pass, fail }) => {
    /*
      A port of its own. The child starts a browser test server, and the suite running this test
      starts one too — both defaulted to 3000, so whichever bound second died with EADDRINUSE and
      took the whole run down.
    */
    const args = ['-b', '-w', '-l', 'verbose', '-d', '200', '-p', '3211', 'counter'];
    let { out, timedOut } = await run(args);
    if(timedOut) ({ out, timedOut } = await run(args));
    if(timedOut) return fail('CLI did not finish within 25s on two consecutive attempts');

    const txt = stripAnsi(out);
    const ok = /Applying pre-test browser delay: 200ms/.test(txt) && /Applying post-test browser delay: 200ms/.test(txt);
    ok ? pass('CLI printed verbose delay logs for browser run') : fail(`Unexpected CLI output:\n${out}`);
  },
  'node-only ignores delay and still runs filtered tests': async ({ pass, fail }) => {
    const { out, timedOut } = await run(['-n', '-l', 'minimal', '-p', '3212', 'example']);
    if(timedOut) return fail('CLI did not finish within 25s');
    const txt = stripAnsi(out);
    const hasSummary = /=== Test Summary ===/.test(txt) && /Total Tests:\s*\d+/.test(txt);
    const noBrowser = !/=== Browser Test Results ===/.test(txt) && !/Running Browser test:/.test(txt);
  hasSummary && noBrowser ? pass('Node-only run produced summary without browser section') : fail(`Unexpected CLI output:\n${out}`);
  }
};
