'use strict';
const $ = id => document.getElementById(id);

// ── Nav ───────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('page-' + btn.dataset.page).classList.add('active');
  })
);

// ── Collapsible cards ─────────────────────────────────────────────────────────
document.querySelectorAll('.ctoggle').forEach(btn =>
  btn.addEventListener('click', () => {
    const card = btn.closest('.collapsible');
    const open = card.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  })
);

// ── Formatter ─────────────────────────────────────────────────────────────────
let quoteStyle = 'single', sepStyle = ', ';

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
      sw.className = 'sub-opts' + (cb.checked ? ' show' : '');
      sw.id = 'sub-' + addon.id;
      if (addon.subType === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'sub-inp'; inp.id = 'subval-' + addon.id;
        inp.placeholder = addon.subLabel || ''; inp.value = addon.subDefault || '';
        inp.addEventListener('input', format); sw.appendChild(inp);
      }
      if (addon.subType === 'pills') {
        const def = addon.subDefault || addon.subPills[0].val;
        addon.subPills.forEach(p => {
          const b = document.createElement('button');
          b.className = 'pill' + (p.val === def ? ' active' : '');
          b.dataset.grp = 'subpill-' + addon.id; b.dataset.val = p.val; b.textContent = p.label;
          b.addEventListener('click', e => { e.preventDefault(); sw.querySelectorAll('[data-grp]').forEach(x => x.classList.remove('active')); b.classList.add('active'); format(); });
          sw.appendChild(b);
        });
      }
      card.appendChild(sw);
      cb.addEventListener('change', () => { sw.classList.toggle('show', cb.checked); format(); });
    } else { cb.addEventListener('change', format); }
    grid.appendChild(card);
  });
}

function getSubVal(addon) {
  if (!addon.subType) return null;
  if (addon.subType === 'text') return ($('subval-' + addon.id) || {}).value || '';
  if (addon.subType === 'pills') { const a = document.querySelector(`[data-grp="subpill-${addon.id}"].active`); return a ? a.dataset.val : (addon.subDefault || ''); }
  return null;
}

function parseItems(raw) {
  return raw.split(/[\n,]+/).flatMap(line => (line.includes(' ') && !line.includes(',')) ? line.split(/\s+/) : [line]);
}

function applyAddons(items) {
  for (const a of ADDONS) {
    if (a.id === 'wrap' || !a.apply) continue;
    if (!$('cb-' + a.id)?.checked) continue;
    items = a.apply(items, getSubVal(a));
  }
  return items;
}

function wrapQ(item, s) {
  if (s === 'single') return `'${item}'`;
  if (s === 'double') return `"${item}"`;
  if (s === 'backtick') return '`' + item + '`';
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
  if (wa && $('cb-wrap')?.checked) { const o = getSubVal(wa), c = o==='('?')':o==='{' ?'}':']'; result = o+result+c; }
  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

document.querySelectorAll('#quote-opts .pill').forEach(el => el.addEventListener('click', () => { document.querySelectorAll('#quote-opts .pill').forEach(p => p.classList.remove('active')); el.classList.add('active'); quoteStyle = el.dataset.val; format(); }));
document.querySelectorAll('#sep-opts .pill').forEach(el => el.addEventListener('click', () => { document.querySelectorAll('#sep-opts .pill').forEach(p => p.classList.remove('active')); el.classList.add('active'); sepStyle = el.dataset.val; $('custom-sep').classList.toggle('show', sepStyle === 'custom'); format(); }));
$('custom-sep').addEventListener('input', format);
$('input').addEventListener('input', format);
$('btn-copy').addEventListener('click', () => copyText($('output').value));
$('btn-clear-input').addEventListener('click', () => { $('input').value = ''; $('output').value = ''; $('stat').textContent = ''; $('input-meta').textContent = '0 items detected'; });
$('btn-download').addEventListener('click', () => { const v = $('output').value; if (!v) return; Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([v], {type:'text/plain'})), download:'formatted-data.txt' }).click(); });
$('btn-clear').addEventListener('click', () => { $('input').value = $('output').value = ''; $('stat').textContent = ''; $('input-meta').textContent = '0 items detected'; });
document.querySelectorAll('.ql-btn').forEach(btn => btn.addEventListener('click', () => {
  let items = applyAddons(parseItems($('input').value)); const m = btn.dataset.mode; let r = '';
  if (m==='sql') r = 'IN (' + items.map(x=>`'${x}'`).join(', ') + ')';
  if (m==='js')  r = '[' + items.map(x=>`'${x}'`).join(', ') + ']';
  if (m==='csv') r = items.map(x=>/[,\s"]/.test(x)?`"${x}"`:x).join(',');
  if (m==='py')  r = '[' + items.map(x=>`'${x}'`).join(', ') + ']';
  $('output').value = r; $('stat').textContent = items.length + ' items · ' + r.length + ' chars';
}));

// ── SQL page ──────────────────────────────────────────────────────────────────
let sqlQ = 'single';

function buildSqlSaved() {
  const list = $('sql-saved-list'); if (!list) return;
  list.innerHTML = '';
  (SQL_TEMPLATES || []).forEach(tpl => {
    const b = document.createElement('button'); b.className = 'pill'; b.textContent = tpl.label;
    b.addEventListener('click', () => { $('sql-template').value = tpl.query; buildQuery(); });
    list.appendChild(b);
  });
}

function buildQuery() {
  const tpl = $('sql-template').value.trim(); if (!tpl) { $('sql-output').value = ''; return; }
  let items = parseItems($('sql-input').value).map(x => x.trim()).filter(x => x !== '');
  const inList = items.map(x => sqlQ==='single' ? `'${x.replace(/'/g,"''")}'` : sqlQ==='double' ? `"${x.replace(/"/g,'""')}"` : x).join(', ');
  $('sql-output').value = tpl.replace(/\{\{IN\}\}/g, inList);
  $('sql-stat').textContent = items.length + ' values injected';
  $('sql-input-meta').textContent = items.length + ' item' + (items.length!==1?'s':'') + ' detected';
}

document.querySelectorAll('#sql-quote-opts .pill').forEach(el => el.addEventListener('click', () => { document.querySelectorAll('#sql-quote-opts .pill').forEach(p => p.classList.remove('active')); el.classList.add('active'); sqlQ = el.dataset.val; buildQuery(); }));
$('btn-sql-run').addEventListener('click', buildQuery);
$('sql-template').addEventListener('input', buildQuery);
$('sql-input').addEventListener('input', buildQuery);
$('btn-sql-copy').addEventListener('click', () => copyText($('sql-output').value));
$('btn-clear-sql-input').addEventListener('click', () => { $('sql-input').value = ''; $('sql-output').value = ''; $('sql-stat').textContent = ''; $('sql-input-meta').textContent = '0 items detected'; });

// ── Library ───────────────────────────────────────────────────────────────────
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function buildLibrary(filter) {
  const body = $('library-body');
  body.innerHTML = '';
  filter = (filter || '').toLowerCase().trim();

  LIBRARY.forEach(section => {
    const items = filter
      ? section.items.filter(it => it.label.toLowerCase().includes(filter) || (it.desc||'').toLowerCase().includes(filter) || it.code.toLowerCase().includes(filter))
      : section.items;
    if (filter && !items.length) return;

    const sec = document.createElement('div');
    sec.className = 'lib-section' + ((section.open || filter) ? ' open' : '');

    const hdr = document.createElement('button');
    hdr.className = 'lib-hdr';
    hdr.innerHTML = `<span class="lib-badge badge-${section.icon}">${section.icon}</span><span class="lib-title">${section.title}</span><span class="lib-count">${items.length}</span><svg class="lib-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));

    const bdy = document.createElement('div');
    bdy.className = 'lib-body';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'lib-item';
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1000); });
      bdy.appendChild(row);
    });

    sec.appendChild(hdr); sec.appendChild(bdy); body.appendChild(sec);
  });
}

$('lib-search').addEventListener('input', e => buildLibrary(e.target.value));
$('btn-lib-expand').addEventListener('click', () => document.querySelectorAll('.lib-section').forEach(s => s.classList.add('open')));
$('btn-lib-collapse').addEventListener('click', () => document.querySelectorAll('.lib-section').forEach(s => s.classList.remove('open')));

// ── Copy + Toast ──────────────────────────────────────────────────────────────
function copyText(val) {
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    const t = document.createElement('textarea'); t.value = val;
    document.body.appendChild(t); t.select(); document.execCommand('copy');
    document.body.removeChild(t); showToast();
  });
}
function showToast() {
  const t = $('toast'); t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600);
}

// ── Init ──────────────────────────────────────────────────────────────────────
buildAddonGrid();
buildSqlSaved();

$('input').value = '1254251\n1254152\n2542541';
$('sql-input').value = '1254251\n1254152\n2542541';
format();
if (SQL_TEMPLATES && SQL_TEMPLATES.length) { $('sql-template').value = SQL_TEMPLATES[0].query; buildQuery(); }

// ── Custom Library (localStorage) ────────────────────────────────────────────
const STORAGE_KEY = 'datafmt_custom_entries';

function loadCustomEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveCustomEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function deleteCustomEntry(id) {
  const entries = loadCustomEntries().filter(e => e.id !== id);
  saveCustomEntries(entries);
  buildLibrary($('lib-search').value);
}

// Rebuild library, prepending custom entries as their own section
const _origBuildLibrary = buildLibrary;
buildLibrary = function(filter) {
  const body = $('library-body');
  body.innerHTML = '';
  filter = (filter || '').toLowerCase().trim();

  const custom = loadCustomEntries();

  // Build custom section first
  const customItems = filter
    ? custom.filter(it => it.label.toLowerCase().includes(filter) || (it.desc||'').toLowerCase().includes(filter) || it.code.toLowerCase().includes(filter))
    : custom;

  if (customItems.length > 0 || (!filter && custom.length === 0)) {
    const sec = document.createElement('div');
    sec.className = 'lib-section open';

    const hdr = document.createElement('button');
    hdr.className = 'lib-hdr';
    hdr.innerHTML = `<span class="lib-badge badge-custom">custom</span><span class="lib-title">My entries</span><span class="lib-count">${customItems.length}</span><svg class="lib-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));

    const bdy = document.createElement('div');
    bdy.className = 'lib-body';

    if (customItems.length === 0 && !filter) {
      bdy.innerHTML = '<div style="padding:12px 1rem;font-size:0.78rem;color:var(--text3)">No custom entries yet — click <strong style="color:var(--text2)">+ Add entry</strong> to save your first snippet.</div>';
    } else {
      customItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'lib-item';
        row.innerHTML = `
          <div class="lib-item-info">
            <div class="lib-item-lbl" style="display:flex;align-items:center;gap:8px">
              ${esc(item.label)}
              <span class="lib-badge badge-${item.category||'custom'}" style="font-size:0.55rem">${item.category||'custom'}</span>
            </div>
            ${item.desc ? `<div class="lib-item-desc">${esc(item.desc)}</div>` : ''}
            <pre class="lib-item-code">${esc(item.code)}</pre>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:center">
            <svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <button class="lib-del-btn" data-id="${item.id}" title="Delete entry">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
          </div>`;
        row.querySelector('.lib-copy-ic').addEventListener('click', e => { e.stopPropagation(); copyText(item.code); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1000); });
        row.querySelector('.lib-del-btn').addEventListener('click', e => { e.stopPropagation(); if (confirm('Delete "' + item.label + '"?')) deleteCustomEntry(item.id); });
        // click row = copy
        row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1000); });
        bdy.appendChild(row);
      });
    }

    sec.appendChild(hdr); sec.appendChild(bdy); body.appendChild(sec);
  }

  // Now render built-in sections
  LIBRARY.forEach(section => {
    const items = filter
      ? section.items.filter(it => it.label.toLowerCase().includes(filter) || (it.desc||'').toLowerCase().includes(filter) || it.code.toLowerCase().includes(filter))
      : section.items;
    if (filter && !items.length) return;

    const sec = document.createElement('div');
    sec.className = 'lib-section' + ((section.open || filter) ? ' open' : '');

    const hdr = document.createElement('button');
    hdr.className = 'lib-hdr';
    hdr.innerHTML = `<span class="lib-badge badge-${section.icon}">${section.icon}</span><span class="lib-title">${section.title}</span><span class="lib-count">${items.length}</span><svg class="lib-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));

    const bdy = document.createElement('div');
    bdy.className = 'lib-body';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'lib-item';
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1000); });
      bdy.appendChild(row);
    });
    sec.appendChild(hdr); sec.appendChild(bdy); body.appendChild(sec);
  });
};

// ── Modal wiring ──────────────────────────────────────────────────────────────
let modalCategoryVal = 'custom';

function openModal(prefillCode) {
  $('m-label').value = '';
  $('m-desc').value = '';
  $('m-code').value = prefillCode || '';
  $('m-error').classList.add('hidden');
  modalCategoryVal = 'custom';
  document.querySelectorAll('#m-category-pills .pill').forEach(p => p.classList.toggle('active', p.dataset.val === 'custom'));
  $('modal-overlay').classList.remove('hidden');
  setTimeout(() => $('m-label').focus(), 50);
}

function closeModal() { $('modal-overlay').classList.add('hidden'); }

document.querySelectorAll('#m-category-pills .pill').forEach(p =>
  p.addEventListener('click', () => {
    document.querySelectorAll('#m-category-pills .pill').forEach(x => x.classList.remove('active'));
    p.classList.add('active');
    modalCategoryVal = p.dataset.val;
  })
);

$('btn-lib-add').addEventListener('click', () => openModal());
$('btn-modal-close').addEventListener('click', closeModal);
$('btn-modal-cancel').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });

$('btn-modal-save').addEventListener('click', () => {
  const label = $('m-label').value.trim();
  const code  = $('m-code').value.trim();
  if (!label || !code) { $('m-error').classList.remove('hidden'); return; }
  $('m-error').classList.add('hidden');

  const entry = {
    id: 'custom_' + Date.now(),
    label,
    desc: $('m-desc').value.trim(),
    code,
    category: modalCategoryVal,
  };

  const entries = loadCustomEntries();
  entries.unshift(entry);
  saveCustomEntries(entries);
  closeModal();

  // Switch to library page and rebuild
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-page="library"]').classList.add('active');
  $('page-library').classList.add('active');
  buildLibrary();
  showToast();
  $('toast').textContent = 'Entry saved!';
  setTimeout(() => { $('toast').textContent = 'Copied!'; }, 1800);
});

// Keyboard: Escape closes modal
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Re-init library with custom entries
buildLibrary();

// ── Library Widget (SQL page sidebar) ─────────────────────────────────────────
function buildWidget(filter) {
  const body = $('widget-body');
  if (!body) return;
  body.innerHTML = '';
  filter = (filter || '').toLowerCase().trim();

  // Gather all entries: custom first, then built-in
  const customEntries = loadCustomEntries();
  const allSections = [];

  if (customEntries.length) {
    allSections.push({
      icon: 'custom', title: 'My entries',
      items: customEntries.map(e => ({ label: e.label, desc: e.desc, code: e.code, isQuery: e.category === 'sql' }))
    });
  }

  LIBRARY.forEach(s => allSections.push({
    icon: s.icon, title: s.title,
    items: s.items.map(it => ({ label: it.label, desc: it.desc || '', code: it.code, isQuery: s.icon === 'sql' }))
  }));

  allSections.forEach((section, si) => {
    const items = filter
      ? section.items.filter(it => it.label.toLowerCase().includes(filter) || it.code.toLowerCase().includes(filter) || (it.desc||'').toLowerCase().includes(filter))
      : section.items;
    if (!items.length) return;

    const sec = document.createElement('div');
    sec.className = 'ws-section' + (si === 0 ? ' open' : '');

    const hdr = document.createElement('button');
    hdr.className = 'ws-hdr';
    hdr.innerHTML = `
      <span class="ws-hdr-badge badge-${section.icon}">${section.icon}</span>
      <span class="ws-title">${section.title}</span>
      <span class="ws-count">${items.length}</span>
      <svg class="ws-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));

    const itemsEl = document.createElement('div');
    itemsEl.className = 'ws-items';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'ws-item';

      // Preview: first non-empty line of code
      const preview = item.code.split('\n').find(l => l.trim()) || item.code;

      row.innerHTML = `
        <div class="ws-item-info">
          <div class="ws-item-label" title="${esc(item.label)}">${esc(item.label)}</div>
          <div class="ws-item-preview" title="${esc(preview)}">${esc(preview)}</div>
        </div>
        ${item.isQuery ? `<button class="ws-load-btn" title="Load into template">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button>` : ''}
        <button class="ws-copy-btn">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>`;

      // Copy button
      row.querySelector('.ws-copy-btn').addEventListener('click', e => {
        e.stopPropagation();
        copyText(item.code);
        row.classList.add('flash');
        setTimeout(() => row.classList.remove('flash'), 900);
      });

      // Load into template button (SQL items only)
      const loadBtn = row.querySelector('.ws-load-btn');
      if (loadBtn) {
        loadBtn.addEventListener('click', e => {
          e.stopPropagation();
          $('sql-template').value = item.code;
          buildQuery();
          // brief highlight on template
          $('sql-template').style.borderColor = 'var(--accent)';
          setTimeout(() => $('sql-template').style.borderColor = '', 800);
        });
      }

      // Click row = copy
      row.addEventListener('click', () => {
        copyText(item.code);
        row.classList.add('flash');
        setTimeout(() => row.classList.remove('flash'), 900);
      });

      itemsEl.appendChild(row);
    });

    sec.appendChild(hdr);
    sec.appendChild(itemsEl);
    body.appendChild(sec);
  });

  if (!body.children.length) {
    body.innerHTML = '<div style="padding:1rem;font-size:0.78rem;color:var(--text3);text-align:center">No results</div>';
  }
}

$('widget-search').addEventListener('input', e => buildWidget(e.target.value));

// Re-run whenever library changes (new custom entry saved)
const _prevBuildLibrary = buildLibrary;
buildLibrary = function(filter) {
  _prevBuildLibrary(filter);
  buildWidget($('widget-search') ? $('widget-search').value : '');
};

// Init widget
buildWidget();

// ── Clock ─────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  $('clock-time').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  $('clock-date').textContent = `${days[now.getDay()]}, ${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── Theme toggle ──────────────────────────────────────────────────────────────
const THEME_KEY = 'datafmt_theme';
let isNeuo = localStorage.getItem(THEME_KEY) === 'neuo';

function applyTheme() {
  document.body.classList.toggle('neuo', isNeuo);
  $('toggle-pill').classList.toggle('on', isNeuo);
  $('theme-label').textContent = isNeuo ? 'Neumorphic' : 'Normal';
}

applyTheme();

$('theme-toggle').addEventListener('click', () => {
  isNeuo = !isNeuo;
  localStorage.setItem(THEME_KEY, isNeuo ? 'neuo' : 'normal');
  applyTheme();
});
