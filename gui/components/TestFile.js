import { LitElement, html, css } from '../lit-all.min.js';
import './Icon.js';
import './Test.js';
import './Logs.js';
import './Collapsible.js';
import { getSettings, subscribe } from './settingsStore.js';

export const statusMap = {
	notran: 'Not Ran',
	running: 'Running',
	pass: 'Pass',
	fail: 'Fail'
};

window.customElements.define('ktf-test-file', class extends LitElement {
	/*
		Properties
	*/
	static properties = {
		file: { type: String, reflect: true },
		testNames: { type: Array },
		status: { type: String, reflect: true }
	}
	#unsubscribe = null;
	constructor(){
		super();
		this.file = '';
		this.testNames = [];
		this.status = 'notran'
	}

	/*
		LifecycleCallbacks
	*/
	firstUpdated() {
		this.shadowRoot.addEventListener('test_status_change', this.testStatusChangeHandler);
		this.#unsubscribe = subscribe(() => this.requestUpdate());
	}

	disconnectedCallback(){
		super.disconnectedCallback();
		if (this.shadowRoot) {
			this.shadowRoot.removeEventListener('test_status_change', this.testStatusChangeHandler);
		}
		if (this.#unsubscribe) this.#unsubscribe();
	}

	/*
		Methods
	*/
	runAllTests = async () => {
		// Set statuses to running and clear existing logs
		this.status = 'running';
		const tests = Array.from(this.shadowRoot.querySelectorAll('ktf-test'));
		for (const testElement of tests) {
			testElement.status = 'running';
			const logsEl = testElement.renderRoot?.getElementById('logs');
			if (logsEl) logsEl.clear();
		}
		const fileLogsEl = this.renderRoot?.getElementById('fileLogs');
		if (fileLogsEl) fileLogsEl.clear();

		try {
			const { showBrowser } = getSettings();
			const resp = await fetch(`/runTest?testFile=${encodeURIComponent(this.file)}&showBrowser=${!!showBrowser}`);
			let data = null;
			try { data = await resp.json(); } catch { /* ignore */ }

			if (!resp.ok || (data && data.error)) {
				const msg = data?.details || data?.error || `${resp.status} ${resp.statusText}`;
				if (fileLogsEl) fileLogsEl.addLog({ message: `Error running tests: ${msg}`, type: 'error', level: 3 });
				for (const testElement of tests) testElement.status = 'fail';
				this.status = 'fail';
				return;
			}

			const fileResults = data?.results ?? {};
			const beforeAllLogs = Array.isArray(fileResults.beforeAllLogs) ? fileResults.beforeAllLogs : [];
			const afterAllLogs = Array.isArray(fileResults.afterAllLogs) ? fileResults.afterAllLogs : [];
			const testsMap = fileResults.tests || {};

			const heading = msg => ({ message: msg, type: 'progress', level: 3 });

			// Add file-level beforeAll logs
			if (fileLogsEl && beforeAllLogs.length) {
				fileLogsEl.addLog(heading('== Before All Logs =='), ...beforeAllLogs);
			}

			// Update each child test with only its own logs and status
			for (const testElement of tests) {
				const name = testElement.name;
				const info = testsMap[name];
				const logsEl = testElement.renderRoot?.getElementById('logs');
				if (logsEl) {
					const batch = [];
					if (Array.isArray(info?.logs)) batch.push(...info.logs);
					logsEl.addLog(...batch);
				}
				testElement.status = info?.passed ? 'pass' : 'fail';
			}

			// AfterAll + Summary at file level
			if (fileLogsEl) {
				if (afterAllLogs.length) fileLogsEl.addLog(heading('== After All Logs =='), ...afterAllLogs);

				const names = Object.keys(testsMap);
				const total = names.length;
				const passed = names.reduce((acc, n) => acc + (testsMap[n]?.passed ? 1 : 0), 0);
				const failed = total - passed;
				if (total > 0) {
					fileLogsEl.addLog(
						{ message: '=== Test Summary ====', type: 'summary', level: 1 },
						{ message: `Total Tests: ${total}`, type: 'summary', level: 1 },
						{ message: `Passed: ${passed}`, type: passed > 0 ? 'pass' : 'log', level: 1 },
						{ message: `Failed: ${failed}`, type: failed > 0 ? 'fail' : 'log', level: 1 },
						failed === 0
							? { message: 'All tests passed!', type: 'pass', level: 1 }
							: { message: 'Some tests failed. See details above.', type: 'fail', level: 1 }
					);
				}
			}

			// Update file status after children update
			this.status = this.calcStatus();
		} catch (e) {
			console.error(e);
			// Mark file and children as failed and log error
			for (const testElement of tests) {
				testElement.status = 'fail';
				const logsEl = testElement.renderRoot?.getElementById('logs');
				if (logsEl) logsEl.addLog({ message: `Error running tests: ${e?.message ?? e}`, type: 'error', level: 3 });
			}
			const fileLogsEl2 = this.renderRoot?.getElementById('fileLogs');
			if (fileLogsEl2) fileLogsEl2.addLog({ message: `Error running tests: ${e?.message ?? e}`, type: 'error', level: 3 });
			this.status = 'fail';
		}
	}
	testStatusChangeHandler = () => {
		this.status = this.calcStatus();
	}

	/*
		Utility Methods
	*/
	calcStatus = () => {
		const testElements = this.shadowRoot.querySelectorAll('ktf-test');
		const statuses = Array.from(testElements).map(el => el.status);

		if (statuses.includes('running')) return 'running';
		if (statuses.includes('fail')) return 'fail';
		if (statuses.length && statuses.every(s => s === 'pass')) return 'pass';
		return 'notran';
	}

	/*
	Rendering
	*/
	render(){
		if(!this.file || !this.testNames.length) return html``;
		const titleText = this.file.replace('tests/', '').replace('.node-test.js', '').replace('.browser-test.js', '').replace('.test.js', '');
		return html`
			<link rel="stylesheet" href="/essential.css">
			<ktf-collapsible>
				<span slot="title" id="title" class="-ml">${titleText}</span>
				<div slot="actions">
					${this.status==='notran' ? html`
						<button class="no-btn d-ib ph" @click=${this.runAllTests} aria-label="Run All Tests">
							<ktf-icon name="play"></ktf-icon>
						</button>
					` : html`
						<span class="d-ib ph status-color" aria-hidden="true">
							<ktf-icon name="${this.status}" animation="${this.status === 'running' ? 'spin' : 'none'}"></ktf-icon>
						</span>
					`}
				</div>
				<div id="details">
					<div id="status">
						<h6>${statusMap[this.status]}</h6>
						${this.status!=='running'?html`
							<button class="primary mb" @click=${this.runAllTests}>Run All Tests</button>
						`:html``}
					</div>
					<ktf-logs id="fileLogs"></ktf-logs>
					${this.testNames.map( testName => html`<ktf-test .file=${this.file} .name=${testName}></ktf-test>`)}
				</div>
			</ktf-collapsible>
		`;
	}

	static styles = css`
		:host {
			--tf_status: var(--tc_default, inherit);
		}
		:host([status="running"]) {
			--tf_status: var(--tc_primary, #3366ff);
		}
		:host([status="pass"]) {
			--tf_status: var(--tc_success, rgb(0, 136, 0));
		}
		:host([status="fail"]) {
			--tf_status: var(--tc_danger, rgb(255, 0, 51));
		}
		#title { font-size: 1.25rem; font-weight: 600; }
		div[slot="actions"] { font-size: 1.25rem; }
		#title,
		#status { color: var(--tf_status); }
		.status-color { color: var(--tf_status); }
	`;
});