import { createEditorAPI } from './editor/editorCore.js';
import { initAIUI } from './ai/aiAgent.js';
import { initFileMenu } from './ui/fileMenu.js';

window.addEventListener('DOMContentLoaded', () => {
  const editorEl = document.getElementById('editor');
  const toolbarEl = document.getElementById('toolbar');
  const toolbarPositionSelect = document.getElementById('toolbar-position-select');
  const writingColumn = document.querySelector('.writing-column');
  const assistantColumn = document.querySelector('.assistant-column');
  const resizer = document.getElementById('column-resizer');
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
  initFileMenu(editorEl);

  // Toolbar position control
  const POSITION_KEY = 'toolbar-position';
  const allowedPositions = ['top', 'bottom', 'left', 'right'];

  function applyToolbarPosition(position) {
    const pos = allowedPositions.includes(position) ? position : 'top';
    allowedPositions.forEach((p) => {
      document.body.classList.remove(`toolbar-pos-${p}`);
    });
    document.body.classList.add(`toolbar-pos-${pos}`);
    if (toolbarPositionSelect) {
      toolbarPositionSelect.value = pos;
    }
    try {
      localStorage.setItem(POSITION_KEY, pos);
    } catch (err) {
      console.warn('Unable to persist toolbar position', err);
    }
  }

  const savedPosition = (() => {
    try {
      return localStorage.getItem(POSITION_KEY);
    } catch {
      return null;
    }
  })();
  applyToolbarPosition(savedPosition || 'top');

  toolbarPositionSelect?.addEventListener('change', () => {
    applyToolbarPosition(toolbarPositionSelect.value);
  });

  // Column resize behavior
  if (resizer && writingColumn && assistantColumn) {
    const workspace = document.querySelector('.workspace');
    const MIN_LEFT = 400;
    const MIN_RIGHT = 260;
    let startX = 0;
    let startLeft = 0;
    let startRight = 0;

    function applySizes(targetLeft) {
      const available = workspace.getBoundingClientRect().width - resizer.offsetWidth;
      const newLeft = Math.min(Math.max(MIN_LEFT, targetLeft), available - MIN_RIGHT);
      const newRight = Math.max(MIN_RIGHT, available - newLeft);

      writingColumn.style.flex = `1 1 ${newLeft}px`;
      assistantColumn.style.flex = `0 0 ${newRight}px`;
      writingColumn.style.width = '';
      assistantColumn.style.width = '';
    }

    function onMouseMove(e) {
      const delta = e.clientX - startX;
      const targetLeft = startLeft + delta;
      applySizes(targetLeft);
    }

    function stopResize() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.userSelect = '';
    }

    function startResize(e) {
      const leftRect = writingColumn.getBoundingClientRect();
      const rightRect = assistantColumn.getBoundingClientRect();
      startX = e.clientX;
      startLeft = leftRect.width;
      startRight = rightRect.width;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', stopResize);
      document.body.style.userSelect = 'none';
    }

    resizer.addEventListener('mousedown', startResize);
    resizer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const delta = e.key === 'ArrowLeft' ? -20 : 20;
        const currentLeft = writingColumn.getBoundingClientRect().width + delta;
        applySizes(currentLeft);
        e.preventDefault();
      }
    });
  }

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
