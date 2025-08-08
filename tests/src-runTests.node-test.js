import runTests from '../src/runTests.js';

const mkSuite = () => ({
  beforeAll: async (log) => { log('before all'); },
  beforeEach: async (log) => { log('before each'); },
  afterEach: async (log) => { log('after each'); },
  afterAll: async (log) => { log('after all'); },
  default: {
    'one passes': async ({ pass, log }) => { log('running one'); pass('ok'); },
    'two passes': async ({ pass, log }) => { log('running two'); pass('ok'); },
  }
});

export default {
  'runs all tests and records logs': async ({ pass, fail }) => {
    try {
      const res = await runTests(mkSuite(), false, 0);
      const names = Object.keys(res.tests);
      if (names.length !== 2) return fail(`expected 2 tests, got ${names.length}`);
      const hasBeforeAll = res.beforeAllLogs.some(l => l.message.includes('before all'));
      const hasAfterAll = res.afterAllLogs.some(l => l.message.includes('after all'));
      const eachs = Object.values(res.tests).flatMap(r => r.logs.map(l=>l.message));
      const hasBefores = eachs.some(m => m.includes('== Before Each =='));
      const hasAfters = eachs.some(m => m.includes('== After Each =='));
      if (hasBeforeAll && hasAfterAll && hasBefores && hasAfters) pass('ok');
      else fail('missing expected lifecycle logs');
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'applies per-test delay': async ({ pass, fail, log }) => {
    try {
      const t0 = Date.now();
      await runTests(mkSuite(), false, 200);
      const elapsed = Date.now() - t0;
      if (elapsed >= 200 && elapsed < 800) pass('ok');
      else fail(`unexpected timing: ${elapsed}ms`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'filters tests by substring': async ({ pass, fail }) => {
    try {
      const res = await runTests(mkSuite(), 'two', 0);
      const names = Object.keys(res.tests);
      if (names.length === 1 && names[0].includes('two')) pass('ok');
      else fail(`unexpected tests: ${names}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  }
};
