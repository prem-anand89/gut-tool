/* ============================================================================
   ui-database.js — patient registry, per-patient visit history, and a simple
   progression chart. Also hosts Export / Import (the local-storage sync path:
   export is stamped + import MERGES, so a colleague's file adds visits rather
   than overwriting). Ported in spirit from v7's database mode.
   ========================================================================== */

import { severityOf, indexPct } from './scoring.js';
import { SECTIONS, sectionMax } from './schema.js';
import { modifiableFactors } from './scales.js';
import { PATTERNS } from './patterns.js';
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
  bar.appendChild(el('button', { class: 'btn btn-o', onclick: () => ctx.newQuestionnaire() }, 'New questionnaire'));
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

  renderTrash(root);
}

function renderTrash(root) {
  const t = ctx.db.trash || {};
  const patients = t.patients || [];
  const visits   = t.visits   || [];
  if (!patients.length && !visits.length) return;

  const section = el('div', { class: 'card', style: 'margin-top:20px;opacity:.85' });
  const hrow = el('div', { class: 'row', style: 'align-items:center;margin-bottom:8px' });
  hrow.appendChild(el('h3', { style: 'flex:1;margin:0' }, `🗑 Trash (${patients.length + visits.length} item${patients.length + visits.length !== 1 ? 's' : ''} · auto-deleted after 30 days)`));
  hrow.appendChild(el('button', { class: 'btn btn-gh', style: 'color:var(--re,#A32D2D)', onclick: emptyTrash }, 'Empty trash'));
  section.appendChild(hrow);

  patients.forEach(p => {
    const row = el('div', { style: 'display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #f0f0f0;font-size:13px' });
    const daysLeft = Math.ceil((30 * 86400000 - (Date.now() - (p.deletedAt || 0))) / 86400000);
    row.appendChild(el('span', { style: 'flex:1' }, `👤 ${esc(p.name || 'Unnamed')} · ${(p.visits || []).length} visits · ${daysLeft}d left`));
    row.appendChild(el('button', { class: 'btn btn-gh', onclick: () => restorePatient(p) }, 'Restore'));
    section.appendChild(row);
  });

  visits.forEach(tv => {
    const row = el('div', { style: 'display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #f0f0f0;font-size:13px' });
    const daysLeft = Math.ceil((30 * 86400000 - (Date.now() - (tv.deletedAt || 0))) / 86400000);
    const who = tv.patientName || 'Unknown patient';
    row.appendChild(el('span', { style: 'flex:1' }, `📋 Visit · ${esc(who)} · ${fmtDate(tv.date)} · ${daysLeft}d left`));
    row.appendChild(el('button', { class: 'btn btn-gh', onclick: () => restoreVisit(tv) }, 'Restore'));
    section.appendChild(row);
  });

  root.appendChild(section);
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
       <div class="pt-stat"><div class="v">${latest ? indexPct(latest.total) + '%' : '—'}</div><div class="l">${latest ? 'Index · ' + latest.total + '/120' : 'Latest index'}</div></div>
       <div class="pt-stat"><div class="v" style="font-size:12px;color:${sev ? sev.color : '#999'}">${sev ? esc(sev.label) : '—'}</div><div class="l">${delta || 'Severity'}</div></div>`));
    card.onclick = () => { ctx.setActive(p.id); view = { mode: 'detail', patientId: p.id }; render(); };
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

// ── Soft-delete helpers (move to trash, 30-day auto-purge) ──────────────────

function ensureTrash() {
  if (!ctx.db.trash) ctx.db.trash = { patients: [], visits: [] };
}

async function deleteVisit(p, v) {
  const when = fmtDate(v.date);
  if (!(await dialogConfirm(
    `Move the visit from ${when} to trash?\n\nIt will be permanently deleted after 30 days.`,
    { title: 'Move to trash', okLabel: 'Move to trash', danger: true }))) return;
  ensureTrash();
  ctx.db.trash.visits.push({ ...v, deletedAt: Date.now(), patientId: p.id, patientName: p.name || '' });
  p.visits = (p.visits || []).filter(x => x.id !== v.id);
  ctx.persist(); render();
  toast('Visit moved to trash · restores within 30 days');
}

async function deletePatient(p) {
  if (!(await dialogConfirm(
    `Move ${p.name || 'this patient'} and all their visits to trash?\n\nPermanently deleted after 30 days.`,
    { title: 'Move to trash', okLabel: 'Move to trash', danger: true }))) return;
  ensureTrash();
  ctx.db.trash.patients.push({ ...p, deletedAt: Date.now() });
  ctx.db.patients = ctx.db.patients.filter(x => x.id !== p.id);
  ctx.persist(); render();
  toast('Patient moved to trash · restores within 30 days');
}

function restorePatient(p) {
  ensureTrash();
  const { deletedAt, ...patient } = p;
  ctx.db.patients.push(patient);
  ctx.db.trash.patients = ctx.db.trash.patients.filter(x => x.id !== p.id);
  ctx.persist(); render();
  toast(`${p.name || 'Patient'} restored`);
}

function restoreVisit(tv) {
  ensureTrash();
  const { deletedAt, patientId, patientName, ...visit } = tv;
  const patient = ctx.db.patients.find(x => x.id === patientId);
  if (!patient) { toast('Original patient no longer exists — cannot restore visit'); return; }
  if (!(patient.visits || []).find(v => v.id === visit.id)) {
    patient.visits = patient.visits || [];
    patient.visits.push(visit);
    patient.visits.sort((a, b) => (a.date || 0) - (b.date || 0));
  }
  ctx.db.trash.visits = ctx.db.trash.visits.filter(x => x.id !== visit.id);
  ctx.persist(); render();
  toast('Visit restored');
}

async function emptyTrash() {
  const t = ctx.db.trash || { patients: [], visits: [] };
  const total = (t.patients || []).length + (t.visits || []).length;
  if (!total) { toast('Trash is empty'); return; }
  if (!(await dialogConfirm(
    `Permanently delete ${total} item(s) from trash? This cannot be undone.`,
    { title: 'Empty trash', okLabel: 'Empty trash', danger: true }))) return;
  ctx.db.trash = { patients: [], visits: [] };
  ctx.persist(); render();
  toast('Trash emptied');
}

function renderDetail(root) {
  const p = ctx.db.patients.find(x => x.id === view.patientId);
  if (!p) { showList(); return; }
  const head = el('div', { class: 'row', style: 'margin-bottom:14px' });
  head.appendChild(el('button', { class: 'back-btn', onclick: showList }, '← All patients'));
  head.appendChild(el('h1', { style: 'flex:1' }, esc(p.name || 'Unnamed') + (p.ref ? ` <small class="muted">Ref ${esc(p.ref)}</small>` : '')));
  head.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.exportPatient(p) }, 'Export patient'));
  head.appendChild(el('button', { class: 'btn btn-o', onclick: () => ctx.newQuestionnaire(p.id) }, '+ New questionnaire'));
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
    const factors = modifiableFactors(v.extras)
      .map(f => `${f.icon} ${esc(f.band)}${f.score ? ' ' + esc(f.score) : ''}`).join(' · ');

    const card = el('div', { class: `visit-card${idx === 0 ? ' latest' : ''}` });
    card.appendChild(el('div', { class: 'visit-num' }, String(realIdx)));
    card.appendChild(el('div', { class: 'visit-info' },
      `<div class="visit-date">${fmtDate(v.date)}</div>
       <div class="visit-sub">${esc(v.source || '')} · <code>${esc(v.code || '')}</code></div>
       <div class="visit-sub">${esc(factors)}</div>`));
    // Score value AND % shown together.
    card.appendChild(el('div', { class: 'visit-score' }, `<div class="v">${indexPct(v.total)}%</div><div class="l">${v.total}/120</div>`));
    card.appendChild(el('span', { class: 'pill ' + sev.cls }, esc(sev.label)));
    if (delta) card.appendChild(el('div', { style: 'font-weight:700' }, delta));
    if (v.answers) card.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.editVisit(v, p.id) }, 'Edit answers'));
    card.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.openClinicianWithVisit(v, p.id) }, 'Open in clinician'));
    card.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.printReport(v) }, 'Print'));
    card.appendChild(el('button', { class: 'btn btn-gh', style: 'color:var(--re,#A32D2D)', onclick: () => deleteVisit(p, v) }, 'Delete'));
    root.appendChild(card);
  });
}

// Progression chart + domain breakdown table + pattern presence heatmap.
function progressionCard(visits) {
  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, 'Progression'));
  card.appendChild(el('div', { class: 'q-sub' }, 'Dysbiosis Index across visits (lower is better).'));

  // ── Total index line chart ──
  const W = 640, H = 180, pad = 30;
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

  // ── Domain-by-domain table ──
  card.appendChild(el('h3', { style: 'margin-top:16px;margin-bottom:6px' }, 'Domain breakdown over visits'));
  const domTbl = buildDomainTable(visits);
  card.appendChild(domTbl);

  // ── Pattern presence heatmap ──
  const allPats = PATTERNS.filter(p => visits.some(v => (v.patterns || []).includes(p.id)));
  if (allPats.length) {
    card.appendChild(el('h3', { style: 'margin-top:16px;margin-bottom:6px' }, 'Pattern presence over visits'));
    card.appendChild(buildPatternTable(visits, allPats));
  }

  return card;
}

function buildDomainTable(visits) {
  const colW = visits.length;
  let html = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">`;
  html += `<tr><th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ddd">Domain</th>`;
  visits.forEach((v, i) => {
    const prev = visits[i - 1];
    const delta = prev != null ? (v.total - prev.total) : null;
    const dStr = delta != null ? ` <span style="color:${delta < 0 ? '#0F6E56' : delta > 0 ? '#B91C1C' : '#888'}">${delta < 0 ? '▼' : delta > 0 ? '▲' : '='}${Math.abs(delta)}</span>` : '';
    html += `<th style="text-align:center;padding:4px 6px;border-bottom:1px solid #ddd;white-space:nowrap">#${i + 1}${dStr}</th>`;
  });
  html += '</tr>';
  SECTIONS.forEach(s => {
    const max = sectionMax(s.id);
    html += `<tr><td style="padding:4px 6px;border-bottom:1px solid #f0f0f0;white-space:nowrap"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color};margin-right:4px"></span>${esc(s.full)}</td>`;
    visits.forEach((v, i) => {
      const sc = (v.secScores || {})[s.id] ?? 0;
      const pct = Math.round(sc / max * 100);
      const prev = visits[i - 1];
      const prevSc = prev ? ((prev.secScores || {})[s.id] ?? 0) : null;
      const d = prevSc != null ? sc - prevSc : null;
      const dStr = d != null && d !== 0 ? ` <span style="color:${d < 0 ? '#0F6E56' : '#B91C1C'};font-size:9px">${d < 0 ? '▼' : '▲'}${Math.abs(d)}</span>` : '';
      html += `<td style="text-align:center;padding:4px 6px;border-bottom:1px solid #f0f0f0"><span style="color:${s.color};font-weight:600">${sc}/${max}</span>${dStr}<br><span style="color:#999;font-size:9px">${pct}%</span></td>`;
    });
    html += '</tr>';
  });
  html += '</table></div>';
  return el('div', {}, html);
}

function buildPatternTable(visits, allPats) {
  let html = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">`;
  html += `<tr><th style="text-align:left;padding:4px 6px;border-bottom:1px solid #ddd">Pattern</th>`;
  visits.forEach((_, i) => { html += `<th style="text-align:center;padding:4px 6px;border-bottom:1px solid #ddd">#${i + 1}</th>`; });
  html += '</tr>';
  allPats.forEach(p => {
    html += `<tr><td style="padding:4px 6px;border-bottom:1px solid #f0f0f0;white-space:nowrap">${p.emoji} <span style="color:${p.color}">${esc(p.label)}</span></td>`;
    visits.forEach(v => {
      const on = (v.patterns || []).includes(p.id);
      html += `<td style="text-align:center;padding:4px 6px;border-bottom:1px solid #f0f0f0">${on ? `<span style="color:${p.color};font-weight:700">✓</span>` : '<span style="color:#ccc">–</span>'}</td>`;
    });
    html += '</tr>';
  });
  html += '</table></div>';
  return el('div', {}, html);
}
