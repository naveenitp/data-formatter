'use strict';

// --- State ---
let quoteStyle = 'single';
let sepStyle = ', ';

const $ = id => document.getElementById(id);

// ─── Build addon UI from config ──────────────────────────────────────────────
function buildAddonGrid() {
  const grid = document.getElementById('addon-grid');
  grid.innerHTML = '';

  ADDONS.forEach(addon => {
    const card = document.createElement('label');
    card.className = 'addon-card';
    card.htmlFor = 'cb-' + addon.id;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'cb-' + addon.id;
    cb.checked = !!addon.default;

    const info = document.createElement('div');
    info.className = 'addon-info';
    info.innerHTML = `<span class="addon-name">${addon.name}</span><span class="addon-desc">${addon.desc}</span>`;

    card.appendChild(cb);
    card.appendChild(info);

    // Sub-controls
    if (addon.subType) {
      const subWrap = document.createElement('div');
      subWrap.className = 'sub-opts' + (cb.checked ? ' visible' : '');
      subWrap.id = 'sub-' + addon.id;

      if (addon.subType === 'text') {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sub-input';
        input.id = 'subval-' + addon.id;
        input.placeholder = addon.subLabel || '';
        input.value = addon.subDefault || '';
        input.addEventListener('input', format);
        subWrap.appendChild(input);
      }

      if (addon.subType === 'pills') {
        const defaultVal = addon.subDefault || addon.subPills[0].val;
        addon.subPills.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'pill' + (p.val === defaultVal ? ' active' : '');
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
        // exclusive group
        if (addon.exclusiveGroup && cb.checked) {
          ADDONS.filter(a => a.exclusiveGroup === addon.exclusiveGroup && a.id !== addon.id)
            .forEach(a => { $('cb-' + a.id).checked = false; });
        }
        format();
      });
    } else {
      cb.addEventListener('change', () => {
        if (addon.exclusiveGroup && cb.checked) {
          ADDONS.filter(a => a.exclusiveGroup === addon.exclusiveGroup && a.id !== addon.id)
            .forEach(a => { $('cb-' + a.id).checked = false; });
        }
        format();
      });
    }

    grid.appendChild(card);
  });
}

// ─── Get sub-control value for an addon ──────────────────────────────────────
function getSubValue(addon) {
  if (!addon.subType) return null;
  if (addon.subType === 'text') {
    const el = $('subval-' + addon.id);
    return el ? el.value : '';
  }
  if (addon.subType === 'pills') {
    const active = document.querySelector(`[data-grp="subpill-${addon.id}"].active`);
    return active ? active.dataset.val : (addon.subDefault || '');
  }
  return null;
}

// ─── Parse raw input into items ───────────────────────────────────────────────
function getItems(raw) {
  return raw.split(/[\n,]+/).flatMap(line =>
    line.includes(' ') && !line.includes(',') ? line.split(/\s+/) : [line]
  );
}

// ─── Apply all enabled addons (except wrap, handled separately) ───────────────
function applyAddons(items) {
  for (const addon of ADDONS) {
    if (addon.id === 'wrap') continue;       // wrap acts on final string
    if (!addon.apply) continue;
    if (!$('cb-' + addon.id)?.checked) continue;
    items = addon.apply(items, getSubValue(addon));
  }
  return items;
}

// ─── Quote helpers ────────────────────────────────────────────────────────────
function wrapQuotes(item) {
  if (quoteStyle === 'single')   return `'${item}'`;
  if (quoteStyle === 'double')   return `"${item}"`;
  if (quoteStyle === 'backtick') return '`' + item + '`';
  return item;
}

function getSep() {
  if (sepStyle === 'custom') return $('custom-sep').value;
  return sepStyle === '\\n' ? '\n' : sepStyle;
}

// ─── Main format function ─────────────────────────────────────────────────────
function format() {
  const raw = $('input').value;
  let items = getItems(raw);
  items = applyAddons(items);

  $('input-meta').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';

  const quoted = items.map(wrapQuotes);
  let result = quoted.join(getSep());

  // Wrap addon — acts on the final string
  const wrapAddon = ADDONS.find(a => a.id === 'wrap');
  if (wrapAddon && $('cb-wrap')?.checked) {
    const open = getSubValue(wrapAddon);
    const close = open === '(' ? ')' : open === '{' ? '}' : ']';
    result = open + result + close;
  }

  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

// ─── Quick templates ──────────────────────────────────────────────────────────
function applyTemplate(mode) {
  let items = applyAddons(getItems($('input').value));
  let result = '';
  if (mode === 'sql') result = 'IN (' + items.map(x => `'${x}'`).join(', ') + ')';
  if (mode === 'js')  result = '[' + items.map(x => `'${x}'`).join(', ') + ']';
  if (mode === 'csv') result = items.map(x => /[,\s"]/.test(x) ? `"${x}"` : x).join(',');
  if (mode === 'py')  result = '[' + items.map(x => `'${x}'`).join(', ') + ']';
  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

// ─── Quote / Separator pills ──────────────────────────────────────────────────
document.querySelectorAll('#quote-opts .pill').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    quoteStyle = el.dataset.val;
    format();
  });
});

document.querySelectorAll('#sep-opts .pill').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#sep-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    sepStyle = el.dataset.val;
    const ci = $('custom-sep');
    ci.classList.toggle('visible', sepStyle === 'custom');
    format();
  });
});

$('custom-sep').addEventListener('input', format);
$('input').addEventListener('input', format);

// ─── Buttons ──────────────────────────────────────────────────────────────────
$('btn-copy').addEventListener('click', () => {
  const val = $('output').value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    $('output').select();
    document.execCommand('copy');
    showToast();
  });
});

$('btn-download').addEventListener('click', () => {
  const val = $('output').value;
  if (!val) return;
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

document.querySelectorAll('.ql-btn').forEach(btn =>
  btn.addEventListener('click', () => applyTemplate(btn.dataset.mode))
);

function showToast() {
  const t = $('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
buildAddonGrid();
$('input').value = '1254251\n1254152\n2542541';
format();

// ─── SQL Query Builder ────────────────────────────────────────────────────────

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

function getSqlQuotedItems() {
  const raw = $('input').value;
  let items = getItems(raw);
  items = applyAddons(items);
  return items.map(x => {
    if (sqlQuoteStyle === 'single') return `'${x.replace(/'/g, "''")}'`;
    if (sqlQuoteStyle === 'double') return `"${x.replace(/"/g, '""')}"`;
    return x;
  });
}

function buildQuery() {
  const template = $('sql-template').value.trim();
  if (!template) { $('sql-output').value = ''; return; }

  const items = getSqlQuotedItems();
  const inList = items.join(', ');
  const result = template.replace(/\{\{IN\}\}/g, inList);

  $('sql-output').value = result;
  $('sql-stat').textContent = items.length + ' values injected';
}

// SQL quote pills
document.querySelectorAll('#sql-quote-opts .pill').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('#sql-quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    sqlQuoteStyle = el.dataset.val;
    if ($('sql-output').value) buildQuery();
  });
});

$('btn-sql-run').addEventListener('click', buildQuery);
$('sql-template').addEventListener('input', buildQuery);

// auto-rebuild when input data changes
const _origFormat = format;
window.format = function() { _origFormat(); if ($('sql-output').value) buildQuery(); };

$('btn-sql-copy').addEventListener('click', () => {
  const val = $('sql-output').value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    $('sql-output').select();
    document.execCommand('copy');
    showToast();
  });
});

// Init SQL panel
buildSqlSavedList();
if (typeof SQL_TEMPLATES !== 'undefined' && SQL_TEMPLATES.length) {
  $('sql-template').value = SQL_TEMPLATES[0].query;
  buildQuery();
}
