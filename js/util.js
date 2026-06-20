/* ============================================================================
   util.js — tiny shared UI helpers: DOM, escaping, dates, toast, and an
   iOS-safe in-page modal (replaces prompt/confirm). No framework.
   ========================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, html) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  if (html != null) n.innerHTML = html;
  return n;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

let toastTimer;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ── Modal: prompt / confirm / choice — all return Promises ──────────────────
const overlay = () => $('#overlay');
const dlgBox = () => $('#dlg');

function openDlg(html) {
  dlgBox().innerHTML = html;
  overlay().classList.add('show');
}
function closeDlg() { overlay().classList.remove('show'); }

export function dialogPrompt(message, { title = '', value = '', placeholder = '', okLabel = 'OK' } = {}) {
  return new Promise(resolve => {
    openDlg(`
      ${title ? `<div class="dlg-h">${esc(title)}</div>` : ''}
      ${message ? `<div class="dlg-m">${esc(message)}</div>` : ''}
      <div class="dlg-b"><input id="dlgIn" value="${esc(value)}" placeholder="${esc(placeholder)}"></div>
      <div class="dlg-acts">
        <button class="btn btn-gh" id="dlgCancel">Cancel</button>
        <button class="btn btn-g" id="dlgOk">${esc(okLabel)}</button>
      </div>`);
    const input = $('#dlgIn');
    input.focus(); input.select();
    const done = v => { closeDlg(); resolve(v); };
    $('#dlgOk').onclick = () => done(input.value);
    $('#dlgCancel').onclick = () => done(null);
    input.onkeydown = e => { if (e.key === 'Enter') done(input.value); };
  });
}

export function dialogConfirm(message, { title = '', okLabel = 'OK', danger = false } = {}) {
  return new Promise(resolve => {
    openDlg(`
      ${title ? `<div class="dlg-h">${esc(title)}</div>` : ''}
      <div class="dlg-m">${esc(message)}</div>
      <div class="dlg-acts">
        <button class="btn btn-gh" id="dlgCancel">Cancel</button>
        <button class="btn ${danger ? 'btn-re' : 'btn-g'}" id="dlgOk">${esc(okLabel)}</button>
      </div>`);
    $('#dlgOk').onclick = () => { closeDlg(); resolve(true); };
    $('#dlgCancel').onclick = () => { closeDlg(); resolve(false); };
  });
}

// fields: [{key,label,value,placeholder}] -> resolves object or null
export function dialogForm(title, fields, { okLabel = 'Save' } = {}) {
  return new Promise(resolve => {
    openDlg(`
      <div class="dlg-h">${esc(title)}</div>
      <div class="dlg-b">${fields.map(f =>
        `<label style="font-size:11px;font-weight:600;color:var(--inkt)">${esc(f.label)}</label>
         <input data-key="${esc(f.key)}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}">`).join('')}
      </div>
      <div class="dlg-acts">
        <button class="btn btn-gh" id="dlgCancel">Cancel</button>
        <button class="btn btn-g" id="dlgOk">${esc(okLabel)}</button>
      </div>`);
    const get = () => {
      const o = {};
      $$('#dlg input[data-key]').forEach(i => { o[i.dataset.key] = i.value.trim(); });
      return o;
    };
    $('#dlgOk').onclick = () => { closeDlg(); resolve(get()); };
    $('#dlgCancel').onclick = () => { closeDlg(); resolve(null); };
  });
}
