// src/predictive/headingRules.js
// Heading-related predictive rules: auto Heading 1 for title-like lines.

(function (global) {
  function getEditorElement() {
    return document.getElementById('editor');
  }

  /**
   * Replace a block element (div/p) with <h1> or <h2>, keeping its text
   * and moving the caret into the new heading.
   */
  function convertBlockToHeading(blockEl, level) {
    if (!blockEl || !blockEl.parentElement) return;

    const tagName = level === 2 ? 'h2' : 'h1';
    const isAlreadyHeading =
      blockEl.tagName && blockEl.tagName.toLowerCase() === tagName.toLowerCase();
    if (isAlreadyHeading) return;

    const parent = blockEl.parentElement;
    const heading = document.createElement(tagName);

    // copy the current inline HTML so bold/italic etc. stay
    heading.innerHTML = blockEl.innerHTML;

    parent.insertBefore(heading, blockEl.nextSibling);
    parent.removeChild(blockEl);

    // Move caret to end of the heading
    const range = document.createRange();
    range.selectNodeContents(heading);
    range.collapse(false);

    const sel = global.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /**
   * Decide if a block should be treated as a Heading 1 based on its text
   * and position.
   */
  function shouldBeHeading1(blockEl, editorEl, { isFirstLine }) {
    if (!blockEl || !editorEl) return false;
    const rawText = (blockEl.textContent || '').trim();
    if (!rawText) return false;

    // Too long? Then probably not a heading.
    if (rawText.length > 60) return false;

    const words = rawText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // All caps & short-ish -> likely a title.
    const isAllCaps =
      rawText === rawText.toUpperCase() && /[A-Z]/.test(rawText);
    if (isAllCaps && wordCount <= 8) return true;

    // First non-empty line of the document often is the title.
    if (isFirstLine && wordCount <= 10) {
      return true;
    }

    return false;
  }

  /**
   * Main API: apply heading rules.
   * We mainly run on Enter:
   *   - When Enter is pressed, the "previousBlock" is the line the user just finished.
   * For other keys you could extend the logic later if needed.
   *
   * context:
   *   { key, editorEl, currentBlock, previousBlock, isFirstLine }
   */
  function applyHeadingRules(context) {
    const { key, editorEl, previousBlock, isFirstLine } = context;
    if (!editorEl) return;

    // Only run the auto-heading rule when user finishes a line (presses Enter).
    if (key !== 'Enter') return;

    const targetBlock = previousBlock;
    if (!targetBlock) return;

    // Don't auto-heading list items.
    if (targetBlock.closest && targetBlock.closest('li')) return;

    if (shouldBeHeading1(targetBlock, editorEl, { isFirstLine })) {
      convertBlockToHeading(targetBlock, 1);
    }
  }

  global.headingRules = {
    applyHeadingRules,
  };
})(window);
