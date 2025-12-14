// src/renderer.js
import { createEditorAPI } from './editor/editorCore.js';
import { initToolbar } from './toolbar/toolbarView.js';

window.addEventListener('DOMContentLoaded', () => {
  const editorEl = document.getElementById('editor');
  const toolbarEl = document.getElementById('toolbar');

  if (!editorEl || !toolbarEl) {
    console.error('Editor or toolbar element missing in DOM');
    return;
  }

  // Create an API for editor operations
  const editorAPI = createEditorAPI(editorEl);

  // Initialize the toolbar with fixed buttons
  initToolbar(toolbarEl, editorAPI);
});
