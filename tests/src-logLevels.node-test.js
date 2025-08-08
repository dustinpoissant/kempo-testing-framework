import LOG_LEVELS from '../src/utils/logLevels.js';

export default {
  'defines expected numeric levels': async ({ pass, fail }) => {
    try {
      const want = { SILENT: 0, MINIMAL: 1, NORMAL: 2, VERBOSE: 3, DEBUG: 4 };
      const ok = want.SILENT === LOG_LEVELS.SILENT &&
        want.MINIMAL === LOG_LEVELS.MINIMAL &&
        want.NORMAL === LOG_LEVELS.NORMAL &&
        want.VERBOSE === LOG_LEVELS.VERBOSE &&
        want.DEBUG === LOG_LEVELS.DEBUG;
      ok ? pass('ok') : fail(`Unexpected values: ${JSON.stringify(LOG_LEVELS)}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  'level ordering is ascending': async ({ pass, fail }) => {
    try {
      const arr = [LOG_LEVELS.SILENT, LOG_LEVELS.MINIMAL, LOG_LEVELS.NORMAL, LOG_LEVELS.VERBOSE, LOG_LEVELS.DEBUG];
      const sorted = [...arr].sort((a,b)=>a-b);
      const ok = JSON.stringify(arr) === JSON.stringify(sorted);
      ok ? pass('ok') : fail(`Not ascending: ${arr}`);
    } catch (e) {
      fail(e.stack || String(e));
    }
  }
};
