// toolbar/toolbarView.js
// Renders the toolbar UI and connects it to the adaptiveToolbarEngine + usageTracker.

(function (global) {
  const MAIN_TOOL_LIMIT = 6; // how many tools show as main buttons

  const TOOL_ORDER_KEY = 'adaptive_toolbar_custom_order_v1';
  const dragState = { draggingId: null, placeholder: null };


  // ------- Tool Definitions ------- //
  // Each tool should have at least: id, label, icon, handler
  // tags: used by highlight-only/context logic
  const TOOL_DEFINITIONS = [
    {
      id: 'bold',
      label: 'Bold',
      icon: 'B',
      tags: ['text-format'],
      handler: () => {
        global.editorCore && global.editorCore.toggleBold();
      },
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: 'I',
      tags: ['text-format'],
      handler: () => {
        global.editorCore && global.editorCore.toggleItalic();
      },
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: 'U',
      tags: ['text-format'],
      handler: () => {
        global.editorCore && global.editorCore.toggleUnderline();
      },
    },
    {
      id: 'heading1',
      label: 'H1',
      icon: 'H1',
      tags: ['text-format', 'heading'],
      handler: () => {
        global.editorCore && global.editorCore.applyHeading(1);
      },
    },
    {
      id: 'heading2',
      label: 'H2',
      icon: 'H2',
      tags: ['text-format', 'heading'],
      handler: () => {
        global.editorCore && global.editorCore.applyHeading(2);
      },
    },
    {
      id: 'bulletList',
      label: 'Bulleted List',
      icon: '• List',
      tags: ['list'],
      handler: () => {
        global.editorCore && global.editorCore.toggleBulletList();
      },
    },
    {
      id: 'numberedList',
      label: 'Numbered List',
      icon: '1. List',
      tags: ['list'],
      handler: () => {
        global.editorCore && global.editorCore.toggleNumberedList();
      },
    },
    {
      id: 'undo',
      label: 'Undo',
      icon: '⤺',
      tags: ['system'],
      handler: () => {
        global.editorCore && global.editorCore.undo();
      },
    },
    {
      id: 'redo',
      label: 'Redo',
      icon: '⤻',
      tags: ['system'],
      handler: () => {
        global.editorCore && global.editorCore.redo();
      },
    },
        {
      id: 'fontSize',
      label: 'Font Size',
      icon: 'FS',
      tags: ['text-format'],
      control: 'font-size',
      handler: (sizePx) => global.editorCore && global.editorCore.setFontSize(sizePx),
    },
    {
      id: 'fontColor',
      label: 'Font Color',
      icon: 'FC',
      tags: ['text-format'],
      control: 'font-color',
      handler: (color) => global.editorCore && global.editorCore.setFontColor(color),
    },
    {
      id: 'fontBackground',
      label: 'Font Background',
      icon: 'BG',
      tags: ['text-format'],
      control: 'font-bg',
      handler: (color) => global.editorCore && global.editorCore.setBackgroundColor(color),
    },
    {
      id: 'lineSpacing',
      label: 'Line Spacing',
      icon: 'LS',
      tags: ['text-format'],
      control: 'line-spacing',
      handler: (spacing) => global.editorCore && global.editorCore.setLineSpacing(spacing),
    },

  ];

  let currentMode =
    (global.adaptiveToolbarEngine && global.adaptiveToolbarEngine.MODES.COMBINED) ||
    'combined';

  // ------- Context Helper (for highlight-only mode) ------- //

  /**
   * Get a minimal context about current selection.
   * For now we only expose hasSelection, but this can grow later.
   */
  function getEditorContext() {
    const selection = global.getSelection ? global.getSelection() : null;
    const hasSelection = selection && !selection.isCollapsed;
    return {
      hasSelection,
    };
  }

    function loadCustomOrder() {
    try {
      const raw = global.localStorage.getItem(TOOL_ORDER_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('[toolbarView] Failed to read custom order:', err);
      return [];
    }
  }

  function saveCustomOrder(order) {
    try {
      global.localStorage.setItem(TOOL_ORDER_KEY, JSON.stringify(order));
    } catch (err) {
      console.warn('[toolbarView] Failed to save custom order:', err);
    }
  }

  function applyCustomOrder(tools) {
    const saved = loadCustomOrder();
    if (!saved.length) return tools;

    const byId = new Map(tools.map((t) => [t.id, t]));
    const ordered = [];

    saved.forEach((id) => {
      if (byId.has(id)) {
        ordered.push(byId.get(id));
        byId.delete(id);
      }
    });

    // Append any new/unknown tools to the end
    byId.forEach((tool) => ordered.push(tool));
    return ordered;
  } 

  function syncOrderFromDom() {
    const buttons = Array.from(
  document.querySelectorAll('#toolbar-main .toolbar-item, #toolbar-more .toolbar-item')
);

    const order = buttons
      .map((btn) => btn.dataset.toolId)
      .filter(Boolean);
    saveCustomOrder(order);
  }


  // ------- DOM Helpers ------- //

  function createButton(tool, usageContext = {}) {
  const btn = document.createElement('button');
  btn.className = 'toolbar-button toolbar-item';
  btn.type = 'button';
  btn.dataset.toolId = tool.id;
  btn.textContent = tool.icon || tool.label;
  btn.draggable = true;
  btn.addEventListener('dragstart', handleDragStart);
  btn.addEventListener('dragend', handleDragEnd);

  applyUsageScaling(btn, tool.id, usageContext.usageStats, usageContext.maxUsageCount);

  btn.addEventListener('click', () => {
    if (typeof tool.handler === 'function') {
      tool.handler();
    }
    if (global.usageTracker && typeof global.usageTracker.logUsage === 'function') {
      global.usageTracker.logUsage(tool.id);
    }
    renderToolbar();
  });

  return btn;
}


  function createControl(tool) {
    const wrapper = document.createElement('div');
    wrapper.className = 'toolbar-control toolbar-item';
    wrapper.dataset.toolId = tool.id;

    wrapper.draggable = true;
    wrapper.addEventListener('dragstart', handleDragStart);
    wrapper.addEventListener('dragend', handleDragEnd);


    const badge = document.createElement('span');
    badge.className = 'toolbar-control__icon';
    badge.textContent = tool.icon || tool.label;
    wrapper.appendChild(badge);

    const logUse = () => {
      if (global.usageTracker && typeof global.usageTracker.logUsage === 'function') {
        global.usageTracker.logUsage(tool.id);
      }
      renderToolbar();
    };

    if (tool.control === 'font-size') {
      const select = document.createElement('select');
      select.className = 'toolbar-control__select';
      select.appendChild(new Option('Sz', ''));
      [12, 14, 16, 18, 20, 24, 28, 32].forEach((size) => {
        select.appendChild(new Option(`${size}px`, size));
      });
      select.addEventListener('change', (e) => {
        const size = parseInt(e.target.value, 10);
        if (!size || !tool.handler) return;
        tool.handler(size);
        logUse();
      });

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '8';
      input.max = '72';
      input.placeholder = 'px';
      input.className = 'toolbar-control__input';
      input.addEventListener('change', (e) => {
        const value = parseInt(e.target.value, 10);
        if (!value || !tool.handler) return;
        tool.handler(value);
        select.value = '';
        logUse();
      });

      wrapper.append(select, input);
    } else if (tool.control === 'font-color' || tool.control === 'font-bg') {
      const input = document.createElement('input');
      input.type = 'color';
      input.className = 'toolbar-control__color';
      input.value = tool.control === 'font-bg' ? '#fef3c7' : '#111827';
      input.addEventListener('input', (e) => {
        if (typeof tool.handler === 'function') {
          tool.handler(e.target.value);
          logUse();
        }
      });
      wrapper.appendChild(input);
    } else if (tool.control === 'line-spacing') {
      const select = document.createElement('select');
      select.className = 'toolbar-control__select';
      [
        { label: 'LS', value: '' },
        { label: '1.0', value: '1' },
        { label: '1.5', value: '1.5' },
        { label: '2.0', value: '2' },
      ].forEach((opt) => select.appendChild(new Option(opt.label, opt.value)));
      select.addEventListener('change', (e) => {
        const spacing = e.target.value;
        if (!spacing || !tool.handler) return;
        tool.handler(spacing);
        logUse();
      });
      wrapper.appendChild(select);
    }

    return wrapper;
  }


  function createToolElement(tool, usageContext) {
  if (tool.control) {
    return createControl(tool);
  }
  return createButton(tool, usageContext);
}


  function clearElement(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

    function ensurePlaceholder() {
    if (dragState.placeholder) return dragState.placeholder;
    const el = document.createElement('div');
    el.className = 'toolbar-button-placeholder';
    dragState.placeholder = el;
    return el;
  }

  function cleanupDragState() {
    if (dragState.placeholder && dragState.placeholder.parentNode) {
      dragState.placeholder.parentNode.removeChild(dragState.placeholder);
    }
    dragState.placeholder = null;
    dragState.draggingId = null;
  }

  function handleDragStart(e) {
    dragState.draggingId = e.currentTarget.dataset.toolId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragState.draggingId);
    e.currentTarget.classList.add('toolbar-button--dragging');
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('toolbar-button--dragging');
    cleanupDragState();
  }

  function handleDragOver(e) {
    e.preventDefault();
    const container = e.currentTarget;
    const targetBtn = e.target.closest('.toolbar-item');
    const placeholder = ensurePlaceholder();

    // Avoid placing before itself
    if (targetBtn && targetBtn.dataset.toolId === dragState.draggingId) {
      return;
    }

    if (targetBtn) {
      container.insertBefore(placeholder, targetBtn);
    } else {
      container.appendChild(placeholder);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const placeholder = dragState.placeholder;
    const draggingId = dragState.draggingId;
    if (!placeholder || !draggingId) return;

    const draggingEl = document.querySelector(`[data-tool-id="${draggingId}"]`);
    if (draggingEl && placeholder.parentNode) {
      placeholder.replaceWith(draggingEl);
    }

    syncOrderFromDom();
    cleanupDragState();
    renderToolbar();
  }

  function handleDragLeave(e) {
    // If leaving the container entirely, clean up the placeholder
    if (!e.currentTarget.contains(e.relatedTarget)) {
      cleanupDragState();
    }
  }

  function bindDragAndDrop(container) {
    if (!container || container.dataset.dndBound === 'true') return;
    container.dataset.dndBound = 'true';
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragleave', handleDragLeave);
  }

  function applyUsageScaling(el, toolId, usageStats, maxUsageCount) {
  if (!el) return;
  const stats = usageStats && usageStats[toolId];
  const count = (stats && stats.count) || 0;
  if (!maxUsageCount || !count) {
    el.style.removeProperty('--usage-scale');
    return;
  }
  const minScale = 1;
  const maxScale = 1.35; // adjust range if needed
  const normalized = count / maxUsageCount;
  const scale = minScale + normalized * (maxScale - minScale);
  el.style.setProperty('--usage-scale', scale.toFixed(3));
}

  function resetButtonSizes() {
    if (global.usageTracker && typeof global.usageTracker.resetUsage === 'function') {
      global.usageTracker.resetUsage();
    }
    document.querySelectorAll('.toolbar-item').forEach((el) => {
      el.style.removeProperty('--usage-scale');
    });
    renderToolbar();
  }


  // ------- Mode Dropdown ------- //

  function initModeDropdown() {
    const modeSelect = document.getElementById('toolbar-mode-select');
    if (!modeSelect || !global.adaptiveToolbarEngine) return;

    const { MODES } = global.adaptiveToolbarEngine;

    const options = [
      { value: MODES.FREQUENCY, label: 'Frequency' },
      { value: MODES.RECENCY, label: 'Recency' },
      { value: MODES.COMBINED, label: 'Combined' },
      { value: MODES.HIGHLIGHT_ONLY, label: 'Highlight Only' },
      { value: MODES.FIXED, label: 'Fixed' },
    ];

    clearElement(modeSelect);

    options.forEach((opt) => {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if (opt.value === currentMode) {
        optionEl.selected = true;
      }
      modeSelect.appendChild(optionEl);
    });

    modeSelect.addEventListener('change', () => {
      currentMode = modeSelect.value;
      renderToolbar();
    });
  }

  // ------- Render Toolbar ------- //

  function renderToolbar() {
    const mainContainer = document.getElementById('toolbar-main');
    const moreContainer = document.getElementById('toolbar-more');

    if (!mainContainer) {
      console.warn('[toolbarView] Missing #toolbar-main container');
      return;
    }

    const engine = global.adaptiveToolbarEngine;
    if (!engine || typeof engine.getSortedTools !== 'function') {
      console.warn('[toolbarView] adaptiveToolbarEngine not available');
      return;
    }

    const usageStats =
    global.usageTracker && typeof global.usageTracker.getUsageStats === 'function'
      ? global.usageTracker.getUsageStats()
      : {};
  const maxUsageCount = Object.values(usageStats).reduce((max, stats) => {
    const count = (stats && stats.count) || 0;
    return count > max ? count : max;
  }, 0);

  const context = getEditorContext();
  const sortedTools = engine.getSortedTools({
    tools: TOOL_DEFINITIONS,
    mode: currentMode,
    context,
  });

  const orderedTools =
  currentMode === engine.MODES.FIXED
    ? applyCustomOrder(sortedTools)
    : sortedTools;

  clearElement(mainContainer);
  if (moreContainer) clearElement(moreContainer);

  const mainTools = orderedTools.slice(0, MAIN_TOOL_LIMIT);
  const extraTools = orderedTools.slice(MAIN_TOOL_LIMIT);

  const usageContext = { usageStats, maxUsageCount };
  mainTools.forEach((tool) => {
    const btn = createToolElement(tool, usageContext);
    mainContainer.appendChild(btn);
  });

  if (moreContainer && extraTools.length > 0) {
    const label = document.createElement('div');
    label.className = 'toolbar-more-label';
    label.textContent = 'More:';
    moreContainer.appendChild(label);

    extraTools.forEach((tool) => {
      const btn = createToolElement(tool, usageContext);
      btn.classList.add('toolbar-button--secondary');
      moreContainer.appendChild(btn);
    });
  }

  bindDragAndDrop(mainContainer);
  if (moreContainer) bindDragAndDrop(moreContainer);

  }

  // ------- Public Init ------- //

  function initToolbarView() {
    initModeDropdown();
    const resetBtn = document.getElementById('toolbar-reset-sizes');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetButtonSizes);
    }
    renderToolbar();
  }

  const api = {
    initToolbarView,
    renderToolbar,
  };

  global.toolbarView = api;

  // Auto-init when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    initToolbarView();
  });
})(window);
