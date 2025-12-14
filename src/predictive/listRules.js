// src/predictive/listRules.js
// List-related predictive rules: bullets, numbered lists, exit list.

(function (global) {
  /**
   * Helper: get the main editor element.
   */
  function getEditorElement() {
    return document.getElementById('editor');
  }

  /**
   * Helper: climb up from a node until we reach a direct child of #editor.
   */
  function findBlockElement(node, editorEl) {
    if (!node) return null;
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (el && el !== editorEl) {
      if (el.parentElement === editorEl) return el;
      el = el.parentElement;
    }
    return el === editorEl ? null : el;
  }

  /**
   * Create a <ul>/<ol><li> structure replacing the current block.
   * kind: 'bullet' | 'numbered'
   */
  function convertBlockToList(blockEl, kind) {
    if (!blockEl || !blockEl.parentElement) return;

    const editorEl = blockEl.parentElement;
    const rawText = blockEl.textContent || '';
    let text = rawText;

    // Remove leading marker "- " or "1. " from the text
    if (kind === 'bullet') {
      text = text.replace(/^\s*-\s+/, '');
    } else if (kind === 'numbered') {
      // matches "1. ", "23. ", etc. at start
      text = text.replace(/^\s*\d+\.\s+/, '');
    }

    const listTag = kind === 'bullet' ? 'ul' : 'ol';

    const listEl = document.createElement(listTag);
    const li = document.createElement('li');

    // If text became empty, keep an empty li so user can type.
    li.textContent = text;

    listEl.appendChild(li);
    editorEl.insertBefore(listEl, blockEl.nextSibling);
    editorEl.removeChild(blockEl);

    // Move caret into the <li> at the end
    const range = document.createRange();
    range.selectNodeContents(li);
    range.collapse(false); // move to end

    const sel = global.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /**
   * Exit a list if we are on an empty <li> and Enter was pressed.
   * This removes the empty <li> and inserts a new block (div) after the list.
   */
  function exitListFromEmptyItem(listItem) {
    if (!listItem) return;

    const listEl = listItem.parentElement;
    if (!listEl || !listEl.parentElement) return;

    const parent = listEl.parentElement;
    const editorEl = getEditorElement();
    if (!editorEl || parent !== editorEl) return;

    const isEmpty = (listItem.textContent || '').trim().length === 0;
    if (!isEmpty) return;

    // Remove the empty list item
    listEl.removeChild(listItem);

    // If list is now empty, remove it fully
    if (!listEl.querySelector('li')) {
      parent.removeChild(listEl);
    }

    // Create a new normal block after the list
    const newBlock = document.createElement('div');
    // Add a <br> so caret positioning works in some browsers
    newBlock.appendChild(document.createElement('br'));

    // Insert after list (or where it was if removed)
    if (listEl.parentElement === parent) {
      parent.insertBefore(newBlock, listEl.nextSibling);
    } else {
      // listEl was removed; insert where it used to be
      parent.appendChild(newBlock);
    }

    // Move caret into the new block
    const range = document.createRange();
    range.selectNodeContents(newBlock);
    range.collapse(true);

    const sel = global.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  /**
   * Main API: apply list rules on keyup.
   * - Detect "- " or "1. " at start of a line -> convert to list.
   * - If in an empty <li> and Enter pressed -> exit list.
   *
   * context:
   *   { key, editorEl, currentBlock, previousBlock, selection }
   */
  function applyListRules(context) {
    const { key, editorEl, currentBlock } = context;
    if (!editorEl || !currentBlock) return;

    // --- Case 1: Exit list on empty item + Enter ---
    if (key === 'Enter') {
      const li = currentBlock.closest && currentBlock.closest('li');
      if (li) {
        const text = (li.textContent || '').trim();
        if (text.length === 0) {
          exitListFromEmptyItem(li);
          return;
        }
      }
    }

    // --- Case 2: Start list when typing "- " or "1. " ---
    // We only need to check when user types regular text / space.
    // (No need to handle all keys; this keeps it cheap.)
    const text = (currentBlock.textContent || '').replace(/\u00a0/g, ' '); // normalize nbsp

    // Already inside a list? Then we don't try to re-start a list here.
    const alreadyInList =
      (currentBlock.closest && currentBlock.closest('li')) ? true : false;
    if (alreadyInList) return;

    const trimmedStart = text.trimStart();

    if (/^-\s+$/.test(trimmedStart) || /^-\s+\S/.test(trimmedStart)) {
      // Pattern like "- " at start
      convertBlockToList(currentBlock, 'bullet');
      return;
    }

    if (/^\d+\.\s+\S?/.test(trimmedStart)) {
      // Pattern like "1. " at start
      convertBlockToList(currentBlock, 'numbered');
      return;
    }
  }

  global.listRules = {
    applyListRules,
  };
})(window);
