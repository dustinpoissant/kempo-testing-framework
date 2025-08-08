// Browser tests for Collapsible component

const nextTick = () => new Promise(r => setTimeout(r));

export const beforeEach = async () => {
  document.body.innerHTML = '';
  try { localStorage.removeItem('ktf_settings'); } catch {}
};

export default {
  'Collapsible toggles content visibility': async ({ pass, fail }) => {
    try {
      await import('/gui/components/Collapsible.js');
      const el = document.createElement('ktf-collapsible');
      el.appendChild(document.createElement('div')).textContent = 'Content';
      document.body.appendChild(el);
      await nextTick();
      const btn = el.shadowRoot.querySelector('button.title');
      const openedBefore = el.hasAttribute('opened') || el.opened;
      const hasSlotBefore = !!el.shadowRoot.querySelector('div.bt');
      btn.click();
      await nextTick();
      const openedAfter = el.opened === true;
      const hasSlotAfter = !!el.shadowRoot.querySelector('div.bt');
      if (!openedBefore && !hasSlotBefore && openedAfter && hasSlotAfter) pass('ok');
      else fail('collapsible did not toggle as expected');
    } catch (e) { fail(e.stack || String(e)); }
  },

  'Collapsible respects opened attribute and can close': async ({ pass, fail }) => {
    try {
      await import('/gui/components/Collapsible.js');
      const el = document.createElement('ktf-collapsible');
      el.setAttribute('opened', '');
      el.appendChild(document.createElement('div')).textContent = 'Content';
      document.body.appendChild(el);
      await nextTick();
      const btn = el.shadowRoot.querySelector('button.title');
      const initiallyOpen = el.opened === true;
      btn.click();
      await nextTick();
      const afterClose = el.opened === false;
      if (initiallyOpen && afterClose) pass('ok'); else fail('opened attribute not respected or cannot close');
    } catch (e) { fail(e.stack || String(e)); }
  }
};
