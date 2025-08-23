import { startServer, stopServer } from './browserTestServer.js';
import puppeteer from 'puppeteer';
import LOG_LEVELS from './utils/logLevels.js';
import path from 'path';
import { fileURLToPath } from 'url';

export default async ({
  testFile,
  filter = false,
  showBrowser = false,
  port = 3000,
  logLevel,
  delayMs = 0
}) => {
  /*
   * Start Test Server
   */
  const url = await startServer(port);

  if(logLevel >= LOG_LEVELS.VERBOSE){
    console.log(`\x1b[90m Browser test server started at ${url}\x1b[0m`);
  }


  // Setup __dirname for ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Load the test module to check for 'page' export
  let customPage = null;
  try {
    const testFilePath = path.resolve(process.cwd(), testFile.replace(/\//g, path.sep));
    const testModule = await import(`file://${testFilePath}`);
    if (typeof testModule.page === 'string') {
      customPage = testModule.page;
    }
  } catch (e) {
    // Ignore errors, fallback to default page
  }

  // Determine which HTML page to serve
  let pageUrl;
  if (customPage) {
    // Resolve custom page relative to test file location
    const testDir = path.dirname(testFile);
    const customPagePath = path.join(testDir, customPage);
    pageUrl = `${url.replace(/\/$/, '')}/${customPagePath.replace(/\\/g, '/')}`;
    if(logLevel >= LOG_LEVELS.VERBOSE){
      console.log(`\x1b[90m Using custom test page: ${customPagePath}\x1b[0m`);
    }
  } else {
    pageUrl = `${url}?testFile=${testFile}&testFilter=${filter}&delay=${delayMs}`;
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  try {
    /*
     * Launch Browser and Execute Tests
     */
    const launchOptions = {
      headless: !showBrowser,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1600, height: 900 }
    };
    if (showBrowser) {
      launchOptions.devtools = true;
      launchOptions.args.push('--auto-open-devtools-for-tabs');
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Optional pre-delay when a visible browser is requested
    if (showBrowser && delayMs > 0) {
      if (logLevel >= LOG_LEVELS.VERBOSE) {
        console.log(`\x1b[90m Applying pre-test browser delay: ${delayMs}ms\x1b[0m`);
      }
      await sleep(delayMs);
    }

    await page.goto(pageUrl);
    await page.waitForFunction(() => document.readyState === 'complete' || document.readyState === 'interactive');

    // If using a custom page, inject the test runner script
    if (customPage) {
      // Inject a script that mimics test.html: loads runTests.js, imports the test file, and sets window.results
      await page.addScriptTag({
        content: `
          (async () => {
            try {
              const runTestsModule = await import('/src/runTests.js');
              const urlParams = new URLSearchParams(window.location.search);
              const testFile = urlParams.get('testFile') || '${testFile}';
              const testFilter = urlParams.get('testFilter') || '';
              const delay = parseInt(urlParams.get('delay') || '0', 10) || 0;
              const testsModule = await import('/' + testFile);
              const results = await runTestsModule.default(testsModule, testFilter, delay);
              window.results = results;
            } catch (error) {
              console.error('Browser test error:', error);
              window.error = error.message || String(error);
            }
          })();
        `
      });
    }

    // Ensure the test page has focus when browser is visible
    if (showBrowser) {
      await page.bringToFront();
      if (logLevel >= LOG_LEVELS.VERBOSE) {
        console.log(`\x1b[90m Bringing test page to front\x1b[0m`);
      }
    }

    // Check for any errors first
    const hasError = await page.evaluate(() => window.error !== undefined);
    if (hasError) {
      const error = await page.evaluate(() => window.error);
      throw new Error(`Browser test error: ${error}`);
    }
    
    await page.waitForFunction(() => window.results !== undefined, { timeout: 20000 });
    const results = await page.evaluate(() => window.results);

    // Optional post-delay when a visible browser is requested
    if (showBrowser && delayMs > 0) {
      if (logLevel >= LOG_LEVELS.VERBOSE) {
        console.log(`\x1b[90m Applying post-test browser delay: ${delayMs}ms\x1b[0m`);
      }
      await sleep(delayMs);
    }
    
    /*
     * Cleanup
     */
    await browser.close();
    await stopServer();
    return results;
  } catch(error){
    await stopServer();
    throw error;
  }
};
