import runTestFiles from '../src/runTestFiles.js';

export default {
  'discovers and runs node tests only when requested': async ({ pass, fail }) => {
    try {
      const { nodeResults, browserResults } = await runTestFiles({
        suiteFilter: 'example',
        testFilter: '',
        shouldRunBrowser: false,
        shouldRunNode: true,
        showBrowser: false,
        port: 3000,
        logLevel: 2
      });
      const onlyNode = Object.keys(browserResults).length === 0 && Object.keys(nodeResults).length >= 1;
      onlyNode ? pass('ok') : fail(`unexpected results: node=${Object.keys(nodeResults)}, browser=${Object.keys(browserResults)}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'passes filter into node runs': async ({ pass, fail }) => {
    try {
      const { nodeResults } = await runTestFiles({
        suiteFilter: 'example',
        testFilter: 'async',
        shouldRunBrowser: false,
        shouldRunNode: true,
        showBrowser: false,
        port: 3000,
        logLevel: 2
      });
      const [file, res] = Object.entries(nodeResults)[0];
      if (!res) return fail('no node results');
      const names = Object.keys(res.tests || {});
      names.length === 1 && names[0].toLowerCase().includes('async') ? pass('ok') : fail(`unexpected tests: ${names}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  }
};
