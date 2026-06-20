/* ============================================================================
   scales.js — answer-option vocabularies for the 0–3 symptom questions, plus
   the separate validated-instrument definitions (PSS-4, sleep-4, Bristol,
   NRS pain). Pure data + pure scoring helpers. No DOM, no globals.

   Ported verbatim in substance from BM_Gut_Suite_v7. Every 0–3 scale is an
   array of exactly four labels (options 0,1,2,3). A question with no `scale`
   uses DEFAULT_SCALE (severity).
   ========================================================================== */

// ── 0–3 SCALE VOCABULARIES ──────────────────────────────────────────────────
export const SCALES = {
  DEFAULT:       ['Never / Absent', 'Mild / Occasional', 'Moderate / Frequent', 'Severe / Always'],
  FREQ:          ['Never / Rarely', 'Occasionally', 'Often / Most weeks', 'Very often / Daily'],
  RECUR:         ['Never', 'Once or twice ever', 'Recurring (3+ times)', 'Current / Persistent'],
  COUNT_INFECT:  ['Rarely / Never', '1–2 times per year', '3–4 times per year', '5+ times per year'],
  COUNT_FOOD_S:  ['None', '1 food', '2–3 foods', '4 or more foods'],
  COUNT_ABX_12:  ['None in past year', '1 course', '2 courses', '3 or more courses'],
  COUNT_ABX_5Y:  ['None in past 5 years', '1–2 courses', '3–5 courses', '6+ or long courses'],
  STATUS:        ['No / Not tested', 'Possible / Suspected', 'Yes – mild / past', 'Yes – confirmed / active'],
  STATUS_DIAG:   ['No', 'Suspected, not confirmed', 'Diagnosed – currently stable', 'Diagnosed – currently active'],
  PPI:           ['Never used', 'Occasionally (as needed)', 'Past regular use', 'Current regular use (3+ months)'],
  FOOD_POISON:   ['Never happened', 'Happened – fully resolved', 'Happened – some symptoms remain', 'Happened – ongoing symptoms'],
  DIET:          ['Mostly whole foods, high fibre', 'Mix of whole and processed', 'Mostly processed, low fibre', 'Almost entirely processed / very low fibre'],
  CSEC:          ['Neither', 'Formula-fed as infant only', 'C-section only', 'Both C-section and formula-fed'],
  HISTAMINE:     ['Never / No reaction', 'Mild — occasional minor reaction', 'Moderate — noticeable reaction several times', 'Severe — consistent strong reaction'],
  POST_INFECT:   ['No — my symptoms started another way', 'Possibly — timing feels related', 'Likely — gut changed noticeably after that infection', 'Yes — gut has never been the same since that episode'],
};

// Resolve a question's scale name (or undefined) to its 4-label array.
export function scaleFor(name) {
  return SCALES[name] || SCALES.DEFAULT;
}

// ── BRISTOL STOOL FORM SCALE (Lewis & Heaton 1997) — types 1–7 ──────────────
export const BRISTOL_TYPES = [
  { n: 1, label: 'Separate hard lumps',     sub: 'like nuts, hard to pass',        tag: 'Constipated',          col: '#7A4A1E' },
  { n: 2, label: 'Lumpy and sausage-like',  sub: 'sausage-shaped but lumpy',       tag: 'Slightly constipated', col: '#9A6B2E' },
  { n: 3, label: 'Sausage with cracks',     sub: 'sausage with surface cracks',    tag: 'Near normal',          col: '#3B6D11' },
  { n: 4, label: 'Smooth, soft sausage',    sub: 'like a smooth soft snake — ideal', tag: 'Normal / ideal',     col: '#0F6E56' },
  { n: 5, label: 'Soft blobs, clear edges', sub: 'soft blobs that pass easily',    tag: 'Lacking fibre',        col: '#BA7517' },
  { n: 6, label: 'Mushy, ragged edges',     sub: 'fluffy pieces, mushy stool',     tag: 'Mild diarrhoea',       col: '#C2622E' },
  { n: 7, label: 'Watery, no solid pieces', sub: 'entirely liquid',                tag: 'Diarrhoea',            col: '#A32D2D' },
];

// ── GI-VALIDATED MODIFIED 4-ITEM PERCEIVED STRESS SCALE ─────────────────────
// Du et al. 2023, BMC Gastroenterol, CC BY 4.0. Items reworded; standard PSS
// 0–4 frequency anchors. Higher = more stress. Items 2 & 3 (indices 1,2) are
// positively framed and therefore reverse-scored.
export const PSS4_ITEMS = [
  'In the last month, how often have you felt unable to control the important things in your life?',
  'In the last month, how often have you felt confident about your ability to handle your personal problems?',
  'In the last month, how often have you felt that things were going your way?',
  'In the last month, how often have you felt difficulties were piling up so high you could not overcome them?',
];
export const PSS4_REVERSED = [false, true, true, false];
export const PSS4_ANCHORS = ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often']; // 0–4

// PSS-4 total 0–16. Returns null until all four items answered.
export function pss4Score(arr) {
  if (!arr || arr.some(v => v == null)) return null;
  return arr.reduce((sum, v, i) => sum + (PSS4_REVERSED[i] ? (4 - v) : v), 0);
}
export function pss4Band(s) {
  if (s == null) return null;
  return s <= 5 ? { l: 'Low', c: '#0F6E56' } : s <= 9 ? { l: 'Moderate', c: '#BA7517' } : { l: 'High', c: '#A32D2D' };
}

// ── SHORT SLEEP-QUALITY CHECK (open items; 0–3 each) ────────────────────────
// Higher = poorer sleep. This is the ONE canonical sleep signal in the rebuild
// (the legacy single-item BG sleep question and the clinician `poor_sleep`
// checkbox-as-scorer are both retired — see schema.js / strains.js notes).
export const SLEEP_ITEMS = [
  { t: 'How long does it usually take you to fall asleep?', a: ['Under 15 min', '15–30 min', '30–60 min', 'Over 60 min'] },
  { t: 'How often do you wake during the night?',           a: ['Rarely', 'Once a night', '2–3 times', '4+ times / frequently'] },
  { t: 'How rested do you feel on waking?',                 a: ['Fully refreshed', 'Mostly rested', 'Somewhat tired', 'Exhausted / unrefreshed'] },
  { t: 'On average, how many hours of actual sleep do you get?', a: ['7–9 hours', '6–7 hours', '5–6 hours', 'Under 5 hours'] },
];

// Sleep total 0–12. Returns null until all four items answered.
export function sleepScore(arr) {
  if (!arr || arr.some(v => v == null)) return null;
  return arr.reduce((a, b) => a + b, 0);
}
export function sleepBand(s) {
  if (s == null) return null;
  return s <= 3 ? { l: 'Good', c: '#0F6E56' } : s <= 6 ? { l: 'Fair', c: '#BA7517' } : { l: 'Poor', c: '#A32D2D' };
}

// ── NRS PAIN — standard 0–10 Numeric Rating Scale + body region ─────────────
// Manual-therapy context: location matters. Purely observational — does NOT
// feed the Dysbiosis Index, pattern detection, or strain ranking by design.
export const PAIN_REGIONS = [
  { id: 'low_back', label: 'Low back' },
  { id: 'neck',     label: 'Neck' },
  { id: 'joints',   label: 'Joints' },
  { id: 'abdomen',  label: 'Abdomen' },
  { id: 'other',    label: 'Other' },
];
export function painBand(s) {
  if (s == null) return null;
  return s === 0 ? { l: 'None', c: '#0F6E56' }
    : s <= 3 ? { l: 'Mild', c: '#3B6D11' }
    : s <= 6 ? { l: 'Moderate', c: '#BA7517' }
    : { l: 'Severe', c: '#A32D2D' };
}
