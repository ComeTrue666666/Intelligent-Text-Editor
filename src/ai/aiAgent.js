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

function cleanAIResponse(raw) {
  if (!raw) return '';
  let text = raw.trim();

  // If the model wrapped output in a code fence, prefer the fenced body.
  const fencedMatch = text.match(/```[a-z0-9]*\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    text = fencedMatch[1].trim();
  }

  // Strip stray fences or surrounding quotes.
  text = text.replace(/^```[a-z0-9]*\s*/i, '').replace(/\s*```$/i, '');
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  // Turn escaped newlines/tabs into real characters.
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

  // If the model used --- as separators, take the first delimited block.
  const lines = text.split(/\r?\n/);
  const firstDash = lines.findIndex((l) => /^---\s*$/.test(l.trim()));
  if (firstDash !== -1) {
    const afterFirst = lines.slice(firstDash + 1);
    const secondDash = afterFirst.findIndex((l) => /^---\s*$/.test(l.trim()));
    if (secondDash !== -1) {
      text = afterFirst.slice(0, secondDash).join('\n').trim();
      return text;
    }
  }

  // Drop common leading pleasantries.
  const leadRegex =
    /^(sure|absolutely|here(?:'| i)s|of course|gladly|no problem|alright|okay|ok|great|sounds good|happy to help|certainly|definitely|yep|yeah|got it|here you go|i (?:will|can|have))/i;
  while (lines.length > 1 && (lines[0].trim() === '' || leadRegex.test(lines[0].trim()))) {
    lines.shift();
  }

  // Drop common closing remarks.
  const tailRegex =
    /^(let me know|hope (?:this )?helps|want me to|anything else|need anything|does that work|feel free|i can adjust|i can tweak|happy to)/i;
  while (lines.length > 1 && (lines[lines.length - 1].trim() === '' || tailRegex.test(lines[lines.length - 1].trim()))) {
    lines.pop();
  }

  text = lines.join('\n').trim();
  text = stripFinalAnswerMarker(text);
  text = dedupeParagraphs(text);
  return text;
}

function stripFinalAnswerMarker(text) {
  const match = text.match(/final answer\s*:?/i);
  if (!match) return text;
  const idx = match.index + match[0].length;
  const after = text.slice(idx).trim();
  return after || text;
}

function dedupeParagraphs(text) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return text;

  const seen = [];
  const unique = [];

  const normalize = (p) =>
    p
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();

  paragraphs.forEach((p) => {
    const norm = normalize(p);
    const isDup = seen.some((prev) => norm === prev || norm.includes(prev) || prev.includes(norm));
    if (!isDup) {
      seen.push(norm);
      unique.push(p);
    }
  });

  return unique.join('\n\n').trim();
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
    const candidate = selection.getRangeAt(0).cloneRange();
    const container = candidate.commonAncestorContainer;
    if (editorEl.contains(container)) {
      return candidate;
    }
  }
  return null;
}

function buildNodesFromText(text) {
  const lines = text.split('\n');
  const nodes = [];
  lines.forEach((line, idx) => {
    nodes.push(document.createTextNode(line));
    if (idx !== lines.length - 1) {
      nodes.push(document.createElement('br'));
    }
  });
  return nodes;
}

export function applyTextToSelection(editorEl, text, targetRange = null) {
  if (!text) return;
  const range = normalizeRangeForApply(editorEl, targetRange);
  const nodes = buildNodesFromText(text);

  // If we failed to get a range, append to the editor instead.
  if (!range) {
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => fragment.appendChild(node));
    editorEl.appendChild(fragment);
    return;
  }

  range.deleteContents();
  const fragment = document.createDocumentFragment();
  nodes.forEach((node) => fragment.appendChild(node));
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    const selection = document.getSelection();
    const afterRange = document.createRange();
    afterRange.setStartAfter(lastNode);
    afterRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(afterRange);
  }
}

export function initAIUI(editorEl) {
  const promptInput = document.getElementById('ai-prompt');
  const runBtn = document.getElementById('ai-run');
  const applyBtn = document.getElementById('ai-apply');
  const newChatBtn = document.getElementById('ai-new-chat');
  const toggleHistoryBtn = document.getElementById('ai-toggle-history');
  const historyEl = document.getElementById('ai-history');
  const statusEl = document.getElementById('ai-status');

  if (
    !promptInput ||
    !runBtn ||
    !applyBtn ||
    !historyEl ||
    !newChatBtn ||
    !toggleHistoryBtn
  ) {
    return;
  }

  let lastResponse = '';
  let chatHistory = [];
  let isHistoryCollapsed = false;

  function renderHistory() {
    historyEl.innerHTML = '';
    chatHistory.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'ai-history-item';

      const roleEl = document.createElement('div');
      roleEl.className = 'ai-history-role';
      roleEl.textContent = entry.role === 'user' ? 'You' : 'AI';

      const textEl = document.createElement('div');
      textEl.className = 'ai-history-text';
      textEl.textContent = entry.text;

      item.appendChild(roleEl);
      item.appendChild(textEl);
      historyEl.appendChild(item);
    });
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function addToHistory(role, text) {
    if (!text) return;
    chatHistory.push({ role, text });
    renderHistory();
  }

  function resetChat() {
    chatHistory = [];
    lastResponse = '';
    promptInput.value = '';
    statusEl.textContent = 'Idle';
    renderHistory();
    setHistoryCollapsed(false);
  }

  function setHistoryCollapsed(collapsed) {
    isHistoryCollapsed = collapsed;
    historyEl.classList.toggle('collapsed', collapsed);
    toggleHistoryBtn.textContent = collapsed ? 'Expand history' : 'Collapse history';
    toggleHistoryBtn.setAttribute('aria-expanded', String(!collapsed));
  }

  setHistoryCollapsed(false);
  renderHistory();

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
    promptInput.value = '';
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
      addToHistory('user', prompt);
      const raw = await callAI(prompt, docText, selectionTextForPrompt);
      lastResponse = cleanAIResponse(raw);

      addToHistory('assistant', lastResponse);
      if (editIntent && lastResponse) {
        applyTextToSelection(editorEl, lastResponse, applyRange);
        statusEl.textContent = 'Applied';
      } else {
        statusEl.textContent = 'Ready';
      }
    } catch (err) {
      statusEl.textContent = 'Error';
      addToHistory('assistant', err.message);
    } finally {
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', runAgent);
  applyBtn.addEventListener('click', () => {
    if (!lastResponse) return;
    applyTextToSelection(editorEl, lastResponse);
  });
  newChatBtn.addEventListener('click', resetChat);
  toggleHistoryBtn.addEventListener('click', () => {
    setHistoryCollapsed(!isHistoryCollapsed);
  });
}
