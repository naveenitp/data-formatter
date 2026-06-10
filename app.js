'use strict';

// --- State ---
let quoteStyle = 'single';
let sepStyle = ', ';

const $ = id => document.getElementById(id);

// --- Format engine ---
function getItems(raw) {
  const trim = $('cb-trim').checked;
  const skipEmpty = $('cb-empty').checked;
  let items = raw.split(/[\n,]+/).flatMap(line => {
    // try to split by whitespace only if no commas/newlines
    return line.includes(' ') && !line.includes(',') ? line.split(/\s+/) : [line];
  });
  if (trim) items = items.map(x => x.trim());
  if (skipEmpty) items = items.filter(x => x !== '');
  return items;
}

function applyAddons(items) {
  if ($('cb-numonly').checked) items = items.filter(x => x !== '' && !isNaN(Number(x)));
  if ($('cb-dedup').checked) items = [...new Set(items)];
  if ($('cb-sort').checked) {
    const allNum = items.every(x => !isNaN(Number(x)));
    items = allNum ? [...items].sort((a, b) => Number(a) - Number(b)) : [...items].sort();
  }
  if ($('cb-upper').checked) items = items.map(x => x.toUpperCase());
  else if ($('cb-lower').checked) items = items.map(x => x.toLowerCase());

  const prefix = $('cb-prefix').checked ? $('prefix-val').value : '';
  const suffix = $('cb-suffix').checked ? $('suffix-val').value : '';
  if (prefix || suffix) items = items.map(x => prefix + x + suffix);

  return items;
}

function wrapQuotes(item) {
  if (quoteStyle === 'single') return `'${item}'`;
  if (quoteStyle === 'double') return `"${item}"`;
  if (quoteStyle === 'backtick') return '`' + item + '`';
  return item;
}

function getSep() {
  if (sepStyle === 'custom') return $('custom-sep').value;
  return sepStyle;
}

function format() {
  const raw = $('input').value;
  let items = getItems(raw);
  items = applyAddons(items);

  $('input-meta').textContent = items.length + ' item' + (items.length !== 1 ? 's' : '') + ' detected';

  const quoted = items.map(wrapQuotes);
  const sep = getSep() === '\\n' ? '\n' : getSep();
  let result = quoted.join(sep);

  if ($('cb-wrap').checked) {
    const active = document.querySelector('[data-grp="bracket"].active');
    const open = active ? active.dataset.val : '[';
    const close = open === '(' ? ')' : ']';
    result = open + result + close;
  }

  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

// --- Quick templates ---
function applyTemplate(mode) {
  const raw = $('input').value;
  let items = getItems(raw);
  items = applyAddons(items);

  let result = '';
  if (mode === 'sql') {
    result = 'IN (' + items.map(x => `'${x}'`).join(', ') + ')';
  } else if (mode === 'js') {
    result = '[' + items.map(x => `'${x}'`).join(', ') + ']';
  } else if (mode === 'csv') {
    result = items.map(x => /[,\s"]/.test(x) ? `"${x}"` : x).join(',');
  } else if (mode === 'py') {
    result = '[' + items.map(x => `'${x}'`).join(', ') + ']';
  }

  $('output').value = result;
  $('stat').textContent = items.length + ' items · ' + result.length + ' chars';
}

// --- UI wiring ---
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
    const customInput = $('custom-sep');
    if (sepStyle === 'custom') customInput.classList.add('visible');
    else customInput.classList.remove('visible');
    format();
  });
});

document.querySelectorAll('[data-grp="bracket"]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('[data-grp="bracket"]').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    format();
  });
});

$('cb-wrap').addEventListener('change', () => {
  $('wrap-opts').classList.toggle('visible', $('cb-wrap').checked);
  format();
});

$('cb-prefix').addEventListener('change', () => {
  $('prefix-row').classList.toggle('visible', $('cb-prefix').checked);
  format();
});

$('cb-suffix').addEventListener('change', () => {
  $('suffix-row').classList.toggle('visible', $('cb-suffix').checked);
  format();
});

$('cb-upper').addEventListener('change', () => {
  if ($('cb-upper').checked) $('cb-lower').checked = false;
  format();
});

$('cb-lower').addEventListener('change', () => {
  if ($('cb-lower').checked) $('cb-upper').checked = false;
  format();
});

['cb-trim','cb-dedup','cb-sort','cb-numonly','cb-empty'].forEach(id => {
  $(id).addEventListener('change', format);
});

$('input').addEventListener('input', format);
$('custom-sep').addEventListener('input', format);
$('prefix-val').addEventListener('input', format);
$('suffix-val').addEventListener('input', format);

// --- Copy ---
$('btn-copy').addEventListener('click', () => {
  const val = $('output').value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(showToast).catch(() => {
    $('output').select();
    document.execCommand('copy');
    showToast();
  });
});

function showToast() {
  const t = $('toast');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

// --- Download ---
$('btn-download').addEventListener('click', () => {
  const val = $('output').value;
  if (!val) return;
  const blob = new Blob([val], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'formatted-data.txt';
  a.click();
});

// --- Clear ---
$('btn-clear').addEventListener('click', () => {
  $('input').value = '';
  $('output').value = '';
  $('stat').textContent = '';
  $('input-meta').textContent = '0 items detected';
});

// --- Quick templates ---
document.querySelectorAll('.ql-btn').forEach(btn => {
  btn.addEventListener('click', () => applyTemplate(btn.dataset.mode));
});

// --- Init ---
$('input').value = '1254251\n1254152\n2542541';
format();
