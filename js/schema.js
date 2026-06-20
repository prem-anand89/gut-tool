/* ============================================================================
   schema.js — THE single source of truth for the Beyond Mechanics Gut Suite.

   In v7 the same questions lived in THREE hand-synced places: a keyed patient
   array, a plain-string clinician array, and a bridging INTAKE_AUTO_MAP. This
   file fuses all three. Every question carries everything all surfaces need:

     - patientText / patientSub : how the patient sees it (graded 0–3)
     - clinicianLabel           : the clinician dashboard label (was array #2)
     - scale                    : 0–3 option vocabulary (see scales.js)
     - clinicianFlag            : intake→clinician auto-derivation (was the map)

   Rules enforced here:
     - IDs are `section_concept`, globally unique, APPEND-ONLY. Never reused,
       never reordered for meaning. Adding/removing a question can never shift
       another's index because every consumer addresses questions BY ID.
     - The flat index (QID: id→position) is COMPUTED ONCE, the only index in
       the app. No hardcoded q[14] / q[28] positions anywhere.
     - Section `max` is COMPUTED (questions × 3), never hand-declared, so it
       can never silently drift from the question list (v7 needed a console
       tripwire for exactly this; here it's impossible by construction).

   Retired vs v7 (deliberate, per rebuild brief §3/§4):
     - Legacy single-item "poor sleep" (BG) and "high chronic stress" (HX)
       questions stay removed — sleep/stress are the validated PSS-4 + sleep-4
       instruments (scales.js), the one canonical signal per construct.

   Clinical wording ported in substance unchanged from BM_Gut_Suite_v7.
   ========================================================================== */

export const SCHEMA_VERSION = 3; // generation tag stamped on every saved record

// ── SECTIONS (order + presentation; max is computed below) ──────────────────
export const SECTIONS = [
  { id: 'GI', label: 'GI', full: 'Gastrointestinal',       color: '#0F6E56', bg: '#E1F5EE' },
  { id: 'IM', label: 'IM', full: 'Immune & Inflammatory',  color: '#A32D2D', bg: '#FCEBEB' },
  { id: 'BG', label: 'BG', full: 'Brain-Gut & Mood',       color: '#534AB7', bg: '#EEEDFE' },
  { id: 'ME', label: 'ME', full: 'Metabolic',              color: '#BA7517', bg: '#FAEEDA' },
  { id: 'HX', label: 'HX', full: 'History & Risk Factors', color: '#185FA5', bg: '#E6F1FB' },
  { id: 'SK', label: 'SK', full: 'Skin & External Signs',  color: '#993C1D', bg: '#FAECE7' },
];

// ── THE 40 QUESTIONS — flat, in canonical order ─────────────────────────────
// clinicianFlag: when a loaded questionnaire answer is >= min, the listed
// clinician symptom (syms) / medication (meds) checkboxes auto-tick, tagged
// "from intake", fully overridable. Questions with no clinicianFlag simply
// don't auto-derive a checkbox.
export const QUESTIONS = [
  // ── GI ──
  { id: 'gi_bloating', section: 'GI',
    patientText: 'Bloating or abdominal distension after meals',
    patientSub:  'Feeling of fullness, pressure, or swelling after eating',
    clinicianLabel: 'Bloating or abdominal distension after meals',
    clinicianFlag: { min: 2, syms: ['bloating'] } },
  { id: 'gi_gas', section: 'GI',
    patientText: 'Excessive gas or belching',
    patientSub:  'Frequent flatulence, especially after meals',
    clinicianLabel: 'Excessive gas or belching',
    clinicianFlag: { min: 2, syms: ['bloating'] } },
  { id: 'gi_irregular_bowel', section: 'GI', scale: 'FREQ',
    patientText: 'Irregular bowel habits',
    patientSub:  'Alternating constipation and diarrhoea, or persistently abnormal',
    clinicianLabel: 'Irregular bowel habits (alternating constipation/diarrhoea)' },
  { id: 'gi_abd_pain', section: 'GI',
    patientText: 'Abdominal pain or cramping',
    patientSub:  'Intermittent or chronic lower/mid abdominal discomfort',
    clinicianLabel: 'Abdominal pain or cramping',
    clinicianFlag: { min: 2, syms: ['ibs_pain'] } },
  { id: 'gi_reflux', section: 'GI',
    patientText: 'Heartburn or acid reflux',
    patientSub:  'Burning sensation, regurgitation, or sour taste',
    clinicianLabel: 'Heartburn or acid reflux',
    clinicianFlag: { min: 2, syms: ['reflux'] } },
  { id: 'gi_undigested', section: 'GI', scale: 'FREQ',
    patientText: 'Undigested food in stool',
    patientSub:  'Visible food particles, greasy or floating stools',
    clinicianLabel: 'Undigested food in stool',
    clinicianFlag: { min: 2, syms: ['undigested'] } },
  { id: 'gi_nausea', section: 'GI',
    patientText: 'Nausea or early satiety',
    patientSub:  'Feeling sick or full after small amounts of food',
    clinicianLabel: 'Nausea or early satiety',
    clinicianFlag: { min: 2, syms: ['nausea'] } },
  { id: 'gi_mucus_stool', section: 'GI', scale: 'FREQ',
    patientText: 'Mucus in stool',
    patientSub:  'Visible mucus or stringy material in bowel movements',
    clinicianLabel: 'Mucus in stool',
    clinicianFlag: { min: 2, syms: ['mucus_stool'] } },
  { id: 'gi_urgency', section: 'GI',
    patientText: 'Urgency to use the bathroom',
    patientSub:  'Sudden urgent need to defecate with little warning',
    clinicianLabel: 'Urgency to use the bathroom' },
  { id: 'gi_bad_breath', section: 'GI',
    patientText: 'Persistent bad breath despite good oral hygiene',
    patientSub:  'Halitosis that seems to come from the gut, not the mouth',
    clinicianLabel: 'Persistent bad breath despite good oral hygiene' },

  // ── IM ──
  { id: 'im_histamine', section: 'IM', scale: 'HISTAMINE',
    patientText: 'Do you experience flushing, hives, itching, or headache after eating fermented foods, aged cheese, wine, or vinegar?',
    patientSub:  'Reactions that suggest histamine intolerance or mast cell sensitivity',
    clinicianLabel: 'Flushing, hives, or headache after fermented foods / wine / vinegar',
    clinicianFlag: { min: 2, syms: ['flushing', 'wine_react'] } },
  { id: 'im_infections', section: 'IM', scale: 'COUNT_INFECT',
    patientText: 'How often do you get infections (colds, UTIs, skin infections)?',
    patientSub:  'Think about the past 12 months',
    clinicianLabel: 'Infection frequency (colds, UTIs, skin) — past 12 months',
    clinicianFlag: { min: 2, syms: ['freq_infect'] } },
  { id: 'im_autoimmune', section: 'IM', scale: 'STATUS_DIAG',
    patientText: 'Autoimmune condition diagnosed',
    patientSub:  "e.g. Hashimoto's, RA, lupus, psoriasis, coeliac disease",
    clinicianLabel: "Autoimmune condition diagnosed (Hashimoto's, RA, lupus, coeliac, etc.)" },
  { id: 'im_allergies', section: 'IM',
    patientText: 'Seasonal allergies or hay fever',
    patientSub:  'Histamine reactivity, runny nose, itchy eyes, sneezing',
    clinicianLabel: 'Seasonal allergies or hay fever',
    clinicianFlag: { min: 2, syms: ['allergy'] } },
  { id: 'im_food_sens', section: 'IM', scale: 'COUNT_FOOD_S',
    patientText: 'How many foods trigger a reaction (bloating, rash, headache)?',
    patientSub:  'Food sensitivities or intolerances',
    clinicianLabel: 'Number of foods that trigger a reaction (sensitivities/intolerances)',
    clinicianFlag: { min: 2, syms: ['food_sens'] } },
  { id: 'im_joint_pain', section: 'IM',
    patientText: 'Joint pain or stiffness',
    patientSub:  'Inflammatory joint pain without a clear structural cause',
    clinicianLabel: 'Joint pain or stiffness without clear structural cause',
    clinicianFlag: { min: 2, syms: ['joint_pain'] } },
  { id: 'im_skin_issues', section: 'IM',
    patientText: 'Skin issues — eczema, urticaria, or rosacea',
    patientSub:  'Inflammatory skin conditions that flare unpredictably',
    clinicianLabel: 'Skin issues — eczema, urticaria, or rosacea',
    clinicianFlag: { min: 2, syms: ['eczema', 'acne_ros'] } },
  { id: 'im_crp', section: 'IM', scale: 'STATUS',
    patientText: 'Blood markers of inflammation (CRP/ESR) raised on blood work',
    patientSub:  'Has your doctor told you your inflammation markers are elevated?',
    clinicianLabel: 'Raised blood inflammation markers (CRP/ESR) on blood work' },

  // ── BG ──
  { id: 'bg_brainfog', section: 'BG',
    patientText: 'Brain fog or poor concentration',
    patientSub:  'Difficulty thinking clearly, word-finding problems, mental fatigue',
    clinicianLabel: 'Brain fog or poor concentration',
    clinicianFlag: { min: 2, syms: ['brainfog'] } },
  { id: 'bg_anxiety', section: 'BG',
    patientText: 'Persistent anxiety or nervousness',
    patientSub:  'Generalised or gut-linked anxiety, restlessness, racing thoughts',
    clinicianLabel: 'Persistent anxiety or nervousness',
    clinicianFlag: { min: 2, syms: ['anxiety'] } },
  { id: 'bg_low_mood', section: 'BG',
    patientText: 'Depressed mood or low motivation',
    patientSub:  'Persistent low mood, loss of interest in things you normally enjoy',
    clinicianLabel: 'Depressed mood or low motivation',
    clinicianFlag: { min: 2, syms: ['low_mood'] } },
  { id: 'bg_fatigue', section: 'BG',
    patientText: 'Fatigue not improved by rest',
    patientSub:  'Chronic tiredness, energy crashes especially after meals',
    clinicianLabel: 'Fatigue not improved by rest',
    clinicianFlag: { min: 2, syms: ['fatigue'] } },
  { id: 'bg_headache', section: 'BG', scale: 'FREQ',
    patientText: 'How often do you get headaches or migraines?',
    patientSub:  'Particularly after eating or in the morning',
    clinicianLabel: 'Frequency of headaches or migraines',
    clinicianFlag: { min: 2, syms: ['headache'] } },

  // ── ME ──
  { id: 'me_weight_gain', section: 'ME',
    patientText: 'Unexplained weight gain or difficulty losing weight',
    patientSub:  'Despite reasonable diet and exercise habits',
    clinicianLabel: 'Unexplained weight gain or difficulty losing weight',
    clinicianFlag: { min: 2, syms: ['weight_gain'] } },
  { id: 'me_sugar_crav', section: 'ME',
    patientText: 'Blood sugar fluctuations or carbohydrate / sugar cravings',
    patientSub:  'Energy crashes, strong cravings for carbs or sweets',
    clinicianLabel: 'Blood sugar fluctuations or carbohydrate/sugar cravings',
    clinicianFlag: { min: 2, syms: ['sugar_crav', 'glucose_swing'] } },
  { id: 'me_nutrients', section: 'ME', scale: 'STATUS',
    patientText: 'Nutrient deficiencies found on blood work',
    patientSub:  'B12, iron, Vitamin D, magnesium — low levels despite adequate diet',
    clinicianLabel: 'Nutrient deficiencies (B12, iron, Vitamin D, magnesium) on blood work' },
  { id: 'me_cholesterol', section: 'ME', scale: 'STATUS',
    patientText: 'Elevated cholesterol or triglycerides',
    patientSub:  'Has your doctor said your cholesterol or lipid levels are abnormal?',
    clinicianLabel: 'Elevated cholesterol or triglycerides' },
  { id: 'me_thyroid_sym', section: 'ME',
    patientText: 'Thyroid symptoms',
    patientSub:  'Feeling cold, fatigue, hair loss, constipation, weight gain without clear cause',
    clinicianLabel: 'Thyroid symptoms (cold intolerance, fatigue, hair loss)',
    clinicianFlag: { min: 1, syms: ['thyroid_sym'] } },
  { id: 'me_fatty_liver', section: 'ME', scale: 'STATUS',
    patientText: 'Fatty liver or elevated liver enzymes (ALT / GGT)',
    patientSub:  'NAFLD diagnosis or raised liver markers on blood work',
    clinicianLabel: 'History of fatty liver or elevated liver enzymes (ALT/GGT)',
    clinicianFlag: { min: 1, syms: ['fatty_liver'] } },

  // ── HX ──
  { id: 'hx_abx_12mo', section: 'HX', scale: 'COUNT_ABX_12',
    patientText: 'How many antibiotic courses have you taken in the past 12 months?',
    patientSub:  'Include any course, even a short one',
    clinicianLabel: 'Antibiotic use in the past 12 months',
    clinicianFlag: { min: 1, meds: ['abx_recent'] } },
  { id: 'hx_abx_5yr', section: 'HX', scale: 'COUNT_ABX_5Y',
    patientText: 'How many antibiotic courses have you taken in the past 5 years?',
    patientSub:  'Include prolonged courses (10+ days) in your count',
    clinicianLabel: 'Multiple or prolonged antibiotic courses (3+ in 5 years)',
    clinicianFlag: { min: 2, meds: ['abx_multiple'] } },
  { id: 'hx_ppi', section: 'HX', scale: 'PPI',
    patientText: 'Use of PPIs or antacids (omeprazole, pantoprazole, ranitidine…)',
    patientSub:  'How regularly do you or have you taken acid-reducing medication?',
    clinicianLabel: 'Regular use of PPIs or antacids (omeprazole, pantoprazole, etc.)',
    clinicianFlag: { min: 2, meds: ['ppi'] } },
  { id: 'hx_food_poison', section: 'HX', scale: 'FOOD_POISON',
    patientText: "History of food poisoning or traveller's diarrhoea",
    patientSub:  'Did gut symptoms persist or start after a past infection?',
    clinicianLabel: "History of food poisoning or traveller's diarrhoea",
    clinicianFlag: { min: 1, meds: ['food_poison'] } },
  { id: 'hx_post_infect', section: 'HX', scale: 'POST_INFECT',
    patientText: 'Did your gut symptoms begin or significantly worsen after a bout of food poisoning, gastroenteritis, or traveller\'s diarrhoea?',
    patientSub:  'This is separate from the episode itself — asking whether that event triggered lasting gut changes',
    clinicianLabel: 'Did gut symptoms begin or worsen after a gut infection?',
    clinicianFlag: { min: 2, meds: ['food_poison'] } },
  { id: 'hx_diet', section: 'HX', scale: 'DIET',
    patientText: 'Diet quality — how much of your diet is processed or low-fibre?',
    patientSub:  'Less than 5 portions of fruit/vegetables daily; frequent packaged foods',
    clinicianLabel: 'Low-fibre or high processed food diet' },
  { id: 'hx_csec', section: 'HX', scale: 'CSEC',
    patientText: 'C-section birth or formula-fed as infant',
    patientSub:  'Applies to you personally, or if answering on behalf of a child',
    clinicianLabel: 'C-section birth or formula-fed as infant',
    clinicianFlag: { min: 2, meds: ['csection'] } },

  // ── SK ──
  { id: 'sk_oral_thrush', section: 'SK', scale: 'RECUR',
    patientText: 'Oral thrush or unusual tongue appearance',
    patientSub:  'White patches, burning sensation, geographic tongue — how often?',
    clinicianLabel: 'Oral thrush or unusual tongue appearance',
    clinicianFlag: { min: 1, syms: ['oral_thrush'] } },
  { id: 'sk_vaginal_yeast', section: 'SK', scale: 'RECUR',
    patientText: 'Vaginal / rectal itching or recurrent yeast infections',
    patientSub:  'Candida-related symptoms — how often do these occur?',
    clinicianLabel: 'Vaginal or rectal itching, or recurrent yeast infections',
    clinicianFlag: { min: 1, syms: ['vaginal_yeast'] } },
  { id: 'sk_nails', section: 'SK',
    patientText: 'Brittle, ridged, or discoloured nails',
    patientSub:  'Changes suggesting malabsorption or fungal involvement',
    clinicianLabel: 'Brittle, ridged, or discoloured nails',
    clinicianFlag: { min: 1, syms: ['nail_fungal'] } },
  { id: 'sk_skin_rash', section: 'SK',
    patientText: 'Acne, eczema, or unexplained skin rashes',
    patientSub:  'Inflammatory skin conditions linked to gut health',
    clinicianLabel: 'Acne, eczema, or unexplained skin rashes',
    clinicianFlag: { min: 1, syms: ['eczema', 'acne_ros'] } },
];

// ── DERIVED INDEX — the ONLY question index in the app ──────────────────────
// QID[id] -> flat position. Built once. Detectors, scoring, migration, and the
// answer array all address questions through this; nothing hardcodes a number.
export const QID = Object.freeze(
  QUESTIONS.reduce((m, q, i) => { m[q.id] = i; return m; }, {})
);

export const QTOTAL = QUESTIONS.length; // 40

// Per-section max = (questions in section) × 3. Computed, never declared.
const _sectionMax = SECTIONS.reduce((m, s) => {
  m[s.id] = QUESTIONS.filter(q => q.section === s.id).length * 3;
  return m;
}, {});
export function sectionMax(sectionId) { return _sectionMax[sectionId]; }

// Theoretical raw ceiling (40 × 3 = 120). Single source for BMScore.
export const RAW_MAX = QTOTAL * 3;

// Questions of a section, in order.
export function questionsOf(sectionId) {
  return QUESTIONS.filter(q => q.section === sectionId);
}

// Dev sanity check — fires only if the schema is internally inconsistent.
// (Unlike v7, this can't drift from a hand-declared max; it guards typos.)
if (typeof console !== 'undefined') {
  const sum = SECTIONS.reduce((t, s) => t + _sectionMax[s.id], 0);
  if (sum !== RAW_MAX) {
    console.warn(`[BM schema] section maxes (${sum}) != RAW_MAX (${RAW_MAX}) — check SECTIONS/QUESTIONS.`);
  }
}
