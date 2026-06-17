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

// ── Theme toggle ──────────────────────────────────────────────────────────────
const THEME_KEY = 'datafmt_theme';
let glassOn = localStorage.getItem(THEME_KEY) === 'glass';

function applyTheme() {
  document.body.classList.toggle('glass', glassOn);
  const pill = $('toggle-pill'), lbl = $('theme-label');
  if (pill) pill.classList.toggle('on', glassOn);
  if (lbl)  lbl.textContent = glassOn ? 'Glass' : 'Normal';
}
applyTheme();
on('theme-toggle', 'click', () => {
  glassOn = !glassOn;
  localStorage.setItem(THEME_KEY, glassOn ? 'glass' : 'normal');
  applyTheme();
});

// ── Nav ───────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(btn =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const page = $('page-' + btn.dataset.page);
    if (page) page.classList.add('active');
    if (btn.dataset.page === 'library')   { buildLibrary(); buildWidget(); }
  })
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
function loadCustom() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; } }
function saveCustom(e) { localStorage.setItem(STORAGE_KEY, JSON.stringify(e)); }

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
      const row = document.createElement('div'); row.className = 'lib-item';
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)} <span class="lib-badge badge-${item.category||'custom'}" style="font-size:.55rem">${item.category||'custom'}</span></div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><div style="display:flex;flex-direction:column;gap:6px;align-items:center"><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><button class="lib-del-btn" data-id="${item.id}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div>`;
      row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
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
      const row = document.createElement('div'); row.className = 'lib-item';
      row.innerHTML = `<div class="lib-item-info"><div class="lib-item-lbl">${esc(item.label)}</div>${item.desc?`<div class="lib-item-desc">${esc(item.desc)}</div>`:''}<pre class="lib-item-code">${esc(item.code)}</pre></div><svg class="lib-copy-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      row.addEventListener('click', () => { copyText(item.code); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1000); });
      bdy.appendChild(row);
    });
    sec.appendChild(hdr); sec.appendChild(bdy); body.appendChild(sec);
  });
}

on('lib-search',    'input',  e => buildLibrary(e.target.value));
on('btn-lib-expand','click',  () => document.querySelectorAll('.lib-section').forEach(s=>s.classList.add('open')));
on('btn-lib-collapse','click',() => document.querySelectorAll('.lib-section').forEach(s=>s.classList.remove('open')));

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

// ── Init ──────────────────────────────────────────────────────────────────────
buildAddonGrid();
buildSqlSaved();
buildLibrary();
buildWidget();
updateDashboard();

const inputEl = $('input');
if (inputEl) { inputEl.value = '1254251\n1254152\n2542541'; format(); }
const sqlIn = $('sql-input');
if (sqlIn) { sqlIn.value = '1254251\n1254152\n2542541'; }
if (SQL_TEMPLATES?.length) { const t=$('sql-template'); if(t){t.value=SQL_TEMPLATES[0].query; buildQuery();} }
