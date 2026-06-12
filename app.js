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
let isNeuo = localStorage.getItem(THEME_KEY) === 'glass';

function applyTheme() {
  document.body.classList.toggle('glass', isNeuo);
  $('toggle-pill').classList.toggle('on', isNeuo);
  $('theme-label').textContent = isNeuo ? 'Glass' : 'Normal';
}

applyTheme();

$('theme-toggle').addEventListener('click', () => {
  isNeuo = !isNeuo;
  localStorage.setItem(THEME_KEY, isNeuo ? 'glass' : 'normal');
  applyTheme();
});

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
let isNeuo = localStorage.getItem(THEME_KEY) === 'glass';

function applyTheme() {
  document.body.classList.toggle('glass', isNeuo);
  $('toggle-pill').classList.toggle('on', isNeuo);
  $('theme-label').textContent = isNeuo ? 'Glass' : 'Normal';
}

applyTheme();

$('theme-toggle').addEventListener('click', () => {
  isNeuo = !isNeuo;
  localStorage.setItem(THEME_KEY, isNeuo ? 'glass' : 'normal');
  applyTheme();
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
function updateDashboard() {
  const raw = $('sql-input') ? $('sql-input').value : '';
  const allLines = raw.split(/[\n,]+/).map(x => x.trim());
  const emptyCount = allLines.filter(x => x === '').length;
  const items = allLines.filter(x => x !== '');
  const total = items.length;
  const unique = [...new Set(items)];
  const dupeCount = total - unique.length;
  const numericCount = items.filter(x => !isNaN(Number(x)) && x !== '').length;

  // Stat cards
  $('ds-total').textContent   = total;
  $('ds-unique').textContent  = unique.length;
  $('ds-dupes').textContent   = dupeCount;
  $('ds-numeric').textContent = numericCount;
  $('ds-empty').textContent   = emptyCount;

  if (total === 0) {
    // Empty state
    $('ds-length-chart').innerHTML = '<div class="dash-empty"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg><p>Paste data in SQL input to see analytics</p></div>';
    $('ds-freq-tbody').innerHTML = '';
    $('ds-values-wrap').innerHTML = '<div class="dash-empty"><p>No data yet</p></div>';
    return;
  }

  // Length distribution
  const lenGroups = {};
  items.forEach(v => {
    const l = v.length;
    lenGroups[l] = (lenGroups[l] || 0) + 1;
  });
  const maxLenCount = Math.max(...Object.values(lenGroups));
  const sortedLens = Object.entries(lenGroups).sort((a,b) => Number(a[0]) - Number(b[0]));
  $('ds-length-chart').innerHTML = sortedLens.map(([len, count]) => `
    <div class="dash-bar-row">
      <span class="dash-bar-lbl">${len} char${len==1?'':'s'}</span>
      <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.round(count/maxLenCount*100)}%"></div></div>
      <span class="dash-bar-count">${count}</span>
    </div>`).join('');

  // Frequency table
  const freq = {};
  items.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a,b) => b[1] - a[1]);
  const maxFreq = sorted[0]?.[1] || 1;
  $('ds-freq-tbody').innerHTML = sorted.map(([val, count], i) => `
    <tr>
      <td style="color:var(--text3)">${i+1}</td>
      <td>${esc(val)}</td>
      <td>${count}</td>
      <td>${((count/total)*100).toFixed(1)}%</td>
      <td><div class="dash-freq-mini-bar" style="width:${Math.max(4,Math.round(count/maxFreq*120))}px"></div></td>
    </tr>`).join('');

  // Value chips
  const seen = {};
  items.forEach(v => { seen[v] = (seen[v]||0)+1; });
  $('ds-values-wrap').innerHTML = items.map(v =>
    `<span class="dash-chip${seen[v]>1?' dup':''}" title="${esc(v)}">${esc(v)}</span>`
  ).join('');

  // Click chip = copy
  $('ds-values-wrap').querySelectorAll('.dash-chip').forEach(chip =>
    chip.addEventListener('click', () => copyText(chip.title || chip.textContent))
  );
}

// Wire sql-input to also update dashboard
const sqlInputEl = $('sql-input');
if (sqlInputEl) {
  sqlInputEl.addEventListener('input', updateDashboard);
}

// Export Excel (CSV download — opens perfectly in Excel)
$('btn-export-excel').addEventListener('click', () => {
  const raw = $('sql-input') ? $('sql-input').value : '';
  const items = raw.split(/[\n,]+/).map(x => x.trim()).filter(x => x !== '');
  if (!items.length) return;

  const freq = {};
  items.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const total = items.length;
  const rows = [
    ['#', 'Value', 'Count', '% of Total', 'Is Duplicate'],
    ...Object.entries(freq)
      .sort((a,b) => b[1]-a[1])
      .map(([val, count], i) => [
        i+1, val, count,
        ((count/total)*100).toFixed(2)+'%',
        count > 1 ? 'Yes' : 'No'
      ])
  ];

  // Summary sheet header rows
  const summary = [
    ['DataFmt — Dashboard Export'],
    ['Generated', new Date().toLocaleString()],
    [''],
    ['SUMMARY'],
    ['Total items', items.length],
    ['Unique values', Object.keys(freq).length],
    ['Duplicates', items.length - Object.keys(freq).length],
    ['Numeric items', items.filter(x => !isNaN(Number(x)) && x !== '').length],
    [''],
    ['FREQUENCY TABLE'],
    ...rows
  ];

  const csv = summary.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `datafmt-dashboard-${new Date().toISOString().slice(0,10)}.csv`
  });
  a.click();
  URL.revokeObjectURL(url);
  showToast();
  $('toast').textContent = 'Excel file downloaded!';
  setTimeout(() => { $('toast').textContent = 'Copied!'; }, 2000);
});

// Trigger initial dashboard render
updateDashboard();

// Also update dashboard when switching to it
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.page === 'dashboard') updateDashboard();
  });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
let dashDelim = 'auto';
let dashHasHeader = true;
let dashParsed = { headers: [], rows: [] };

// Delimiter pills
document.querySelectorAll('#dash-delim-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#dash-delim-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); dashDelim = el.dataset.val; updateDashboard();
  })
);
document.querySelectorAll('#dash-header-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#dash-header-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); dashHasHeader = el.dataset.val === 'yes'; updateDashboard();
  })
);

function detectDelim(line) {
  const counts = { ',': 0, '\t': 0, '|': 0, ';': 0 };
  for (const c of line) if (c in counts) counts[c]++;
  return Object.entries(counts).sort((a,b) => b[1]-a[1])[0][1] > 0
    ? Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0] : null;
}

function parseDash(raw) {
  const lines = raw.split('\n').map(l => l.trimEnd()).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };

  const delim = dashDelim === 'auto'
    ? (detectDelim(lines[0]) || (lines.some(l => l.includes(',')) ? ',' : null))
    : (dashDelim === '\\t' ? '\t' : dashDelim);

  let rows;
  if (delim) {
    rows = lines.map(l => l.split(delim).map(c => c.trim()));
  } else {
    rows = lines.map(l => [l.trim()]);
  }

  // Normalize row lengths
  const maxCols = Math.max(...rows.map(r => r.length));
  rows = rows.map(r => { while (r.length < maxCols) r.push(''); return r; });

  let headers;
  if (dashHasHeader && rows.length > 1) {
    headers = rows[0];
    rows = rows.slice(1);
  } else {
    headers = Array.from({ length: maxCols }, (_, i) => `Column ${i+1}`);
  }
  return { headers, rows };
}

function updateDashboard() {
  const raw = ($('dash-input') || {}).value || '';
  dashParsed = parseDash(raw);
  const { headers, rows } = dashParsed;
  const total = rows.length;

  $('dash-input-meta').textContent = total + ' row' + (total !== 1 ? 's' : '') + ' · ' + headers.length + ' col' + (headers.length !== 1 ? 's' : '') + ' detected';
  $('ds-total').textContent = total;
  $('ds-cols').textContent = headers.length;

  if (!total) {
    $('ds-unique').textContent = 0;
    $('ds-dupes').textContent = 0;
    $('ds-preview-wrap').innerHTML = '<div class="dash-empty">Paste data on the left to preview</div>';
    $('ds-col-breakdown-card').style.display = 'none';
    return;
  }

  // Unique / dupes (by full row string)
  const rowStrs = rows.map(r => r.join('|||'));
  const uniqueSet = new Set(rowStrs);
  $('ds-unique').textContent = uniqueSet.size;
  $('ds-dupes').textContent = total - uniqueSet.size;

  // Preview table (first 50 rows)
  const preview = rows.slice(0, 50);
  const tableHTML = `<table class="dash-preview-table">
    <thead><tr><th class="row-num">#</th>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${preview.map((r,i) => `<tr><td class="row-num">${i+1}</td>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>${rows.length > 50 ? `<div class="dash-preview-more">Showing 50 of ${rows.length} rows</div>` : ''}`;
  $('ds-preview-wrap').innerHTML = tableHTML;

  // Column breakdown selector
  $('ds-col-breakdown-card').style.display = '';
  const sel = $('ds-col-select');
  const prevVal = sel.value;
  sel.innerHTML = headers.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join('');
  if (prevVal && [...sel.options].some(o => o.value === prevVal)) sel.value = prevVal;
  renderColChart(parseInt(sel.value) || 0);
}

function renderColChart(colIdx) {
  const { headers, rows } = dashParsed;
  if (!rows.length) return;
  const vals = rows.map(r => r[colIdx] || '').filter(v => v !== '');
  const freq = {};
  vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 20);
  const maxF = sorted[0]?.[1] || 1;
  $('ds-col-chart').innerHTML = sorted.map(([val, count]) => `
    <div class="dash-bar-row">
      <span class="dash-bar-lbl" title="${esc(val)}">${esc(val.length > 10 ? val.slice(0,9)+'…' : val)}</span>
      <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.round(count/maxF*100)}%"></div></div>
      <span class="dash-bar-count">${count}</span>
    </div>`).join('');
}

$('ds-col-select') && $('ds-col-select').addEventListener('change', e => renderColChart(parseInt(e.target.value)));
$('dash-input') && $('dash-input').addEventListener('input', updateDashboard);
$('btn-clear-dash') && $('btn-clear-dash').addEventListener('click', () => {
  $('dash-input').value = '';
  updateDashboard();
});

// ── Excel export (real .xlsx via SheetJS-style CSV with styling cues) ──────────
function buildExcelCSV() {
  const { headers, rows } = dashParsed;
  const title = ($('dash-title') || {}).value || 'Data Report';
  const incSummary = $('dx-summary').checked;
  const incData    = $('dx-data').checked;
  const incFreq    = $('dx-freq').checked;
  const incDupes   = $('dx-dupes').checked;
  const now = new Date().toLocaleString();
  const total = rows.length;
  const rowStrs = rows.map(r => r.join('|||'));
  const dupeRows = rows.filter((_, i) => rowStrs.indexOf(rowStrs[i]) !== i);
  const uniqueCount = new Set(rowStrs).size;

  const sheets = [];

  // ── SUMMARY sheet ──────────────────────────────────────────────────────────
  if (incSummary) {
    const s = [];
    s.push([title]);
    s.push(['Generated', now]);
    s.push(['']);
    s.push(['SUMMARY']);
    s.push(['Total rows',    total]);
    s.push(['Columns',       headers.length]);
    s.push(['Unique rows',   uniqueCount]);
    s.push(['Duplicate rows',total - uniqueCount]);
    s.push(['']);
    s.push(['COLUMN INFO']);
    s.push(['Column', 'Unique values', 'Empty cells', 'Sample values']);
    headers.forEach((h, ci) => {
      const col = rows.map(r => r[ci] || '');
      const uniq = new Set(col.filter(v => v !== '')).size;
      const empty = col.filter(v => v === '').length;
      const samples = [...new Set(col.filter(v => v !== ''))].slice(0, 3).join(', ');
      s.push([h, uniq, empty, samples]);
    });
    sheets.push({ name: 'Summary', rows: s });
  }

  // ── RAW DATA sheet ─────────────────────────────────────────────────────────
  if (incData) {
    const s = [headers, ...rows];
    sheets.push({ name: 'Raw Data', rows: s });
  }

  // ── FREQUENCY sheets (one per column if ≤5 cols, else first col only) ─────
  if (incFreq) {
    const colsToAnalyse = headers.length <= 5 ? headers.map((_, i) => i) : [0];
    colsToAnalyse.forEach(ci => {
      const col = rows.map(r => r[ci] || '').filter(v => v !== '');
      const freq = {};
      col.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
      const s = [
        [`Frequency — ${headers[ci]}`],
        ['Value', 'Count', '% of total'],
        ...sorted.map(([v, c]) => [v, c, ((c / col.length) * 100).toFixed(1) + '%'])
      ];
      const sheetName = ('Freq_' + headers[ci]).slice(0, 31).replace(/[\\/?*[\]:]/g, '_');
      sheets.push({ name: sheetName, rows: s });
    });
  }

  // ── DUPLICATES sheet ───────────────────────────────────────────────────────
  if (incDupes && dupeRows.length) {
    const s = [
      ['DUPLICATE ROWS'],
      [''],
      headers,
      ...dupeRows
    ];
    sheets.push({ name: 'Duplicates', rows: s });
  }

  return sheets;
}

function sheetsToCSVBlob(sheets) {
  // Multi-sheet as single CSV with separators (Excel can't do true multi-sheet from CSV,
  // but we use the xlsx format via a minimal XLSX builder below)
  let out = '';
  sheets.forEach(sheet => {
    out += `\n\n========== ${sheet.name} ==========\n`;
    out += sheet.rows.map(row =>
      row.map(cell => `"${String(cell ?? '').replace(/"/g,'""')}"`).join(',')
    ).join('\r\n');
  });
  return new Blob(['\uFEFF' + out], { type: 'text/csv;charset=utf-8;' });
}

// Minimal XLSX writer (no external lib needed)
function buildXLSX(sheets) {
  // Use XML-based SpreadsheetML (.xlsx = zip of XML files)
  // We'll build a proper xlsx using the Blob/zip approach
  const rows2xml = (rows) => rows.map(row =>
    `<row>${row.map((cell, ci) => {
      const val = String(cell ?? '');
      const isNum = val !== '' && !isNaN(Number(val)) && val.trim() !== '';
      return isNum
        ? `<c r="${colName(ci)}1"><v>${val}</v></c>`
        : `<c r="${colName(ci)}1" t="inlineStr"><is><t>${xmlEsc(val)}</t></is></c>`;
    }).join('')}</row>`
  ).join('');

  // Since we can't use JSZip without CDN, use CSV with .xlsx extension trick:
  // Instead, generate a proper HTML table that Excel opens natively
  const wb = buildExcelHTML(sheets);
  return new Blob([wb], { type: 'application/vnd.ms-excel;charset=utf-8;' });
}

function colName(i) {
  let s = '';
  i++;
  while (i > 0) { s = String.fromCharCode(64 + (i % 26 || 26)) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

function xmlEsc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildExcelHTML(sheets) {
  // Excel opens this perfectly — multi-sheet via HTML with table per sheet
  const title = ($('dash-title') || {}).value || 'Data Report';
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>`;
  sheets.forEach(s => {
    html += `<x:ExcelWorksheet><x:Name>${xmlEsc(s.name)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`;
  });
  html += `</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th { background: #4472C4; color: white; font-weight: bold; padding: 6px 10px; border: 1px solid #2F5496; text-align: left; }
  td { padding: 5px 10px; border: 1px solid #D9D9D9; }
  tr:nth-child(even) td { background: #EEF2FF; }
  tr:first-child th { font-size: 12pt; }
  .title-row td { background: #1F3864; color: white; font-size: 14pt; font-weight: bold; padding: 10px; border: none; }
  .section-row td { background: #8EA9C1; color: white; font-weight: bold; padding: 6px 10px; }
  .num { text-align: right; }
  .dup-row td { background: #FFE0E0 !important; }
  h2 { color: #1F3864; border-bottom: 2px solid #4472C4; padding-bottom: 4px; }
</style>
</head><body>`;

  sheets.forEach((sheet, si) => {
    html += `${si > 0 ? '<div style="page-break-before:always"></div>' : ''}
<h2>${xmlEsc(sheet.name)}</h2>
<table>`;
    sheet.rows.forEach((row, ri) => {
      const isTitle = ri === 0 && (row.length === 1 || (row[0] && row[0].toString().length > 20));
      const isSection = row.length > 0 && row[1] === undefined && row[0] && row[0].toString().startsWith('===');
      const isHeader = !isTitle && ri === (sheet.name === 'Raw Data' ? 0 : (sheet.name.startsWith('Freq') ? 2 : -1));
      const isDupRow = sheet.name === 'Duplicates' && ri > 2;
      if (row.every(c => c === '' || c == null)) { html += ''; return; }
      html += `<tr class="${isTitle?'title-row':isDupRow?'dup-row':''}">`;
      row.forEach(cell => {
        const v = String(cell ?? '');
        const isNum = v !== '' && !isNaN(Number(v.replace('%','')));
        html += isTitle
          ? `<td colspan="10">${xmlEsc(v)}</td>`
          : (isHeader || (ri === 0 && sheet.name !== 'Raw Data' && sheet.name !== 'Duplicates'))
          ? `<th>${xmlEsc(v)}</th>`
          : `<td class="${isNum?'num':''}">${xmlEsc(v)}</td>`;
      });
      html += '</tr>';
    });
    html += '</table>';
  });

  html += '</body></html>';
  return html;
}

$('btn-export-excel') && $('btn-export-excel').addEventListener('click', () => {
  if (!dashParsed.rows.length) { alert('Paste some data first!'); return; }
  const sheets = buildExcelCSV();
  const blob = buildXLSX(sheets);
  const title = ($('dash-title') || {}).value || 'data-report';
  const fname = title.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'') + '_' + new Date().toISOString().slice(0,10) + '.xls';
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fname });
  a.click(); URL.revokeObjectURL(a.href);
  $('toast').textContent = '✓ Excel downloaded!';
  showToast();
  setTimeout(() => { $('toast').textContent = 'Copied!'; }, 2200);
});

$('btn-export-csv') && $('btn-export-csv').addEventListener('click', () => {
  if (!dashParsed.rows.length) { alert('Paste some data first!'); return; }
  const sheets = buildExcelCSV();
  const blob = sheetsToCSVBlob(sheets);
  const title = ($('dash-title') || {}).value || 'data-report';
  const fname = title.replace(/\s+/g,'_') + '_' + new Date().toISOString().slice(0,10) + '.csv';
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fname });
  a.click(); URL.revokeObjectURL(a.href);
});

// Update dashboard when switching to page
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => { if (btn.dataset.page === 'dashboard') updateDashboard(); });
});
updateDashboard();
