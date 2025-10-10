import runTests from '../../src/runTests.js';

export default {
  'should timeout hanging test with custom timeout': async ({ pass, fail, log }) => {
    try {
      const hangingTest = {
        default: {
          'hanging test': () => {
            // Return a promise that never resolves
            return new Promise(() => {});
          }
        }
      };
      
      const start = Date.now();
      const results = await runTests(hangingTest, false, 0, 2000); // 2 second timeout for faster testing
      const duration = Date.now() - start;
      
      log(`Test completed in ${duration}ms`);
      
      // Should have timed out and marked as failed
      const testResult = results.tests['hanging test'];
      if (testResult && !testResult.passed && duration >= 1900 && duration <= 3000) {
        // Check if the failure message mentions timeout
        const hasTimeoutMessage = testResult.logs.some(log => log.message.includes('timed out'));
        if (hasTimeoutMessage) {
          pass('Test correctly timed out and reported timeout error');
        } else {
          fail('Test failed but timeout message not found in logs');
        }
      } else {
        fail(`Test should have timed out. passed: ${testResult?.passed}, duration: ${duration}ms`);
      }
    } catch (e) {
      fail(e.stack || String(e));
    }
  },
  
  'should complete normal test within timeout': async ({ pass, fail, log }) => {
    try {
      const normalTest = {
        default: {
          'quick test': ({ pass }) => {
            pass('This test completes quickly');
          }
        }
      };
      
      const start = Date.now();
      const results = await runTests(normalTest, false, 0, 2000); // 2 second timeout
      const duration = Date.now() - start;
      
      log(`Test completed in ${duration}ms`);
      
      // Should complete quickly and pass
      const testResult = results.tests['quick test'];
      if (testResult && testResult.passed && duration < 1000) {
        pass('Normal test completed successfully within timeout');
      } else {
        fail(`Normal test should have passed quickly. passed: ${testResult?.passed}, duration: ${duration}ms`);
      }
    } catch (e) {
      fail(e.stack || String(e));
    }
  }
};