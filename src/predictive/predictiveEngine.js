// src/predictive/predictiveEngine.js
// Orchestrates predictive behavior: list rules + heading rules.

(function (global) {
  /**
   * If there's no editorCore yet, provide a very minimal one so
   * toolbar buttons and predictive features have something to call.
   * If you already implement your own editorCore.js, this block will
   * NOT overwrite it.
   */
  function ensureMinimalEditorCore() {
    if (global.editorCore) return;

    const editorEl = document.getElementById('editor');
    if (!editorEl) return;

    function applyInlineStyle(styleApplier) {
      const selection = global.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (range.collapsed) return;

      const fragment = range.extractContents();
      const span = document.createElement('span');
      styleApplier(span.style);
      span.appendChild(fragment);
      range.insertNode(span);

      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      newRange.collapse(false);
      selection.addRange(newRange);
    }


    global.editorCore = {
      toggleBold() {
        document.execCommand('bold');
      },
      toggleItalic() {
        document.execCommand('italic');
      },
      toggleUnderline() {
        document.execCommand('underline');
      },
      applyHeading(level) {
        // Very simple: wrap current block as <h1> / <h2>
        const selection = global.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let block = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        while (block && block.parentElement !== editorEl) {
          block = block.parentElement;
        }
        if (!block) return;

        const tagName = level === 2 ? 'h2' : 'h1';
        const heading = document.createElement(tagName);
        heading.innerHTML = block.innerHTML;
        editorEl.insertBefore(heading, block.nextSibling);
        editorEl.removeChild(block);

        const newRange = document.createRange();
        newRange.selectNodeContents(heading);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      },
      toggleBulletList() {
        document.execCommand('insertUnorderedList');
      },
      toggleNumberedList() {
        document.execCommand('insertOrderedList');
      },
      undo() {
        document.execCommand('undo');
      },
      redo() {
        document.execCommand('redo');
      },
      setFontSize(px) {
        if (!px) return;
        applyInlineStyle((style) => {
          style.fontSize = `${px}px`;
        });
      },
      setFontColor(color) {
        if (!color) return;
        applyInlineStyle((style) => {
          style.color = color;
        });
      },
      setBackgroundColor(color) {
        if (!color) return;
        applyInlineStyle((style) => {
          style.backgroundColor = color;
        });
      },
      setLineSpacing(multiplier) {
        const editorEl = document.getElementById('editor');
        if (!editorEl || !multiplier) return;
        editorEl.style.lineHeight = multiplier;
      },

    };
  }

  function getEditorElement() {
    return document.getElementById('editor');
  }

  /**
   * Find the direct child of #editor that contains the selection.
   */
  function findBlockElementForSelection(selection, editorEl) {
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    let node = range.startContainer;

    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (el && el !== editorEl) {
      if (el.parentElement === editorEl) return el;
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Build context object passed into rule modules.
   */
  function buildContext(event) {
    const editorEl = getEditorElement();
    if (!editorEl) return null;

    const selection = global.getSelection ? global.getSelection() : null;
    const currentBlock = findBlockElementForSelection(selection, editorEl);

    let previousBlock = null;
    let isFirstLine = false;

    if (currentBlock && currentBlock.parentElement === editorEl) {
      previousBlock = currentBlock.previousElementSibling || null;

 
      let firstNonEmpty = null;
      let child = editorEl.firstElementChild;
      while (child) {
        const text = (child.textContent || '').trim();
        if (text.length > 0) {
          firstNonEmpty = child;
          break;
        }
        child = child.nextElementSibling;
      }
      isFirstLine = firstNonEmpty != null && firstNonEmpty === currentBlock;
    }

    return {
      key: event.key,
      editorEl,
      selection,
      currentBlock,
      previousBlock,
      isFirstLine,
    };
  }

  function onEditorKeyup(event) {
    const editorEl = getEditorElement();
    if (!editorEl) return;


    if (event.target !== editorEl && !editorEl.contains(event.target)) {
      return;
    }

    const context = buildContext(event);
    if (!context) return;


    if (global.listRules && typeof global.listRules.applyListRules === 'function') {
      global.listRules.applyListRules(context);
    }


    if (global.headingRules && typeof global.headingRules.applyHeadingRules === 'function') {
      global.headingRules.applyHeadingRules(context);
    }
  }

  function initPredictiveEngine() {
    const editorEl = getEditorElement();
    if (!editorEl) {
      console.warn('[predictiveEngine] #editor not found');
      return;
    }

    ensureMinimalEditorCore();

    editorEl.addEventListener('keyup', onEditorKeyup);
  }


  global.predictiveEngine = {
    initPredictiveEngine,
  };


  document.addEventListener('DOMContentLoaded', () => {
    initPredictiveEngine();
  });
})(window);
