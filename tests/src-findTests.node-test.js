import findTests from '../src/findTests.js';

export default {
  'finds node and browser test files with no filters': async ({ pass, fail }) => {
    try {
      const { nodeTests, browserTests } = await findTests('', '', true, true);
      const hasCounter = browserTests.some(f => f.endsWith('tests/counter.browser-test.js'));
      const hasExample = nodeTests.some(f => f.endsWith('tests/example.node-test.js'));
      if (hasCounter && hasExample) pass('ok');
      else fail(`Missing expected files. node: ${JSON.stringify(nodeTests)}, browser: ${JSON.stringify(browserTests)}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'honors suite filter for file substring': async ({ pass, fail }) => {
    try {
      const { nodeTests, browserTests } = await findTests('counter', '', true, true);
      const okNode = nodeTests.every(f => f.includes('counter') === true) || nodeTests.length === 0;
      const okBrowser = browserTests.every(f => f.includes('counter') === true);
      okNode && okBrowser ? pass('ok') : fail(`Unexpected filtering. node: ${nodeTests}, browser: ${browserTests}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'respects environment toggles': async ({ pass, fail }) => {
    try {
      const a = await findTests('', '', false, true); // node only
      const b = await findTests('', '', true, false); // browser only
      const okA = a.browserTests.length === 0 && a.nodeTests.length > 0;
      const okB = b.nodeTests.length === 0 && b.browserTests.length > 0;
      okA && okB ? pass('ok') : fail(`Env mismatch: a=${JSON.stringify(a)}, b=${JSON.stringify(b)}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  }
};
