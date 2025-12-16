import { createEditorAPI } from './editor/editorCore.js';
import { initAIUI } from './ai/aiAgent.js';

window.addEventListener('DOMContentLoaded', () => {
  const editorEl = document.getElementById('editor');
  const toolbarEl = document.getElementById('toolbar');
  const themeToggleBtn = document.getElementById('theme-toggle');

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

  function setTheme(theme) {
    const mode = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', mode);
    if (themeToggleBtn) {
      const isDark = mode === 'dark';
      themeToggleBtn.textContent = isDark ? '☀' : '☾';
      themeToggleBtn.setAttribute(
        'aria-label',
        isDark ? 'Switch to light mode' : 'Switch to dark mode'
      );
      themeToggleBtn.setAttribute(
        'title',
        isDark ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }
    try {
      localStorage.setItem('app-theme', mode);
    } catch (err) {
      console.warn('Unable to persist theme', err);
    }
  }

  const savedTheme = (() => {
    try {
      return localStorage.getItem('app-theme');
    } catch {
      return null;
    }
  })();

  setTheme(savedTheme || 'light');

  themeToggleBtn?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
});
