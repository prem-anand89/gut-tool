/* ============================================================================
   scoring.js — the Dysbiosis Index, as PURE functions. No DOM, no globals.
   The patient results screen, the clinician dashboard, the printed report and
   the migration script all call THIS — there is no second copy to drift.

   Raw score 0–120 (40 questions × 0–3). Because no real patient maxes every
   antagonistic/historical item, scores normalise against an EFFECTIVE_MAX (~90)
   where a genuinely severe presentation lands near 100%.
     Index% = round(min(raw, EFFECTIVE_MAX) / EFFECTIVE_MAX * 100)
   Severity bands are defined on the RAW score (so the patient code is stable)
   and presented alongside the Index%. Ported from v7 BMScore unchanged.
   ========================================================================== */

import { SECTIONS, QUESTIONS, QID, QTOTAL, RAW_MAX, sectionMax } from './schema.js';

export const EFFECTIVE_MAX = 90; // realistic ceiling; recalibrate from real data later

// Bands defined on RAW score. Colours shared across all surfaces.
export const BANDS = [
  { label: 'Minimal',        rawMax: 21,       color: '#0F6E56', bg: '#E1F5EE', cls: 'sev-min' },
  { label: 'Mild–Moderate',  rawMax: 41,       color: '#BA7517', bg: '#FAEEDA', cls: 'sev-mod' },
  { label: 'Significant',    rawMax: 60,       color: '#C2622E', bg: '#FAECE7', cls: 'sev-sig' },
  { label: 'Severe',         rawMax: Infinity, color: '#A32D2D', bg: '#FCEBEB', cls: 'sev-sev' },
];

export const SEVERITY_DESC = {
  'Minimal':       'Your result suggests minimal dysbiosis. A foundation approach with diet changes and basic probiotics is likely sufficient.',
  'Mild–Moderate': 'Your result suggests mild-to-moderate dysbiosis. A targeted protocol is recommended — discuss with your clinician.',
  'Significant':   'Your result suggests significant dysbiosis. A clinician-guided protocol and selective testing is recommended.',
  'Severe':        'Your result suggests severe dysbiosis. A comprehensive clinical assessment is strongly recommended.',
};

// Index% from raw total.
export function indexPct(raw) {
  return Math.round(Math.min(raw, EFFECTIVE_MAX) / EFFECTIVE_MAX * 100);
}

// Severity object for a raw total: {label,color,bg,cls,index,desc}.
export function severityOf(raw) {
  const b = BANDS.find(x => raw < x.rawMax) || BANDS[BANDS.length - 1];
  return Object.assign({}, b, { index: indexPct(raw), desc: SEVERITY_DESC[b.label] });
}

// Per-section 0–3 band from a section's raw score and max.
export function sectionBand(score, max) {
  return Math.min(3, Math.floor(score / max * 4));
}

// Chart-background zones expressed as Index% boundaries.
export function indexZones() {
  let prevRaw = 0; const out = [];
  for (const b of BANDS) {
    const top = b.rawMax === Infinity ? RAW_MAX : b.rawMax;
    out.push({ label: b.label, color: b.color, bg: b.bg, fromPct: indexPct(prevRaw), toPct: indexPct(top) });
    prevRaw = top;
  }
  return out;
}

/* ── CORE: answers (array OR id-map) → full score object ────────────────────
   Accepts either a positional array (length QTOTAL) or an object keyed by
   question id. Returns everything every surface needs.                        */
export function computeScores(answers) {
  const get = Array.isArray(answers)
    ? (id) => answers[QID[id]] ?? 0
    : (id) => answers[id] ?? 0;

  const secScores = {}; const bands = {}; let total = 0;
  for (const sec of SECTIONS) {
    let sc = 0;
    for (const q of QUESTIONS) if (q.section === sec.id) sc += (get(q.id) || 0);
    secScores[sec.id] = sc;
    bands[sec.id] = sectionBand(sc, sectionMax(sec.id));
    total += sc;
  }
  return { secScores, bands, total, severity: severityOf(total), index: indexPct(total) };
}

// Flat positional answer array (length QTOTAL) from an id-map or array.
export function toAnswerArray(answers) {
  if (Array.isArray(answers)) {
    const out = [];
    for (let i = 0; i < QTOTAL; i++) out.push(answers[i] ?? 0);
    return out;
  }
  return QUESTIONS.map(q => answers[q.id] ?? 0);
}

/* ── COMPACT CODE STRING (export/print/share only) ─────────────────────────
   Format: GI{b}·IM{b}·BG{b}·ME{b}·HX{b}·SK{b}·T{total}[·PATID...]
   e.g. "GI1·IM1·BG1·ME1·HX1·SK0·T34". Matches v7 so old codes stay readable. */
const DOT = '·';
export function buildCode(secScores, total, patternIds = []) {
  const bandsStr = SECTIONS.map(s => `${s.id}${sectionBand(secScores[s.id] || 0, sectionMax(s.id))}`).join(DOT);
  const patStr = (patternIds && patternIds.length) ? DOT + patternIds.join(DOT) : '';
  return `${bandsStr}${DOT}T${total}${patStr}`;
}

// Parse the band/total portion of a code back to {bands,total}. Patterns are
// derived fresh from data, so any trailing pattern tokens are ignored.
export function parseCode(code) {
  if (!code || typeof code !== 'string') return null;
  const bands = {}; let total = null;
  for (const tok of code.split(DOT)) {
    const m = tok.match(/^([A-Z]{2})([0-3])$/);
    if (m && SECTIONS.some(s => s.id === m[1])) { bands[m[1]] = +m[2]; continue; }
    const t = tok.match(/^T(\d+)$/);
    if (t) total = +t[1];
  }
  if (SECTIONS.some(s => bands[s.id] == null)) return null;
  return { bands, total };
}
