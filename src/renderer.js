import { createEditorAPI } from './editor/editorCore.js';
import { initAIUI } from './ai/aiAgent.js';

window.addEventListener('DOMContentLoaded', () => {
  const editorEl = document.getElementById('editor');
  const toolbarEl = document.getElementById('toolbar');

  if (!editorEl || !toolbarEl) {
    console.error('Editor or toolbar element missing in DOM');
    return;
  }

  const editorAPI = createEditorAPI(editorEl);
  window.editorCore = editorAPI; // expose for toolbarView.js

  if (window.toolbarView && typeof window.toolbarView.initToolbarView === 'function') {
    window.toolbarView.initToolbarView();
  } else {
    console.error('toolbarView not found on window');
  }

  initAIUI(editorEl);
});
