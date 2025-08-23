export const page = './custom-test-page.html';

export default {
  'should find custom element in custom page': ({ pass, fail }) => {
    const el = document.getElementById('custom-test-element');
    if (el && el.textContent === 'Hello from custom page!') {
      pass('Custom element found and content matches');
    } else {
      fail('Custom element not found or content mismatch');
    }
  }
};
