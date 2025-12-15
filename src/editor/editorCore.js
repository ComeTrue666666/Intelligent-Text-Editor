// src/editor/editorCore.js

/**
 * Creates an API for interacting with the rich-text editor.
 * @param {HTMLElement} editorElement - The contenteditable div.
 */
export function createEditorAPI(editorElement) {
  if (!editorElement) {
    throw new Error('editorElement is required');
  }

  function focusEditor() {
    editorElement.focus();
  }

  function exec(cmd, value = null) {
    focusEditor();
    // execCommand is deprecated but works for this prototype.
    document.execCommand(cmd, false, value);
  }

  /**
   * Apply a formatting command to the current selection.
   * Uses document.execCommand for Stage 1.
   * @param {string} cmd - e.g., 'bold', 'italic', 'underline'
   */
  function applyCommand(cmd) {
    exec(cmd);
  }

  function applyInlineStyle(styleApplier) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const fragment = range.extractContents();
    const span = document.createElement('span');
    styleApplier(span.style);
    span.appendChild(fragment);
    range.insertNode(span);

    // Move caret to end of the applied span
    selection.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    newRange.collapse(false);
    selection.addRange(newRange);
  }

  function toggleBold() {
    exec('bold');
  }

  function toggleItalic() {
    exec('italic');
  }

  function toggleUnderline() {
    exec('underline');
  }

  function applyHeading(level) {
    const tag = level === 2 ? 'H2' : 'H1';
    exec('formatBlock', tag);
  }

  function toggleBulletList() {
    exec('insertUnorderedList');
  }

  function toggleNumberedList() {
    exec('insertOrderedList');
  }

  function undo() {
    exec('undo');
  }

  function redo() {
    exec('redo');
  }

  function setFontSize(px) {
    if (!px) return;
    applyInlineStyle((style) => {
      style.fontSize = `${px}px`;
    });
  }

  function setFontColor(color) {
    if (!color) return;
    applyInlineStyle((style) => {
      style.color = color;
    });
  }

  function setBackgroundColor(color) {
    if (!color) return;
    applyInlineStyle((style) => {
      style.backgroundColor = color;
    });
  }

  function setLineSpacing(multiplier) {
    if (!multiplier) return;
    editorElement.style.lineHeight = multiplier;
  }

  return {
    applyCommand,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    applyHeading,
    toggleBulletList,
    toggleNumberedList,
    undo,
    redo,
    setFontSize,
    setFontColor,
    setBackgroundColor,
    setLineSpacing,
  };
}
