/**
 * ADDONS CONFIGURATION
 * ====================
 * To add a new addon, just append an object to the ADDONS array below.
 * No changes needed in index.html, style.css, or app.js.
 *
 * Each addon object supports these fields:
 *
 *   id        {string}   Unique ID. A checkbox <input id="cb-{id}"> will be created.
 *   name      {string}   Label shown in the UI.
 *   desc      {string}   Short description shown under the label.
 *   default   {boolean}  Whether the checkbox is checked on page load.
 *
 *   -- Optional: sub-controls rendered below the checkbox when enabled --
 *   subType   {string}   'text'   → a text input  (value accessed via sub-{id})
 *                        'pills'  → a pill toggle  (value accessed via sub-{id} active pill)
 *   subLabel  {string}   Placeholder text (for 'text') or ignored (for 'pills').
 *   subPills  {Array}    Required for subType:'pills'. Array of { label, val } objects.
 *   subDefault {string}  Default value for 'text', or default active val for 'pills'.
 *
 *   -- The transform function --
 *   apply(items, subValue)
 *              {Function} Receives the current array of strings and the sub-control
 *                         value (string for 'text', active val for 'pills', or null).
 *                         Must return a new array of strings.
 *
 * EXAMPLES at the bottom of this file show how to add more.
 */

const ADDONS = [

  // ── Core hygiene ──────────────────────────────────────────────────────────

  {
    id: 'trim',
    name: 'Trim whitespace',
    desc: 'Remove leading/trailing spaces from each item',
    default: true,
    apply: (items) => items.map(x => x.trim()),
  },

  {
    id: 'empty',
    name: 'Skip empty lines',
    desc: 'Ignore blank or whitespace-only lines',
    default: true,
    apply: (items) => items.filter(x => x.trim() !== ''),
  },

  {
    id: 'dedup',
    name: 'Remove duplicates',
    desc: 'Keep only unique values (case-sensitive)',
    default: false,
    apply: (items) => [...new Set(items)],
  },

  // ── Ordering ──────────────────────────────────────────────────────────────

  {
    id: 'sort',
    name: 'Sort items',
    desc: 'Numeric sort if all numbers, else alphabetical',
    default: false,
    apply: (items) => {
      const allNum = items.every(x => !isNaN(Number(x)));
      return allNum
        ? [...items].sort((a, b) => Number(a) - Number(b))
        : [...items].sort();
    },
  },

  {
    id: 'reverse',
    name: 'Reverse order',
    desc: 'Flip the order of all items',
    default: false,
    apply: (items) => [...items].reverse(),
  },

  // ── Case ──────────────────────────────────────────────────────────────────

  {
    id: 'upper',
    name: 'Uppercase',
    desc: 'Convert all items to UPPERCASE',
    default: false,
    exclusiveGroup: 'case',
    apply: (items) => items.map(x => x.toUpperCase()),
  },

  {
    id: 'lower',
    name: 'Lowercase',
    desc: 'Convert all items to lowercase',
    default: false,
    exclusiveGroup: 'case',
    apply: (items) => items.map(x => x.toLowerCase()),
  },

  // ── Filtering ─────────────────────────────────────────────────────────────

  {
    id: 'numonly',
    name: 'Numbers only',
    desc: 'Filter out any non-numeric items',
    default: false,
    apply: (items) => items.filter(x => x !== '' && !isNaN(Number(x))),
  },

  {
    id: 'stripchars',
    name: 'Strip characters',
    desc: 'Remove specific characters from each item',
    default: false,
    subType: 'text',
    subLabel: 'Chars to remove, e.g.  | - _',
    subDefault: '|',
    apply: (items, chars) => {
      if (!chars) return items;
      // Escape special regex chars except the ones user wants stripped
      const escaped = chars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const re = new RegExp('[' + escaped + ']', 'g');
      return items.map(x => x.replace(re, ''));
    },
  },

  {
    id: 'regex',
    name: 'Regex filter',
    desc: 'Keep only items matching a regex pattern',
    default: false,
    subType: 'text',
    subLabel: 'Pattern, e.g. ^\\d{7}$',
    subDefault: '',
    apply: (items, pattern) => {
      if (!pattern) return items;
      try {
        const re = new RegExp(pattern);
        return items.filter(x => re.test(x));
      } catch {
        return items; // invalid regex → no-op
      }
    },
  },

  // ── Transform ─────────────────────────────────────────────────────────────

  {
    id: 'prefix',
    name: 'Add prefix',
    desc: 'Prepend text to every item',
    default: false,
    subType: 'text',
    subLabel: 'e.g.  ID_',
    subDefault: '',
    apply: (items, val) => items.map(x => val + x),
  },

  {
    id: 'suffix',
    name: 'Add suffix',
    desc: 'Append text to every item',
    default: false,
    subType: 'text',
    subLabel: 'e.g.  _END',
    subDefault: '',
    apply: (items, val) => items.map(x => x + val),
  },

  {
    id: 'wrap',
    name: 'Wrap in brackets',
    desc: 'Surround the entire result with brackets',
    default: false,
    subType: 'pills',
    subPills: [
      { label: '[ ]', val: '[' },
      { label: '( )', val: '(' },
      { label: '{ }', val: '{' },
    ],
    subDefault: '[',
    // wrap is applied to the final joined string, not items — handled in app.js
    apply: null,
  },

  // ── Add more addons below this line ───────────────────────────────────────
  //
  // EXAMPLE: strip leading zeros
  // {
  //   id: 'nozeros',
  //   name: 'Remove leading zeros',
  //   desc: 'Turn 007 into 7',
  //   default: false,
  //   apply: (items) => items.map(x => x.replace(/^0+(\d)/, '$1')),
  // },
  //
  // EXAMPLE: limit to N items
  // {
  //   id: 'limit',
  //   name: 'Limit items',
  //   desc: 'Keep only the first N items',
  //   default: false,
  //   subType: 'text',
  //   subLabel: 'Max items, e.g. 10',
  //   subDefault: '10',
  //   apply: (items, val) => {
  //     const n = parseInt(val, 10);
  //     return isNaN(n) ? items : items.slice(0, n);
  //   },
  // },

];
