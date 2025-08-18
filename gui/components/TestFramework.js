import { LitElement, html } from '../lit-all.min.js';
import { getSettings } from './settingsStore.js';

class TestFrameworkEl extends LitElement {
  /*
    Properties
  */
  static properties = { };
  constructor(){
    super();
    this.queue = [];
    this.queueKeys = new Set();
    this.running = false;
    this.runningKey = null;
  }

  /*
    Lifecycle
  */
  connectedCallback(){
    super.connectedCallback();
  }
  disconnectedCallback(){
    super.disconnectedCallback();
  }

  /*
    Utility
  */
  keyFor = (task) => task.type==='test' ? `test:${task.file}::${task.name}` : `suite:${task.file}`;

  /*
    Public Methods
  */
  enqueueTest({ file, name, el }){
    if(!file || !name || !el) return;
    const task = { type: 'test', file, name, el };
    const key = this.keyFor(task);
    if(this.runningKey===key || this.queueKeys.has(key)) return;
    this.queue.push(task);
    this.queueKeys.add(key);
    try { el.status = 'queued'; } catch {}
    this.dispatchEvent(new CustomEvent('ktf:queue-updated', { detail: { length: this.queue.length } }));
    this.runNext();
  }

  enqueueSuite({ file, testNames, el }){
    if(!file || !el) return;
    const names = Array.isArray(testNames)?testNames:[];
    const task = { type: 'suite', file, testNames: names, el };
    const key = this.keyFor(task);
    if(this.runningKey===key || this.queueKeys.has(key)) return;
    this.queue.push(task);
    this.queueKeys.add(key);
    try {
      el.status = 'queued';
  const tests = Array.from(el.querySelectorAll('ktf-test'));
      for(const t of tests){ t.status = 'queued'; }
    } catch {}
    this.dispatchEvent(new CustomEvent('ktf:queue-updated', { detail: { length: this.queue.length } }));
    this.runNext();
  }

  runAllSuites(){
    const suites = Array.from(this.querySelectorAll('ktf-test-suite'));
    for(const s of suites){ this.enqueueSuite({ file: s.file, testNames: s.testNames, el: s }); }
  };

  /*
    Internal Queue Runner
  */
  runNext = async () => {
    if(this.running) return;
    const task = this.queue.shift();
    if(!task) return;
    this.running = true;
    const key = this.keyFor(task);
    this.queueKeys.delete(key);
    this.runningKey = key;
    this.dispatchEvent(new CustomEvent('ktf:queue-updated', { detail: { length: this.queue.length } }));
    try {
      if(task.type==='test') await this.runTest(task);
      else await this.runSuite(task);
    } catch (e) {
      console.error(e);
    } finally {
      this.running = false;
      this.runningKey = null;
      this.dispatchEvent(new CustomEvent('ktf:queue-updated', { detail: { length: this.queue.length } }));
      if(this.queue.length) this.runNext();
    }
  };

  /*
    Runners
  */
  runTest = async ({ file, name, el }) => {
    try {
      el.status = 'running';
      const logsEl = el.renderRoot?.getElementById('logs');
      if (logsEl) logsEl.clear();
    } catch {}
    const { showBrowser, delayMs } = getSettings();
    const resp = await fetch(`/runTest?testFile=${encodeURIComponent(file)}&testNames=${encodeURIComponent(name)}&showBrowser=${!!showBrowser}&delayMs=${Number(delayMs||0)}`);
    let data = null;
    try { data = await resp.json(); } catch {}
    if(!resp.ok || (data && data.error)){
      const msg = data?.details || data?.error || `${resp.status} ${resp.statusText}`;
      try {
        const logsEl = el.renderRoot?.getElementById('logs');
        if (logsEl) logsEl.addLog({ message: `Error running test: ${msg}`, type: 'error', level: 3 });
        el.status = 'fail';
      } catch {}
      return;
    }
    const fileResults = data?.results || {};
    const beforeAllLogs = Array.isArray(fileResults.beforeAllLogs) ? fileResults.beforeAllLogs : [];
    const afterAllLogs = Array.isArray(fileResults.afterAllLogs) ? fileResults.afterAllLogs : [];
    const testInfo = fileResults.tests?.[name] || null;
    const testLogs = Array.isArray(testInfo?.logs) ? testInfo.logs : [];
    try {
      el.status = testInfo?.passed ? 'pass' : 'fail';
      const logsEl = el.renderRoot?.getElementById('logs');
      if (logsEl) {
        const heading = msg => ({ message: msg, type: 'progress', level: 3 });
        const batch = [];
        if (beforeAllLogs.length) batch.push(heading('== Before All Logs =='), ...beforeAllLogs);
        batch.push(...testLogs);
        if (afterAllLogs.length) batch.push(heading('== After All Logs =='), ...afterAllLogs);
        const testsMap = fileResults.tests || {};
        const names = Object.keys(testsMap);
        const total = names.length;
        const passed = names.reduce((acc, n) => acc + (testsMap[n]?.passed ? 1 : 0), 0);
        const failed = total - passed;
        if (total > 0) {
          batch.push(
            { message: '=== Test Summary ====', type: 'summary', level: 1 },
            { message: `Total Tests: ${total}`, type: 'summary', level: 1 },
            { message: `Passed: ${passed}`, type: passed > 0 ? 'pass' : 'log', level: 1 },
            { message: `Failed: ${failed}`, type: failed > 0 ? 'fail' : 'log', level: 1 }
          );
          batch.push(
            failed === 0
              ? { message: 'All tests passed!', type: 'pass', level: 1 }
              : { message: 'Some tests failed. See details above.', type: 'fail', level: 1 }
          );
        }
        logsEl.addLog(...batch);
      }
    } catch {}
  };

  runSuite = async ({ file, testNames, el }) => {
    try {
      el.status = 'running';
  const tests = Array.from(el.querySelectorAll('ktf-test'));
      for(const t of tests){
        t.status = 'running';
        const logsEl = t.renderRoot?.getElementById('logs');
        if(logsEl) logsEl.clear();
      }
      const fileLogsEl = el.renderRoot?.getElementById('fileLogs');
      if(fileLogsEl) fileLogsEl.clear();
    } catch {}
    const { showBrowser, delayMs } = getSettings();
    const resp = await fetch(`/runTest?testFile=${encodeURIComponent(file)}&showBrowser=${!!showBrowser}&delayMs=${Number(delayMs||0)}`);
    let data = null;
    try { data = await resp.json(); } catch {}
    if(!resp.ok || (data && data.error)){
      const msg = data?.details || data?.error || `${resp.status} ${resp.statusText}`;
      try {
        const fileLogsEl = el.renderRoot?.getElementById('fileLogs');
        if(fileLogsEl) fileLogsEl.addLog({ message: `Error running tests: ${msg}`, type: 'error', level: 3 });
  const tests = Array.from(el.querySelectorAll('ktf-test'));
        for(const t of tests){ t.status = 'fail'; }
        el.status = 'fail';
      } catch {}
      return;
    }
    const results = data?.results || {};
    const beforeAllLogs = Array.isArray(results.beforeAllLogs) ? results.beforeAllLogs : [];
    const afterAllLogs = Array.isArray(results.afterAllLogs) ? results.afterAllLogs : [];
    const testsMap = results.tests || {};
    try {
      const fileLogsEl = el.renderRoot?.getElementById('fileLogs');
      const heading = msg => ({ message: msg, type: 'progress', level: 3 });
      if(fileLogsEl && beforeAllLogs.length){ fileLogsEl.addLog(heading('== Before All Logs =='), ...beforeAllLogs); }
  const tests = Array.from(el.querySelectorAll('ktf-test'));
      for(const t of tests){
        const name = t.name;
        const info = testsMap[name];
        const logsEl = t.renderRoot?.getElementById('logs');
        if(logsEl){
          const batch = [];
          if(Array.isArray(info?.logs)) batch.push(...info.logs);
          logsEl.addLog(...batch);
        }
        t.status = info?.passed ? 'pass' : 'fail';
      }
      if(fileLogsEl){
        if(afterAllLogs.length) fileLogsEl.addLog(heading('== After All Logs =='), ...afterAllLogs);
        const names = Object.keys(testsMap);
        const total = names.length;
        const passed = names.reduce((acc, n) => acc + (testsMap[n]?.passed ? 1 : 0), 0);
        const failed = total - passed;
        if(total>0){
          fileLogsEl.addLog(
            { message: '=== Test Summary ====', type: 'summary', level: 1 },
            { message: `Total Tests: ${total}`, type: 'summary', level: 1 },
            { message: `Passed: ${passed}`, type: passed>0 ? 'pass' : 'log', level: 1 },
            { message: `Failed: ${failed}`, type: failed>0 ? 'fail' : 'log', level: 1 },
            failed===0
              ? { message: 'All tests passed!', type: 'pass', level: 1 }
              : { message: 'Some tests failed. See details above.', type: 'fail', level: 1 }
          );
        }
      }
      // Recalculate suite status
  const testEls = el.querySelectorAll('ktf-test');
      const statuses = Array.from(testEls).map(x=>x.status);
      let suiteStatus = 'notran';
      if(statuses.includes('running')) suiteStatus = 'running';
      else if(statuses.includes('fail')) suiteStatus = 'fail';
      else if(statuses.length && statuses.every(s => s==='pass')) suiteStatus = 'pass';
      el.status = suiteStatus;
    } catch {}
  };

  /*
    Rendering
  */
  render(){ return html`<slot></slot>`; }
}

customElements.define('ktf-test-framework', TestFrameworkEl);
export default TestFrameworkEl;
