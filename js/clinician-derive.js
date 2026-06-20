/* ============================================================================
   clinician-derive.js — clinician taxonomy + intake→clinician auto-derivation.

   In v7 the intake→clinician mapping lived in a standalone INTAKE_AUTO_MAP that
   had to be hand-kept in step with the questions. Here the mapping lives ON each
   question (schema.js `clinicianFlag`); this module just walks the schema. The
   clinician checkbox lists (SYM_GROUPS / CONDITIONS / MEDS) are the vocabulary
   those flags resolve into, and the clinician UI renders straight from them.

   Symptom/medication ids are a SEPARATE namespace from question ids (question
   ids are `section_concept`; sym/med ids are short tokens like `bloating`,
   `ppi`, `constip`) — so there's no collision, unlike v7 where question key
   `ppi` and med id `ppi` looked alike.
   ========================================================================== */

import { QUESTIONS, QID } from './schema.js';
import { toAnswerArray } from './scoring.js';

// ── Symptom groups (manual clinician input + auto-fill targets) ─────────────
export const SYM_GROUPS = [
  { label: 'Digestive', color: '#0F6E56', syms: [
    { id: 'bloating',    label: 'Bloating / gas after meals' },
    { id: 'ibs_pain',    label: 'IBS-type cramping/pain' },
    { id: 'constip',     label: 'Constipation dominant' },
    { id: 'diarrhoea',   label: 'Diarrhoea dominant' },
    { id: 'reflux',      label: 'Reflux / heartburn' },
    { id: 'nausea',      label: 'Nausea / early satiety' },
    { id: 'mucus_stool', label: 'Mucus in stool' },
    { id: 'undigested',  label: 'Undigested food in stool' },
    { id: 'post_infect', label: 'Symptoms began after gut infection' },
  ] },
  { label: 'Immune & Skin', color: '#A32D2D', syms: [
    { id: 'freq_infect', label: 'Frequent infections 3+/yr' },
    { id: 'food_sens',   label: 'Multiple food sensitivities' },
    { id: 'allergy',     label: 'Seasonal allergies / atopy' },
    { id: 'joint_pain',  label: 'Joint pain / stiffness' },
    { id: 'eczema',      label: 'Eczema / urticaria / psoriasis' },
    { id: 'acne_ros',    label: 'Acne / rosacea' },
    { id: 'flushing',    label: 'Flushing / hives after eating' },
    { id: 'wine_react',  label: 'Reaction to wine / fermented foods' },
  ] },
  { label: 'Brain-Gut & Mood', color: '#534AB7', syms: [
    { id: 'brainfog',   label: 'Brain fog / poor focus' },
    { id: 'anxiety',    label: 'Anxiety / restlessness' },
    { id: 'low_mood',   label: 'Low mood / depression' },
    // poor_sleep stays a recordable symptom but no longer feeds strain ranking
    // (validated sleep score is the canonical signal — see strains.js).
    { id: 'poor_sleep', label: 'Poor / non-restorative sleep' },
    { id: 'fatigue',    label: 'Fatigue not relieved by rest' },
    { id: 'headache',   label: 'Frequent headaches' },
  ] },
  { label: 'Metabolic', color: '#BA7517', syms: [
    { id: 'weight_gain',  label: 'Unexplained weight gain' },
    { id: 'sugar_crav',   label: 'Strong sugar / carb cravings' },
    { id: 'glucose_swing',label: 'Blood sugar fluctuations' },
    { id: 'thyroid_sym',  label: 'Thyroid symptoms (cold/fatigue/hair)' },
    { id: 'fatty_liver',  label: 'Fatty liver / elevated GGT/ALT' },
  ] },
  { label: 'Candida indicators', color: '#993C1D', syms: [
    { id: 'oral_thrush',  label: 'Oral thrush / white tongue' },
    { id: 'vaginal_yeast',label: 'Recurrent vaginal yeast' },
    { id: 'nail_fungal',  label: 'Brittle / discoloured nails' },
    { id: 'itching',      label: 'Rectal / skin itching' },
  ] },
];

// ── Condition / diagnosis flags ─────────────────────────────────────────────
export const CONDITIONS = [
  { id: 'ibd',        label: "IBD (Crohn's / UC)",             color: '#A32D2D', bg: '#FCEBEB', pats: ['AUTOIMMUNE', 'LEAKY'] },
  { id: 'coeliac',    label: 'Coeliac disease',                 color: '#A32D2D', bg: '#FCEBEB', pats: ['AUTOIMMUNE', 'LEAKY'] },
  { id: 'hashimotos', label: "Hashimoto's thyroiditis",         color: '#0F6E56', bg: '#E1F5EE', pats: ['THYROID', 'AUTOIMMUNE'] },
  { id: 'ra_lupus',   label: 'RA / Lupus / other AI',           color: '#A32D2D', bg: '#FCEBEB', pats: ['AUTOIMMUNE', 'LEAKY'] },
  { id: 'nafld',      label: 'NAFLD / fatty liver',             color: '#BA7517', bg: '#FAEEDA', pats: ['METABOLIC'] },
  { id: 't2dm_ir',    label: 'Type 2 DM / insulin resistance',  color: '#BA7517', bg: '#FAEEDA', pats: ['METABOLIC'] },
  { id: 'pcos',       label: 'PCOS',                            color: '#BA7517', bg: '#FAEEDA', pats: ['METABOLIC', 'THYROID'] },
  { id: 'fibromyalg', label: 'Fibromyalgia / chronic pain',     color: '#534AB7', bg: '#EEEDFE', pats: ['PSYCHO', 'LEAKY'] },
  { id: 'sibo_dx',    label: 'SIBO previously diagnosed',       color: '#BA7517', bg: '#FAEEDA', pats: ['SIBO'] },
  { id: 'candida_dx', label: 'Candida / fungal diagnosed',      color: '#993C1D', bg: '#FAECE7', pats: ['FUNGAL'] },
  { id: 'autism_adhd',label: 'Autism / ADHD (paediatric)',      color: '#534AB7', bg: '#EEEDFE', pats: ['PSYCHO', 'LEAKY'] },
  { id: 'eczema_dx',  label: 'Atopic eczema / asthma',          color: '#A32D2D', bg: '#FCEBEB', pats: ['AUTOIMMUNE', 'HISTAMINE'] },
  { id: 'pibs_dx',    label: 'Post-infectious IBS diagnosed',   color: '#185FA5', bg: '#E6F1FB', pats: ['POST_INF'] },
  { id: 'mcas_dx',    label: 'MCAS / histamine intolerance',    color: '#7A3B8A', bg: '#F5EEFF', pats: ['HISTAMINE'] },
];

// ── Medication / history flags — boost patterns + inform avoidances ─────────
export const MEDS = [
  { id: 'abx_recent',   label: 'Antibiotics past 12 months',         color: '#BA7517', pats: ['SIBO', 'FUNGAL'],
    note: 'Post-antibiotic: S. boulardii essential. Delay Lactobacillus-only probiotics 48h after antibiotic dose.' },
  { id: 'abx_multiple', label: '3+ antibiotic courses (5 yrs)',       color: '#A32D2D', pats: ['SIBO', 'LEAKY', 'FUNGAL'],
    note: 'Repeated courses: severe microbiome depletion likely. Consider GI-MAP. Higher dose/longer duration protocol needed.' },
  { id: 'ppi',          label: 'PPI / antacid (long-term)',          color: '#BA7517', pats: ['SIBO'],
    note: 'PPI use: achlorhydria promotes SIBO. If ongoing, SIBO breath test mandatory before probiotic protocol.' },
  { id: 'nsaids',       label: 'NSAIDs (regular)',                    color: '#185FA5', pats: ['LEAKY'],
    note: 'NSAIDs: primary cause of leaky gut. Prioritise barrier repair. Zinc carnosine + PGE2 pathway support.' },
  { id: 'steroids',     label: 'Steroids / immunosuppressants',      color: '#A32D2D', pats: ['FUNGAL', 'AUTOIMMUNE'],
    note: 'Steroids: Candida overgrowth risk elevated. Screen for fungal pattern. Avoid fermented foods acutely.' },
  { id: 'antidepress',  label: 'Antidepressants / SSRIs',            color: '#534AB7', pats: ['PSYCHO'],
    note: 'SSRIs: note serotonin pathway. ⚠ Do NOT co-prescribe 5-HTP (serotonin syndrome risk). Psychobiotic combination (L. helveticus R0052) may allow dose review at 6 months with prescribing doctor.' },
  { id: 'hpylori_tx',   label: 'H. pylori treatment (past)',         color: '#0F6E56', pats: ['SIBO', 'LEAKY'],
    note: 'Post-H. pylori eradication: microbiome significantly disrupted. L. reuteri DSM 17938 + S. boulardii are priority strains.' },
  { id: 'csection',     label: 'C-section birth (patient / child)',  color: '#185FA5', pats: ['LEAKY'],
    note: 'C-section birth: early microbiome seeding deficit. Higher risk of atopy, allergy, dysbiosis — document in HX.' },
  { id: 'food_poison',  label: "Past food poisoning / traveller's D", color: '#BA7517', pats: ['SIBO', 'LEAKY'],
    note: 'Post-infectious IBS is a recognised entity. SIBO very common sequela. Screen if ongoing symptoms 3+ months post-infection.' },
];

/* Derive clinician syms/meds (and which were auto-derived) from a questionnaire
   visit's raw answers + extras, by reading each question's schema clinicianFlag.
   Bowel direction comes from Bristol (more reliable than the generic "irregular
   bowel" item). Returns {syms:Set, meds:Set, fromIntake:Set}.                  */
export function deriveClinicianFlags(rawAnswers, extrasObj) {
  const syms = new Set(), meds = new Set(), fromIntake = new Set();
  if (Array.isArray(rawAnswers) || (rawAnswers && typeof rawAnswers === 'object')) {
    const a = toAnswerArray(rawAnswers);
    for (const q of QUESTIONS) {
      const flag = q.clinicianFlag;
      if (!flag) continue;
      const val = a[QID[q.id]];
      if (val != null && val >= flag.min) {
        (flag.syms || []).forEach(s => { syms.add(s); fromIntake.add(s); });
        (flag.meds || []).forEach(m => { meds.add(m); fromIntake.add(m); });
      }
    }
  }
  if (extrasObj && extrasObj.bristol != null) {
    if (extrasObj.bristol <= 2) { syms.add('constip'); fromIntake.add('constip'); }
    else if (extrasObj.bristol >= 6) { syms.add('diarrhoea'); fromIntake.add('diarrhoea'); }
  }
  return { syms, meds, fromIntake };
}
