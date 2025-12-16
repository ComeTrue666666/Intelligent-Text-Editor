// src/ui/fileMenu.js
// Handles the File tab menu and export actions for the editor.

function getEditorPlainText(editorEl) {
  if (!editorEl) return '';
  return (editorEl.innerText || '').replace(/\u00a0/g, ' ');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function normalizeToAscii(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '?');
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdfFromText(text) {
  const safeText = normalizeToAscii(text).replace(/\r\n/g, '\n');
  const lines = safeText.split('\n');
  const printableLines = lines.length ? lines : [' '];
  const contentLines = printableLines
    .map((line) => `(${escapePdfText(line || ' ')}) Tj\nT*`)
    .join('\n');

  const contentStream = [
    'BT',
    '/F1 12 Tf',
    '72 720 Td',
    '14 TL',
    contentLines,
    'ET',
  ].join('\n');

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(contentStream);
  const contentLength = contentBytes.length;

  const chunks = [];
  const offsets = [];
  let length = 0;

  function pushChunk(str, isObject = false) {
    if (isObject) {
      offsets.push(length);
    }
    chunks.push(str);
    length += str.length;
  }

  pushChunk('%PDF-1.4\n');
  pushChunk('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n', true);
  pushChunk('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n', true);
  pushChunk(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    true
  );
  pushChunk(
    `4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    true
  );
  pushChunk('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n', true);

  const xrefStart = length;
  const xrefLines = ['xref', `0 ${offsets.length + 1}`, '0000000000 65535 f '];
  offsets.forEach((offset) => {
    xrefLines.push(`${String(offset).padStart(10, '0')} 00000 n `);
  });

  const trailer = [
    'trailer',
    `<< /Size ${offsets.length + 1} /Root 1 0 R >>`,
    'startxref',
    xrefStart.toString(),
    '%%EOF',
  ];

  const pdfString = chunks.join('') + xrefLines.join('\n') + '\n' + trailer.join('\n');
  return new Blob([pdfString], { type: 'application/pdf' });
}

function saveAsTxt(editorEl) {
  const text = getEditorPlainText(editorEl);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, 'document.txt');
}

function saveAsPdf(editorEl) {
  const text = getEditorPlainText(editorEl);
  const blob = buildPdfFromText(text || ' ');
  downloadBlob(blob, 'document.pdf');
}

export function initFileMenu(editorEl) {
  const toggle = document.getElementById('file-tab-toggle');
  const menu = document.getElementById('file-menu');
  const txtBtn = document.getElementById('save-as-txt');
  const pdfBtn = document.getElementById('save-as-pdf');

  if (!toggle || !menu || !txtBtn || !pdfBtn) {
    return;
  }

  let isOpen = false;

  function setMenuState(open) {
    isOpen = open;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function toggleMenu() {
    setMenuState(!isOpen);
  }

  function handleOutsideClick(event) {
    if (!isOpen) return;
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      setMenuState(false);
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      setMenuState(false);
    }
  }

  toggle.addEventListener('click', toggleMenu);
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeydown);

  txtBtn.addEventListener('click', () => {
    saveAsTxt(editorEl);
    setMenuState(false);
  });

  pdfBtn.addEventListener('click', () => {
    saveAsPdf(editorEl);
    setMenuState(false);
  });
}
