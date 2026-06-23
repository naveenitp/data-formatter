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
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)} <span class="lib-badge badge-${item.category||'custom'}" style="font-size:.55rem">${item.category||'custom'}</span></div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><div style="display:flex;flex-direction:column;gap:6px;align-items:center"><button class="lib-star-btn${filled?' active':''}" title="Favorite">${starSVG(filled)}</button><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><button class="lib-del-btn" data-id="${item.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div>`;
      row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
      row.querySelector('.lib-star-btn').addEventListener('click', e => {
        e.stopPropagation(); toggleFav(favItem);
        const btn = e.currentTarget; const nowFilled = isFav(favItem);
        btn.classList.toggle('active', nowFilled); btn.innerHTML = starSVG(nowFilled);
      });
      row.querySelector('.lib-del-btn').addEventListener('click', e => {
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
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><div style="display:flex;flex-direction:column;gap:6px;align-items:center"><button class="lib-star-btn${filled?' active':''}" title="Favorite">${starSVG(filled)}</button><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>`;
      row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
      row.querySelector('.lib-star-btn').addEventListener('click', e => {
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
    const row = document.createElement('div'); row.className = 'lib-item fav-row';
    row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)} <span class="lib-badge badge-${item.category||'custom'}" style="font-size:.55rem">${item.category||'custom'}</span></div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><div style="display:flex;flex-direction:column;gap:6px;align-items:center"><button class="lib-star-btn active" title="Remove favorite">${starSVG(true)}</button><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>`;
    row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
    row.querySelector('.lib-star-btn').addEventListener('click', e => {
      e.stopPropagation();
      toggleFav(item);
      row.remove();
      if (!$('favorites-body').children.length) buildFavorites($('fav-search')?.value);
    });
    body.appendChild(row);
  });
}
on('fav-search', 'input', e => buildFavorites(e.target.value));

// ── Library modal ─────────────────────────────────────────────────────────────
let modalCat = 'custom';
function openModal(code) {
  const o=$('modal-overlay'); if(!o) return;
  [$('m-label'),$('m-desc')].forEach(el=>{if(el)el.value='';});
  const mc=$('m-code'); if(mc) mc.value=code||'';
  $('m-error')?.classList.add('hidden');
  modalCat='custom';
  document.querySelectorAll('#m-category-pills .pill').forEach(p=>p.classList.toggle('active',p.dataset.val==='custom'));
  o.classList.remove('hidden');
  setTimeout(()=>$('m-label')?.focus(),50);
}
function closeModal() { $('modal-overlay')?.classList.add('hidden'); }

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
  const entry = { id:'custom_'+Date.now(), label, desc:$('m-desc')?.value.trim()||'', code, category:modalCat };
  const entries=loadCustom(); entries.unshift(entry); saveCustom(entries);
  closeModal();
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelector('[data-page="library"]')?.classList.add('active');
  $('page-library')?.classList.add('active');
  buildLibrary(); buildWidget();
  showToast('Entry saved!');
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

// ── CSV Dashboard ─────────────────────────────────────────────────────────────────
let csvParsed = { headers: [], rows: [] };
let csvCharts = []; // { id, colIdx, colName, type }

function parseCSVText(text) {
  const lines = text.split('\n').map(l => l.replace(/\r$/,'')).filter(l => l.trim() !== '');
  if (!lines.length) return { headers: [], rows: [] };
  const splitLine = line => {
    const cells = []; let cur = ''; let inQ = false;
    for (let i=0;i<line.length;i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { cells.push(cur); cur=''; }
      else cur += c;
    }
    cells.push(cur);
    return cells.map(c => c.trim());
  };
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

function loadCSVFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    csvParsed = parseCSVText(reader.result);
    csvCharts = [];
    renderCSVMeta();
    renderCSVColSelect();
    renderCSVCharts();
    showToast('CSV loaded: ' + file.name);
  };
  reader.readAsText(file);
}

function renderCSVMeta() {
  const meta = $('csv-meta'); if (!meta) return;
  const { headers, rows } = csvParsed;
  meta.textContent = rows.length ? `${rows.length} rows · ${headers.length} columns` : 'No file loaded';
  const colsCard = $('csv-cols-card');
  if (colsCard) colsCard.style.display = rows.length ? '' : 'none';
}

function renderCSVColSelect() {
  const sel = $('csv-col-select'); if (!sel) return;
  sel.innerHTML = csvParsed.headers.map((h,i) => `<option value="${i}">${esc(h)}</option>`).join('');
}

function colValues(idx) {
  return csvParsed.rows.map(r => r[idx]).filter(v => v !== undefined && v !== '');
}

function isNumericCol(idx) {
  const vals = colValues(idx).slice(0, 50);
  if (!vals.length) return false;
  return vals.every(v => !isNaN(Number(v)));
}

function buildChartHTML(chart) {
  const { colIdx, colName, type } = chart;
  const vals = colValues(colIdx);
  if (type === 'stat') {
    const numeric = isNumericCol(colIdx);
    let statHTML;
    if (numeric) {
      const nums = vals.map(Number);
      const sum = nums.reduce((a,b)=>a+b,0);
      const avg = sum / nums.length;
      statHTML = `
        <div class="csv-stat-grid">
          <div class="csv-stat-item"><span class="csv-stat-val">${nums.length}</span><span class="csv-stat-lbl">Count</span></div>
          <div class="csv-stat-item"><span class="csv-stat-val">${sum.toLocaleString(undefined,{maximumFractionDigits:2})}</span><span class="csv-stat-lbl">Sum</span></div>
          <div class="csv-stat-item"><span class="csv-stat-val">${avg.toLocaleString(undefined,{maximumFractionDigits:2})}</span><span class="csv-stat-lbl">Average</span></div>
          <div class="csv-stat-item"><span class="csv-stat-val">${Math.min(...nums).toLocaleString()}</span><span class="csv-stat-lbl">Min</span></div>
          <div class="csv-stat-item"><span class="csv-stat-val">${Math.max(...nums).toLocaleString()}</span><span class="csv-stat-lbl">Max</span></div>
        </div>`;
    } else {
      const unique = new Set(vals).size;
      statHTML = `
        <div class="csv-stat-grid">
          <div class="csv-stat-item"><span class="csv-stat-val">${vals.length}</span><span class="csv-stat-lbl">Count</span></div>
          <div class="csv-stat-item"><span class="csv-stat-val">${unique}</span><span class="csv-stat-lbl">Unique</span></div>
        </div>`;
    }
    return statHTML;
  }

  // Frequency-based charts (bar / pie / line)
  const freq = {};
  vals.forEach(v => { freq[v] = (freq[v]||0) + 1; });
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 12);
  const maxF = sorted[0]?.[1] || 1;
  const total = vals.length;

  if (type === 'bar' || type === 'line') {
    return `<div class="csv-bar-chart">${sorted.map(([val,count]) => `
      <div class="dash-bar-row">
        <span class="dash-bar-lbl" title="${esc(val)}">${esc(val.length>12?val.slice(0,11)+'…':val)}</span>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.round(count/maxF*100)}%"></div></div>
        <span class="dash-bar-count">${count}</span>
      </div>`).join('')}</div>`;
  }

  if (type === 'pie') {
    const colors = ['#7c6af7','#34d399','#fb923c','#60a5fa','#f472b6','#facc15','#a78bfa','#2dd4bf','#fb7185','#94a3b8','#4ade80','#38bdf8'];
    let cumPct = 0;
    const gradientParts = sorted.map(([val,count], i) => {
      const pct = (count/total)*100;
      const start = cumPct; cumPct += pct;
      return `${colors[i%colors.length]} ${start}% ${cumPct}%`;
    });
    const legend = sorted.map(([val,count], i) => `
      <div class="csv-pie-legend-row">
        <span class="csv-pie-dot" style="background:${colors[i%colors.length]}"></span>
        <span class="csv-pie-legend-label" title="${esc(val)}">${esc(val.length>16?val.slice(0,15)+'…':val)}</span>
        <span class="csv-pie-legend-pct">${((count/total)*100).toFixed(1)}%</span>
      </div>`).join('');
    return `
      <div class="csv-pie-wrap">
        <div class="csv-pie" style="background:conic-gradient(${gradientParts.join(',')})"></div>
        <div class="csv-pie-legend">${legend}</div>
      </div>`;
  }
  return '';
}

function renderCSVCharts() {
  const grid = $('csv-charts-grid'); if (!grid) return;
  if (!csvCharts.length) {
    grid.innerHTML = `<div class="dash-empty" id="csv-charts-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
      <p>Upload a CSV and add charts to build your dashboard</p>
    </div>`;
    return;
  }
  grid.innerHTML = csvCharts.map(chart => `
    <div class="csv-chart-card" data-chart-id="${chart.id}">
      <div class="csv-chart-card-hdr">
        <span class="csv-chart-title">${esc(chart.colName)}</span>
        <span class="csv-chart-type-badge">${chart.type}</span>
        <button class="csv-chart-remove" data-chart-id="${chart.id}" title="Remove">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="csv-chart-body">${buildChartHTML(chart)}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.csv-chart-remove').forEach(btn =>
    btn.addEventListener('click', () => {
      csvCharts = csvCharts.filter(c => String(c.id) !== btn.dataset.chartId);
      renderCSVCharts();
    })
  );
}

let csvChartType = 'bar';
document.querySelectorAll('#csv-chart-type-opts .pill').forEach(el =>
  el.addEventListener('click', () => {
    document.querySelectorAll('#csv-chart-type-opts .pill').forEach(p=>p.classList.remove('active'));
    el.classList.add('active'); csvChartType = el.dataset.val;
  })
);

on('btn-add-chart', 'click', () => {
  const sel = $('csv-col-select'); if (!sel || !csvParsed.headers.length) return;
  const colIdx = parseInt(sel.value);
  csvCharts.push({ id: Date.now(), colIdx, colName: csvParsed.headers[colIdx], type: csvChartType });
  renderCSVCharts();
});

on('btn-clear-csv', 'click', () => {
  csvParsed = { headers: [], rows: [] };
  csvCharts = [];
  renderCSVMeta(); renderCSVColSelect(); renderCSVCharts();
  const fi = $('csv-file-input'); if (fi) fi.value = '';
});

// CSV dropzone (click to browse + drag/drop)
const csvDropzone = $('csv-dropzone');
const csvFileInput = $('csv-file-input');
if (csvDropzone && csvFileInput) {
  csvDropzone.addEventListener('click', () => csvFileInput.click());
  csvFileInput.addEventListener('change', () => { if (csvFileInput.files[0]) loadCSVFile(csvFileInput.files[0]); });
  ['dragenter','dragover'].forEach(ev => csvDropzone.addEventListener(ev, e => { e.preventDefault(); csvDropzone.classList.add('drag-over'); }));
  ['dragleave','dragend'].forEach(ev => csvDropzone.addEventListener(ev, e => { e.preventDefault(); csvDropzone.classList.remove('drag-over'); }));
  csvDropzone.addEventListener('drop', e => {
    e.preventDefault(); csvDropzone.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file) loadCSVFile(file);
  });
}

on('btn-export-csv-dashboard', 'click', () => {
  if (!csvParsed.rows.length) { alert('Upload a CSV first!'); return; }
  const { headers, rows } = csvParsed;
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body>
    <style>body{font-family:Calibri,Arial,sans-serif}table{border-collapse:collapse;width:100%;margin-bottom:24px}th{background:#4472C4;color:white;padding:6px 10px;border:1px solid #2F5496}td{padding:5px 10px;border:1px solid #D9D9D9}tr:nth-child(even) td{background:#EEF2FF}h2{color:#1F3864}</style>
    <h2>Raw Data</h2><table><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  csvCharts.forEach(chart => {
    const vals = colValues(chart.colIdx);
    const freq = {}; vals.forEach(v=>{freq[v]=(freq[v]||0)+1;});
    const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    html += `<h2>${chart.colName} (${chart.type})</h2><table><tr><th>Value</th><th>Count</th><th>%</th></tr>${sorted.map(([v,c])=>`<tr><td>${v}</td><td>${c}</td><td>${((c/vals.length)*100).toFixed(1)}%</td></tr>`).join('')}</table>`;
  });
  html += '</body></html>';
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `csv-dashboard-${new Date().toISOString().slice(0,10)}.xls` }).click();
  showToast('Dashboard exported!');
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
