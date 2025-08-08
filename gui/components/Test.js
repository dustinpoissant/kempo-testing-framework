import { LitElement, html, css } from '../lit-all.min.js';
import { statusMap } from './TestFile.js';
import './Icon.js';
import './Logs.js';
import './Collapsible.js';
import { getSettings, subscribe } from './settingsStore.js';

window.customElements.define('ktf-test', class extends LitElement {
	static properties = {
		file: { type: String, reflect: true },
		name: { type: String, reflect: true },
		status: { type: String, reflect: true }
	}
	#unsubscribe = null;
	constructor(){
		super();
		this.file = '';
		this.name = '';
		this.status = 'notran';
	}

	connectedCallback(){
		super.connectedCallback();
		this.#unsubscribe = subscribe(() => this.requestUpdate());
	}
	disconnectedCallback(){
		super.disconnectedCallback();
		if (this.#unsubscribe) this.#unsubscribe();
	}

	updated(changedProps){
		if(changedProps.has('status')){
			this.dispatchEvent(new CustomEvent('test_status_change', {
				detail: {status: this.status},
				bubbles: true,
				composed: true
			}));
		}
	}

	runTest = async () => {
		this.status = 'running';
		const logsEl = this.renderRoot?.getElementById('logs');
		if (logsEl) logsEl.clear();
		try {
			const { showBrowser } = getSettings();
			const resp = await fetch(`/runTest?testFile=${encodeURIComponent(this.file)}&testNames=${encodeURIComponent(this.name)}&showBrowser=${!!showBrowser}`);
			let data = null;
			try { data = await resp.json(); } catch { /* ignore */ }
			console.log(data);

			if (!resp.ok || (data && data.error)) {
				const msg = data?.details || data?.error || `${resp.status} ${resp.statusText}`;
				if (logsEl) logsEl.addLog({ message: `Error running test: ${msg}`, type: 'error', level: 3 });
				this.status = 'fail';
				return;
			}

			const fileResults = data?.results ?? {};
			const beforeAllLogs = Array.isArray(fileResults.beforeAllLogs) ? fileResults.beforeAllLogs : [];
			const afterAllLogs = Array.isArray(fileResults.afterAllLogs) ? fileResults.afterAllLogs : [];
			const testInfo = fileResults.tests?.[this.name] ?? null;
			const testLogs = Array.isArray(testInfo?.logs) ? testInfo.logs : [];

			this.status = testInfo?.passed ? 'pass' : 'fail';

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
		} catch (e) {
			console.error(e);
			this.status = 'fail';
			if (logsEl) logsEl.addLog({ message: `Error running test: ${e?.message ?? e}`, type: 'error', level: 3 });
		}
	}

	render(){
		if(!this.file || !this.name) return html``;
		return html`
			<link rel="stylesheet" href="/essential.css">
			<ktf-collapsible>
				<span slot="title" id="title" class="-ml">
					${this.name}
				</span>
				<div slot="actions">
					${this.status==='notran' ? html`
						<button class="no-btn d-ib ph" @click=${this.runTest} aria-label="Run Test">
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
					</div>
					${this.status!=='running'?html`
						<button class="primary mb" @click=${this.runTest}>Run Test</button>
					`:html``}
					<ktf-logs id="logs"></ktf-logs>
				</div>
			</ktf-collapsible>
		`;
	}

	static styles = css`
		:host {
			--tc_status: var(--tc_default, inherit);
		}
		:host([status="running"]) {
			--tc_status: var(--tc_primary, #3366ff);
		}
		:host([status="pass"]) {
			--tc_status: var(--tc_success, rgb(0, 136, 0));
		}
		:host([status="fail"]) {
			--tc_status: var(--tc_danger, rgb(255, 0, 51));
		}
		#title { font-size: 1rem; font-weight: 600; }
		div[slot="actions"] { font-size: 1rem; }
		#title,
		#status {
			color: var(--tc_status);
		}
		.status-color { color: var(--tc_status); }
	`;
});
