/* ============================================================================
   ui-clinician.js — clinician dashboard. Loads a questionnaire visit (full,
   answer-level pattern detection + auto-derived flags) OR supports manual entry
   via section sliders + symptom/condition/medication checkboxes. Renders
   patterns, strains (the ONE shared ranker), labs and protocols.

   Audience gating (brief §8.4): a banner states this is for physician
   co-management / review before anything reaches a patient. Rx items retained.
   ========================================================================== */

import { SECTIONS, sectionMax } from './schema.js';
import { computeScores, severityOf, parseCode, buildCode } from './scoring.js';
import { detectPatterns, PATTERNS, patternById } from './patterns.js';
import { rankStrains } from './strains.js';
import { LAB_TESTS, AVAIL_LABELS, relevantLabs } from './labs.js';
import { SYM_GROUPS, CONDITIONS, MEDS, deriveClinicianFlags } from './clinician-derive.js';
import { pss4Band, sleepBand, painBand } from './scales.js';
import { el, esc, toast } from './util.js';

let ctx;
let state;

function blankState() {
  return {
    bands: { GI: 0, IM: 0, BG: 0, ME: 0, HX: 0, SK: 0 },
    secScores: null, total: 0,
    syms: new Set(), conds: new Set(), meds: new Set(), fromIntake: new Set(),
    extras: null, rawAnswers: null, patterns: [],
    patientName: '', notes: '', activeTab: 'patterns',
  };
}

export function init(appCtx) { ctx = appCtx; if (!state) state = blankState(); }

// Approx per-section score from a 0–3 band when exact secScores absent.
const approx = (band, max) => Math.round(band / 3 * max);
function domainScore(id) {
  if (state.secScores && state.secScores[id] != null) return state.secScores[id];
  return approx(state.bands[id], sectionMax(id));
}
function totalScore() {
  if (state.secScores) return Object.values(state.secScores).reduce((a, b) => a + b, 0);
  return SECTIONS.reduce((t, s) => t + approx(state.bands[s.id], sectionMax(s.id)), 0);
}

// Load a visit (from questionnaire or saved record) into clinician state.
export function loadVisit(visit) {
  state = blankState();
  state.secScores = visit.secScores || null;
  state.bands = visit.bands ? { ...visit.bands }
    : (visit.secScores ? SECTIONS.reduce((b, s) => { b[s.id] = computeScores(visit.answers || []).bands[s.id]; return b; }, {}) : state.bands);
  state.rawAnswers = visit.answers || null;
  state.extras = visit.extras || null;
  state.notes = visit.notes || '';
  if (visit.answers) {
    const d = deriveClinicianFlags(visit.answers, visit.extras);
    state.syms = d.syms; state.meds = d.meds; state.fromIntake = d.fromIntake;
  }
  recompute();
}

export function render() {
  if (!state) state = blankState();
  const root = document.getElementById('mode-clinician');
  root.innerHTML = '';

  root.appendChild(el('div', { class: 'gate-note' },
    `<b>Clinician view — for physician co-management.</b> Protocols below include prescription-only agents (Rifaximin, etc.) ` +
    `and drug-interaction calls. This is decision-support for review by a prescribing clinician before anything reaches a patient — not patient-facing instructions.`));

  const grid = el('div', { class: 'clin-grid' });
  grid.appendChild(leftColumn());
  grid.appendChild(el('div', { id: 'clin-right' }));
  root.appendChild(grid);
  renderRight();
}

function leftColumn() {
  const col = el('div', { class: 'left-col' });

  // Code input
  const codeCard = el('div', { class: 'card' });
  codeCard.appendChild(el('h3', {}, 'Load a code'));
  const ci = el('input', { class: 'db-search', placeholder: 'e.g. GI2·IM1·BG1·ME0·HX1·SK0·T34', style: 'width:100%;margin:8px 0' });
  const btn = el('button', { class: 'btn btn-o', style: 'width:100%' }, 'Parse code');
  btn.onclick = () => {
    const parsed = parseCode(ci.value.trim());
    if (!parsed) { toast('Could not parse that code'); return; }
    state = blankState();
    state.bands = parsed.bands;
    recompute(); render();
    toast('Code loaded (manual mode)');
  };
  codeCard.appendChild(ci); codeCard.appendChild(btn);
  col.appendChild(codeCard);

  // Sliders (manual band entry)
  const sl = el('div', { class: 'card' });
  sl.appendChild(el('h3', {}, 'Domain severity (manual)'));
  sl.appendChild(el('div', { class: 'q-sub' }, state.secScores ? 'Loaded from questionnaire — exact scores in use.' : 'Set 0–3 per domain, or load a questionnaire for exact scoring.'));
  SECTIONS.forEach(s => {
    const head = el('div', { class: 'sh' });
    head.appendChild(el('span', {}, esc(s.full)));
    const vlabel = el('span', { style: 'font-weight:700' }, String(state.bands[s.id]));
    head.appendChild(vlabel);
    const input = el('input', { type: 'range', min: '0', max: '3', step: '1', value: String(state.bands[s.id]) });
    input.oninput = () => {
      state.bands[s.id] = +input.value; vlabel.textContent = input.value;
      state.secScores = null; // manual edit drops exact scores
      recompute(); renderRight();
    };
    const wrap = el('div', { class: 'slider-row' });
    wrap.appendChild(head); wrap.appendChild(input);
    sl.appendChild(wrap);
  });
  col.appendChild(sl);

  // Symptom checkboxes
  const symCard = el('div', { class: 'card' });
  symCard.appendChild(el('h3', {}, 'Symptoms'));
  SYM_GROUPS.forEach(g => {
    symCard.appendChild(el('div', { class: 'grp-label', style: `color:${g.color}` }, esc(g.label)));
    const grid = el('div', { class: 'sym-grid' });
    g.syms.forEach(s => grid.appendChild(checkbox(s.id, s.label, state.syms)));
    symCard.appendChild(grid);
  });
  col.appendChild(symCard);

  // Conditions
  const condCard = el('div', { class: 'card' });
  condCard.appendChild(el('h3', {}, 'Conditions / diagnoses'));
  const cg = el('div', { class: 'cond-grid', style: 'margin-top:8px' });
  CONDITIONS.forEach(c => {
    const on = state.conds.has(c.id);
    const t = el('button', { class: `cond${on ? ' on' : ''}`, type: 'button', style: on ? `border-color:${c.color};background:${c.bg}` : '' },
      `<span class="cond-dot" style="background:${c.color}"></span>${esc(c.label)}`);
    t.onclick = () => { state.conds.has(c.id) ? state.conds.delete(c.id) : state.conds.add(c.id); recompute(); render(); };
    cg.appendChild(t);
  });
  condCard.appendChild(cg);
  col.appendChild(condCard);

  // Medications
  const medCard = el('div', { class: 'card' });
  medCard.appendChild(el('h3', {}, 'Medications / history'));
  const mg = el('div', { class: 'sym-grid', style: 'margin-top:8px' });
  MEDS.forEach(m => mg.appendChild(checkbox(m.id, m.label, state.meds)));
  medCard.appendChild(mg);
  col.appendChild(medCard);

  return col;
}

function checkbox(id, label, set) {
  const on = set.has(id);
  const fromIntake = state.fromIntake.has(id);
  const lab = el('label', { class: `cb${on ? ' active' : ''}` });
  const cbx = el('input', { type: 'checkbox' });
  cbx.checked = on;
  cbx.onchange = () => { cbx.checked ? set.add(id) : set.delete(id); recompute(); render(); };
  lab.appendChild(cbx);
  lab.appendChild(el('span', {}, esc(label) + (fromIntake ? ' <span class="tag-intake">from intake</span>' : '')));
  return lab;
}

// Recompute fired patterns from current state.
function recompute() {
  const secScores = SECTIONS.reduce((o, s) => { o[s.id] = domainScore(s.id); return o; }, {});
  const set = new Set();
  // Full answer-level detection when a questionnaire is loaded.
  if (state.rawAnswers) {
    const ex = state.extras ? {
      bristol: state.extras.bristol ?? null, pss4Score: state.extras.pss4Score ?? null,
      sleepScore: state.extras.sleepScore ?? null, nrsPain: state.extras.nrsPain ?? null,
    } : {};
    detectPatterns(secScores, state.rawAnswers, ex).forEach(p => set.add(p.id));
  }
  // Manual lever: conditions + medications carry pattern associations.
  CONDITIONS.forEach(c => { if (state.conds.has(c.id)) c.pats.forEach(p => set.add(p)); });
  MEDS.forEach(m => { if (state.meds.has(m.id)) m.pats.forEach(p => set.add(p)); });
  // Preserve canonical order.
  state.patterns = PATTERNS.filter(p => set.has(p.id)).map(p => p.id);
  state.total = totalScore();
}

function renderRight() {
  const right = document.getElementById('clin-right');
  if (!right) return;
  right.innerHTML = '';
  right.appendChild(scoreSummary());
  right.appendChild(driversCard());

  const tabs = el('div', { class: 'tabs' });
  const panes = el('div');
  const tabDefs = [['patterns', 'Patterns'], ['strains', 'Strains'], ['labs', 'Lab guide'], ['protocol', 'Protocols']];
  tabDefs.forEach(([id, label]) => {
    const t = el('button', { class: `tab${state.activeTab === id ? ' active' : ''}` }, label);
    t.onclick = () => { state.activeTab = id; renderRight(); };
    tabs.appendChild(t);
  });
  right.appendChild(tabs);
  if (state.activeTab === 'patterns') panes.appendChild(patternsPane());
  else if (state.activeTab === 'strains') panes.appendChild(strainsPane());
  else if (state.activeTab === 'labs') panes.appendChild(labsPane());
  else panes.appendChild(protocolPane());
  right.appendChild(panes);

  // Save bar
  const bar = el('div', { class: 'save-bar' });
  bar.appendChild(el('div', { style: 'flex:1;min-width:140px;font-size:12px;color:var(--inks)' },
    `Code: <b>${esc(buildCode(SECTIONS.reduce((o, s) => { o[s.id] = domainScore(s.id); return o; }, {}), totalScore(), state.patterns))}</b>`));
  bar.appendChild(el('button', { class: 'btn btn-gh', onclick: () => ctx.printReport(buildSnapshot()) }, 'Print report'));
  bar.appendChild(el('button', { class: 'btn btn-g', onclick: () => ctx.saveVisit(buildSnapshot()) }, 'Save to patient'));
  right.appendChild(bar);
}

function scoreSummary() {
  const total = totalScore(); const sv = severityOf(total);
  const card = el('div', { class: 'card' });
  const row = el('div', { class: 'row', style: 'align-items:center' });
  row.appendChild(el('div', { style: `font-size:36px;font-weight:800;color:var(--g)` }, String(sv.index) + '%'));
  const bars = el('div', { style: 'flex:1;min-width:180px' });
  bars.appendChild(el('div', {}, `<span class="pill ${sv.cls}">${esc(sv.label)}</span> <span class="muted" style="font-size:12px">raw ${total}/120</span>`));
  SECTIONS.forEach(s => {
    const sc = domainScore(s.id); const max = sectionMax(s.id); const p = Math.round(sc / max * 100);
    bars.appendChild(el('div', { class: 'bar-row' },
      `<div class="bar-label"><span>${s.label}</span><span class="muted">${sc}/${max}</span></div>
       <div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${s.color}"></div></div>`));
  });
  row.appendChild(bars);
  card.appendChild(row);
  return card;
}

function driversCard() {
  const ex = state.extras || {};
  const ps = pss4Band(ex.pss4Score ?? null);
  const sl = sleepBand(ex.sleepScore ?? null);
  const pn = painBand(ex.nrsPain ?? null);
  const card = el('div', { class: 'card' });
  card.appendChild(el('h3', {}, 'Modifiable drivers'));
  const g = el('div', { class: 'drivers', style: 'margin-top:8px' });
  g.appendChild(el('div', { class: 'driver' }, `<div class="dv" style="color:${ps ? ps.c : '#999'}">${ps ? ps.l : '—'}</div><div class="dl">Stress (PSS-4)</div>`));
  g.appendChild(el('div', { class: 'driver' }, `<div class="dv" style="color:${sl ? sl.c : '#999'}">${sl ? sl.l : '—'}</div><div class="dl">Sleep</div>`));
  g.appendChild(el('div', { class: 'driver' }, `<div class="dv" style="color:${pn ? pn.c : '#999'}">${pn ? pn.l : '—'}</div><div class="dl">Pain (NRS)</div>`));
  g.appendChild(el('div', { class: 'driver' }, `<div class="dv">${ex.bristol ?? '—'}</div><div class="dl">Bristol type</div>`));
  card.appendChild(g);
  return card;
}

function patternsPane() {
  const pane = el('div', { class: 'tabpane show' });
  if (!state.patterns.length) { pane.appendChild(el('div', { class: 'card muted' }, 'No patterns flagged. Load a questionnaire or select conditions/medications.')); return pane; }
  state.patterns.forEach(pid => {
    const p = patternById(pid);
    const a = el('div', { class: 'pat-alert', style: `background:${p.bg};border-color:${p.border || p.color}` });
    a.appendChild(el('div', { class: 'pa-ic' }, p.emoji));
    const body = el('div', { style: 'flex:1' });
    body.appendChild(el('div', { class: 'pa-title', style: `color:${p.color}` }, esc(p.label)));
    body.appendChild(el('div', { class: 'pa-desc' }, esc(p.desc)));
    body.appendChild(el('div', { class: 'pa-block' }, `<b>Tests:</b> ${p.tests.map(esc).join(' · ')}`));
    body.appendChild(el('div', { class: 'pa-block', style: 'color:var(--re)' }, `<b>Avoid:</b> ${esc(p.avoid)}`));
    a.appendChild(body);
    pane.appendChild(a);
  });
  return pane;
}

function strainsPane() {
  const pane = el('div', { class: 'tabpane show' });
  const ranked = rankStrains({
    patternIds: state.patterns, bands: state.bands,
    syms: state.syms, meds: state.meds, conds: state.conds, extras: state.extras,
  });
  pane.appendChild(el('div', { class: 'q-sub', style: 'margin-bottom:8px' }, 'Ranked by fired patterns, domain severity, symptoms, conditions and medications. Indian brands from product catalogue.'));
  const list = el('div', { class: 'strain-list' });
  const evColor = { High: '#085041', Moderate: '#633806', Emerging: '#042C53' };
  const evBg = { High: '#E1F5EE', Moderate: '#FAEEDA', Emerging: '#E6F1FB' };
  const rankBg = ['#0F6E56', '#BA7517', '#185FA5', '#888780'];
  ranked.forEach((s, i) => {
    const top = i < 4 && s.score > 0;
    const card = el('div', { class: `strain${top ? ' top' : ''}` });
    card.appendChild(el('div', { class: 'sc-head' },
      `<div class="sc-rank" style="background:${rankBg[Math.min(i, 3)]}">${i + 1}</div>
       <div class="sc-name">${esc(s.name)}</div>
       <div class="sc-ev" style="color:${evColor[s.ev]};background:${evBg[s.ev]}">${esc(s.ev)}</div>`));
    const body = el('div', { class: 'sc-body' });
    body.appendChild(el('div', {}, `${esc(s.indication)}`));
    body.appendChild(el('div', { class: 'muted', style: 'margin-top:3px' }, `${esc(s.cfu)} · ${esc(s.timing)}`));
    body.appendChild(el('div', { class: 'india' }, esc(s.india)));
    if (s.warn) body.appendChild(el('div', { class: 'warn' }, '⚠ ' + esc(s.warn)));
    card.appendChild(body);
    list.appendChild(card);
  });
  pane.appendChild(list);
  return pane;
}

function labsPane() {
  const pane = el('div', { class: 'tabpane show' });
  const cats = state.patterns.length ? relevantLabs(state.patterns) : LAB_TESTS;
  cats.forEach(cat => {
    const c = el('div', { class: 'lab-cat' });
    c.appendChild(el('div', { class: 'lab-cat-h', style: `background:${cat.bg};color:${cat.color}` }, esc(cat.category)));
    cat.tests.forEach(t => {
      const av = AVAIL_LABELS[t.avail] || AVAIL_LABELS.yes;
      const row = el('div', { class: 'lab-row' });
      row.appendChild(el('div', { style: 'flex:1' },
        `<div class="lr-name">${esc(t.name)} <span class="av ${av.cls}">${av.label}</span></div>
         <div class="lr-desc">${esc(t.desc)}</div>${t.where ? `<div class="lr-where">${esc(t.where)}</div>` : ''}`));
      row.appendChild(el('div', { class: 'lr-right' }, `<div class="lr-opt">${esc(t.opt)}</div><div class="lr-cost">${esc(t.cost)}</div>`));
      c.appendChild(row);
    });
    pane.appendChild(c);
  });
  return pane;
}

function protocolPane() {
  const pane = el('div', { class: 'tabpane show' });
  if (!state.patterns.length) { pane.appendChild(el('div', { class: 'card muted' }, 'No patterns flagged — no protocol to show.')); return pane; }
  state.patterns.forEach(pid => {
    const p = patternById(pid);
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'pa-title', style: `color:${p.color};margin-bottom:6px` }, `${p.emoji} ${esc(p.label)}`));
    card.appendChild(el('div', { class: 'pa-block' }, `<b>Protocol:</b> ${esc(p.protocol)}`));
    card.appendChild(el('div', { class: 'pa-block', style: 'color:var(--re)' }, `<b>Avoid:</b> ${esc(p.avoid)}`));
    pane.appendChild(card);
  });
  return pane;
}

// Build a canonical visit snapshot for saving / printing.
function buildSnapshot() {
  const secScores = SECTIONS.reduce((o, s) => { o[s.id] = domainScore(s.id); return o; }, {});
  const total = totalScore();
  return {
    date: Date.now(), source: state.rawAnswers ? 'clinician (from intake)' : 'clinician',
    answers: state.rawAnswers || null,
    extras: state.extras || {},
    secScores, bands: { ...state.bands }, total,
    severity: severityOf(total).label,
    patterns: [...state.patterns],
    code: buildCode(secScores, total, state.patterns),
    notes: state.notes || '',
    syms: [...state.syms], conds: [...state.conds], meds: [...state.meds],
  };
}
