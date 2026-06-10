/**
 * ADDONS CONFIGURATION
 * ====================
 * To add a new addon, append an object to the ADDONS array.
 * No changes needed in index.html, style.css, or app.js.
 *
 * Fields:
 *   id        {string}   Unique ID. Checkbox will be <input id="cb-{id}">.
 *   name      {string}   Label shown in the UI.
 *   desc      {string}   Short description shown under the label.
 *   default   {boolean}  Checked on page load.
 *
 *   subType   {string}   'text'  → text input   (value from #subval-{id})
 *                        'pills' → pill toggle   (active val from [data-grp="subpill-{id}"].active)
 *   subLabel  {string}   Placeholder for 'text' inputs.
 *   subPills  {Array}    { label, val }[] — required for subType:'pills'.
 *   subDefault {string}  Default text value, or default active pill val.
 *
 *   apply(items, subValue)
 *             {Function} Transform the items array. Return a new array.
 *                        subValue is the sub-control value, or null.
 */

const ADDONS = [

  // ── Hygiene ───────────────────────────────────────────────────────────────

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
    desc: 'Keep only unique values',
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

  // ── Filtering ─────────────────────────────────────────────────────────────

  {
    id: 'stripchars',
    name: 'Strip characters',
    desc: 'Remove specific characters from each item',
    default: false,
    subType: 'text',
    subLabel: 'Chars to remove e.g.  | - _',
    subDefault: '|',
    apply: (items, chars) => {
      if (!chars) return items;
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
    subLabel: 'Pattern e.g. ^\\d{7}$',
    subDefault: '',
    apply: (items, pattern) => {
      if (!pattern) return items;
      try { const re = new RegExp(pattern); return items.filter(x => re.test(x)); }
      catch { return items; }
    },
  },

  // ── Transform ─────────────────────────────────────────────────────────────

  {
    id: 'prefix',
    name: 'Add prefix',
    desc: 'Prepend text to every item',
    default: false,
    subType: 'text',
    subLabel: 'e.g. ID_',
    subDefault: '',
    apply: (items, val) => items.map(x => val + x),
  },

  {
    id: 'suffix',
    name: 'Add suffix',
    desc: 'Append text to every item',
    default: false,
    subType: 'text',
    subLabel: 'e.g. _END',
    subDefault: '',
    apply: (items, val) => items.map(x => x + val),
  },

  {
    id: 'wrap',
    name: 'Wrap in brackets',
    desc: 'Surround the entire result',
    default: false,
    subType: 'pills',
    subPills: [
      { label: '[ ]', val: '[' },
      { label: '( )', val: '(' },
      { label: '{ }', val: '{' },
    ],
    subDefault: '[',
    apply: null, // handled separately in app.js after join
  },

  // ── Add more addons below ─────────────────────────────────────────────────
  //
  // {
  //   id: 'nozeros',
  //   name: 'Remove leading zeros',
  //   desc: 'Turn 007 → 7',
  //   default: false,
  //   apply: (items) => items.map(x => x.replace(/^0+(\d)/, '$1')),
  // },

];
