'use strict';
const $ = id => document.getElementById(id);

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('page-' + btn.dataset.page).classList.add('active');
  });
});

// ─── Collapsible cards ────────────────────────────────────────────────────────
document.querySelectorAll('.card-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.collapsible');
    const open = card.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
});

// ─── Formatter state ──────────────────────────────────────────────────────────
let quoteStyle = 'single';
let sepStyle   = ', ';

// ─── Build addon grid ─────────────────────────────────────────────────────────
function buildAddonGrid() {
  const grid = $('addon-grid');
  grid.innerHTML = '';
  ADDONS.forEach(addon => {
    const card = document.createElement('label');
    card.className = 'addon-card';

    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = 'cb-' + addon.id; cb.checked = !!addon.default;

    const info = document.createElement('div');
    info.className = 'addon-info';
    info.innerHTML = `<span class="addon-name">${addon.name}</span><span class="addon-desc">${addon.desc}</span>`;
    card.appendChild(cb); card.appendChild(info);

    if (addon.subType) {
      const sw = document.createElement('div');
      sw.className = 'sub-opts' + (cb.checked ? ' visible' : '');
      sw.id = 'sub-' + addon.id;

      if (addon.subType === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'sub-input';
        inp.id = 'subval-' + addon.id;
        inp.placeholder = addon.subLabel || ''; inp.value = addon.subDefault || '';
        inp.addEventListener('input', format);
        sw.appendChild(inp);
      }
      if (addon.subType === 'pills') {
        const def = addon.subDefault || addon.subPills[0].val;
        addon.subPills.forEach(p => {
          const b = document.createElement('button');
          b.className = 'pill' + (p.val === def ? ' active' : '');
          b.dataset.grp = 'subpill-' + addon.id; b.dataset.val = p.val;
          b.textContent = p.label;
          b.addEventListener('click', e => {
            e.preventDefault();
            sw.querySelectorAll('[data-grp]').forEach(x => x.classList.remove('active'));
            b.classList.add('active'); format();
          });
          sw.appendChild(b);
        });
      }
      card.appendChild(sw);
      cb.addEventListener('change', () => { sw.classList.toggle('visible', cb.checked); format(); });
    } else {
      cb.addEventListener('change', format);
    }
    grid.appendChild(card);
  });
}

function getSubValue(addon) {
  if (!addon.subType) return null;
  if (addon.subType === 'text') return ($('subval-' + addon.id) || {}).value || '';
  if (addon.subType === 'pills') {
    const a = document.querySelector(`[data-grp="subpill-${addon.id}"].active`);
    return a ? a.dataset.val : (addon.subDefault || '');
  }
  return null;
}

function parseItems(raw) {
  return raw.split(/[\n,]+/).flatMap(line =>
    (line.includes(' ') && !line.includes(',')) ? line.split(/\s+/) : [line]
  );
}

function applyAddons(items) {
  for (const addon of ADDONS) {
    if (addon.id === 'wrap' || !addon.apply) continue;
    if (!$('cb-' + addon.id)?.checked) continue;
    items = addon.apply(items, getSubValue(addon));
  }
  return items;
}

function wrapQ(item, style) {
  if (style === 'single')   return `'${item}'`;
  if (style === 'double')   return `"${item}"`;
  if (style === 'backtick') return '`' + item + '`';
  return item;
}

function getSep() {
  if (sepStyle === 'custom') return $('custom-sep').value;
  return sepStyle === '\\n' ? '\n' : sepStyle;
}

function format() {
  let items = applyAddons(parseItems($('input').value));
  $('input-meta').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';

  let result = items.map(x => wrapQ(x, quoteStyle)).join(getSep());

  const wa = ADDONS.find(a => a.id === 'wrap');
  if (wa && $('cb-wrap')?.checked) {
    const o = getSubValue(wa), c = o === '(' ? ')' : o === '{' ? '}' : ']';
    result = o + result + c;
  }
  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

// Quote pills
document.querySelectorAll('#quote-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); quoteStyle = el.dataset.val; format();
  })
);

// Sep pills
document.querySelectorAll('#sep-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#sep-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); sepStyle = el.dataset.val;
    $('custom-sep').classList.toggle('visible', sepStyle === 'custom');
    format();
  })
);

$('custom-sep').addEventListener('input', format);
$('input').addEventListener('input', format);

$('btn-copy').addEventListener('click', () => copyText($('output').value));
$('btn-download').addEventListener('click', () => {
  const v = $('output').value; if (!v) return;
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([v], { type: 'text/plain' })),
    download: 'formatted-data.txt',
  }).click();
});
$('btn-clear').addEventListener('click', () => {
  $('input').value = $('output').value = '';
  $('stat').textContent = ''; $('input-meta').textContent = '0 items detected';
});

document.querySelectorAll('.ql-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    let items = applyAddons(parseItems($('input').value));
    const m = btn.dataset.mode;
    let r = '';
    if (m === 'sql') r = 'IN (' + items.map(x => `'${x}'`).join(', ') + ')';
    if (m === 'js')  r = '[' + items.map(x => `'${x}'`).join(', ') + ']';
    if (m === 'csv') r = items.map(x => /[,\s"]/.test(x) ? `"${x}"` : x).join(',');
    if (m === 'py')  r = '[' + items.map(x => `'${x}'`).join(', ') + ']';
    $('output').value = r;
    $('stat').textContent = items.length + ' items · ' + r.length + ' chars';
  })
);

// ─── SQL page ─────────────────────────────────────────────────────────────────
let sqlQ = 'single';

function buildSqlSavedList() {
  const list = $('sql-saved-list'); if (!list || typeof SQL_TEMPLATES === 'undefined') return;
  list.innerHTML = '';
  SQL_TEMPLATES.forEach(tpl => {
    const b = document.createElement('button');
    b.className = 'pill'; b.textContent = tpl.label;
    b.addEventListener('click', () => { $('sql-template').value = tpl.query; buildQuery(); });
    list.appendChild(b);
  });
}

function buildQuery() {
  const tpl = $('sql-template').value.trim();
  if (!tpl) { $('sql-output').value = ''; return; }
  const raw = $('sql-input').value;
  let items = parseItems(raw).map(x => x.trim()).filter(x => x !== '');
  const inList = items.map(x => {
    if (sqlQ === 'single') return `'${x.replace(/'/g, "''")}'`;
    if (sqlQ === 'double') return `"${x.replace(/"/g, '""')}"`;
    return x;
  }).join(', ');
  $('sql-output').value = tpl.replace(/\{\{IN\}\}/g, inList);
  $('sql-stat').textContent = items.length + ' values injected';
  $('sql-input-meta').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';
}

document.querySelectorAll('#sql-quote-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#sql-quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); sqlQ = el.dataset.val; buildQuery();
  })
);
$('btn-sql-run').addEventListener('click', buildQuery);
$('sql-template').addEventListener('input', buildQuery);
$('sql-input').addEventListener('input', buildQuery);
$('btn-sql-copy').addEventListener('click', () => copyText($('sql-output').value));

// ─── Library ──────────────────────────────────────────────────────────────────
function buildLibrary(filter = '') {
  const body = $('library-body');
  body.innerHTML = '';
  if (typeof LIBRARY === 'undefined' || !LIBRARY.length) {
    body.innerHTML = '<p style="color:#55555f;font-size:.82rem;padding:1rem">No library entries found.</p>';
    return;
  }
  const q = filter.toLowerCase();

  LIBRARY.forEach(section => {
    const items = q
      ? section.items.filter(it =>
          it.label.toLowerCase().includes(q) ||
          (it.desc || '').toLowerCase().includes(q) ||
          it.code.toLowerCase().includes(q)
        )
      : section.items;

    if (q && items.length === 0) return;

    const sec = document.createElement('div');
    sec.className = 'lib-section' + (section.open || q ? ' open' : '');
    sec.dataset.id = section.id;

    const hdr = document.createElement('button');
    hdr.className = 'lib-section-header';
    hdr.innerHTML = `
      <span class="lib-badge badge-${section.icon}">${section.icon}</span>
      <span class="lib-section-title">${section.title}</span>
      <span class="lib-count">${items.length}</span>
      <svg class="lib-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    `;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));

    const bodyEl = document.createElement('div');
    bodyEl.className = 'lib-section-body';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'lib-item';
      row.innerHTML = `
        <div class="lib-item-info">
          <div class="lib-item-label">${item.label}</div>
          ${item.desc ? `<div class="lib-item-desc">${item.desc}</div>` : ''}
          <pre class="lib-item-code">${escHtml(item.code)}</pre>
        </div>
        <svg class="lib-copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      `;
      row.addEventListener('click', () => {
        copyText(item.code);
        row.classList.add('copied');
        setTimeout(() => row.classList.remove('copied'), 1200);
      });
      bodyEl.appendChild(row);
    });

    sec.appendChild(hdr); sec.appendChild(bodyEl);
    body.appendChild(sec);
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

$('lib-search').addEventListener('input', e => buildLibrary(e.target.value));

$('btn-lib-expand').addEventListener('click', () =>
  document.querySelectorAll('.lib-section').forEach(s => s.classList.add('open'))
);
$('btn-lib-collapse').addEventListener('click', () =>
  document.querySelectorAll('.lib-section').forEach(s => s.classList.remove('open'))
);

// ─── Toast + copy ─────────────────────────────────────────────────────────────
function copyText(val) {
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    const t = document.createElement('textarea');
    t.value = val; document.body.appendChild(t); t.select();
    document.execCommand('copy'); document.body.removeChild(t); showToast();
  });
}
function showToast() {
  const t = $('toast'); t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1600);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
buildAddonGrid();
buildSqlSavedList();
buildLibrary();

$('input').value = '1254251\n1254152\n2542541';
$('sql-input').value = '1254251\n1254152\n2542541';
format();

if (typeof SQL_TEMPLATES !== 'undefined' && SQL_TEMPLATES.length) {
  $('sql-template').value = SQL_TEMPLATES[0].query;
  buildQuery();
}
