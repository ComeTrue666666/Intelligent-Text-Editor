// src/ai/aiAgent.js
const MODEL = 'deepseek-r1:7b'; // Open-source Mistral 7B Instruct (Apache 2.0)
const OLLAMA_URL = 'http://localhost:11434/api/generate';

function buildPrompt(userPrompt, docText, selectionText) {
  const selectionBlock = selectionText || '(none)';
  const documentBlock = docText || '(empty)';

  return `
You are an assistant embedded in a text editor. When asked to edit or rewrite, respond with the exact text that should replace the user's current selection. If there is no selection, assume you are replacing the whole document.

Current editor content:
"""${documentBlock}"""

Current selection:
"""${selectionBlock}"""

User request:
"""${userPrompt}"""

Return only the text to insert into the editor. Do not add explanations, quotes, or formatting outside the requested text.
`.trim();
}

function isEditingIntent(prompt) {
  const text = prompt.toLowerCase();
  const keywords = [
    'edit',
    'rewrite',
    'revise',
    'replace',
    'update',
    'modify',
    'change',
    'fix',
    'correct',
    'improve',
    'polish',
    'clean up',
    'formal',
    'casual',
    'shorten',
    'expand',
    'simplify',
    'summarize',
  ];
  return keywords.some((word) => text.includes(word));
}

export async function callAI(userPrompt, docText, selectionText) {
  const payload = {
    model: MODEL,
    prompt: buildPrompt(userPrompt, docText, selectionText),
    stream: false,
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`AI request failed (${res.status}): ${msg}`);
  }

  const data = await res.json();
  return data?.response || '';
}

function createRangeCoveringEditor(editorEl) {
  const range = document.createRange();
  range.selectNodeContents(editorEl);
  return range;
}

function normalizeRangeForApply(editorEl, targetRange) {
  if (targetRange) return targetRange;
  const selection = document.getSelection();
  if (selection && selection.rangeCount) {
    return selection.getRangeAt(0).cloneRange();
  }
  return null;
}

export function applyTextToSelection(editorEl, text, targetRange = null) {
  if (!text) return;
  const range = normalizeRangeForApply(editorEl, targetRange);
  if (!range) {
    editorEl.insertAdjacentText('beforeend', text);
    return;
  }

  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // move caret to end of inserted text
  const selection = document.getSelection();
  const afterRange = document.createRange();
  afterRange.setStartAfter(textNode);
  afterRange.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(afterRange);
}

export function initAIUI(editorEl) {
  const promptInput = document.getElementById('ai-prompt');
  const runBtn = document.getElementById('ai-run');
  const applyBtn = document.getElementById('ai-apply');
  const outputEl = document.getElementById('ai-output');
  const statusEl = document.getElementById('ai-status');

  if (!promptInput || !runBtn || !applyBtn || !outputEl) return;

  let lastResponse = '';

  function captureSelectionDetails() {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return { text: '', range: null };
    }
    const range = selection.getRangeAt(0);
    return {
      text: selection.toString(),
      range: range.cloneRange(),
    };
  }

  async function runAgent() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    statusEl.textContent = 'Thinking...';
    runBtn.disabled = true;
    const editIntent = isEditingIntent(prompt);
    const { text: selectedText, range: savedRange } = captureSelectionDetails();
    const docText = editorEl.innerText;
    const selectionTextForPrompt = selectedText || (editIntent ? docText : '');
    const applyRange = editIntent
      ? savedRange || createRangeCoveringEditor(editorEl)
      : savedRange;

    try {
      lastResponse = await callAI(prompt, docText, selectionTextForPrompt);
      outputEl.textContent = lastResponse;
      if (editIntent && lastResponse) {
        applyTextToSelection(editorEl, lastResponse, applyRange);
        statusEl.textContent = 'Applied';
      } else {
        statusEl.textContent = 'Ready';
      }
    } catch (err) {
      statusEl.textContent = 'Error';
      outputEl.textContent = err.message;
    } finally {
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', runAgent);
  applyBtn.addEventListener('click', () => {
    if (!lastResponse) return;
    applyTextToSelection(editorEl, lastResponse);
  });
}
