'use strict';

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
function esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function copyText(val) {
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    const t = document.createElement('textarea');
    t.value = val; document.body.appendChild(t); t.select();
    document.execCommand('copy'); document.body.removeChild(t); showToast();
  });
}
function showToast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg || 'Copied!';
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); t.textContent = 'Copied!'; }, 1800);
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ct = $('clock-time'), cd = $('clock-date');
  if (ct) ct.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  if (cd) cd.textContent = `${days[now.getDay()]}, ${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── Generic custom dropdown helper ─────────────────────────────────────────────
function setupCustomSelect({ wrapId, triggerId, menuId, dataAttr, storageKey, defaultVal, onSelect, labelEl, swatchEl }) {
  const wrap = $(wrapId), trigger = $(triggerId), menu = $(menuId);
  if (!wrap || !trigger || !menu) return null;

  let current = localStorage.getItem(storageKey) || defaultVal;

  function render() {
    const opts = menu.querySelectorAll('.custom-select-opt');
    opts.forEach(opt => opt.classList.toggle('active', opt.getAttribute(dataAttr) === current));
    const activeOpt = [...opts].find(o => o.getAttribute(dataAttr) === current);
    if (activeOpt && labelEl) labelEl.textContent = activeOpt.textContent.trim();
    if (activeOpt && swatchEl) {
      const swatch = activeOpt.querySelector('.swatch-preview');
      if (swatch) swatchEl.className = swatch.className;
    }
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.custom-select.open').forEach(s => { if (s !== wrap) s.classList.remove('open'); });
    wrap.classList.toggle('open');
  });

  menu.querySelectorAll('.custom-select-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      current = opt.getAttribute(dataAttr);
      localStorage.setItem(storageKey, current);
      wrap.classList.remove('open');
      render();
      onSelect(current);
    });
  });

  document.addEventListener('click', e => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });

  render();
  onSelect(current);
  return { get: () => current };
}

// ── Theme picker ──────────────────────────────────────────────────────────────
const THEME_KEY = 'datafmt_theme';
const THEME_CLASSES = ['glass', 'monolight', 'monodark', 'paper']; // 'normal' = no class

setupCustomSelect({
  wrapId: 'theme-select-wrap',
  triggerId: 'theme-select-trigger',
  menuId: 'theme-select-menu',
  dataAttr: 'data-theme',
  storageKey: THEME_KEY,
  defaultVal: 'normal',
  labelEl: $('theme-select-label'),
  swatchEl: $('theme-select-swatch'),
  onSelect: (val) => {
    THEME_CLASSES.forEach(c => document.body.classList.remove(c));
    if (THEME_CLASSES.includes(val)) document.body.classList.add(val);
  },
});

// ── Font pickers ───────────────────────────────────────────────────────────────
const FONT_UI_MAP = {
  inter:       "'Inter', system-ui, sans-serif",
  system:      "system-ui, -apple-system, sans-serif",
  handwritten: "'Caveat', cursive",
  cursive:     "'Dancing Script', cursive",
  serif:       "Georgia, 'Times New Roman', serif",
};
const FONT_CODE_MAP = {
  jetbrains: "'JetBrains Mono', monospace",
  fira:      "'Fira Code', monospace",
  mono:      "'Roboto Mono', monospace",
  ibm:       "'IBM Plex Mono', monospace",
};

setupCustomSelect({
  wrapId: 'font-ui-select-wrap',
  triggerId: 'font-ui-select-trigger',
  menuId: 'font-ui-select-menu',
  dataAttr: 'data-font-ui',
  storageKey: 'datafmt_font_ui',
  defaultVal: 'inter',
  labelEl: $('font-ui-select-label'),
  onSelect: (val) => {
    document.documentElement.style.setProperty('--sans', FONT_UI_MAP[val] || FONT_UI_MAP.inter);
  },
});

setupCustomSelect({
  wrapId: 'font-code-select-wrap',
  triggerId: 'font-code-select-trigger',
  menuId: 'font-code-select-menu',
  dataAttr: 'data-font-code',
  storageKey: 'datafmt_font_code',
  defaultVal: 'jetbrains',
  labelEl: $('font-code-select-label'),
  onSelect: (val) => {
    document.documentElement.style.setProperty('--mono', FONT_CODE_MAP[val] || FONT_CODE_MAP.jetbrains);
  },
});

// ── Nav ───────────────────────────────────────────────────────────────────────
function goToPage(pageName) {
  document.querySelectorAll('.nav-item, .mnav-item').forEach(b => b.classList.toggle('active', b.dataset.page === pageName));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = $('page-' + pageName);
  if (page) page.classList.add('active');
  if (pageName === 'library')    { buildLibrary(); buildWidget(); }
  if (pageName === 'favorites')  buildFavorites();
}

document.querySelectorAll('.nav-item, .mnav-item').forEach(btn =>
  btn.addEventListener('click', () => goToPage(btn.dataset.page))
);

// ── Collapsible cards ─────────────────────────────────────────────────────────
document.querySelectorAll('.ctoggle').forEach(btn =>
  btn.addEventListener('click', () => {
    const card = btn.closest('.collapsible');
    if (card) { const open = card.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open)); }
  })
);

// ── Formatter ─────────────────────────────────────────────────────────────────
let quoteStyle = 'single', sepStyle = ', ';

function buildAddonGrid() {
  const grid = $('addon-grid'); if (!grid) return;
  grid.innerHTML = '';
  (ADDONS||[]).forEach(addon => {
    const card = document.createElement('label');
    card.className = 'addon-card';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = 'cb-' + addon.id; cb.checked = !!addon.default;
    const info = document.createElement('div');
    info.className = 'addon-info';
    info.innerHTML = `<span class="addon-name">${esc(addon.name)}</span><span class="addon-desc">${esc(addon.desc)}</span>`;
    card.appendChild(cb); card.appendChild(info);
    if (addon.subType) {
      const sw = document.createElement('div');
      sw.className = 'sub-opts' + (cb.checked ? ' show' : '');
      sw.id = 'sub-' + addon.id;
      if (addon.subType === 'text') {
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'sub-inp'; inp.id = 'subval-' + addon.id;
        inp.placeholder = addon.subLabel || ''; inp.value = addon.subDefault || '';
        inp.addEventListener('input', format);
        sw.appendChild(inp);
      }
      if (addon.subType === 'pills') {
        const def = addon.subDefault || addon.subPills[0].val;
        addon.subPills.forEach(p => {
          const b = document.createElement('button');
          b.className = 'pill' + (p.val === def ? ' active' : '');
          b.dataset.grp = 'subpill-' + addon.id; b.dataset.val = p.val; b.textContent = p.label;
          b.addEventListener('click', e => {
            e.preventDefault();
            sw.querySelectorAll('[data-grp]').forEach(x => x.classList.remove('active'));
            b.classList.add('active'); format();
          });
          sw.appendChild(b);
        });
      }
      card.appendChild(sw);
      cb.addEventListener('change', () => { sw.classList.toggle('show', cb.checked); format(); });
    } else {
      cb.addEventListener('change', format);
    }
    grid.appendChild(card);
  });
}

function getSubVal(addon) {
  if (!addon.subType) return null;
  if (addon.subType === 'text') return ($('subval-' + addon.id)||{}).value || '';
  if (addon.subType === 'pills') {
    const a = document.querySelector(`[data-grp="subpill-${addon.id}"].active`);
    return a ? a.dataset.val : (addon.subDefault || '');
  }
  return null;
}

function parseItems(raw) {
  return (raw||'').split(/[\n,]+/).flatMap(line =>
    (line.includes(' ') && !line.includes(',')) ? line.split(/\s+/) : [line]
  );
}

function applyAddons(items) {
  for (const a of (ADDONS||[])) {
    if (a.id === 'wrap' || !a.apply) continue;
    if (!$('cb-' + a.id)?.checked) continue;
    items = a.apply(items, getSubVal(a));
  }
  return items;
}

function wrapQ(item, s) {
  if (s === 'single')   return `'${item}'`;
  if (s === 'double')   return `"${item}"`;
  if (s === 'backtick') return '`' + item + '`';
  return item;
}

function getSep() {
  if (sepStyle === 'custom') return $('custom-sep')?.value || '';
  return sepStyle === '\\n' ? '\n' : sepStyle;
}

function format() {
  const inputEl = $('input'); if (!inputEl) return;
  const rawInput = inputEl.value;
  let items = applyAddons(parseItems(rawInput));
  const showCharCount = $('cb-charCount')?.checked;

  const meta = $('input-meta');
  if (meta) {
    let metaText = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';
    if (showCharCount) metaText += ' · ' + rawInput.length + ' input chars';
    meta.textContent = metaText;
  }

  let result = items.map(x => wrapQ(x, quoteStyle)).join(getSep());
  const wa = (ADDONS||[]).find(a => a.id === 'wrap');
  if (wa && $('cb-wrap')?.checked) { const o = getSubVal(wa), c = o==='('?')':o==='{'?'}':']'; result = o+result+c; }
  const out = $('output'); if (out) out.value = result;

  const stat = $('stat');
  if (stat) {
    let statText = items.length + ' items · ' + result.length + ' chars';
    if (showCharCount) statText += ' (output)';
    stat.textContent = statText;
  }
}

document.querySelectorAll('#quote-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#quote-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); quoteStyle = el.dataset.val; format();
  })
);
document.querySelectorAll('#sep-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#sep-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active'); sepStyle = el.dataset.val;
    $('custom-sep')?.classList.toggle('show', sepStyle === 'custom');
    format();
  })
);
on('custom-sep', 'input', format);
on('input', 'input', format);
on('btn-copy', 'click', () => copyText($('output')?.value));
on('btn-download', 'click', () => {
  const v = $('output')?.value; if (!v) return;
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([v], {type:'text/plain'})), download:'formatted-data.txt' }).click();
});
on('btn-clear', 'click', () => {
  const i=$('input'), o=$('output'), s=$('stat'), m=$('input-meta');
  if(i)i.value=''; if(o)o.value=''; if(s)s.textContent=''; if(m)m.textContent='0 items detected';
});
on('btn-clear-input', 'click', () => {
  const i=$('input'), o=$('output'), s=$('stat'), m=$('input-meta');
  if(i)i.value=''; if(o)o.value=''; if(s)s.textContent=''; if(m)m.textContent='0 items detected';
});

document.querySelectorAll('.ql-btn').forEach(btn =>
  btn.addEventListener('click', () => {
    const items = applyAddons(parseItems($('input')?.value||''));
    const m = btn.dataset.mode; let r = '';
    if (m==='sql') r = 'IN (' + items.map(x=>`'${x}'`).join(', ') + ')';
    if (m==='js')  r = '[' + items.map(x=>`'${x}'`).join(', ') + ']';
    if (m==='csv') r = items.map(x=>/[,\s"]/.test(x)?`"${x}"`:x).join(',');
    if (m==='py')  r = '[' + items.map(x=>`'${x}'`).join(', ') + ']';
    const out=$('output'), stat=$('stat');
    if(out) out.value=r; if(stat) stat.textContent=items.length+' items · '+r.length+' chars';
  })
);

// ── SQL page ──────────────────────────────────────────────────────────────────
let sqlQ = 'single';

function buildSqlSaved() {
  const list = $('sql-saved-list'); if (!list) return;
  list.innerHTML = '';
  (SQL_TEMPLATES||[]).forEach(tpl => {
    const b = document.createElement('button'); b.className = 'pill'; b.textContent = tpl.label;
    b.addEventListener('click', () => { const t=$('sql-template'); if(t) t.value=tpl.query; buildQuery(); });
    list.appendChild(b);
  });
}

function buildQuery() {
  const tplEl=$('sql-template'), outEl=$('sql-output'), statEl=$('sql-stat'), metaEl=$('sql-input-meta');
  if (!tplEl||!outEl) return;
  const tpl = tplEl.value.trim();
  if (!tpl) { outEl.value=''; return; }
  const stripPipes = $('sql-strip-pipes')?.checked;
  let items = parseItems($('sql-input')?.value||'').map(x=>x.trim()).filter(x=>x!=='');
  if (stripPipes) {
    items = items
      .map(x => x.split('|').join(' '))
      .map(x => x.trim())
      .filter(x => x !== '');
  }
  const inList = items.map(x => sqlQ==='single'?`'${x.replace(/'/g,"''")}'`:sqlQ==='double'?`"${x.replace(/"/g,'""')}"`:x).join(', ');
  outEl.value = tpl.replace(/\{\{IN\}\}/g, inList);
  if(statEl) statEl.textContent = items.length+' values injected';
  if(metaEl) metaEl.textContent = items.length+' item'+(items.length!==1?'s':'')+' detected';
}

document.querySelectorAll('#sql-quote-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#sql-quote-opts .pill').forEach(p=>p.classList.remove('active'));
    el.classList.add('active'); sqlQ=el.dataset.val; buildQuery();
  })
);
on('btn-sql-run',       'click', buildQuery);
on('sql-template',      'input', buildQuery);
on('sql-input',         'input', buildQuery);
on('sql-strip-pipes',   'change', buildQuery);
on('btn-sql-copy',      'click', () => copyText($('sql-output')?.value));
on('btn-clear-sql-input','click', () => {
  const i=$('sql-input'),o=$('sql-output'),s=$('sql-stat'),m=$('sql-input-meta');
  if(i)i.value=''; if(o)o.value=''; if(s)s.textContent=''; if(m)m.textContent='0 items detected';
});

// ── My Queries ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'datafmt_custom_entries';
const FAV_KEY = 'datafmt_favorites';
function loadCustom() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; } }
function saveCustom(e) { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); }
function loadFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); } catch { return []; } }
function saveFavs(f) { localStorage.setItem(FAV_KEY, JSON.stringify(f)); }
function favKeyFor(item) { return item.id || item.label; }
function isFav(item) { return loadFavs().includes(favKeyFor(item)); }
function toggleFav(item) {
  const key = favKeyFor(item);
  let favs = loadFavs();
  if (favs.includes(key)) favs = favs.filter(f => f !== key);
  else favs.unshift(key);
  saveFavs(favs);
}
function starSVG(filled) {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
}

// Shared action-button row: Copy, Edit, Star, Delete
function buildItemActions({ isStarred }) {
  return `
    <div class="lib-item-actions">
      <button class="lib-act-btn lib-act-copy" title="Copy to clipboard">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
      <button class="lib-act-btn lib-act-edit" title="Edit query">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Edit</span>
      </button>
      <button class="lib-act-btn lib-act-star${isStarred?' active':''}" title="${isStarred?'Remove favorite':'Add to favorites'}">
        ${starSVG(isStarred)}
      </button>
      <button class="lib-act-btn lib-act-delete" title="Delete query">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>`;
}

// Flat list of every saved query (for favorites lookups, widget, etc.)
function getAllLibraryItems() {
  return loadCustom().map(e => ({ label: e.label, code: e.code, id: e.id }));
}

function buildLibrary(filter) {
  const body = $('library-body'); if (!body) return;
  body.innerHTML = '';
  filter = (filter||'').toLowerCase().trim();
  const all = loadCustom();
  const items = filter ? all.filter(it => (it.label+' '+it.code).toLowerCase().includes(filter)) : all;

  if (!items.length) {
    body.innerHTML = filter
      ? `<div class="dash-empty"><p>No queries match "${esc(filter)}"</p></div>`
      : `<div class="dash-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <p>No saved queries yet — click <strong style="color:var(--text2)">+ Add query</strong> to save your first one.</p>
        </div>`;
    return;
  }

  items.forEach((item, idx) => {
    const filled = isFav(item);
    const row = document.createElement('div');
    row.className = 'lib-item lib-item-anim';
    row.style.animationDelay = (idx * 30) + 'ms';
    row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div><pre class="lib-item-code">${esc(item.code)}</pre></div>${buildItemActions({isStarred:filled})}`;
    row.querySelector('.lib-act-copy').addEventListener('click', e => { e.stopPropagation(); copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
    row.querySelector('.lib-act-edit').addEventListener('click', e => { e.stopPropagation(); openModal(item.code, item); });
    row.querySelector('.lib-act-star').addEventListener('click', e => {
      e.stopPropagation(); toggleFav(item);
      const btn = e.currentTarget; const nowFilled = isFav(item);
      btn.classList.toggle('active', nowFilled); btn.innerHTML = starSVG(nowFilled);
    });
    row.querySelector('.lib-act-delete').addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Delete "${item.label}"?`)) {
        row.classList.add('removing');
        setTimeout(() => { saveCustom(loadCustom().filter(x=>x.id!==item.id)); buildLibrary($('lib-search')?.value); buildWidget(); }, 180);
      }
    });
    body.appendChild(row);
  });
}

on('lib-search', 'input', e => buildLibrary(e.target.value));

// ── Favorites page ─────────────────────────────────────────────────────────────
function buildFavorites(filter) {
  const body = $('favorites-body'); if (!body) return;
  body.innerHTML = '';
  filter = (filter||'').toLowerCase().trim();
  const favs = loadFavs();
  const all = loadCustom();
  let favItems = all.filter(it => favs.includes(favKeyFor(it)));
  if (filter) favItems = favItems.filter(it => (it.label+' '+it.code).toLowerCase().includes(filter));

  if (!favItems.length) {
    body.innerHTML = `<div class="dash-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <p>No favorites yet — star any query in My Queries to see it here.</p>
    </div>`;
    return;
  }

  favItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'lib-item fav-row lib-item-anim';
    row.style.animationDelay = (idx * 30) + 'ms';
    row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div><pre class="lib-item-code">${esc(item.code)}</pre></div>${buildItemActions({isStarred:true})}`;
    row.querySelector('.lib-act-copy').addEventListener('click', e => { e.stopPropagation(); copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
    row.querySelector('.lib-act-edit').addEventListener('click', e => { e.stopPropagation(); openModal(item.code, item); });
    row.querySelector('.lib-act-star').addEventListener('click', e => {
      e.stopPropagation();
      toggleFav(item);
      row.classList.add('removing');
      setTimeout(() => { row.remove(); if (!$('favorites-body').children.length) buildFavorites($('fav-search')?.value); }, 180);
    });
    row.querySelector('.lib-act-delete').addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Delete "${item.label}"?`)) {
        saveCustom(loadCustom().filter(x=>x.id!==item.id));
        toggleFav(item);
        row.classList.add('removing');
        setTimeout(() => row.remove(), 180);
      }
    });
    body.appendChild(row);
  });
}
on('fav-search', 'input', e => buildFavorites(e.target.value));

// ── Add/Edit query modal ───────────────────────────────────────────────────────
let editingEntryId = null; // null = adding new, otherwise editing this entry's id

function openModal(code, existingItem) {
  const o=$('modal-overlay'); if(!o) return;
  editingEntryId = existingItem?.id || null;

  $('m-label').value = existingItem?.label || '';
  const mc=$('m-code'); if(mc) mc.value = code || existingItem?.code || '';
  $('m-error')?.classList.add('hidden');

  const titleEl = document.querySelector('.modal-title');
  if (titleEl) titleEl.textContent = editingEntryId ? 'Edit query' : 'Add query';
  const saveLabel = $('btn-modal-save-label');
  if (saveLabel) saveLabel.textContent = editingEntryId ? 'Save changes' : 'Save query';

  o.classList.remove('hidden');
  setTimeout(()=>$('m-label')?.focus(),50);
}
function closeModal() { $('modal-overlay')?.classList.add('hidden'); editingEntryId = null; }

on('btn-lib-add',    'click', () => openModal());
on('btn-modal-close','click', closeModal);
on('btn-modal-cancel','click',closeModal);
$('modal-overlay')?.addEventListener('click', e => { if(e.target===$('modal-overlay')) closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

on('btn-modal-save','click', () => {
  const label=$('m-label')?.value.trim(), code=$('m-code')?.value.trim();
  if (!label||!code) { $('m-error')?.classList.remove('hidden'); return; }
  $('m-error')?.classList.add('hidden');
  const entries = loadCustom();

  if (editingEntryId) {
    const idx = entries.findIndex(e => e.id === editingEntryId);
    if (idx !== -1) entries[idx] = { ...entries[idx], label, code };
    saveCustom(entries);
    showToast('Query updated!');
  } else {
    entries.unshift({ id:'q_'+Date.now(), label, code });
    saveCustom(entries);
    showToast('Query saved!');
  }

  closeModal();
  goToPage('library');
  buildLibrary(); buildWidget();
});

// ── My Queries widget (SQL page sidebar) ────────────────────────────────────────
function buildWidget(filter) {
  const body=$('widget-body'); if(!body) return;
  body.innerHTML='';
  filter=(filter||'').toLowerCase().trim();
  const all = loadCustom();
  const items = filter ? all.filter(it => (it.label+' '+it.code).toLowerCase().includes(filter)) : all;

  if (!items.length) {
    body.innerHTML = '<div style="padding:1rem;font-size:0.78rem;color:var(--text3);text-align:center">No saved queries yet</div>';
    return;
  }

  items.forEach((item, idx) => {
    const row=document.createElement('div'); row.className='ws-item ws-item-anim';
    row.style.animationDelay = (idx * 25) + 'ms';
    const preview=(item.code.split('\n').find(l=>l.trim())||item.code);
    row.innerHTML=`<div class="ws-item-info"><div class="ws-item-label" title="${esc(item.label)}">${esc(item.label)}</div><div class="ws-item-preview">${esc(preview.length>50?preview.slice(0,49)+'…':preview)}</div></div><button class="ws-load-btn" title="Load into template"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button><button class="ws-copy-btn"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>`;
    row.querySelector('.ws-copy-btn').addEventListener('click',e=>{e.stopPropagation();copyText(item.code);row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),900);});
    row.querySelector('.ws-load-btn').addEventListener('click',e=>{e.stopPropagation();const t=$('sql-template');if(t){t.value=item.code;buildQuery();t.style.borderColor='var(--accent)';setTimeout(()=>t.style.borderColor='',800);}});
    row.addEventListener('click',()=>{copyText(item.code);row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),900);});
    body.appendChild(row);
  });
}
on('widget-search','input',e=>buildWidget(e.target.value));

// ── Drag & drop for textareas ──────────────────────────────────────────────────
function enableDropzone(textareaEl, onDropped) {
  if (!textareaEl) return;
  ['dragenter','dragover'].forEach(ev => textareaEl.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    textareaEl.classList.add('drag-over');
  }));
  ['dragleave','dragend'].forEach(ev => textareaEl.addEventListener(ev, e => {
    e.preventDefault(); e.stopPropagation();
    textareaEl.classList.remove('drag-over');
  }));
  textareaEl.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    textareaEl.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      textareaEl.value = reader.result;
      textareaEl.dispatchEvent(new Event('input', { bubbles: true }));
      if (onDropped) onDropped(file, reader.result);
      showToast('File loaded: ' + file.name);
    };
    reader.readAsText(file);
  });
}

enableDropzone($('input'));
enableDropzone($('sql-input'));
enableDropzone($('checker-input'));

// ── SQL Checker ──────────────────────────────────────────────────────────────────
const SQL_KEYWORDS = ['SELECT','FROM','WHERE','JOIN','INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL JOIN','ON',
  'GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM',
  'AND','OR','NOT','IN','EXISTS','BETWEEN','LIKE','IS NULL','IS NOT NULL','AS','DISTINCT','UNION','UNION ALL',
  'CASE','WHEN','THEN','ELSE','END','CREATE TABLE','ALTER TABLE','DROP TABLE','PRIMARY KEY','FOREIGN KEY',
  'REFERENCES','DEFAULT','NULL','ASC','DESC','COUNT','SUM','AVG','MIN','MAX'];

function checkQuery(sql) {
  const issues = [];
  const tips = [];
  const trimmed = sql.trim();
  if (!trimmed) return { issues: [{type:'error', msg:'Query is empty.'}], tips: [], formatted: '' };

  // ── Syntax checks ──
  const openParens = (trimmed.match(/\(/g)||[]).length;
  const closeParens = (trimmed.match(/\)/g)||[]).length;
  if (openParens !== closeParens) issues.push({type:'error', msg:`Mismatched parentheses: ${openParens} open vs ${closeParens} close.`});

  const singleQuotes = (trimmed.match(/'/g)||[]).length;
  if (singleQuotes % 2 !== 0) issues.push({type:'error', msg:'Unclosed single quote detected.'});

  const doubleQuotes = (trimmed.match(/"/g)||[]).length;
  if (doubleQuotes % 2 !== 0) issues.push({type:'error', msg:'Unclosed double quote detected.'});

  if (!/;\s*$/.test(trimmed)) issues.push({type:'warn', msg:'Query does not end with a semicolon.'});

  const upper = trimmed.toUpperCase();
  if (/\bSELECT\b/.test(upper) && !/\bFROM\b/.test(upper)) issues.push({type:'error', msg:'SELECT statement is missing a FROM clause.'});

  if (/\bFROM\s+,/.test(upper) || /,\s*FROM\b/.test(upper)) issues.push({type:'error', msg:'Trailing or stray comma near FROM clause.'});

  if (/,\s*\)/.test(trimmed)) issues.push({type:'error', msg:'Trailing comma before closing parenthesis.'});

  if (/\bWHERE\s*$/.test(upper.trim())) issues.push({type:'error', msg:'WHERE clause has no condition.'});

  if (/\bJOIN\b/.test(upper) && !/\bON\b/.test(upper)) issues.push({type:'error', msg:'JOIN is missing an ON condition.'});

  // double keyword check e.g. "WHERE WHERE" or "SELECT SELECT"
  SQL_KEYWORDS.forEach(kw => {
    const re = new RegExp('\\b'+kw+'\\s+'+kw+'\\b', 'i');
    if (re.test(trimmed)) issues.push({type:'error', msg:`Duplicate keyword detected: "${kw} ${kw}".`});
  });

  // ── Optimization tips ──
  if (/SELECT\s+\*/i.test(trimmed)) tips.push('Avoid SELECT * — list only the columns you need to reduce I/O and improve query plan caching.');
  if (/\bWHERE\b/i.test(upper) === false && /\b(UPDATE|DELETE)\b/i.test(upper)) tips.push('UPDATE/DELETE without WHERE will affect every row — make sure this is intentional.');
  if (/\bLIKE\s+'%/i.test(trimmed)) tips.push('A leading wildcard in LIKE (\'%value\') prevents index usage — consider full-text search or a different pattern.');
  if (/\bOR\b/i.test(upper) && /\bWHERE\b/i.test(upper)) tips.push('Multiple OR conditions in WHERE can prevent index usage — consider UNION of indexed queries or IN(...) for equality checks.');
  if (/\bNOT\s+IN\b/i.test(upper)) tips.push('NOT IN can be slow with NULLs present — consider NOT EXISTS instead.');
  if (/\bDISTINCT\b/i.test(upper) && /\bGROUP BY\b/i.test(upper)) tips.push('Using DISTINCT together with GROUP BY is usually redundant — GROUP BY already deduplicates.');
  if (/\bORDER BY\b/i.test(upper) && !/\bLIMIT\b/i.test(upper)) tips.push('ORDER BY without LIMIT sorts the entire result set — add LIMIT if you only need top N rows.');
  if ((trimmed.match(/\bJOIN\b/gi)||[]).length >= 4) tips.push('Query has 4+ JOINs — verify indexes exist on all join columns to avoid slow nested loops.');
  if (/\bIN\s*\(\s*SELECT/i.test(trimmed)) tips.push('IN (SELECT ...) subqueries can often be rewritten as JOINs or EXISTS for better performance on large tables.');
  if (!/\bLIMIT\b/i.test(upper) && /\bSELECT\b/i.test(upper) && !/\bCOUNT\(/i.test(upper)) tips.push('Consider adding a LIMIT clause during development/testing to avoid pulling huge result sets.');
  if (/--/.test(trimmed) === false && /\/\*/.test(trimmed) === false && trimmed.length > 200) tips.push('Long query with no comments — consider adding inline comments for readability.');

  if (issues.length === 0) issues.push({type:'ok', msg:'No syntax issues detected.'});

  return { issues, tips, formatted: formatSQL(trimmed) };
}

function formatSQL(sql) {
  let s = sql.replace(/\s+/g, ' ').trim();
  // Uppercase keywords (longest first to handle multi-word keywords)
  const sorted = [...SQL_KEYWORDS].sort((a,b) => b.length - a.length);
  sorted.forEach(kw => {
    const re = new RegExp('\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'gi');
    s = s.replace(re, kw);
  });
  // Line breaks before major clauses
  const breakBefore = ['SELECT','FROM','WHERE','GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET',
    'INNER JOIN','LEFT JOIN','RIGHT JOIN','FULL JOIN','JOIN','UNION ALL','UNION','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM'];
  breakBefore.forEach(kw => {
    const re = new RegExp('\\s*\\b' + kw.replace(/ /g, '\\s+') + '\\b', 'g');
    s = s.replace(re, '\n' + kw);
  });
  // Indent AND/OR under WHERE
  s = s.split('\n').map(line => {
    const t = line.trim();
    if (/^(AND|OR)\b/i.test(t)) return '  ' + t;
    return t;
  }).join('\n');
  // Comma-separated columns after SELECT onto aligned lines if long
  s = s.replace(/^SELECT\s+(.+)$/m, (m, cols) => {
    const parts = cols.split(',').map(c => c.trim());
    if (parts.length > 3) return 'SELECT\n  ' + parts.join(',\n  ');
    return 'SELECT ' + parts.join(', ');
  });
  return s.trim();
}

function renderCheckerResults(result) {
  const box = $('checker-results'); if (!box) return;
  const iconFor = t => t==='error' ? '⛔' : t==='warn' ? '⚠️' : '✅';
  const colorFor = t => t==='error' ? 'chk-error' : t==='warn' ? 'chk-warn' : 'chk-ok';
  let html = '<div class="chk-group"><div class="chk-group-title">Syntax</div>';
  result.issues.forEach(i => { html += `<div class="chk-row ${colorFor(i.type)}"><span class="chk-icon">${iconFor(i.type)}</span><span>${esc(i.msg)}</span></div>`; });
  html += '</div>';
  if (result.tips.length) {
    html += '<div class="chk-group"><div class="chk-group-title">Optimization tips</div>';
    result.tips.forEach(t => { html += `<div class="chk-row chk-tip"><span class="chk-icon">💡</span><span>${esc(t)}</span></div>`; });
    html += '</div>';
  } else {
    html += '<div class="chk-group"><div class="chk-group-title">Optimization tips</div><div class="chk-row chk-ok"><span class="chk-icon">✅</span><span>No obvious optimization issues found.</span></div></div>';
  }
  box.innerHTML = html;
}

on('btn-check-query', 'click', () => {
  const sql = $('checker-input')?.value || '';
  const result = checkQuery(sql);
  renderCheckerResults(result);
  const out = $('checker-output'); if (out) out.value = result.formatted;
  const meta = $('checker-meta');
  if (meta) {
    const errCount = result.issues.filter(i=>i.type==='error').length;
    const warnCount = result.issues.filter(i=>i.type==='warn').length;
    meta.textContent = errCount ? `${errCount} error${errCount!==1?'s':''} found` : warnCount ? `${warnCount} warning${warnCount!==1?'s':''}` : 'No issues found';
  }
});
on('btn-clear-checker', 'click', () => {
  const i=$('checker-input'), o=$('checker-output'), m=$('checker-meta'), r=$('checker-results');
  if(i)i.value=''; if(o)o.value=''; if(m)m.textContent='Paste a query to analyze';
  if(r)r.innerHTML='<div class="dash-empty">Run a query to see results</div>';
});
on('btn-copy-formatted', 'click', () => copyText($('checker-output')?.value));

// ── SQL Table(s) → Excel ───────────────────────────────────────────────────────
// Supports pasting MULTIPLE query+result blocks in one go. Query text and noise
// (footers, blank lines) are discarded; only table-shaped lines are kept. Blocks
// with identical headers are merged into one table (with a Source column);
// blocks with different headers become separate tables.

let sqlTableGroups = []; // [{ headers, rows, sources: [blockLabel,...], merged: bool }]

function isBorderLine(t) {
  return /^\+?[-+]+\+?$/.test(t);
}
function isFooterLine(t) {
  return /^\d+\s+rows?\s+in\s+set/i.test(t) || /^\(\d+\s+rows?\)/i.test(t);
}
function isTableLine(t) {
  // A line is "table-shaped" if it's a border, or contains a pipe with content on both sides
  if (isBorderLine(t)) return true;
  if (t.includes('|')) return true;
  return false;
}
function splitRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map(c => c.trim());
}

// Detect a PostgreSQL-style header followed by a "----+----+----" separator
// (no pipes in the separator, but the header line itself uses pipes).
function isPgSeparator(t) {
  return /^[-]+(\+[-]+)+$/.test(t) || /^[-]+$/.test(t) && t.length > 2;
}

function extractTableBlocks(text) {
  const rawLines = text.split('\n').map(l => l.replace(/\r$/, ''));
  const blocks = [];
  let current = [];
  let currentBorderSig = null;   // exact border string of the table currently being read
  let borderCountInCurrent = 0;  // MySQL emits exactly 3 borders per table: top, after-header, bottom

  const flush = () => {
    if (current.length) blocks.push(current);
    current = [];
    currentBorderSig = null;
    borderCountInCurrent = 0;
  };

  for (const line of rawLines) {
    const t = line.trim();
    if (t === '') { flush(); continue; }
    if (isFooterLine(t)) { flush(); continue; }

    if (isBorderLine(t)) {
      if (currentBorderSig === null) {
        // first border of a fresh block
        currentBorderSig = t;
        borderCountInCurrent = 1;
        current.push(line);
      } else if (t === currentBorderSig) {
        borderCountInCurrent++;
        current.push(line);
        // A 4th identical border can't belong to the same table (MySQL only ever
        // emits 3 per result set) — it's the TOP border of a new same-shaped table
        // pasted immediately after, with no blank line in between.
        if (borderCountInCurrent === 4) {
          current.pop();
          flush();
          currentBorderSig = t;
          borderCountInCurrent = 1;
          current.push(line);
        }
      } else {
        // Different column widths -> a new table has started right here
        flush();
        currentBorderSig = t;
        borderCountInCurrent = 1;
        current.push(line);
      }
    } else if (isPgSeparator(t) || t.includes('|')) {
      current.push(line);
    } else {
      // Non-table line (e.g. the SQL query itself, a notice, prompt) — discard, end current block
      flush();
    }
  }
  flush();
  return blocks;
}

function parseBlockLines(blockLines) {
  const lines = blockLines.filter(l => {
    const t = l.trim();
    if (isBorderLine(t)) return false;
    if (isPgSeparator(t) && !t.includes('|')) return false;
    return true;
  });
  if (!lines.length) return null;
  const allRows = lines.map(splitRow);
  const maxCols = Math.max(...allRows.map(r => r.length));
  if (maxCols < 1) return null;
  const normalized = allRows.map(r => { while (r.length < maxCols) r.push(''); return r; });
  const headers = normalized[0];
  const rows = normalized.slice(1).filter(r => r.some(c => c !== ''));
  if (!rows.length) return null;
  return { headers, rows };
}

function headerSignature(headers) {
  return headers.map(h => h.toLowerCase().trim()).join('|||');
}

function parseMultiSQLTables(text) {
  const blocks = extractTableBlocks(text);
  const parsedBlocks = blocks
    .map((b, i) => ({ parsed: parseBlockLines(b), label: `Query ${i + 1}` }))
    .filter(b => b.parsed);

  if (!parsedBlocks.length) return [];

  // Group by header signature
  const groups = new Map();
  parsedBlocks.forEach(({ parsed, label }) => {
    const sig = headerSignature(parsed.headers);
    if (!groups.has(sig)) groups.set(sig, { headers: parsed.headers, rows: [], sources: [] });
    const g = groups.get(sig);
    parsed.rows.forEach(r => { g.rows.push(r); g.sources.push(label); });
  });

  // Re-label sources sequentially if only one block total per group (no need for "Query 1" everywhere)
  const result = [];
  let groupIdx = 1;
  groups.forEach(g => {
    const uniqueSources = [...new Set(g.sources)];
    const merged = uniqueSources.length > 1;
    result.push({
      title: merged ? `Merged result (${uniqueSources.length} queries)` : uniqueSources[0],
      headers: g.headers,
      rows: g.rows,
      sources: g.sources,
      merged,
    });
    groupIdx++;
  });
  return result;
}

function renderSQLTablePreview() {
  const wrapFallback = $('csv-preview-fallback-card');
  const container = $('csv-tables-preview');
  if (!container) return;
  container.innerHTML = '';

  if (!sqlTableGroups.length) {
    if (wrapFallback) wrapFallback.style.display = '';
    const wrap = $('csv-preview-wrap');
    if (wrap) wrap.innerHTML = `<div class="dash-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      <p>Paste raw SQL output and click "Parse table(s)" to preview</p>
    </div>`;
    return;
  }
  if (wrapFallback) wrapFallback.style.display = 'none';

  const addSourceCol = $('csv-add-source-col')?.checked ?? true;

  sqlTableGroups.forEach((group, gi) => {
    const showSource = group.merged && addSourceCol;
    const headers = showSource ? ['Source', ...group.headers] : group.headers;
    const preview = group.rows.slice(0, 100);

    const card = document.createElement('section');
    card.className = 'card dash-card';
    card.style.marginBottom = '12px';

    const titleRow = document.createElement('div');
    titleRow.className = 'card-row';
    titleRow.style.marginBottom = '8px';
    titleRow.innerHTML = `
      <span class="card-label" style="margin-bottom:0">${esc(group.title)}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="stat">${group.rows.length} row${group.rows.length!==1?'s':''} · ${group.headers.length} col${group.headers.length!==1?'s':''}</span>
        <button class="btn btn-screenshot" data-group-idx="${gi}" title="Save as image for WhatsApp">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Screenshot
        </button>
      </div>
    `;
    card.appendChild(titleRow);

    const tableWrap = document.createElement('div');
    tableWrap.className = 'dash-preview-wrap';
    tableWrap.style.maxHeight = '320px';
    tableWrap.innerHTML = `<table class="dash-preview-table">
      <thead><tr><th class="row-num">#</th>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${preview.map((r, i) => {
        const cells = showSource ? [group.sources[i], ...r] : r;
        return `<tr><td class="row-num">${i+1}</td>${cells.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`;
      }).join('')}</tbody>
    </table>${group.rows.length > 100 ? `<div class="dash-preview-more">Showing 100 of ${group.rows.length} rows</div>` : ''}`;
    card.appendChild(tableWrap);

    container.appendChild(card);
  });

  container.querySelectorAll('.btn-screenshot').forEach(btn =>
    btn.addEventListener('click', () => downloadTableScreenshot(sqlTableGroups[parseInt(btn.dataset.groupIdx)], addSourceCol))
  );
}

// ── Screenshot export (canvas-rendered PNG, perfect for WhatsApp) ─────────────
function downloadTableScreenshot(group, addSourceCol) {
  const showSource = group.merged && addSourceCol;
  const headers = showSource ? ['Source', ...group.headers] : group.headers;
  const rows = group.rows.map((r, i) => showSource ? [group.sources[i], ...r] : r);

  // ── Style constants ──
  const PADDING = 24;
  const ROW_H = 36;
  const HEADER_H = 40;
  const CELL_PAD_X = 14;
  const FONT = '600 14px -apple-system, Segoe UI, Roboto, sans-serif';
  const CELL_FONT = '14px -apple-system, Segoe UI, Roboto, sans-serif';
  const MIN_COL_W = 70;
  const MAX_COL_W = 280;

  // ── Measure text to compute column widths ──
  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d');

  function colWidth(colIdx) {
    mctx.font = FONT;
    let max = mctx.measureText(headers[colIdx]).width;
    mctx.font = CELL_FONT;
    rows.forEach(r => {
      const w = mctx.measureText(String(r[colIdx] ?? '')).width;
      if (w > max) max = w;
    });
    return Math.min(MAX_COL_W, Math.max(MIN_COL_W, max + CELL_PAD_X * 2));
  }

  const colWidths = headers.map((_, i) => colWidth(i));
  const tableW = colWidths.reduce((a,b) => a+b, 0);
  const visibleRows = rows.slice(0, 200); // sane cap for image size
  const tableH = HEADER_H + visibleRows.length * ROW_H;
  const footerH = rows.length > 200 ? 28 : 0;
  const canvasW = tableW + PADDING * 2;
  const canvasH = tableH + PADDING * 2 + footerH;

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // ── Background ──
  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.textBaseline = 'middle';
  let y = PADDING;

  // ── Header row ──
  ctx.fillStyle = '#4c3fc7';
  ctx.fillRect(PADDING, y, tableW, HEADER_H);
  let x = PADDING;
  ctx.font = FONT;
  ctx.fillStyle = '#ffffff';
  headers.forEach((h, i) => {
    ctx.textAlign = 'center';
    ctx.fillText(truncateText(ctx, h, colWidths[i] - CELL_PAD_X), x + colWidths[i] / 2, y + HEADER_H / 2);
    x += colWidths[i];
  });
  y += HEADER_H;

  // ── Data rows ──
  ctx.font = CELL_FONT;
  visibleRows.forEach((r, ri) => {
    ctx.fillStyle = ri % 2 === 0 ? '#16161a' : '#1c1c22';
    ctx.fillRect(PADDING, y, tableW, ROW_H);
    x = PADDING;
    r.forEach((cell, ci) => {
      const isNum = cell !== '' && !isNaN(Number(cell));
      ctx.fillStyle = isNum ? '#c4b5fd' : '#e0e0ea';
      ctx.textAlign = 'center';
      ctx.fillText(truncateText(ctx, String(cell ?? ''), colWidths[ci] - CELL_PAD_X), x + colWidths[ci] / 2, y + ROW_H / 2);
      x += colWidths[ci];
    });
    y += ROW_H;
  });

  // ── Column separators ──
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  x = PADDING;
  headers.forEach((_, i) => {
    x += colWidths[i];
    if (i < headers.length - 1) {
      ctx.beginPath(); ctx.moveTo(x, PADDING); ctx.lineTo(x, PADDING + tableH); ctx.stroke();
    }
  });
  // outer border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(PADDING, PADDING, tableW, tableH);

  if (footerH) {
    ctx.fillStyle = '#888892';
    ctx.font = '12px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Showing 200 of ${rows.length} rows`, PADDING, y + 16);
  }

  // ── Download ──
  canvas.toBlob(blob => {
    const fname = (group.title || 'table').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) + '.png';
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fname }).click();
    showToast('Screenshot saved!');
  }, 'image/png');
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

function updateSQLTableMeta() {
  const meta = $('csv-meta'); if (!meta) return;
  if (!sqlTableGroups.length) { meta.textContent = 'No data yet'; return; }
  const totalRows = sqlTableGroups.reduce((sum, g) => sum + g.rows.length, 0);
  const tableWord = sqlTableGroups.length === 1 ? 'table' : 'tables';
  meta.textContent = `${sqlTableGroups.length} ${tableWord} · ${totalRows} total rows parsed`;
}

on('btn-parse-sql-table', 'click', () => {
  const raw = $('csv-input')?.value || '';
  sqlTableGroups = parseMultiSQLTables(raw);
  updateSQLTableMeta();
  renderSQLTablePreview();
  if (sqlTableGroups.length) {
    const merged = sqlTableGroups.filter(g => g.merged).length;
    showToast(merged ? `Parsed ${sqlTableGroups.length} table(s), ${merged} merged` : `Parsed ${sqlTableGroups.length} table(s)`);
  } else {
    showToast('No tables found — check the pasted format');
  }
});

on('csv-add-source-col', 'change', renderSQLTablePreview);

on('btn-clear-csv', 'click', () => {
  const i = $('csv-input'); if (i) i.value = '';
  sqlTableGroups = [];
  updateSQLTableMeta();
  renderSQLTablePreview();
});

enableDropzone($('csv-input'));

// ── Excel export (multi-sheet via SpreadsheetML HTML, opens natively in Excel) ─
function xmlEscCSV(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

on('btn-download-excel', 'click', () => {
  if (!sqlTableGroups.length) { alert('Paste and parse SQL output first!'); return; }
  const baseSheetName = ($('csv-sheet-name')?.value || 'Query Result').trim() || 'Query Result';
  const addSourceCol = $('csv-add-source-col')?.checked ?? true;

  const sheetBlock = (group, idx) => {
    const showSource = group.merged && addSourceCol;
    const headers = showSource ? ['Source', ...group.headers] : group.headers;
    const rows = group.rows.map((r, i) => showSource ? [group.sources[i], ...r] : r);
    const heading = sqlTableGroups.length > 1 ? `<h2>${xmlEscCSV(group.title)}<span class="subtle"> &nbsp;·&nbsp; ${rows.length} row${rows.length!==1?'s':''}</span></h2>` : '';
    const colgroup = `<colgroup>${headers.map(() => '<col style="width:140px">').join('')}</colgroup>`;
    return `${idx > 0 ? '<div style="page-break-before:always"></div>' : ''}${heading}
      <table>
        ${colgroup}
        <thead><tr>${headers.map(h => `<th>${xmlEscCSV(h)}</th>`).join('')}</tr></thead>
        <tbody>
        ${rows.map((r, ri) => `<tr class="${ri % 2 === 0 ? 'r-even' : 'r-odd'}">${r.map(c => {
          const isNum = c !== '' && !isNaN(Number(c));
          return `<td class="${isNum ? 'cell-num' : 'cell-text'}">${xmlEscCSV(c)}</td>`;
        }).join('')}</tr>`).join('')}
        </tbody>
      </table>`;
  };

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets>
${sqlTableGroups.map((g,i) => `<x:ExcelWorksheet><x:Name>${xmlEscCSV((g.title||baseSheetName).slice(0,31))}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>`).join('')}
</x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1f2937; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 28px; table-layout: fixed; }

  thead th {
    background: #1F3864;
    color: #ffffff;
    font-weight: bold;
    font-size: 11.5pt;
    padding: 9px 10px;
    border: 1px solid #14274a;
    text-align: center;
    vertical-align: middle;
    mso-pattern: gray-0;
  }

  td {
    padding: 7px 10px;
    border: 1px solid #D6DCE5;
    text-align: center;
    vertical-align: middle;
    mso-number-format: "General";
  }

  .cell-text { text-align: center; color: #1f2937; }
  .cell-num  { text-align: center; color: #1F3864; font-weight: 500; mso-number-format: "0"; }

  tr.r-even td { background: #F2F5FB; }
  tr.r-odd  td { background: #FFFFFF; }

  h2 {
    color: #1F3864;
    font-size: 14pt;
    border-bottom: 2.5px solid #1F3864;
    padding-bottom: 6px;
    margin-top: 6px;
    margin-bottom: 10px;
  }
  h2 .subtle { color: #6B7A99; font-size: 10.5pt; font-weight: normal; }
</style></head><body>
${sqlTableGroups.map(sheetBlock).join('')}
</body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const fname = baseSheetName.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_-]/g,'') + '_' + new Date().toISOString().slice(0,10) + '.xls';
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: fname }).click();
  showToast('Excel downloaded!');
});

// ── Sample Generator ──────────────────────────────────────────────────────────
const SAMPLER_CACHE_KEY = 'datafmt_sampler_seen';
const SAMPLER_SEQ_KEY  = 'datafmt_sampler_seq';

function loadSeenSet()  { try { return new Set(JSON.parse(localStorage.getItem(SAMPLER_CACHE_KEY)||'[]')); } catch { return new Set(); } }
function saveSeenSet(s) { localStorage.setItem(SAMPLER_CACHE_KEY, JSON.stringify([...s])); }
function loadSeq()      { return parseInt(localStorage.getItem(SAMPLER_SEQ_KEY)||'0',10); }
function saveSeq(n)     { localStorage.setItem(SAMPLER_SEQ_KEY, String(n)); }

let samplerSep = '\n';
document.querySelectorAll('#sampler-sep-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#sampler-sep-opts .pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    samplerSep = el.dataset.val;
  })
);

// Token chip insert-into-pattern
document.querySelectorAll('.sampler-token-chip').forEach(btn =>
  btn.addEventListener('click', () => {
    const pat = $('sampler-pattern');
    if (!pat) return;
    const pos = pat.selectionStart ?? pat.value.length;
    const v = pat.value;
    pat.value = v.slice(0,pos) + btn.dataset.insert + v.slice(pos);
    pat.focus();
    pat.selectionStart = pat.selectionEnd = pos + btn.dataset.insert.length;
  })
);

// ── Token generators ──────────────────────────────────────────────────────────
const FIRST_NAMES = ['Alice','Bob','Carol','David','Emma','Frank','Grace','Henry','Iris','Jack',
  'Karen','Leo','Mia','Noah','Olivia','Paul','Quinn','Rose','Sam','Tara','Uma','Victor','Wendy',
  'Xander','Yara','Zoe','Amit','Priya','Raj','Sana','Omar','Fatima','Lucas','Sofia','Ethan'];
const LAST_NAMES  = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson',
  'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Young','Lee',
  'Patel','Kumar','Khan','Nguyen','Lopez','Gonzalez','Hernandez','Perez','Robinson','Clark'];
const DOMAINS     = ['gmail.com','yahoo.com','outlook.com','proton.me','icloud.com','hotmail.com'];

function randInt(min,max)  { return Math.floor(Math.random()*(max-min+1))+min; }
function randChar(chars)   { return chars[Math.floor(Math.random()*chars.length)]; }
function randStr(chars,n)  { let s=''; for(let i=0;i<n;i++) s+=randChar(chars); return s; }
function pick(arr)         { return arr[Math.floor(Math.random()*arr.length)]; }
function pad2(n)           { return String(n).padStart(2,'0'); }

function generateToken(tok, seqRef) {
  // {Nn} — n-digit random number (padded)
  let m = tok.match(/^N(\d+)$/);
  if (m) { const d=parseInt(m[1]); return String(randInt(0,Math.pow(10,d)-1)).padStart(d,'0'); }

  // {NUM:min-max} — number in range
  m = tok.match(/^NUM:(\d+)-(\d+)$/);
  if (m) return String(randInt(parseInt(m[1]),parseInt(m[2])));

  // {SEQ} — auto-incrementing sequence
  if (tok === 'SEQ') { const v = seqRef.val++; return String(v); }

  // {An} — n uppercase letters
  m = tok.match(/^A(\d+)$/);
  if (m) return randStr('ABCDEFGHIJKLMNOPQRSTUVWXYZ',parseInt(m[1]));

  // {an} — n lowercase letters
  m = tok.match(/^a(\d+)$/);
  if (m) return randStr('abcdefghijklmnopqrstuvwxyz',parseInt(m[1]));

  // {Wn} — n alphanumeric chars
  m = tok.match(/^W(\d+)$/);
  if (m) return randStr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',parseInt(m[1]));

  // {FIRST} {LAST}
  if (tok === 'FIRST') return pick(FIRST_NAMES);
  if (tok === 'LAST')  return pick(LAST_NAMES);

  // {EMAIL}
  if (tok === 'EMAIL') {
    const fn = pick(FIRST_NAMES).toLowerCase();
    const ln = pick(LAST_NAMES).toLowerCase();
    const sep = pick(['.','-','_','']);
    return `${fn}${sep}${ln}${randInt(1,999)}@${pick(DOMAINS)}`;
  }

  // {PHONE}
  if (tok === 'PHONE') {
    return `+${randInt(1,99)}-${randInt(100,999)}-${randInt(100,999)}-${randInt(1000,9999)}`;
  }

  // {DATE} or {DATE:yyyy-yyyy}
  m = tok.match(/^DATE(?::(\d{4})-(\d{4}))?$/);
  if (m) {
    const y = randInt(parseInt(m[1]||'2000'), parseInt(m[2]||'2026'));
    const mo = randInt(1,12);
    const maxDay = new Date(y,mo,0).getDate();
    return `${y}-${pad2(mo)}-${pad2(randInt(1,maxDay))}`;
  }

  // {TIME}
  if (tok === 'TIME') return `${pad2(randInt(0,23))}:${pad2(randInt(0,59))}:${pad2(randInt(0,59))}`;

  // {TS} — full timestamp
  if (tok === 'TS') {
    const y=randInt(2020,2026),mo=randInt(1,12);
    return `${y}-${pad2(mo)}-${pad2(randInt(1,28))} ${pad2(randInt(0,23))}:${pad2(randInt(0,59))}:${pad2(randInt(0,59))}`;
  }

  // {UUID}
  if (tok === 'UUID') {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0;
      return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });
  }

  // {HEX:n}
  m = tok.match(/^HEX:(\d+)$/);
  if (m) return randStr('0123456789ABCDEF',parseInt(m[1]));

  // {BOOL}
  if (tok === 'BOOL') return Math.random()<0.5?'true':'false';

  // {PICK:a,b,c,...}
  m = tok.match(/^PICK:(.+)$/);
  if (m) return pick(m[1].split(',').map(s=>s.trim()));

  // Unknown token — return as-is with braces
  return '{'+tok+'}';
}

function generateValue(pattern, seqRef) {
  return pattern.replace(/\{([^}]+)\}/g, (_,tok) => generateToken(tok, seqRef));
}

function updateCacheInfo() {
  const info = $('sampler-cache-info');
  if (!info) return;
  const size = loadSeenSet().size;
  const seq  = loadSeq();
  if (size === 0 && seq === 0) {
    info.textContent = 'No values cached yet.';
  } else {
    info.textContent = `${size.toLocaleString()} unique value${size!==1?'s':''} in cache · sequence at ${seq}`;
  }
}

on('btn-sampler-generate','click', () => {
  const pattern = $('sampler-pattern')?.value?.trim();
  if (!pattern) { showToast('Enter a pattern first!'); return; }

  const count = Math.min(10000, Math.max(1, parseInt($('sampler-count')?.value||'10',10)));
  const seen = loadSeenSet();
  let seq = loadSeq();
  const seqRef = { val: seq };

  const results = [];
  let attempts = 0;
  const maxAttempts = count * 50; // prevent infinite loop on exhausted spaces

  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const val = generateValue(pattern, seqRef);
    if (!seen.has(val)) {
      seen.add(val);
      results.push(val);
    }
  }

  saveSeenSet(seen);
  saveSeq(seqRef.val);

  const sep = samplerSep === '\\n' ? '\n' : samplerSep === '\\t' ? '\t' : samplerSep;
  const output = $('sampler-output');
  if (output) output.value = results.join(sep);

  const stat = $('sampler-stat');
  if (stat) {
    const skipped = attempts - results.length;
    stat.textContent = `${results.length} values generated` +
      (skipped > 0 ? ` · ${skipped} duplicates skipped` : '') +
      (results.length < count ? ` · warning: pattern space may be exhausted` : '');
  }

  updateCacheInfo();
  if (results.length > 0) showToast(`${results.length} values generated`);
});

on('btn-sampler-copy','click', () => copyText($('sampler-output')?.value));

on('btn-sampler-download','click', () => {
  const v = $('sampler-output')?.value;
  if (!v) return;
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([v],{type:'text/plain'})),
    download: 'sample-data.txt'
  });
  a.click();
});

on('btn-sampler-clear-output','click', () => {
  const o=$('sampler-output'), s=$('sampler-stat');
  if(o) o.value='';
  if(s) s.textContent='';
  // Note: does NOT clear the seen cache — output cleared, history kept
});

on('btn-sampler-clear-cache','click', () => {
  if (!confirm('Clear all cached values? Previously generated values may repeat again.')) return;
  localStorage.removeItem(SAMPLER_CACHE_KEY);
  localStorage.removeItem(SAMPLER_SEQ_KEY);
  updateCacheInfo();
  showToast('Cache cleared!');
});

// Wire up "sampler" page navigation to refresh cache info
const _origGoToPage = goToPage;
goToPage = function(pageName) {
  _origGoToPage(pageName);
  if (pageName === 'sampler') updateCacheInfo();
};

// ── Init ──────────────────────────────────────────────────────────────────────
buildAddonGrid();
buildSqlSaved();
buildLibrary();
buildWidget();

const inputEl = $('input');
if (inputEl) { inputEl.value = '1254251\n1254152\n2542541'; format(); }
const sqlIn = $('sql-input');
if (sqlIn) { sqlIn.value = '1254251\n1254152\n2542541'; }
if (SQL_TEMPLATES?.length) { const t=$('sql-template'); if(t){t.value=SQL_TEMPLATES[0].query; buildQuery();} }
