# DataFmt

A fast, clean browser-based tool to format raw data into quoted, comma-separated lists — with extra addons.

**[Live demo →](https://yourusername.github.io/data-formatter)**

## Features

- **Quote styles** — single `'…'`, double `"…"`, backtick, or none
- **Separators** — comma+space, comma only, pipe, newline, or custom
- **Addons**
  - Trim whitespace
  - Skip empty lines
  - Remove duplicates
  - Sort (numeric or alphabetical)
  - Uppercase / Lowercase
  - Numbers-only filter
  - Wrap in `[ ]` or `( )`
  - Prefix / Suffix per item
- **Quick templates** — SQL `IN (…)`, JS Array, CSV row, Python list
- **Copy to clipboard** and **Download as .txt**

## Usage

Paste your raw data (one per line, or space/comma-separated) into the input box. Configure your options and copy the result.

## Hosting on GitHub Pages

1. Fork or clone this repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your site will be live at `https://yourusername.github.io/data-formatter`

## Local development

No build step needed — just open `index.html` in a browser.

```bash
git clone https://github.com/yourusername/data-formatter
cd data-formatter
open index.html
```

## License

MIT
