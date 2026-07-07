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
    default: false,
    apply: (items) => items.map(x => x.trim()),
  },

  {
    id: 'empty',
    name: 'Skip empty lines',
    desc: 'Ignore blank or whitespace-only lines',
    default: false,
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

  {
    id: 'stripPipes',
    name: 'Strip SQL pipes',
    desc: 'Remove | characters from raw SQL CLI output',
    default: false,
    apply: (items) => items
      .map(x => x.split('|').join(' '))
      .map(x => x.trim())
      .filter(x => x !== ''),
  },

  {
    id: 'macFormat',
    name: 'Format as MAC address',
    desc: 'Insert colons every 2 chars — 00008384000DD51A → 00:00:83:84:00:0D:D5:1A',
    default: false,
    apply: (items) => items.map(x => {
      const hex = x.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
      if (!hex) return x;
      return hex.match(/.{1,2}/g).join(':');
    }),
  },

  {
    id: 'charCount',
    name: 'Character count',
    desc: 'Show input and output character counts',
    default: false,
    apply: null, // display-only — handled directly in format()
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
/**
 * SQL QUERY TEMPLATES
 * ===================
 * Add your saved queries here. Each will appear as a one-click button.
 * Use the placeholder {{IN}} exactly where you want the values injected.
 *
 * Fields:
 *   id      {string}  Unique ID
 *   label   {string}  Button label shown in the UI
 *   query   {string}  Full SQL with {{IN}} as the placeholder
 */

const SQL_TEMPLATES = [

  {
    id: 'stock_serial',
    label: 'Stock by serial_number',
    query:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE serial_number IN ({{IN}});`,
  },

  {
    id: 'stock_id',
    label: 'Stock by stock_id',
    query:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE stock_id IN ({{IN}});`,
  },

  {
    id: 'stock_vc',
    label: 'Stock by vc_number',
    query:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE vc_number IN ({{IN}});`,
  },

  // ── Add more queries below ─────────────────────────────────────────────────
  //
  // {
  //   id: 'delete_stock',
  //   label: 'Delete stock',
  //   query:
  // `DELETE FROM eb_stock
  // WHERE serial_number IN ({{IN}});`,
  // },
  //
  // {
  //   id: 'update_trash',
  //   label: 'Mark as trashed',
  //   query:
  // `UPDATE eb_stock
  // SET is_trash = 1, trashed_date = NOW()
  // WHERE serial_number IN ({{IN}});`,
  // },

];
/**
 * LIBRARY CONFIGURATION
 * =====================
 * Add SQL queries and Linux commands here.
 * They appear in the Library page as collapsible sections with one-click copy.
 *
 * Structure:
 *   LIBRARY = [
 *     {
 *       id:      {string}   unique section ID
 *       title:   {string}   section heading
 *       icon:    {string}   'sql' | 'linux' | 'git' | 'docker' (controls the badge colour)
 *       open:    {boolean}  expanded by default?
 *       items: [
 *         {
 *           label:   {string}  short title
 *           desc:    {string}  optional one-line description
 *           code:    {string}  the snippet to copy
 *         }
 *       ]
 *     }
 *   ]
 */

const LIBRARY = [

  // ── SQL ───────────────────────────────────────────────────────────────────
  {
    id:    'sql-stock',
    title: 'Stock queries',
    icon:  'sql',
    open:  true,
    items: [
      {
        label: 'Select by serial_number',
        desc:  'Fetch full stock row by serial number list',
        code:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE serial_number IN ();`,
      },
      {
        label: 'Select by stock_id',
        desc:  'Fetch stock rows by stock ID list',
        code:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE stock_id IN ();`,
      },
      {
        label: 'Select by vc_number',
        desc:  'Fetch stock rows by VC number list',
        code:
`SELECT stock_id, serial_number, vc_number, is_trash, trashed_date
FROM eb_stock
WHERE vc_number IN ();`,
      },
      {
        label: 'Mark as trashed',
        desc:  'Soft-delete stock rows by serial number',
        code:
`UPDATE eb_stock
SET is_trash = 1, trashed_date = NOW()
WHERE serial_number IN ();`,
      },
      {
        label: 'Restore from trash',
        desc:  'Un-delete stock rows',
        code:
`UPDATE eb_stock
SET is_trash = 0, trashed_date = NULL
WHERE serial_number IN ();`,
      },
    ],
  },

  {
    id:    'sql-general',
    title: 'General SQL',
    icon:  'sql',
    open:  false,
    items: [
      {
        label: 'Count rows in table',
        code:  `SELECT COUNT(*) FROM table_name;`,
      },
      {
        label: 'Show table structure',
        code:  `DESCRIBE table_name;`,
      },
      {
        label: 'Show all indexes',
        code:  `SHOW INDEX FROM table_name;`,
      },
      {
        label: 'Duplicate a table (structure + data)',
        code:
`CREATE TABLE new_table AS
SELECT * FROM old_table;`,
      },
      {
        label: 'Find duplicate values',
        desc:  'Replace col with the column to check',
        code:
`SELECT col, COUNT(*) AS cnt
FROM table_name
GROUP BY col
HAVING cnt > 1
ORDER BY cnt DESC;`,
      },
      {
        label: 'Delete duplicates (keep lowest id)',
        code:
`DELETE t1 FROM table_name t1
INNER JOIN table_name t2
WHERE t1.id > t2.id AND t1.col = t2.col;`,
      },
    ],
  },

  // ── Linux ─────────────────────────────────────────────────────────────────
  {
    id:    'linux-files',
    title: 'File operations',
    icon:  'linux',
    open:  false,
    items: [
      {
        label: 'Find file by name',
        code:  `find / -name "filename.txt" 2>/dev/null`,
      },
      {
        label: 'Find files modified in last 7 days',
        code:  `find /path -mtime -7 -type f`,
      },
      {
        label: 'Bulk rename files',
        desc:  'Rename all .log → .txt in current dir',
        code:  `for f in *.log; do mv "$f" "\${f%.log}.txt"; done`,
      },
      {
        label: 'Copy directory recursively',
        code:  `cp -r /source/dir /dest/dir`,
      },
      {
        label: 'Sync directories (rsync)',
        code:  `rsync -avz --progress /source/ user@host:/dest/`,
      },
      {
        label: 'Check disk usage by folder',
        code:  `du -sh /* 2>/dev/null | sort -rh | head -20`,
      },
      {
        label: 'Watch a log file live',
        code:  `tail -f /var/log/syslog`,
      },
    ],
  },

  {
    id:    'linux-process',
    title: 'Process & system',
    icon:  'linux',
    open:  false,
    items: [
      {
        label: 'List processes by CPU usage',
        code:  `ps aux --sort=-%cpu | head -20`,
      },
      {
        label: 'Kill process by name',
        code:  `pkill -f process_name`,
      },
      {
        label: 'Kill process on a port',
        code:  `fuser -k 8080/tcp`,
      },
      {
        label: 'Check open ports',
        code:  `ss -tulnp`,
      },
      {
        label: 'Check memory usage',
        code:  `free -h`,
      },
      {
        label: 'Top 10 memory-hungry processes',
        code:  `ps aux --sort=-%mem | head -10`,
      },
      {
        label: 'Run command in background',
        code:  `nohup command &> output.log &`,
      },
    ],
  },

  {
    id:    'linux-network',
    title: 'Networking',
    icon:  'linux',
    open:  false,
    items: [
      {
        label: 'Test port connectivity',
        code:  `nc -zv hostname 3306`,
      },
      {
        label: 'Show all network interfaces',
        code:  `ip addr show`,
      },
      {
        label: 'Trace route to host',
        code:  `traceroute google.com`,
      },
      {
        label: 'Download file with curl',
        code:  `curl -O https://example.com/file.zip`,
      },
      {
        label: 'POST JSON with curl',
        code:  `curl -X POST https://api.example.com/endpoint \\\n  -H "Content-Type: application/json" \\\n  -d '{"key":"value"}'`,
      },
    ],
  },

  // ── Git ───────────────────────────────────────────────────────────────────
  {
    id:    'git-common',
    title: 'Git essentials',
    icon:  'git',
    open:  false,
    items: [
      {
        label: 'Undo last commit (keep changes)',
        code:  `git reset --soft HEAD~1`,
      },
      {
        label: 'Discard all local changes',
        code:  `git checkout -- .`,
      },
      {
        label: 'Stash changes',
        code:  `git stash push -m "description"`,
      },
      {
        label: 'Apply latest stash',
        code:  `git stash pop`,
      },
      {
        label: 'See what changed (pretty log)',
        code:  `git log --oneline --graph --all`,
      },
      {
        label: 'Delete remote branch',
        code:  `git push origin --delete branch-name`,
      },
      {
        label: 'Cherry-pick a commit',
        code:  `git cherry-pick <commit-hash>`,
      },
    ],
  },

  // ── Add more sections below ───────────────────────────────────────────────
  // {
  //   id:    'docker-common',
  //   title: 'Docker',
  //   icon:  'docker',
  //   open:  false,
  //   items: [
  //     { label: 'List running containers', code: 'docker ps' },
  //     { label: 'Stop all containers',     code: 'docker stop $(docker ps -q)' },
  //   ],
  // },

];
