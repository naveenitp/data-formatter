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

// ── Theme picker ──────────────────────────────────────────────────────────────
const THEME_KEY = 'datafmt_theme';
const THEME_CLASSES = ['glass', 'aurora']; // 'normal' = no class
let currentTheme = localStorage.getItem(THEME_KEY) || 'normal';

function applyTheme() {
  THEME_CLASSES.forEach(c => document.body.classList.remove(c));
  if (THEME_CLASSES.includes(currentTheme)) document.body.classList.add(currentTheme);
  document.querySelectorAll('.theme-swatch').forEach(sw =>
    sw.classList.toggle('active', sw.dataset.theme === currentTheme)
  );
}
applyTheme();

document.querySelectorAll('.theme-swatch').forEach(sw =>
  sw.addEventListener('click', () => {
    currentTheme = sw.dataset.theme;
    localStorage.setItem(THEME_KEY, currentTheme);
    applyTheme();
  })
);

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
  let items = applyAddons(parseItems(inputEl.value));
  const meta = $('input-meta'); if (meta) meta.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';
  let result = items.map(x => wrapQ(x, quoteStyle)).join(getSep());
  const wa = (ADDONS||[]).find(a => a.id === 'wrap');
  if (wa && $('cb-wrap')?.checked) { const o = getSubVal(wa), c = o==='('?')':o==='{'?'}':']'; result = o+result+c; }
  const out = $('output'); if (out) out.value = result;
  const stat = $('stat'); if (stat) stat.textContent = items.length + ' items · ' + result.length + ' chars';
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

// ── Library ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'datafmt_custom_entries';
const FAV_KEY = 'datafmt_favorites';
function loadCustom() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; } }
function saveCustom(e) { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); }
function loadFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); } catch { return []; } }
function saveFavs(f) { localStorage.setItem(FAV_KEY, JSON.stringify(f)); }
function favKeyFor(item) { return (item.source||'') + '::' + item.label; }
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

// Shared action-button row: Copy (always), Edit (custom only), Star, Delete (custom only)
function buildItemActions({ isCustom, isStarred }) {
  return `
    <div class="lib-item-actions">
      <button class="lib-act-btn lib-act-copy" title="Copy to clipboard">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
      ${isCustom ? `<button class="lib-act-btn lib-act-edit" title="Edit entry">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        <span>Edit</span>
      </button>` : ''}
      <button class="lib-act-btn lib-act-star${isStarred?' active':''}" title="${isStarred?'Remove favorite':'Add to favorites'}">
        ${starSVG(isStarred)}
      </button>
      ${isCustom ? `<button class="lib-act-btn lib-act-delete" title="Delete entry">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
      </button>` : ''}
    </div>`;
}

// Collect every library item (custom + built-in) with a stable source/category tag
function getAllLibraryItems() {
  const out = [];
  loadCustom().forEach(e => out.push({ label: e.label, desc: e.desc, code: e.code, source: 'custom', category: e.category||'custom', id: e.id }));
  (LIBRARY||[]).forEach(section => section.items.forEach(it =>
    out.push({ label: it.label, desc: it.desc||'', code: it.code, source: section.id||section.title, category: section.icon })
  ));
  return out;
}

function buildLibrary(filter) {
  const body = $('library-body'); if (!body) return;
  body.innerHTML = '';
  filter = (filter||'').toLowerCase().trim();
  const custom = loadCustom();
  const custF = filter ? custom.filter(it => (it.label+' '+(it.desc||'')+' '+it.code).toLowerCase().includes(filter)) : custom;

  const makeSec = (badge, badgeClass, title, items, isEmpty) => {
    const sec = document.createElement('div');
    sec.className = 'lib-section open';
    const hdr = document.createElement('button');
    hdr.className = 'lib-hdr';
    hdr.innerHTML = `<span class="lib-badge badge-${badgeClass}">${badge}</span><span class="lib-title">${esc(title)}</span><span class="lib-count">${items.length}</span><svg class="lib-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));
    const bdy = document.createElement('div'); bdy.className = 'lib-body';
    if (isEmpty) {
      bdy.innerHTML = '<div style="padding:12px 1rem;font-size:0.78rem;color:var(--text3)">No entries yet — click <strong style="color:var(--text2)">+ Add entry</strong>.</div>';
    }
    sec.appendChild(hdr); sec.appendChild(bdy); body.appendChild(sec);
    return bdy;
  };

  // Custom section
  if (!filter || custF.length) {
    const bdy = makeSec('custom','custom','My entries', custF, custF.length===0);
    custF.forEach(item => {
      const favItem = { label: item.label, source: 'custom' };
      const filled = isFav(favItem);
      const row = document.createElement('div'); row.className = 'lib-item';
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)} <span class="lib-badge badge-${item.category||'custom'}" style="font-size:.55rem">${item.category||'custom'}</span></div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div>${buildItemActions({isCustom:true, isStarred:filled})}`;
      row.querySelector('.lib-act-copy').addEventListener('click', e => { e.stopPropagation(); copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
      row.querySelector('.lib-act-edit').addEventListener('click', e => { e.stopPropagation(); openModal(item.code, item); });
      row.querySelector('.lib-act-star').addEventListener('click', e => {
        e.stopPropagation(); toggleFav(favItem);
        const btn = e.currentTarget; const nowFilled = isFav(favItem);
        btn.classList.toggle('active', nowFilled); btn.innerHTML = starSVG(nowFilled);
      });
      row.querySelector('.lib-act-delete').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(`Delete "${item.label}"?`)) { saveCustom(loadCustom().filter(x=>x.id!==item.id)); buildLibrary($('lib-search')?.value); buildWidget(); }
      });
      bdy.appendChild(row);
    });
  }

  // Built-in sections
  (LIBRARY||[]).forEach(section => {
    const items = filter ? section.items.filter(it=>(it.label+' '+(it.desc||'')+' '+it.code).toLowerCase().includes(filter)) : section.items;
    if (filter && !items.length) return;
    const sec = document.createElement('div');
    sec.className = 'lib-section' + ((section.open||filter)?' open':'');
    const hdr = document.createElement('button'); hdr.className = 'lib-hdr';
    hdr.innerHTML = `<span class="lib-badge badge-${section.icon}">${section.icon}</span><span class="lib-title">${esc(section.title)}</span><span class="lib-count">${items.length}</span><svg class="lib-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click', () => sec.classList.toggle('open'));
    const bdy = document.createElement('div'); bdy.className = 'lib-body';
    items.forEach(item => {
      const favItem = { label: item.label, source: section.id||section.title };
      const filled = isFav(favItem);
      const row = document.createElement('div'); row.className = 'lib-item';
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div>${buildItemActions({isCustom:false, isStarred:filled})}`;
      row.querySelector('.lib-act-copy').addEventListener('click', e => { e.stopPropagation(); copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
      row.querySelector('.lib-act-star').addEventListener('click', e => {
        e.stopPropagation(); toggleFav(favItem);
        const btn = e.currentTarget; const nowFilled = isFav(favItem);
        btn.classList.toggle('active', nowFilled); btn.innerHTML = starSVG(nowFilled);
      });
      bdy.appendChild(row);
    });
    sec.appendChild(hdr); sec.appendChild(bdy); body.appendChild(sec);
  });
}

on('lib-search',    'input',  e => buildLibrary(e.target.value));
on('btn-lib-expand','click',  () => document.querySelectorAll('.lib-section').forEach(s=>s.classList.add('open')));
on('btn-lib-collapse','click',() => document.querySelectorAll('.lib-section').forEach(s=>s.classList.remove('open')));

// ── Favorites page ─────────────────────────────────────────────────────────────
function buildFavorites(filter) {
  const body = $('favorites-body'); if (!body) return;
  body.innerHTML = '';
  filter = (filter||'').toLowerCase().trim();
  const favs = loadFavs();
  const all = getAllLibraryItems();
  let favItems = all.filter(it => favs.includes(favKeyFor(it)));
  if (filter) favItems = favItems.filter(it => (it.label+' '+(it.desc||'')+' '+it.code).toLowerCase().includes(filter));

  if (!favItems.length) {
    body.innerHTML = `<div class="dash-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <p>No favorites yet — star any item in the Library to see it here.</p>
    </div>`;
    return;
  }

  favItems.forEach(item => {
    const isCustom = item.source === 'custom';
    const row = document.createElement('div'); row.className = 'lib-item fav-row';
    row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)} <span class="lib-badge badge-${item.category||'custom'}" style="font-size:.55rem">${item.category||'custom'}</span></div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div>${buildItemActions({isCustom, isStarred:true})}`;
    row.querySelector('.lib-act-copy').addEventListener('click', e => { e.stopPropagation(); copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
    const editBtn = row.querySelector('.lib-act-edit');
    if (editBtn) editBtn.addEventListener('click', e => { e.stopPropagation(); openModal(item.code, item); });
    row.querySelector('.lib-act-star').addEventListener('click', e => {
      e.stopPropagation();
      toggleFav(item);
      row.remove();
      if (!$('favorites-body').children.length) buildFavorites($('fav-search')?.value);
    });
    const delBtn = row.querySelector('.lib-act-delete');
    if (delBtn) delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`Delete "${item.label}"?`)) {
        saveCustom(loadCustom().filter(x=>x.id!==item.id));
        toggleFav(item);
        row.remove();
      }
    });
    body.appendChild(row);
  });
}
on('fav-search', 'input', e => buildFavorites(e.target.value));

// ── Library modal ─────────────────────────────────────────────────────────────
let modalCat = 'custom';
let editingEntryId = null; // null = adding new, otherwise editing this custom entry's id

function openModal(code, existingItem) {
  const o=$('modal-overlay'); if(!o) return;
  editingEntryId = existingItem?.id || null;

  $('m-label').value = existingItem?.label || '';
  $('m-desc').value = existingItem?.desc || '';
  const mc=$('m-code'); if(mc) mc.value = code || existingItem?.code || '';
  $('m-error')?.classList.add('hidden');
  modalCat = existingItem?.category || 'custom';
  document.querySelectorAll('#m-category-pills .pill').forEach(p=>p.classList.toggle('active',p.dataset.val===modalCat));

  const titleEl = document.querySelector('.modal-title');
  if (titleEl) titleEl.textContent = editingEntryId ? 'Edit library entry' : 'Add library entry';
  const saveLabel = $('btn-modal-save-label');
  if (saveLabel) saveLabel.textContent = editingEntryId ? 'Save changes' : 'Save entry';

  o.classList.remove('hidden');
  setTimeout(()=>$('m-label')?.focus(),50);
}
function closeModal() { $('modal-overlay')?.classList.add('hidden'); editingEntryId = null; }

document.querySelectorAll('#m-category-pills .pill').forEach(p =>
  p.addEventListener('click', () => {
    document.querySelectorAll('#m-category-pills .pill').forEach(x=>x.classList.remove('active'));
    p.classList.add('active'); modalCat=p.dataset.val;
  })
);
on('btn-lib-add',    'click', () => openModal());
on('btn-modal-close','click', closeModal);
on('btn-modal-cancel','click',closeModal);
$('modal-overlay')?.addEventListener('click', e => { if(e.target===$('modal-overlay')) closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

on('btn-modal-save','click', () => {
  const label=$('m-label')?.value.trim(), code=$('m-code')?.value.trim();
  if (!label||!code) { $('m-error')?.classList.remove('hidden'); return; }
  $('m-error')?.classList.add('hidden');
  const desc = $('m-desc')?.value.trim()||'';
  const entries = loadCustom();

  if (editingEntryId) {
    const idx = entries.findIndex(e => e.id === editingEntryId);
    if (idx !== -1) entries[idx] = { ...entries[idx], label, desc, code, category: modalCat };
    saveCustom(entries);
    showToast('Entry updated!');
  } else {
    entries.unshift({ id:'custom_'+Date.now(), label, desc, code, category:modalCat });
    saveCustom(entries);
    showToast('Entry saved!');
  }

  closeModal();
  goToPage('library');
  buildLibrary(); buildWidget();
});

// ── Library widget (SQL page) ─────────────────────────────────────────────────
function buildWidget(filter) {
  const body=$('widget-body'); if(!body) return;
  body.innerHTML='';
  filter=(filter||'').toLowerCase().trim();
  const custom=loadCustom();
  const allSections=[];
  if(custom.length) allSections.push({ icon:'custom', title:'My entries', items:custom.map(e=>({label:e.label,desc:e.desc,code:e.code,isSQL:e.category==='sql'})) });
  (LIBRARY||[]).forEach(s=>allSections.push({ icon:s.icon, title:s.title, items:s.items.map(it=>({label:it.label,desc:it.desc||'',code:it.code,isSQL:s.icon==='sql'})) }));

  allSections.forEach((section,si)=>{
    const items=filter?section.items.filter(it=>(it.label+' '+it.code+' '+(it.desc||'')).toLowerCase().includes(filter)):section.items;
    if(!items.length) return;
    const sec=document.createElement('div'); sec.className='ws-section'+(si===0?' open':'');
    const hdr=document.createElement('button'); hdr.className='ws-hdr';
    hdr.innerHTML=`<span class="ws-hdr-badge badge-${section.icon}">${section.icon}</span><span class="ws-title">${esc(section.title)}</span><span class="ws-count">${items.length}</span><svg class="ws-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    hdr.addEventListener('click',()=>sec.classList.toggle('open'));
    const itemsEl=document.createElement('div'); itemsEl.className='ws-items';
    items.forEach(item=>{
      const row=document.createElement('div'); row.className='ws-item';
      const preview=(item.code.split('\n').find(l=>l.trim())||item.code);
      row.innerHTML=`<div class="ws-item-info"><div class="ws-item-label" title="${esc(item.label)}">${esc(item.label)}</div><div class="ws-item-preview">${esc(preview.length>50?preview.slice(0,49)+'…':preview)}</div></div>${item.isSQL?`<button class="ws-load-btn" title="Load into template"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>`:''}<button class="ws-copy-btn"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy</button>`;
      row.querySelector('.ws-copy-btn').addEventListener('click',e=>{e.stopPropagation();copyText(item.code);row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),900);});
      const lb=row.querySelector('.ws-load-btn');
      if(lb) lb.addEventListener('click',e=>{e.stopPropagation();const t=$('sql-template');if(t){t.value=item.code;buildQuery();t.style.borderColor='var(--accent)';setTimeout(()=>t.style.borderColor='',800);}});
      row.addEventListener('click',()=>{copyText(item.code);row.classList.add('flash');setTimeout(()=>row.classList.remove('flash'),900);});
      itemsEl.appendChild(row);
    });
    sec.appendChild(hdr); sec.appendChild(itemsEl); body.appendChild(sec);
  });
  if(!body.children.length) body.innerHTML='<div style="padding:1rem;font-size:0.78rem;color:var(--text3);text-align:center">No results</div>';
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
  const TITLE_H = 44;
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
  const canvasH = TITLE_H + tableH + PADDING * 2 + footerH + 30; // +30 for watermark

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // ── Background ──
  ctx.fillStyle = '#0e0e10';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // ── Title ──
  ctx.fillStyle = '#f0f0f2';
  ctx.font = '700 17px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(group.title, PADDING, PADDING + TITLE_H / 2);
  ctx.fillStyle = '#7c6af7';
  ctx.font = '600 12px -apple-system, Segoe UI, Roboto, sans-serif';
  const rowLabel = `${rows.length} row${rows.length!==1?'s':''} · ${headers.length} col${headers.length!==1?'s':''}`;
  const rowLabelW = ctx.measureText(rowLabel).width;
  ctx.fillText(rowLabel, canvasW - PADDING - rowLabelW, PADDING + TITLE_H / 2);

  let y = PADDING + TITLE_H;

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
      ctx.beginPath(); ctx.moveTo(x, PADDING + TITLE_H); ctx.lineTo(x, PADDING + TITLE_H + tableH); ctx.stroke();
    }
  });
  // outer border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(PADDING, PADDING + TITLE_H, tableW, tableH);

  if (footerH) {
    ctx.fillStyle = '#888892';
    ctx.font = '12px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Showing 200 of ${rows.length} rows`, PADDING, y + 16);
    y += footerH;
  }

  // ── Watermark ──
  ctx.fillStyle = '#55555f';
  ctx.font = '11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Generated with DataFmt', canvasW - PADDING, canvasH - 14);

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
