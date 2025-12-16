****Adaptive Text Editor****

Adaptive text editor prototype built with Electron. It blends a drag-and-drop adaptive toolbar, predictive formatting rules, and a local AI assistant to rewrite or insert text directly into the editor.

**Features**

Electron shell (main.js, preload.js) loading src/index.html
Rich-text editor with adaptive toolbar (usage-based ordering, drag-to-reorder, font controls)
Predictive formatting: auto-convert “- ”/“1. ” to lists; auto-promote title-like first lines to H1
AI agent panel that calls a local Ollama model to rewrite/insert text and track chat history
File tab to export editor content as .txt or .pdf (client-side PDF builder)
Theme toggle, movable toolbar (top/bottom/left/right), resizable editor/assistant columns

**Project Structure**

src/index.html – page layout, toolbar + editor + AI panel wiring
src/renderer.js – bootstraps editor API, toolbar view, AI UI, file menu, layout controls
Editor core: src/editor/editorCore.js (execCommand-based formatting API)
Adaptive toolbar: src/toolbar/toolbarView.js (UI), src/toolbar/adaptiveToolbarEngine.js (ranking modes), src/toolbar/usageTracker.js (localStorage stats)
Predictive rules: src/predictive/predictiveEngine.js (wires listeners), src/predictive/listRules.js (auto lists, exit empty list item), src/predictive/headingRules.js (title → H1)
AI: src/ai/aiAgent.js (prompting, Ollama request, response cleaning, apply-to-selection)
File menu/export: src/ui/fileMenu.js (Save as TXT/PDF)
Styles: src/styles/base.css, src/styles/toolbar.css, src/styles/editor.css
Stubs/placeholders: src/analytics/*, src/ui/focusMode.js, src/ui/miniToolbar.js, src/ui/outlinePanel.js, src/editor/selectionManager.js

**Prerequisites**

Node.js 18+ and npm
Electron installed via npm install
(For AI) Local Ollama server at http://localhost:11434 with model deepseek-r1:7b pulled
Install & Run

Install deps: npm install
Start the app: npm start
Electron will open the editor window.
Using the Editor

Toolbar: Click buttons or controls for bold/italic/underline, headings, lists, font size/color/bg, line spacing. Drag buttons to reorder; the “Reset sizes” button clears usage scaling.
Toolbar position/mode: Use the position dropdown (top/bottom/left/right) and mode dropdown (frequency, recency, combined, highlight-only, fixed). Orders and usage persist in localStorage.
Predictive formatting: Type “- ” or “1. ” at the start of a new line to auto-convert to bullet/numbered list. Press Enter on an empty list item to exit the list. First short line (esp. all-caps) becomes H1 when you press Enter.
AI panel: Enter a prompt and click “Ask AI”. If the prompt looks like an edit/replace request, the AI response is auto-applied to the current selection (or whole doc if nothing is selected). Otherwise it just returns text you can apply with “Apply to selection.” Upload text/PDF/image to include a snippet in the prompt. History can be collapsed/reset.
Layout & theme: Drag the vertical resizer between editor and AI panel; toggle light/dark theme via the sun/moon button.
Export: File tab → “Save as .txt” or “Save as PDF” (client-side PDF builder). Output uses ASCII-safe text.
AI Configuration

Default endpoint: OLLAMA_URL = http://localhost:11434/api/generate in src/ai/aiAgent.js
Model: MODEL = 'deepseek-r1:7b'
To change, edit those constants or wire env-driven config.

**Notes**

The editor uses contenteditable + document.execCommand for prototype simplicity.
Usage metrics and custom toolbar order are stored in localStorage (adaptive_editor_tool_usage_v1, adaptive_toolbar_custom_order_v1).
PDF export is minimal and intended for plain text output.
Unused stubs (analytics, outline, mini toolbar, focus mode) are placeholders for future expansion.
Next steps (optional)

Add model/config UI for the AI panel and error handling when Ollama is not running.
Replace execCommand with a modern editing model (ranges + custom formatting).
Expand predictive rules (e.g., checkboxes, code blocks) and add tests around them.
