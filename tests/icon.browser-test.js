// Browser tests for Icon component

const nextTick = () => new Promise(r => setTimeout(r));

export const beforeEach = async () => {
  document.body.innerHTML = '';
  try { localStorage.removeItem('ktf_settings'); } catch {}
};

export default {
  'Icon loads via fetch and caches results': async ({ pass, fail }) => {
    try {
      await import('/gui/components/Icon.js');
      const originalFetch = window.fetch;
      let calls = 0;
      window.fetch = async (url) => {
        calls++;
        if (String(url).endsWith('/icons/test.svg')) {
          return { ok: true, text: async () => '<svg><g id="ok"/></svg>' };
        }
        return { ok: false, text: async () => '' };
      };
      const a = document.createElement('ktf-icon');
      a.name = 'test';
      document.body.appendChild(a);
      await nextTick(); await nextTick();
      const firstLoaded = a.shadowRoot.innerHTML.includes('id="ok"');
      window.fetch = async () => { throw new Error('blocked'); };
      const b = document.createElement('ktf-icon');
      b.name = 'test';
      document.body.appendChild(b);
      await nextTick(); await nextTick();
      const secondLoaded = b.shadowRoot.innerHTML.includes('id="ok"');
      window.fetch = originalFetch;
      if (firstLoaded && secondLoaded) pass('ok'); else fail('icon did not cache/fetch as expected');
    } catch (e) { fail(e.stack || String(e)); }
  },

  'Icon falls back when fetch fails': async ({ pass, fail }) => {
    try {
      await import('/gui/components/Icon.js');
      const originalFetch = window.fetch;
      window.fetch = async () => ({ ok: false, text: async () => '' });
      const a = document.createElement('ktf-icon');
      a.name = 'does-not-exist';
      document.body.appendChild(a);
      await nextTick(); await nextTick();
      const hasSvg = a.shadowRoot.innerHTML.includes('<svg');
      window.fetch = originalFetch;
      if (hasSvg) pass('ok'); else fail('fallback svg missing');
    } catch (e) { fail(e.stack || String(e)); }
  }
};
