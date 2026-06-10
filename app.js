'use strict';

const $ = id => document.getElementById(id);

// ─── Sidebar navigation ───────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('page-' + btn.dataset.page).classList.add('active');
  });
});

// ─── Formatter state ──────────────────────────────────────────────────────────
let quoteStyle = 'single';
let sepStyle   = ', ';

// ─── Build addon grid from config ─────────────────────────────────────────────
function buildAddonGrid() {
  const grid = $('addon-grid');
  grid.innerHTML = '';
  ADDONS.forEach(addon => {
    const card = document.createElement('label');
    card.className = 'addon-card';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'cb-' + addon.id;
    cb.checked = !!addon.default;

    const info = document.createElement('div');
    info.className = 'addon-info';
    info.innerHTML = `<span class="addon-name">${addon.name}</span><span class="addon-desc">${addon.desc}</span>`;

    card.appendChild(cb);
    card.appendChild(info);

    if (addon.subType) {
      const subWrap = document.createElement('div');
      subWrap.className = 'sub-opts' + (cb.checked ? ' visible' : '');
      subWrap.id = 'sub-' + addon.id;

      if (addon.subType === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'sub-input';
        inp.id = 'subval-' + addon.id;
        inp.placeholder = addon.subLabel || '';
        inp.value = addon.subDefault || '';
        inp.addEventListener('input', format);
        subWrap.appendChild(inp);
      }

      if (addon.subType === 'pills') {
        const def = addon.subDefault || addon.subPills[0].val;
        addon.subPills.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'pill' + (p.val === def ? ' active' : '');
          btn.dataset.grp = 'subpill-' + addon.id;
          btn.dataset.val = p.val;
          btn.textContent = p.label;
          btn.addEventListener('click', e => {
            e.preventDefault();
            subWrap.querySelectorAll('[data-grp]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            format();
          });
          subWrap.appendChild(btn);
        });
      }

      card.appendChild(subWrap);
      cb.addEventListener('change', () => {
        subWrap.classList.toggle('visible', cb.checked);
        format();
      });
    } else {
      cb.addEventListener('change', format);
    }

    grid.appendChild(card);
  });
}

// ─── Sub-control value helpers ─────────────────────────────────────────────────
function getSubValue(addon) {
  if (!addon.subType) return null;
  if (addon.subType === 'text') return ($('subval-' + addon.id) || {}).value || '';
  if (addon.subType === 'pills') {
    const a = document.querySelector(`[data-grp="subpill-${addon.id}"].active`);
    return a ? a.dataset.val : (addon.subDefault || '');
  }
  return null;
}

// ─── Parse raw text → item array ──────────────────────────────────────────────
function parseItems(raw) {
  return raw.split(/[\n,]+/).flatMap(line =>
    (line.includes(' ') && !line.includes(',')) ? line.split(/\s+/) : [line]
  );
}

// ─── Run enabled addons ────────────────────────────────────────────────────────
function applyAddons(items) {
  for (const addon of ADDONS) {
    if (addon.id === 'wrap' || !addon.apply) continue;
    if (!$('cb-' + addon.id)?.checked) continue;
    items = addon.apply(items, getSubValue(addon));
  }
  return items;
}

function wrapQuotes(item, style) {
  if (style === 'single')   return `'${item}'`;
  if (style === 'double')   return `"${item}"`;
  if (style === 'backtick') return '`' + item + '`';
  return item;
}

function getSep() {
  if (sepStyle === 'custom') return $('custom-sep').value;
  return sepStyle === '\\n' ? '\n' : sepStyle;
}

// ─── Main format ───────────────────────────────────────────────────────────────
function format() {
  const raw = $('input').value;
  let items = parseItems(raw);
  items = applyAddons(items);

  $('input-meta').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';

  let result = items.map(x => wrapQuotes(x, quoteStyle)).join(getSep());

  const wrapAddon = ADDONS.find(a => a.id === 'wrap');
  if (wrapAddon && $('cb-wrap')?.checked) {
    const open  = getSubValue(wrapAddon);
    const close = open === '(' ? ')' : open === '{' ? '}' : ']';
    result = open + result + close;
  }

  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';

  // keep SQL page live if it's visible
  if ($('sql-output').value) buildQuery();
}

// ─── Quote pills (formatter) ───────────────────────────────────────────────────
document.querySelectorAll('#quote-opts .pill').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    quoteStyle = el.dataset.val;
    format();
  });
});

// ─── Separator pills ───────────────────────────────────────────────────────────
document.querySelectorAll('#sep-opts .pill').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#sep-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    sepStyle = el.dataset.val;
    $('custom-sep').classList.toggle('visible', sepStyle === 'custom');
    format();
  });
});

$('custom-sep').addEventListener('input', format);
$('input').addEventListener('input', format);

// ─── Buttons (formatter) ───────────────────────────────────────────────────────
$('btn-copy').addEventListener('click', () => copyText($('output').value));
$('btn-download').addEventListener('click', () => {
  const val = $('output').value; if (!val) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([val], { type: 'text/plain' })),
    download: 'formatted-data.txt',
  });
  a.click();
});
$('btn-clear').addEventListener('click', () => {
  $('input').value = $('output').value = '';
  $('stat').textContent = '';
  $('input-meta').textContent = '0 items detected';
});

// ─── Quick templates ───────────────────────────────────────────────────────────
function applyTemplate(mode) {
  let items = applyAddons(parseItems($('input').value));
  let result = '';
  if (mode === 'sql') result = 'IN (' + items.map(x => `'${x}'`).join(', ') + ')';
  if (mode === 'js')  result = '[' + items.map(x => `'${x}'`).join(', ') + ']';
  if (mode === 'csv') result = items.map(x => /[,\s"]/.test(x) ? `"${x}"` : x).join(',');
  if (mode === 'py')  result = '[' + items.map(x => `'${x}'`).join(', ') + ']';
  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

document.querySelectorAll('.ql-btn').forEach(btn =>
  btn.addEventListener('click', () => applyTemplate(btn.dataset.mode))
);

// ─── SQL page ─────────────────────────────────────────────────────────────────
let sqlQuoteStyle = 'single';

function buildSqlSavedList() {
  const list = $('sql-saved-list');
  if (!list || typeof SQL_TEMPLATES === 'undefined') return;
  list.innerHTML = '';
  SQL_TEMPLATES.forEach(tpl => {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = tpl.label;
    btn.addEventListener('click', () => {
      $('sql-template').value = tpl.query;
      buildQuery();
    });
    list.appendChild(btn);
  });
}

function getSqlItems() {
  // SQL page has its own input textarea
  const raw = $('sql-input').value || $('input').value;
  let items = parseItems(raw);
  // always trim + skip empty for SQL
  items = items.map(x => x.trim()).filter(x => x !== '');
  return items;
}

function buildQuery() {
  const template = $('sql-template').value.trim();
  if (!template) { $('sql-output').value = ''; return; }

  const items = getSqlItems();
  const inList = items.map(x => {
    if (sqlQuoteStyle === 'single') return `'${x.replace(/'/g, "''")}'`;
    if (sqlQuoteStyle === 'double') return `"${x.replace(/"/g, '""')}"`;
    return x;
  }).join(', ');

  $('sql-output').value = template.replace(/\{\{IN\}\}/g, inList);
  $('sql-stat').textContent = items.length + ' values injected';
  $('sql-input-meta').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';
}

document.querySelectorAll('#sql-quote-opts .pill').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#sql-quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    sqlQuoteStyle = el.dataset.val;
    buildQuery();
  });
});

$('btn-sql-run').addEventListener('click', buildQuery);
$('sql-template').addEventListener('input', buildQuery);
$('sql-input').addEventListener('input', buildQuery);
$('btn-sql-copy').addEventListener('click', () => copyText($('sql-output').value));

// ─── Toast + copy helper ───────────────────────────────────────────────────────
function copyText(val) {
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = val; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showToast();
  });
}

function showToast() {
  const t = $('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

// ─── Init ──────────────────────────────────────────────────────────────────────
buildAddonGrid();
buildSqlSavedList();

$('input').value = '1254251\n1254152\n2542541';
$('sql-input').value = '1254251\n1254152\n2542541';
format();

if (typeof SQL_TEMPLATES !== 'undefined' && SQL_TEMPLATES.length) {
  $('sql-template').value = SQL_TEMPLATES[0].query;
  buildQuery();
}
