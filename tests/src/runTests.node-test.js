import runTests from '../../src/runTests.js';

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

const runOne = async (test) => (await runTests({ default: { subject: test } }, false, 0)).tests.subject;

export default {
  'runs all tests and records logs': async ({ pass, fail, log }) => {
    try {
      const res = await runTests(mkSuite(), false, 0);
      const names = Object.keys(res.tests);
    log(`Discovered tests: ${names.join(', ')}`);
    if (names.length !== 2) return fail(`Expected 2 tests, got ${names.length} [${names.join(', ')}]`);
      const hasBeforeAll = res.beforeAllLogs.some(l => l.message.includes('before all'));
      const hasAfterAll = res.afterAllLogs.some(l => l.message.includes('after all'));
      const eachs = Object.values(res.tests).flatMap(r => r.logs.map(l=>l.message));
      const hasBefores = eachs.some(m => m.includes('== Before Each =='));
      const hasAfters = eachs.some(m => m.includes('== After Each =='));
    log(`Lifecycle logs — beforeAll:${hasBeforeAll} afterAll:${hasAfterAll} beforeEach:${hasBefores} afterEach:${hasAfters}`);
    if (hasBeforeAll && hasAfterAll && hasBefores && hasAfters) pass('Recorded lifecycle and per-test logs as expected');
    else fail('Missing expected lifecycle log sections');
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'applies per-test delay': async ({ pass, fail, log }) => {
    try {
      const t0 = Date.now();
      await runTests(mkSuite(), false, 200);
      const elapsed = Date.now() - t0;
    log(`Elapsed with delay: ${elapsed}ms`);
    if (elapsed >= 200 && elapsed < 800) pass(`Applied per-test delay successfully (~${elapsed}ms >= 200ms)`);
    else fail(`Unexpected timing with delay=200ms: ${elapsed}ms`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'filters tests by substring': async ({ pass, fail, log }) => {
    try {
      const res = await runTests(mkSuite(), 'two', 0);
      const names = Object.keys(res.tests);
    log(`Filtered tests: ${names.join(', ')}`);
    if (names.length === 1 && names[0].includes('two')) pass(`Filtered to expected test: ${names[0]}`);
    else fail(`Unexpected filtered set: [${names.join(', ')}]`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'a later pass() cannot overwrite an earlier fail()': async ({ pass, fail }) => {
    const result = await runOne(({ pass, fail }) => {
      fail('the check broke');
      pass('but then it passed');
    });
    if(result.passed !== false) return fail(`Expected the test to fail, got passed=${result.passed}`);
    if(result.logs.some(l => l.type === 'pass')) return fail('An ignored pass() must not be logged as a pass');
    if(!result.logs.some(l => l.type === 'fail' && l.message === 'the check broke')) return fail('The failure message was not recorded');
    if(!result.logs.some(l => l.message.includes('pass() ignored') && l.message.includes('but then it passed'))) return fail('The ignored pass() was not logged');
    pass('fail() is final');
  },
  'return fail() from a nested callback is not masked by a trailing pass()': async ({ pass, fail }) => {
    /*
      The real-world shape: a helper takes a callback, the callback does `return fail(...)`, which only
      leaves the callback, and the test then reaches its own pass().
    */
    const result = await runOne(async ({ pass, fail }) => {
      await (async () => { return fail('inner check failed'); })();
      pass('reached the end');
    });
    if(result.passed !== false) return fail(`A failure inside a nested callback was reported as passed=${result.passed}`);
    pass('nested fail() is not masked');
  },
  'pass() followed by fail() is a failure': async ({ pass, fail }) => {
    const result = await runOne(({ pass, fail }) => {
      pass('looked fine');
      fail('then it broke');
    });
    if(result.passed !== false) return fail(`Expected the test to fail, got passed=${result.passed}`);
    pass('fail() after pass() fails the test');
  },
  'an exception after pass() is a failure': async ({ pass, fail }) => {
    const result = await runOne(({ pass }) => {
      pass('looked fine');
      throw new Error('then it threw');
    });
    if(result.passed !== false) return fail(`Expected the test to fail, got passed=${result.passed}`);
    pass('a throw after pass() fails the test');
  },
  'a test that only passes still passes, including repeated pass() calls': async ({ pass, fail }) => {
    const result = await runOne(({ pass, log }) => {
      log('working');
      pass('first');
      pass('second');
    });
    if(result.passed !== true) return fail(`Expected the test to pass, got passed=${result.passed}`);
    if(result.logs.filter(l => l.type === 'pass').length !== 2) return fail('Both pass() calls should be logged as passes');
    pass('unaffected');
  },
  'a failing test in a suite does not affect its neighbours': async ({ pass, fail }) => {
    const res = await runTests({
      default: {
        'bad': ({ pass, fail }) => { fail('broke'); pass('masked'); },
        'good': ({ pass }) => { pass('fine'); }
      }
    }, false, 0);
    if(res.tests.bad.passed !== false) return fail('bad should fail');
    if(res.tests.good.passed !== true) return fail('good should still pass');
    pass('failures are isolated per test');
  }
};
