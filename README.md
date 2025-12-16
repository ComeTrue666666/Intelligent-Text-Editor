# Adaptive Text Editor

Adaptive Text Editor is a prototype built with **Electron**. It blends a drag-and-drop adaptive toolbar, predictive formatting rules, and a local AI assistant that can rewrite or insert text directly into the editor.

---

## Features

- Electron shell (`main.js`, `preload.js`) loading `src/index.html`
- Rich-text editor with an adaptive toolbar  
  - Usage-based ordering  
  - Drag-to-reorder  
  - Font and formatting controls
- Predictive formatting
  - Auto-convert `- ` / `1. ` into bullet and numbered lists
  - Auto-promote title-like first lines into **H1**
- AI assistant panel
  - Calls a local **Ollama** model
  - Rewrites or inserts text directly into the editor
  - Tracks chat history
- File export
  - Save editor content as `.txt` or `.pdf`
  - Client-side PDF generation
- UI customization
  - Light / dark theme toggle
  - Movable toolbar (top / bottom / left / right)
  - Resizable editor and AI panel columns

---

## Project Structure

- `src/index.html`  
  Page layout, toolbar, editor, and AI panel wiring

- `src/renderer.js`  
  Bootstraps editor APIs, toolbar view, AI UI, file menu, and layout controls

- **Editor Core**
  - `src/editor/editorCore.js` – execCommand-based formatting API

- **Adaptive Toolbar**
  - `src/toolbar/toolbarView.js` – toolbar UI
  - `src/toolbar/adaptiveToolbarEngine.js` – ranking modes
  - `src/toolbar/usageTracker.js` – usage stats via `localStorage`

- **Predictive Formatting**
  - `src/predictive/predictiveEngine.js` – event wiring
  - `src/predictive/listRules.js` – auto lists, exit empty list item
  - `src/predictive/headingRules.js` – title → H1 conversion

- **AI Integration**
  - `src/ai/aiAgent.js` – prompt building, Ollama requests, response cleaning, apply-to-selection logic

- **File Menu / Export**
  - `src/ui/fileMenu.js` – save as TXT or PDF

- **Styles**
  - `src/styles/base.css`
  - `src/styles/toolbar.css`
  - `src/styles/editor.css`

- **Stubs / Placeholders**
  - `src/analytics/*`
  - `src/ui/focusMode.js`
  - `src/ui/miniToolbar.js`
  - `src/ui/outlinePanel.js`
  - `src/editor/selectionManager.js`

---

## Prerequisites

- Node.js **18+**
- npm
- Electron (installed via npm)
- **For AI features**
  - Local Ollama server running at `http://localhost:11434`
  - Model pulled: `deepseek-r1:7b`

---

## Install & Run

```bash
npm install
npm start
```

Electron will open the editor window.

---

## Using the Editor

### Toolbar

- Use buttons for **bold, italic, underline, headings, lists**
- Adjust **font size, text color, background color, line spacing**
- Drag toolbar buttons to reorder them
- “Reset sizes” clears usage-based scaling

### Toolbar Position & Mode

- Position: **top / bottom / left / right**
- Mode:
  - frequency
  - recency
  - combined
  - highlight-only
  - fixed
- Toolbar order and usage persist in `localStorage`

### Predictive Formatting

- Type `- ` or `1. ` at the start of a line → auto list
- Press **Enter** on an empty list item → exit list
- First short line (especially ALL CAPS) becomes **H1** when pressing Enter

### AI Panel

- Enter a prompt and click **Ask AI**
- If the prompt implies editing or replacement:
  - AI output is auto-applied to the current selection
  - Falls back to the full document if nothing is selected
- Otherwise, the response can be manually applied with **Apply to selection**
- Upload text, PDF, or image files to include snippets in the prompt
- Chat history can be collapsed or reset

### Layout & Theme

- Drag the vertical divider to resize editor and AI panel
- Toggle light/dark theme using the sun/moon button

### Export

- **File → Save as .txt**
- **File → Save as PDF**
- PDF export is client-side and ASCII-safe

---

## AI Configuration

- Default endpoint:  
  `OLLAMA_URL = http://localhost:11434/api/generate`
- Model:
  ```js
  MODEL = 'deepseek-r1:7b'
  ```
- Located in: `src/ai/aiAgent.js`

---

## Notes

- The editor uses `contenteditable` + `document.execCommand` for prototype simplicity
- Toolbar usage metrics and custom ordering are stored in `localStorage`
  - `adaptive_editor_tool_usage_v1`
  - `adaptive_toolbar_custom_order_v1`
- PDF export is minimal and intended for plain-text output
- Unused stubs are placeholders for future expansion

---

## Next Steps (Optional)

- Add model selection UI and error handling when Ollama is not running
- Replace `execCommand` with a modern editing model
- Expand predictive rules (checkboxes, code blocks)
- Add automated tests
