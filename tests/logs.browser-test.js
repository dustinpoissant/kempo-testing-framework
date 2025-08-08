// Browser tests for Logs component

const nextTick = () => new Promise(r => setTimeout(r));

export const beforeEach = async () => {
  document.body.innerHTML = '';
  try { localStorage.removeItem('ktf_settings'); } catch {}
};

export default {
  'Logs filters by level and reacts to settings changes': async ({ pass, fail }) => {
    try {
      const { set: setSettings } = (await import('/gui/components/settingsStore.js')).default?.KTF_SETTINGS || window.KTF_SETTINGS || { set: () => {} };
      await import('/gui/components/Logs.js');
      const logs = document.createElement('ktf-logs');
      document.body.appendChild(logs);
      await nextTick();
      logs.addLog({ message: 'L0', level: 0 }, { message: 'L2', level: 2 }, { message: 'L4', level: 4 });
      await nextTick();
      const text1 = logs.shadowRoot.textContent;
      const cond1 = text1.includes('L0') && text1.includes('L2') && !text1.includes('L4');
      window.KTF_SETTINGS.set({ logLevel: 4 });
      await nextTick();
      const text2 = logs.shadowRoot.textContent;
      const cond2 = text2.includes('L4');
      if (cond1 && cond2) pass('ok'); else fail('filtering failed');
    } catch (e) { fail(e.stack || String(e)); }
  },

  'Logs clear removes previous entries': async ({ pass, fail }) => {
    try {
      await import('/gui/components/Logs.js');
      const logs = document.createElement('ktf-logs');
      document.body.appendChild(logs);
      await nextTick();
      logs.addLog({ message: 'A', level: 2 }, { message: 'B', level: 2 });
      await nextTick();
      const before = logs.shadowRoot.textContent.includes('A') && logs.shadowRoot.textContent.includes('B');
      logs.clear();
      await nextTick();
      const after = logs.shadowRoot.textContent.trim().length === 0 || !logs.shadowRoot.textContent.includes('A');
      if (before && after) pass('ok'); else fail('clear did not remove entries');
    } catch (e) { fail(e.stack || String(e)); }
  }
};
