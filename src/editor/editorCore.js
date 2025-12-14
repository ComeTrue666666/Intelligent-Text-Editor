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

  /**
   * Apply a formatting command to the current selection.
   * Uses document.execCommand for Stage 1.
   * @param {string} cmd - e.g., 'bold', 'italic', 'underline'
   */
  function applyCommand(cmd) {
    focusEditor();
    // execCommand is deprecated in spec but works fine for this prototype.
    document.execCommand(cmd, false, null);
  }

  return {
    applyCommand
  };
}
