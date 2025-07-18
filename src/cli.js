import findTests from './findTests.js';
import runTests from './runTests.js';
import runBrowserTests from './runBrowserTests.js';
import path from 'path';
import { LOG_LEVELS } from './logLevels.js';

export default async (flags, args) => {
  const [ suiteFilter, testFilter ] = args;
  let logLevel = LOG_LEVELS.NORMAL;
  if (flags.silent) {
    logLevel = LOG_LEVELS.SILENT;
  } else if (flags.quiet) {
    logLevel = LOG_LEVELS.MINIMAL;
  } else if (flags.verbose) {
    logLevel = LOG_LEVELS.VERBOSE;
  } else if (flags.debug) {
    logLevel = LOG_LEVELS.DEBUG;
  }
  
  if (logLevel >= LOG_LEVELS.DEBUG) {
    console.log('\x1b[90m[Debug] Flags:', flags);
    console.log('[Debug] Args:', args);
    console.log(`[Debug] Log level: ${logLevel}\x1b[0m`);
  }
  
  const showBrowser = Boolean(flags['show-browser']);

  const runBrowser = Boolean(flags.browser);
  const runNode = Boolean(flags.node);
  const shouldRunBrowser = runBrowser || (!runBrowser && !runNode);
  const shouldRunNode = runNode || (!runBrowser && !runNode);
  const {
    nodeTests,
    browserTests
  } = await findTests(suiteFilter, testFilter, shouldRunBrowser, shouldRunNode);
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
    blue: '\x1b[34m'
  };
  const nodeResults = {};
  if(nodeTests.length) {
    for(const file of nodeTests) {
      if (logLevel > LOG_LEVELS.MINIMAL) {
        console.log(`${colors.cyan}Running Node test: ${file}${colors.reset}`);
      }
      // Convert forward slashes back to OS-specific path separators for file system operations
      const normalizedFile = file.replace(/\//g, path.sep);
      const module = await import(`file://${path.resolve(process.cwd(), normalizedFile)}`);
      nodeResults[file] = await runTests(module, testFilter);
    }
  }

  // Get port from flags object directly
  let port = 3000; // Default port
  if (flags.port) {
    port = parseInt(flags.port, 10);
  }
  
  const browserResults = {};
  if(browserTests.length) {
    for(const testFile of browserTests) {
      if (logLevel > LOG_LEVELS.MINIMAL) {
        console.log(`${colors.magenta}Running Browser test: ${testFile}${colors.reset}`);
      }
      browserResults[testFile] = await runBrowserTests({
        testFile,
        testFilter,
        showBrowser,
        port,
        logLevel
      });
    }
  }
  if (logLevel >= LOG_LEVELS.SILENT) {
    displayResults('Node', nodeResults, logLevel, colors);
    displayResults('Browser', browserResults, logLevel, colors);
    displaySummary(nodeResults, browserResults, colors);
  }
}

function displayResults(type, results, logLevel, colors) {
  if (Object.keys(results).length === 0) return;
  // Only show section headers for NORMAL and above
  if (logLevel > LOG_LEVELS.MINIMAL) {
    console.log(`\n${colors.bright}=== ${type} Test Results ====${colors.reset}`);
  }
  let hasFailedTests = false;
  if (logLevel === LOG_LEVELS.MINIMAL) {
    for (const [_, result] of Object.entries(results)) {
      for (const [_, testResult] of Object.entries(result.tests)) {
        if (!testResult.passed) {
          hasFailedTests = true;
          break;
        }
      }
      if (hasFailedTests) break;
    }
    // If there are failed tests, show a simple header
    if (hasFailedTests) {
      console.log(`\n${colors.red}Failed ${type} Tests:${colors.reset}`);
    }
  }
  
  for (const [file, result] of Object.entries(results)) {
    let fileHeaderShown = logLevel > LOG_LEVELS.MINIMAL;
    // Always show beforeAll logs at VERBOSE or higher
    if (logLevel >= LOG_LEVELS.VERBOSE && result.beforeAllLogs?.length) {
      if (!fileHeaderShown) {
        console.log(`\n${colors.bright}${file}${colors.reset}`);
        fileHeaderShown = true;
      }
      console.log(`${colors.blue}${colors.bright}beforeAll${colors.reset}`);
      result.beforeAllLogs.forEach(log => {
        if (log.level <= logLevel) {
          console.log(`  ${colors.blue}${log.message}${colors.reset}`);
        }
      });
    }
    for (const [testName, testResult] of Object.entries(result.tests)) {
      // For MINIMAL level, only display failed tests
      if (logLevel === LOG_LEVELS.MINIMAL && testResult.passed) {
        continue; // Skip passed tests at MINIMAL level
      }
      const passStatus = testResult.passed 
        ? `${colors.green}PASS${colors.reset}` 
        : `${colors.red}FAIL${colors.reset}`;
      // Show file header if we're showing a test and it hasn't been shown yet
      if (!fileHeaderShown) {
        console.log(`\n${colors.bright}${file}${colors.reset}`);
        fileHeaderShown = true;
      }
      // Display test name and status for all non-silent levels
      if (logLevel >= LOG_LEVELS.MINIMAL) {
        console.log(`  ${passStatus} ${testName}`);
      }
      // Show logs for verbose mode or failed tests
      if (logLevel >= LOG_LEVELS.VERBOSE || (!testResult.passed && logLevel >= LOG_LEVELS.NORMAL)) {
        if (testResult.logs && testResult.logs.length > 0) {
          if (logLevel >= LOG_LEVELS.VERBOSE) {
            console.log(`    ${colors.cyan}--Test Logs--${colors.reset}`);
          }
          
          const logsToShow = testResult.logs.filter(log => {
            if (logLevel >= LOG_LEVELS.VERBOSE) return true;
            return log.type !== 'progress' && log.level <= logLevel;
          });
            
          logsToShow.forEach(log => {
            let logColor = colors.gray;
            if (log.type === 'fail') logColor = colors.red;
            if (log.type === 'pass') logColor = colors.green;
            
            console.log(`      ${logColor}${log.message}${colors.reset}`);
          });
        }
      }
    }
    // Always show afterAll logs at VERBOSE or higher
    if (logLevel >= LOG_LEVELS.VERBOSE && result.afterAllLogs?.length) {
      if (!fileHeaderShown) {
        console.log(`\n${colors.bright}${file}${colors.reset}`);
        fileHeaderShown = true;
      }
      console.log(`${colors.blue}${colors.bright}afterAll${colors.reset}`);
      result.afterAllLogs.forEach(log => {
        if (log.level <= logLevel) {
          console.log(`  ${colors.blue}${log.message}${colors.reset}`);
        }
      });
    }
  }
}

function displaySummary(nodeResults, browserResults, colors) {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  Object.values(nodeResults).forEach(result => {
    Object.values(result.tests || {}).forEach(test => {
      totalTests++;
      if (test.passed) passedTests++;
      else failedTests++;
    });
  });
  Object.values(browserResults).forEach(result => {
    Object.values(result.tests || {}).forEach(test => {
      totalTests++;
      if (test.passed) passedTests++;
      else failedTests++;
    });
  });
  console.log(`\n${colors.bright}=== Test Summary ====${colors.reset}`);
  console.log(`${colors.bright}Total Tests:${colors.reset} ${totalTests}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passedTests}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failedTests}`);
  if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bright}All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}Some tests failed. See details above.${colors.reset}`);
  }
}