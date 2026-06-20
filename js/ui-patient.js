/* ============================================================================
   ui-patient.js — the patient questionnaire surface. Renders straight from the
   schema (one source), collects answers by question id + the validated
   instruments, computes results via the shared scoring/pattern modules, and
   hands a canonical visit record to the app for saving / clinician handoff.
   ========================================================================== */

import { SECTIONS, QUESTIONS, questionsOf, sectionMax } from './schema.js';
import { scaleFor, BRISTOL_TYPES, PSS4_ITEMS, PSS4_ANCHORS, pss4Score, pss4Band,
         SLEEP_ITEMS, sleepScore, sleepBand, PAIN_REGIONS, painBand } from './scales.js';
import { computeScores, buildCode } from './scoring.js';
import { detectPatterns } from './patterns.js';
import { el, esc, toast } from './util.js';

let ctx;
let answers = {};                          // id -> 0..3
let extras = { bristol: null, pss4: [null, null, null, null], sleep: [null, null, null, null], nrsPain: null, painRegion: null };
let editingVisit = null;                   // set when reviewing/editing a saved visit

export function init(appCtx) { ctx = appCtx; }

// Start a fresh questionnaire (the ONLY place in-progress answers are cleared —
// tab navigation no longer wipes state, so mid-questionnaire switching is safe).
export function reset() {
  answers = {};
  extras = { bristol: null, pss4: [null, null, null, null], sleep: [null, null, null, null], nrsPain: null, painRegion: null };
  editingVisit = null;
}

// Load a saved visit's answers/extras into the form for review or editing.
// Pre-selection happens in render() (each builder marks the matching option).
export function loadVisit(visit) {
  reset();
  editingVisit = visit;
  const arr = Array.isArray(visit.answers) ? visit.answers : [];
  QUESTIONS.forEach((q, i) => { if (arr[i] != null) answers[q.id] = arr[i]; });
  const ex = visit.extras || {};
  extras = {
    bristol: ex.bristol ?? null,
    pss4: Array.isArray(ex.pss4) ? ex.pss4.slice() : [null, null, null, null],
    sleep: Array.isArray(ex.sleep) ? ex.sleep.slice() : [null, null, null, null],
    nrsPain: ex.nrsPain ?? null,
    painRegion: ex.painRegion ?? null,
  };
}

export function render() {
  // NOTE: state is intentionally NOT reset here — render() runs on every tab
  // switch, so resetting would silently wipe an in-progress questionnaire.
  // New/edit flows call reset()/loadVisit() before switching in.
  const root = document.getElementById('mode-patient');
  root.innerHTML = '';
  const p = ctx.activePatient && ctx.activePatient();
  const who = p
    ? `<b>Patient:</b> ${esc(p.name || 'Patient')}${editingVisit ? ' · <span style="color:var(--am);font-weight:700">editing a saved visit</span>' : ''}<br>`
    : '';
  root.appendChild(el('div', { class: 'intro' },
    `${who}<b>Gut Health Questionnaire.</b> Answer each item as honestly as you can — there are no right answers. ` +
    `Your responses produce a Dysbiosis Index your clinician will review. This is an educational screening tool, not a diagnosis.`));

  // Symptom sections
  SECTIONS.forEach(sec => {
    const card = el('div', { class: 'sec-card' });
    card.appendChild(el('div', { class: 'sec-head', style: `background:${sec.color}` },
      `${esc(sec.full)} <span style="opacity:.8;font-weight:500">${questionsOf(sec.id).length} items</span>`));
    const body = el('div', { class: 'sec-body' });
    questionsOf(sec.id).forEach(q => body.appendChild(questionRow(q)));
    card.appendChild(body);
    root.appendChild(card);
  });

  root.appendChild(bristolCard());
  root.appendChild(instrumentCard('Stress (PSS-4)', PSS4_ITEMS, PSS4_ANCHORS, 'pss4', true));
  root.appendChild(sleepCard());
  root.appendChild(painCard());

  const actions = el('div', { class: 'card row', style: 'justify-content:flex-end' });
  actions.appendChild(el('button', { class: 'btn btn-g', onclick: calc }, 'See results →'));
  root.appendChild(actions);
  root.appendChild(el('div', { id: 'patient-results' }));
}

function questionRow(q) {
  const labels = scaleFor(q.scale);
  const row = el('div', { class: 'q' });
  row.appendChild(el('div', { class: 'q-txt' }, esc(q.patientText)));
  if (q.patientSub) row.appendChild(el('div', { class: 'q-sub' }, esc(q.patientSub)));
  const opts = el('div', { class: 'opts' });
  labels.forEach((lab, v) => {
    const sel = answers[q.id] === v ? ' sel' : '';
    const b = el('button', { class: `opt s${v}${sel}`, dataset: { q: q.id, v }, type: 'button' },
      `<span class="on">${v}</span>${esc(lab)}`);
    b.onclick = () => {
      answers[q.id] = v;
      opts.querySelectorAll('.opt').forEach(o => o.classList.remove('sel'));
      b.classList.add('sel');
    };
    opts.appendChild(b);
  });
  row.appendChild(opts);
  return row;
}

function bristolCard() {
  const card = el('div', { class: 'sec-card' });
  card.appendChild(el('div', { class: 'sec-head', style: 'background:#6B4A2E' }, 'Stool type (Bristol scale)'));
  const body = el('div', { class: 'sec-body' });
  body.appendChild(el('div', { class: 'q-sub' }, 'Pick the type that best matches your usual stool.'));
  const grid = el('div', { class: 'bristol-grid' });
  BRISTOL_TYPES.forEach(t => {
    const sel = extras.bristol === t.n ? ' sel' : '';
    const b = el('button', { class: `bristol-opt${sel}`, type: 'button' },
      `<span class="bristol-n" style="background:${t.col}">${t.n}</span>
       <span><b>${esc(t.label)}</b> · <span class="muted">${esc(t.sub)}</span><br><small style="color:${t.col}">${esc(t.tag)}</small></span>`);
    b.onclick = () => { extras.bristol = t.n; grid.querySelectorAll('.bristol-opt').forEach(o => o.classList.remove('sel')); b.classList.add('sel'); };
    grid.appendChild(b);
  });
  body.appendChild(grid);
  card.appendChild(body);
  return card;
}

// PSS-4 anchors are 0-4; map to colour classes s0..s3
const PSS4_COLOR = ['s0', 's0', 's1', 's2', 's3'];

function instrumentCard(title, items, anchors, key, compact = false) {
  const card = el('div', { class: 'sec-card' });
  card.appendChild(el('div', { class: 'sec-head', style: 'background:#534AB7' }, esc(title)));
  const body = el('div', { class: 'sec-body' });
  items.forEach((q, qi) => {
    const row = el('div', { class: 'q' });
    row.appendChild(el('div', { class: 'q-txt', style: 'font-weight:500' }, esc(q)));
    const optsStyle = compact ? 'flex-wrap:nowrap;gap:4px' : '';
    const opts = el('div', { class: 'opts', style: optsStyle });
    anchors.forEach((lab, v) => {
      const sel = extras[key][qi] === v;
      const col = PSS4_COLOR[v] || 's1';
      const btnStyle = compact ? 'min-width:0;flex:1;font-size:11px;padding:6px 4px' : '';
      const b = el('button', { class: `opt${sel ? ` sel ${col}` : ''}`, type: 'button', style: btnStyle },
        `<span class="on">${v}</span>${esc(lab)}`);
      b.onclick = () => { extras[key][qi] = v; opts.querySelectorAll('.opt').forEach(o => o.classList.remove('sel', ...PSS4_COLOR)); b.classList.add('sel', col); };
      opts.appendChild(b);
    });
    row.appendChild(opts);
    body.appendChild(row);
  });
  card.appendChild(body);
  return card;
}

function sleepCard() {
  const card = el('div', { class: 'sec-card' });
  card.appendChild(el('div', { class: 'sec-head', style: 'background:#185FA5' }, 'Sleep quality (Sleep-4)'));
  const body = el('div', { class: 'sec-body' });
  SLEEP_ITEMS.forEach((q, qi) => {
    const row = el('div', { class: 'q' });
    row.appendChild(el('div', { class: 'q-txt', style: 'font-weight:500' }, esc(q.t)));
    const opts = el('div', { class: 'opts' });
    q.a.forEach((lab, v) => {
      const sel = extras.sleep[qi] === v;
      const b = el('button', { class: `opt${sel ? ` sel s${v}` : ''}`, type: 'button' }, `<span class="on">${v}</span>${esc(lab)}`);
      b.onclick = () => { extras.sleep[qi] = v; opts.querySelectorAll('.opt').forEach(o => o.classList.remove('sel', 's0', 's1', 's2', 's3')); b.classList.add('sel', `s${v}`); };
      opts.appendChild(b);
    });
    row.appendChild(opts);
    body.appendChild(row);
  });
  card.appendChild(body);
  return card;
}

function painCard() {
  const card = el('div', { class: 'sec-card' });
  card.appendChild(el('div', { class: 'sec-head', style: 'background:#A32D2D' }, 'Pain (optional)'));
  const body = el('div', { class: 'sec-body' });
  body.appendChild(el('div', { class: 'q-txt', style: 'font-weight:500' }, 'Current pain level (0 = none, 10 = worst)'));
  const nrs = el('div', { class: 'nrs-row' });
  const regWrap = el('div', { style: 'margin-top:10px' });
  for (let v = 0; v <= 10; v++) {
    const sel = extras.nrsPain === v ? ' sel' : '';
    const b = el('button', { class: `nrs-opt${sel}`, type: 'button' }, String(v));
    b.onclick = () => {
      extras.nrsPain = v; nrs.querySelectorAll('.nrs-opt').forEach(o => o.classList.remove('sel')); b.classList.add('sel');
      regWrap.style.display = v > 0 ? 'block' : 'none';
    };
    nrs.appendChild(b);
  }
  body.appendChild(nrs);
  regWrap.style.display = extras.nrsPain > 0 ? 'block' : 'none';
  regWrap.appendChild(el('div', { class: 'grp-label' }, 'Where?'));
  const chips = el('div', { class: 'chips' });
  PAIN_REGIONS.forEach(r => {
    const sel = extras.painRegion === r.id ? ' sel' : '';
    const b = el('button', { class: `chip-opt${sel}`, type: 'button' }, esc(r.label));
    b.onclick = () => { extras.painRegion = r.id; chips.querySelectorAll('.chip-opt').forEach(o => o.classList.remove('sel')); b.classList.add('sel'); };
    chips.appendChild(b);
  });
  regWrap.appendChild(chips);
  body.appendChild(regWrap);
  card.appendChild(body);
  return card;
}

// Build the canonical visit record from current answers/extras.
function buildVisit() {
  const answerArr = QUESTIONS.map(q => answers[q.id] ?? 0);
  const ps = pss4Score(extras.pss4);
  const ss = sleepScore(extras.sleep);
  const { secScores, bands, total } = computeScores(answerArr);
  const detectExtras = { bristol: extras.bristol, pss4Score: ps, sleepScore: ss, nrsPain: extras.nrsPain, painRegion: extras.painRegion };
  const fired = detectPatterns(secScores, answerArr, detectExtras);
  const patternIds = fired.map(p => p.id);
  return {
    // Carry the original id/date when editing so saving updates in place
    // instead of creating a duplicate visit.
    id: editingVisit ? editingVisit.id : undefined,
    date: editingVisit ? (editingVisit.date || Date.now()) : Date.now(),
    source: editingVisit ? 'patient (edited)' : 'patient',
    answers: answerArr,
    extras: { ...extras, pss4Score: ps, sleepScore: ss },
    secScores, bands, total,
    severity: undefined, // set by recompute on save; results screen computes locally
    patterns: patternIds,
    code: buildCode(secScores, total, patternIds),
    notes: '',
    _detectExtras: detectExtras,
  };
}

function calc() {
  const answered = Object.keys(answers).length;
  if (answered < QUESTIONS.length) {
    toast(`${QUESTIONS.length - answered} question(s) left — unanswered count as 0.`);
  }
  const visit = buildVisit();
  const { secScores, total } = visit;
  const sv = computeScores(visit.answers).severity;
  const fired = detectPatterns(secScores, visit.answers, visit._detectExtras);

  const out = document.getElementById('patient-results');
  out.innerHTML = '';

  // Hero
  const hero = el('div', { class: 'card' });
  hero.appendChild(el('div', { class: 'hero' },
    `<div><div class="big">${sv.index}%</div><div class="sub">Dysbiosis Index · raw ${total}/120</div></div>
     <div style="flex:1;min-width:160px"><span class="pill ${sv.cls}">${esc(sv.label)} dysbiosis</span>
     <div style="font-size:12px;color:var(--inks);margin-top:8px;line-height:1.5">${esc(sv.desc)}</div></div>`));
  out.appendChild(hero);

  // Section bars
  const bars = el('div', { class: 'card' });
  bars.appendChild(el('h2', {}, 'By domain'));
  SECTIONS.forEach(s => {
    const sc = secScores[s.id]; const max = sectionMax(s.id); const p = Math.round(sc / max * 100);
    bars.appendChild(el('div', { class: 'bar-row' },
      `<div class="bar-label"><span>${esc(s.full)}</span><span class="muted">${sc}/${max} · ${p}%</span></div>
       <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${s.color}"></div></div>`));
  });
  out.appendChild(bars);

  // Instruments
  const ps = pss4Band(extras.pss4.every(v => v != null) ? pss4Score(extras.pss4) : null);
  const sl = sleepBand(extras.sleep.every(v => v != null) ? sleepScore(extras.sleep) : null);
  const pn = painBand(extras.nrsPain);
  const driv = el('div', { class: 'card' });
  driv.appendChild(el('h2', {}, 'Modifiable drivers'));
  const dg = el('div', { class: 'drivers' });
  dg.appendChild(el('div', { class: 'driver' }, `<div class="dv" style="color:${ps ? ps.c : '#999'}">${ps ? ps.l : '—'}</div><div class="dl">🧠 Stress (PSS-4)</div>`));
  dg.appendChild(el('div', { class: 'driver' }, `<div class="dv" style="color:${sl ? sl.c : '#999'}">${sl ? sl.l : '—'}</div><div class="dl">😴 Sleep (Sleep-4)</div>`));
  dg.appendChild(el('div', { class: 'driver' }, `<div class="dv" style="color:${pn ? pn.c : '#999'}">${pn ? pn.l : '—'}</div><div class="dl">⚡ Pain (NRS)</div>`));
  dg.appendChild(el('div', { class: 'driver' }, `<div class="dv">${extras.bristol != null ? 'Type ' + extras.bristol : '—'}</div><div class="dl">🫙 Bristol stool</div>`));
  driv.appendChild(dg);
  out.appendChild(driv);

  // Patterns (patient-facing wording)
  if (fired.length) {
    const pc = el('div', { class: 'card' });
    pc.appendChild(el('h2', {}, 'Patterns to discuss with your clinician'));
    fired.forEach(p => pc.appendChild(el('div', { class: 'pat-alert', style: `background:${p.bg};border-color:${p.border || p.color}` },
      `<div class="pa-ic">${p.emoji}</div><div><div class="pa-title" style="color:${p.color}">${esc(p.label)}</div><div class="pa-desc">${esc(p.patientDesc)}</div></div>`)));
    out.appendChild(pc);
  }

  // Actions
  const acts = el('div', { class: 'card row', style: 'justify-content:flex-end' });
  acts.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.openClinicianWithVisit(buildVisit()) }, 'Open in clinician view'));
  acts.appendChild(el('button', { class: 'btn btn-g', onclick: () => ctx.saveVisit(buildVisit()) }, 'Save to patient record'));
  out.appendChild(acts);

  out.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
}
