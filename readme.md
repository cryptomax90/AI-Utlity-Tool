# Utility AI Toolkit (Local, No API Keys)

A zero-cost, browser-only toolkit that helps you clean/analyze spreadsheets and summarize meetings into action items. **No servers, no API keys.**

## Features
- **Spreadsheet Cleaner & Analyzer**
  - Upload CSV/XLSX
  - Trim headers/whitespace, remove empty rows, de-duplicate (optional keys)
  - Quick stats + simple bar chart for a numeric column
  - Export cleaned CSV + textual summary
- **Meeting Notes Summarizer**
  - Paste notes/transcripts
  - Frequency-based extractive summary (local)
  - Action-item extraction (owner & due-date heuristics)
  - Export summary + actions (TXT)

## Getting Started
1. Download or clone this repo.
2. Open `index.html` in a modern browser, or host on GitHub Pages.
3. Use the tabs to try the two tools.

## Publish Free via GitHub Pages
1. Create a public repo (e.g., `utility-ai-toolkit`).
2. Commit these files to the repo root.
3. Go to **Settings → Pages** → Source: **Deploy from a branch**, Branch: **main**, Folder: **/root**.
4. Your site will appear at `https://<your-username>.github.io/utility-ai-toolkit/`.

## Roadmap
- XLSX export (SheetJS write support)
- Fuzzy dedupe (Jaro/Levenshtein)
- Better date parsing for action items (chrono-node)
- Optional PWA for offline cache

## License
MIT © You
