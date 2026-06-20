/* ============================================================================
   ui-database.js — patient registry, per-patient visit history, and a simple
   progression chart. Also hosts Export / Import (the local-storage sync path:
   export is stamped + import MERGES, so a colleague's file adds visits rather
   than overwriting). Ported in spirit from v7's database mode.
   ========================================================================== */

import { severityOf, indexPct } from './scoring.js';
import { SECTIONS, sectionMax } from './schema.js';
import { el, esc, fmtDate, toast, dialogForm, dialogConfirm } from './util.js';

let ctx;
let view = { mode: 'list', patientId: null };

export function init(appCtx) { ctx = appCtx; }
export function showList() { view = { mode: 'list', patientId: null }; render(); }

export function render() {
  const root = document.getElementById('mode-database');
  root.innerHTML = '';
  if (view.mode === 'detail') return renderDetail(root);
  renderList(root);
}

function renderList(root) {
  const bar = el('div', { class: 'db-toolbar' });
  const search = el('input', { class: 'db-search', placeholder: 'Search patients…' });
  search.oninput = () => filter(search.value.toLowerCase());
  bar.appendChild(search);
  bar.appendChild(el('button', { class: 'btn btn-g', onclick: newPatient }, '+ New patient'));
  bar.appendChild(el('button', { class: 'btn btn-o', onclick: () => ctx.setMode('patient') }, 'New questionnaire'));
  bar.appendChild(el('button', { class: 'btn btn-gh', onclick: ctx.exportDB }, 'Export backup'));
  bar.appendChild(el('button', { class: 'btn btn-gh', onclick: ctx.importDB }, 'Import / merge'));
  root.appendChild(bar);

  const grid = el('div', { class: 'db-grid', id: 'dbGrid' });
  root.appendChild(grid);
  paintCards(ctx.db.patients);

  if (!ctx.db.patients.length) {
    grid.innerHTML = '';
    root.appendChild(el('div', { class: 'db-empty' }, '🌱<br>No patients yet. Start a questionnaire or add a patient.'));
  }
}

function filter(q) {
  const list = ctx.db.patients.filter(p => (p.name || '').toLowerCase().includes(q) || (p.ref || '').toLowerCase().includes(q));
  paintCards(list);
}

function paintCards(list) {
  const grid = document.getElementById('dbGrid');
  if (!grid) return;
  grid.innerHTML = '';
  list.forEach(p => {
    const visits = p.visits || [];
    const latest = visits[visits.length - 1];
    const prev = visits[visits.length - 2];
    const sev = latest ? severityOf(latest.total) : null;
    let delta = '';
    if (latest && prev) {
      const d = latest.total - prev.total;
      const cls = d < 0 ? 'delta-down' : d > 0 ? 'delta-up' : 'delta-flat';
      delta = `<span class="${cls}" style="font-weight:700;font-size:12px">${d < 0 ? '▼' : d > 0 ? '▲' : '='} ${Math.abs(d)}</span>`;
    }
    const card = el('div', { class: 'pt-card' });
    card.appendChild(el('button', { class: 'pt-del', title: 'Delete', onclick: e => { e.stopPropagation(); deletePatient(p); } }, '✕'));
    card.appendChild(el('div', { class: 'pt-top' },
      `<div class="pt-av">${esc((p.name || '?').slice(0, 1).toUpperCase())}</div>
       <div><div class="pt-name">${esc(p.name || 'Unnamed')}</div>
       <div class="pt-meta">${p.ref ? 'Ref ' + esc(p.ref) + ' · ' : ''}${p.dob ? esc(p.dob) : ''}</div></div>`));
    card.appendChild(el('div', { class: 'pt-stats' },
      `<div class="pt-stat"><div class="v">${visits.length}</div><div class="l">Visits</div></div>
       <div class="pt-stat"><div class="v">${latest ? indexPct(latest.total) + '%' : '—'}</div><div class="l">Latest index</div></div>
       <div class="pt-stat"><div class="v" style="font-size:12px;color:${sev ? sev.color : '#999'}">${sev ? esc(sev.label) : '—'}</div><div class="l">${delta || 'Severity'}</div></div>`));
    card.onclick = () => { view = { mode: 'detail', patientId: p.id }; render(); };
    grid.appendChild(card);
  });
}

async function newPatient() {
  const r = await dialogForm('New patient', [
    { key: 'name', label: 'Name', placeholder: 'Patient name' },
    { key: 'ref', label: 'Reference / ID', placeholder: 'optional' },
    { key: 'dob', label: 'Year of birth', placeholder: 'optional' },
  ]);
  if (!r || !r.name) return;
  ctx.db.patients.push({ id: ctx.uid(), name: r.name, ref: r.ref, dob: r.dob, sex: '', notes: '', created: Date.now(), visits: [] });
  ctx.persist(); render();
}

async function deletePatient(p) {
  if (!(await dialogConfirm(`Delete ${p.name || 'this patient'} and all their visits? This cannot be undone.`, { title: 'Delete patient', okLabel: 'Delete', danger: true }))) return;
  ctx.db.patients = ctx.db.patients.filter(x => x.id !== p.id);
  ctx.persist(); render();
}

function renderDetail(root) {
  const p = ctx.db.patients.find(x => x.id === view.patientId);
  if (!p) { showList(); return; }
  const head = el('div', { class: 'row', style: 'margin-bottom:14px' });
  head.appendChild(el('button', { class: 'back-btn', onclick: showList }, '← All patients'));
  head.appendChild(el('h1', { style: 'flex:1' }, esc(p.name || 'Unnamed') + (p.ref ? ` <small class="muted">Ref ${esc(p.ref)}</small>` : '')));
  head.appendChild(el('button', { class: 'btn btn-o', onclick: () => { ctx.setActive(p.id); ctx.setMode('patient'); } }, '+ New questionnaire'));
  root.appendChild(head);

  const visits = (p.visits || []).slice().sort((a, b) => (a.date || 0) - (b.date || 0));
  if (!visits.length) { root.appendChild(el('div', { class: 'db-empty' }, 'No visits yet for this patient.')); return; }

  root.appendChild(progressionCard(visits));

  visits.slice().reverse().forEach((v, idx) => {
    const realIdx = visits.length - idx;
    const sev = severityOf(v.total);
    const prev = visits[visits.length - idx - 2];
    let delta = '';
    if (prev) { const d = v.total - prev.total; const cls = d < 0 ? 'delta-down' : d > 0 ? 'delta-up' : 'delta-flat'; delta = `<span class="${cls}">${d < 0 ? '▼' : d > 0 ? '▲' : '='}${Math.abs(d)}</span>`; }
    const card = el('div', { class: `visit-card${idx === 0 ? ' latest' : ''}` });
    card.appendChild(el('div', { class: 'visit-num' }, String(realIdx)));
    card.appendChild(el('div', { class: 'visit-info' },
      `<div class="visit-date">${fmtDate(v.date)}</div><div class="visit-sub">${esc(v.source || '')} · <code>${esc(v.code || '')}</code></div>`));
    card.appendChild(el('div', { class: 'visit-score' }, `<div class="v">${indexPct(v.total)}%</div><div class="l">Index</div>`));
    card.appendChild(el('span', { class: 'pill ' + sev.cls }, esc(sev.label)));
    if (delta) card.appendChild(el('div', { style: 'font-weight:700' }, delta));
    card.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.openClinicianWithVisit(v) }, 'Open in clinician'));
    card.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.printReport(v) }, 'Print'));
    root.appendChild(card);
  });
}

// Simple progression chart of the Dysbiosis Index across visits.
function progressionCard(visits) {
  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, 'Progression'));
  card.appendChild(el('div', { class: 'q-sub' }, 'Dysbiosis Index across visits (lower is better).'));
  const W = 640, H = 200, pad = 30;
  const pts = visits.map((v, i) => {
    const x = pad + (visits.length === 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (visits.length - 1));
    const y = H - pad - (indexPct(v.total) / 100) * (H - 2 * pad);
    return { x, y, v };
  });
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="max-width:660px">`;
  [0, 25, 50, 75, 100].forEach(g => {
    const y = H - pad - g / 100 * (H - 2 * pad);
    svg += `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#eee"/><text x="4" y="${y + 3}" font-size="9" fill="#999">${g}%</text>`;
  });
  if (pts.length > 1) svg += `<path d="${path}" fill="none" stroke="#0F6E56" stroke-width="2"/>`;
  pts.forEach(p => {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${severityOf(p.v.total).color}"/>`;
    svg += `<text x="${p.x}" y="${p.y - 9}" font-size="9" text-anchor="middle" fill="#555">${indexPct(p.v.total)}%</text>`;
    svg += `<text x="${p.x}" y="${H - pad + 14}" font-size="8" text-anchor="middle" fill="#999">${fmtDate(p.v.date).replace(/ \d{4}$/, '')}</text>`;
  });
  svg += '</svg>';
  card.appendChild(el('div', { class: 'prog-svg' }, svg));
  return card;
}
