/**
 * Utility functions for interacting with Google Web Toolkit (GWT) DOM elements.
 */

/**
 * Programmatically populates an input field inside a GWT frame and triggers
 * the necessary framework events to ensure GWT synchronizes its internal state binding.
 * 
 * @param {import('playwright').Frame} frame - The Playwright Frame object containing the GWT DOM.
 * @param {string} selector - The CSS selector for targeting the GWT inputs.
 * @param {number} index - The zero-based index of the target input among matched elements.
 * @param {string} value - The literal text value to populate.
 */
async function fillGWTInput(frame, selector, index, value) {
  await frame.evaluate(({ sel, idx, val }) => {
    const inputs = Array.from(document.querySelectorAll(sel));
    const inp = inputs[idx];
    if (inp) {
      inp.value = val;
      // Dispatch events sequentially to trigger GWT event handlers
      inp.dispatchEvent(new Event('focus', { bubbles: true }));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }, { sel: selector, idx: index, val: value });
}

module.exports = {
  fillGWTInput
};
