import { startServer, stopServer } from './browserTestServer.js';
import puppeteer from 'puppeteer';
import LOG_LEVELS from './utils/logLevels.js';

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

  await page.goto(`${url}?testFile=${testFile}&testFilter=${filter}&delay=${delayMs}`);
  await page.waitForFunction(() => document.readyState === 'complete' || document.readyState === 'interactive');
  await page.waitForFunction(() => window.results !== undefined);
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
