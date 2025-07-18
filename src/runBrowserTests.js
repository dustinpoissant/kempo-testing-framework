import { startServer, stopServer } from './browserTestServer.js';
import puppeteer from 'puppeteer';
import LOG_LEVELS from './utils/logLevels.js';

export default async ({
  testFile,
  filter = false,
  showBrowser = false,
  port = 3000,
  logLevel
}) => {
  /*
   * Start Test Server
   */
  const url = await startServer(port);
  
  if(logLevel >= LOG_LEVELS.VERBOSE){
    console.log(`\x1b[90m Browser test server started at ${url}\x1b[0m`);
  }
  
  try {
    /*
     * Launch Browser and Execute Tests
     */
    const browser = await puppeteer.launch({ 
      headless: !showBrowser,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--auto-open-devtools-for-tabs'],
      defaultViewport: { width: 1600, height: 900 }
    });
    const page = await browser.newPage();
    await page.goto(`${url}?testFile=${testFile}&filter=${filter}`);
    await page.waitForFunction(() => window.results !== undefined);
    const results = await page.evaluate(() => window.results);
    
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
