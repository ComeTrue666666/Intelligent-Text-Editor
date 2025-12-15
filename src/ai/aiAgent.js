// src/ai/aiAgent.js
const MODEL = 'deepseek-r1:7b'; // Open-source Mistral 7B Instruct (Apache 2.0)
const OLLAMA_URL = 'http://localhost:11434/api/generate';

function buildPrompt(userPrompt, docText) {
  return `
You are an assistant embedded in a text editor.

User request:
"""${userPrompt}"""

Return only the revised or inserted text. Do not add explanations.
`;
}

// Current document:
// """${docText || '(empty)'}"""

export async function callAI(userPrompt, docText) {
  const payload = {
    model: MODEL,
    prompt: buildPrompt(userPrompt, docText),
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

export function applyTextToSelection(editorEl, text) {
  if (!text) return;
  const selection = document.getSelection();
  if (!selection || !selection.rangeCount) {
    editorEl.insertAdjacentText('beforeend', text);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  // move caret to end of inserted text
  selection.removeAllRanges();
  selection.addRange(range);
}

export function initAIUI(editorEl) {
  const promptInput = document.getElementById('ai-prompt');
  const runBtn = document.getElementById('ai-run');
  const applyBtn = document.getElementById('ai-apply');
  const outputEl = document.getElementById('ai-output');
  const statusEl = document.getElementById('ai-status');

  if (!promptInput || !runBtn || !applyBtn || !outputEl) return;

  let lastResponse = '';

  async function runAgent() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    statusEl.textContent = 'Thinking...';
    runBtn.disabled = true;
    try {
      const docText = editorEl.innerText;
      lastResponse = await callAI(prompt, docText);
      outputEl.textContent = lastResponse;
      statusEl.textContent = 'Ready';
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
