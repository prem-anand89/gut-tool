/* ============================================================================
   patterns.js — ONE pattern set. Each entry carries both its detector and its
   clinician content (tests / avoid / strains / protocol). The patient screen
   reads `patientDesc`; the clinician dashboard and the printed report read the
   rest — all from this single array, so they can never disagree (v7 kept two
   parallel PATTERNS arrays; this collapses them).

   Detectors are PURE: detect(secScores, answers, extras) → boolean, addressing
   questions through QID — never a hardcoded position.

   Clinical content ported in substance from v7, with the rebuild brief §8.3
   corrections applied inline and marked  [§8.3]:
     - LEAKY tests: lead with fecal zonulin (tissue-specific); serum demoted
       with its cross-reactivity caveat, matching labs.js.
     - THYROID avoid: iodine caution retargeted to excess/supplemental iodine,
       with an explicit pregnancy/lactation exception (needs rise, not fall).
     - PSYCHO protocol: 5-HTP + SSRI/SNRI serotonin-syndrome contraindication
       added (mirrors the Berberine+metformin flag already under METABOLIC).
     - Evidence-tier hedges added to the more speculative items (5-HTP as MMC
       prokinetic, NAC biofilm, Atrantil for IMO).

   Audience (brief §8.4): this content is for physician co-management / review
   before anything reaches a patient. Rx items are retained and labelled Rx.
   ========================================================================== */

import { QID } from './schema.js';
import { toAnswerArray } from './scoring.js';

export const PATTERNS = [
  { id: 'SIBO', label: 'SIBO pattern', emoji: '💨', color: '#BA7517', bg: '#FAEEDA', border: '#EF9F27',
    patientDesc: 'Your bloating pattern and history suggest possible small intestine bacterial overgrowth.',
    desc: 'Bloating 1–2 hrs post-meal, antibiotic/PPI history, and GI-dominant score — hydrogen/mixed SIBO suggested.',
    detect: (sc, q) => sc.GI >= 15 && q[QID.gi_bloating] >= 2 && (q[QID.hx_abx_5yr] >= 1 || q[QID.hx_food_poison] >= 1),
    tests: ['Hydrogen breath test — glucose substrate · AIG Hospitals or Cygnus Gastro Hyderabad', 'Lactulose H2+CH4 breath test (if CH4/IMO suspected)', 'B12 + folate (SIBO competes for B12)', 'H. pylori stool antigen (rule out concurrent H. pylori)'],
    avoid: 'Avoid Lactobacillus-only probiotics during active SIBO eradication phase. Introduce spore-formers (BCO, BCL) post-eradication. Reduce fermentable carbohydrates (low-FODMAP) during treatment.',
    strains: ['BCO', 'BCL', 'SBO', 'LRE'],
    protocol: 'Pharmaceutical: Rifaximin 550mg TID × 14 days (first-line H2-SIBO, Rx). Herbal alternative (no Rifaximin access): Berberine 500mg TID + Oregano oil 200mg TID × 4 weeks. Restore phase: B. coagulans MTCC 5856 (BCO) + S. boulardii. Prokinetics post-treatment: 5-HTP 50mg PM [§8.3 emerging evidence as MMC prokinetic — contraindicated with SSRI/SNRI, see PSYCHO] or ginger extract. Retest breath 4 wks after eradication.' },

  { id: 'IMO', label: 'Methane-SIBO / IMO', emoji: '🔄', color: '#3B6D11', bg: '#EAF3DE', border: '#639922',
    patientDesc: 'Constipation with bloating suggests methanogen overgrowth in the intestine.',
    desc: 'Constipation-dominant pattern — methanogen overgrowth (Methanobrevibacter smithii).',
    detect: (sc, q) => q[QID.gi_irregular_bowel] >= 2 && sc.GI >= 12 && q[QID.gi_bloating] >= 2,
    tests: ['H2+CH4 breath test — confirm CH4 channel · AIG Hospitals Hyderabad (confirm CH4 available before booking)', 'Fecal calprotectin to rule out structural cause'],
    avoid: 'Rifaximin alone is inadequate for IMO — methanogens require a different antibiotic target. Standard H2-SIBO herbal protocols are also less effective without the Allicin + Atrantil combination.',
    strains: ['BCO'],
    protocol: 'PHARMACEUTICAL (CH4 confirmed): Rifaximin 550mg TID + Neomycin 500mg BD × 14 days (combination required — Neomycin targets Methanobrevibacter). Rx — requires gastroenterology co-management. HERBAL ALTERNATIVE: Allicin (garlic extract) 450mg TID + Atrantil (peppermint + quebracho) 2 caps TID × 4 wks [§8.3 emerging evidence for IMO]. CONSTIPATION SUPPORT: Magnesium citrate 400–600mg nocte as osmotic agent. Prokinetics essential post-eradication: 5-HTP 50mg PM [§8.3 emerging; contraindicated with SSRI/SNRI]. B. coagulans (BCO) restore phase.' },

  { id: 'LEAKY', label: 'Leaky gut / high permeability', emoji: '🔓', color: '#185FA5', bg: '#E6F1FB', border: '#378ADD',
    patientDesc: 'Immune reactivity combined with gut symptoms suggests elevated intestinal permeability.',
    desc: 'Immune + GI combination with food reactivity — elevated intestinal permeability likely.',
    detect: (sc, q) => sc.IM >= 10 && sc.GI >= 10 && q[QID.im_food_sens] >= 2,
    // [§8.3] fecal zonulin first (tissue-specific); serum demoted with caveat, matching labs.js.
    tests: ['Fecal zonulin (preferred — tissue-specific) · iThrive → Diagnostic Solutions USA (send-out)', 'Serum zonulin only if fecal unavailable — cross-reacts with complement, less specific · Neuberg Hyderabad', 'Fecal calprotectin · Metropolis / Vijaya', 'Anti-gliadin IgG/IgA (DGP) · Metropolis (₹2,000–4,000)', 'hsCRP (proxy for endotoxaemia) · Vijaya Diagnostics'],
    avoid: 'Repair barrier FIRST before high-dose probiotic loading (4 weeks). No aggressive fermented food challenge acutely. Identify and remove root cause (NSAIDs, gluten, stress) before starting protocol.',
    strains: ['LPL', 'BIN', 'LGG', 'NCF'],
    protocol: 'Sequence matters: WEEK 1–4: L-Glutamine 5g BD + Zinc carnosine 75mg BD + Tributyrin 600mg BD (barrier repair). WEEK 5+: Introduce L. plantarum 299v as anchor probiotic. WEEK 8+: Add B. infantis 35624 if visceral pain present. Allow 8–12 wks minimum before assessing response.' },

  { id: 'FUNGAL', label: 'Candida / fungal pattern', emoji: '🔬', color: '#993C1D', bg: '#FAECE7', border: '#D85A30',
    patientDesc: 'Sugar cravings plus skin/mucous membrane symptoms suggest possible Candida overgrowth.',
    desc: 'Sugar cravings + mucous membrane symptoms — Candida overgrowth suspected.',
    detect: (sc, q) => q[QID.hx_ppi] >= 2 && (q[QID.sk_oral_thrush] >= 1 || q[QID.sk_vaginal_yeast] >= 1 || q[QID.sk_nails] >= 1),
    tests: ['Urine OAT (D-arabinitol) — send to USA via iThrive · ₹12,000–20,000 (Tier 4 escalation)', 'Stool R/E + culture — look for Candida species', 'Treat empirically based on clinical pattern at Tier 2–3'],
    avoid: 'Anti-Candida diet: no refined sugar, no yeast-containing foods (bread, beer, vinegar), no fermented dairy, limit fruit to 1–2 low-sugar servings/day. Avoid standard Lactobacillus probiotics during antifungal phase — reintroduce after 4–6 weeks. Avoid L. casei and L. bulgaricus (histamine-producing species).',
    strains: ['SBO', 'NCF', 'LGG'],
    protocol: 'ANTIFUNGAL PHASE (4 wks): S. boulardii CNCM I-745 5B CFU BD + Caprylic acid 1–2g with meals + Oregano oil 200mg (carvacrol standardised) + NAC 600mg BD [§8.3 biofilm-disruption rationale is emerging, not established]. RESTORE PHASE (wks 5+): L. acidophilus NCFM® + L. rhamnosus GG for competitive exclusion recolonisation. Rotate antifungal herbs every 4 weeks.' },

  { id: 'PSYCHO', label: 'Psychobiotic priority', emoji: '🧠', color: '#534AB7', bg: '#EEEDFE', border: '#7F77DD',
    patientDesc: 'Your brain-gut axis is the dominant domain — mood, anxiety, or sleep are the lead symptoms.',
    desc: 'Brain-gut axis dominant — mood/anxiety/sleep scores exceed GI burden.',
    // Dominant-domain branch keeps its scaled threshold; the validated PSS-4 /
    // sleep branch uses a lower BG floor so a clearly elevated validated score
    // isn't blocked by the dominant-domain gate (replaces the old single sleep item).
    detect: (sc, q, ex) =>
      (sc.BG >= 8 && sc.BG > sc.GI * 0.7) ||
      (sc.BG >= 4 && ((ex && ex.pss4Score != null && ex.pss4Score >= 10) || (ex && ex.sleepScore != null && ex.sleepScore >= 7))),
    tests: ['Morning serum cortisol (8–9am fasting) · Vijaya Diagnostics', 'Salivary cortisol (CAR) · Neuberg Diagnostics if serum abnormal', 'CBC + B12 + folate to rule out haematological mood drivers'],
    avoid: 'No specific probiotic avoidances — add psychobiotics alongside standard protocol. Never replace prescribed psychiatric medications.',
    strains: ['LHE', 'LRE'],
    // [§8.3] 5-HTP + SSRI/SNRI serotonin-syndrome contraindication added.
    protocol: "L. helveticus R0052 + B. longum R0175 (Probio'Stick) 1 sachet bedtime in cool water. 4–6 weeks minimum before judging response. Magnesium glycinate 300–400mg PM. Ashwagandha KSM-66 300mg BD if cortisol dysregulation confirmed. 5-HTP 50–100mg PM as serotonin pathway support — ⚠ CONTRAINDICATED with SSRIs/SNRIs (serotonin syndrome risk); do not co-prescribe without prescribing doctor's review. Vagal nerve adjuncts: humming 5 min/day, diaphragmatic breathing, cold water face immersion — evidence-based, free, recommend to patient." },

  { id: 'THYROID', label: 'Gut-thyroid axis', emoji: '⚡', color: '#0F6E56', bg: '#E1F5EE', border: '#5DCAA5',
    patientDesc: 'Thyroid symptoms with immune and metabolic involvement suggest a gut-thyroid axis pattern.',
    desc: "Thyroid symptoms + immune + metabolic elevation — Hashimoto's / gut-thyroid axis dysfunction.",
    detect: (sc, q) => q[QID.me_thyroid_sym] >= 1 && sc.IM >= 8 && sc.ME >= 6,
    tests: ['TSH + free T3 + free T4 + anti-TPO + anti-TG · Vijaya Diagnostics (₹650–1,800)', 'Anti-gliadin IgG/IgA (DGP) + tTG IgA · Metropolis (₹3,500–5,000 combined)', 'hsCRP · Vijaya'],
    // [§8.3] iodine caution retargeted to excess/supplemental, pregnancy/lactation exception added.
    avoid: 'Gluten-free trial strongly indicated regardless of coeliac status — 3-month minimum. Dairy elimination also recommended. IODINE: avoid EXCESS / SUPPLEMENTAL iodine (high-dose supplements, kelp/seaweed) in active Hashimoto\'s — iodine excess can drive TPO antibody production. This does NOT mean avoiding iodised table salt at normal dietary levels (India\'s iodisation programme prevents deficiency goitre). EXCEPTION: iodine requirements RISE in pregnancy and lactation — do not restrict; manage with the treating physician.',
    strains: ['BLG', 'LGG'],
    protocol: "FIRST INTERVENTION: Gluten-free + dairy-free 3-month trial before adding supplements. Myo-inositol 2g BD (reduces anti-TPO antibodies — multiple RCTs, strongest nutraceutical for Hashimoto's). Selenium 100–200µg/day. B. longum BB536 + L. rhamnosus GG. Vitamin D3 target 60–80 ng/mL. Recheck anti-TPO at 6 months." },

  { id: 'METABOLIC', label: 'Metabolic dysbiosis', emoji: '📈', color: '#BA7517', bg: '#FAEEDA', border: '#EF9F27',
    patientDesc: 'Weight and metabolic markers suggest a gut-driven insulin resistance pattern.',
    desc: 'Weight gain + metabolic pattern — Akkermansia depletion + insulin resistance likely.',
    detect: (sc, q) => sc.ME >= 12 && q[QID.me_sugar_crav] >= 2 && q[QID.me_cholesterol] >= 1,
    tests: ['Fasting insulin + fasting glucose → calculate HOMA-IR · Vijaya / Sprint Diagnostics Hyderabad', 'HbA1c + lipid profile · Vijaya (₹600–1,200)', 'Liver panel (GGT, ALT, AST) · Vijaya'],
    avoid: 'Avoid high-fructose diet and ultra-processed carbohydrates. Avoid generic Indian "Akkermansia" blends — Akkermansia cannot survive standard capsule manufacturing; only pasteurised Pendulum product has evidence. DRUG INTERACTION: Berberine + metformin = additive hypoglycaemic effect — reduce Berberine dose or monitor glucose closely in T2DM patients on metformin.',
    strains: ['AKK', 'LGA', 'LPL'],
    protocol: 'Akkermansia muciniphila pasteurised (Pendulum) 100M AFU — fasted, 30 min before food. Berberine 500mg TID with meals (caution: metformin interaction). L. gasseri SBT2055 10–20B CFU for visceral fat reduction (12–24 weeks for effect). Polyphenol prebiotics for Akkermansia substrate: Pomegranate extract + Cranberry + Green tea catechins daily. Target HOMA-IR <1.5 as outcome marker.' },

  { id: 'AUTOIMMUNE', label: 'Autoimmune gut link', emoji: '🛡️', color: '#A32D2D', bg: '#FCEBEB', border: '#E24B4A',
    patientDesc: 'Your autoimmune history combined with immune burden suggests gut permeability may be a factor.',
    desc: 'Autoimmune diagnosis + high immune burden — gut permeability driving immune activation.',
    detect: (sc, q) => q[QID.im_autoimmune] >= 1 && sc.IM >= 14,
    tests: ['Fecal calprotectin · Metropolis / Vijaya (₹2,500–5,500)', 'tTG IgA + anti-gliadin DGP · Metropolis (₹3,500–5,000)', 'ANA by IFA · Vijaya / Metropolis', 'hsCRP · Vijaya'],
    avoid: 'Gluten-free and nightshade elimination for 8-week structured trial, then reintroduce one at a time. Dairy elimination strongly recommended. Vitamin D3 target 60–80 ng/mL is especially critical — standard lab range is insufficient for autoimmune management.',
    strains: ['BIN', 'LGG', 'BLG', 'VSL'],
    protocol: 'B. infantis 35624 1B CFU/day. L. rhamnosus GG 10–20B CFU. B. longum BB536 (cytokine modulation, NK cell support). VSL#3 if IBD-level inflammation confirmed (Rx). Curcumin 500mg BD + Omega-3 2–3g/day. Vitamin D3 target 60–80 ng/mL. 6-month minimum commitment — recheck autoimmune markers at 6 months.' },

  { id: 'POST_INF', label: 'Post-infectious IBS (PI-IBS)', emoji: '🦠', color: '#185FA5', bg: '#E6F1FB', border: '#378ADD',
    patientDesc: 'Your gut symptoms appear to have begun or worsened significantly after a past gut infection — post-infectious IBS is a distinct pattern your clinician should assess.',
    desc: 'Ongoing gut symptoms 3+ months after acute gastroenteritis, food poisoning, or traveller\'s diarrhoea — post-infectious IBS is a distinct clinical entity, not residual infection.',
    detect: (sc, q) => q[QID.hx_post_infect] >= 2 || (q[QID.hx_food_poison] >= 2 && (sc.GI >= 8 || q[QID.gi_abd_pain] >= 2)),
    tests: ['Fecal calprotectin · Metropolis / Vijaya — rule out ongoing inflammation vs functional PI-IBS', 'H. pylori stool antigen — rule out concurrent H. pylori', 'Stool R/E + culture — rule out unresolved infection or parasites', 'hsCRP — if elevated, inflammatory component still active'],
    avoid: 'Do not treat as active infection — antibiotics inappropriate if cultures are negative. Avoid aggressive probiotic loading before ruling out ongoing mucosal inflammation (calprotectin first).',
    strains: ['LGG', 'BIN', 'SBO'],
    protocol: 'MECHANISM: Mast cell activation, visceral hypersensitivity, and gut motility disruption persist after pathogen clearance. PROTOCOL: L. rhamnosus GG 10B CFU BD + B. infantis 35624 1B CFU/day — specifically effective in PI-IBS visceral pain. S. boulardii for ongoing bowel irregularity. Low-FODMAP diet for 6–8 weeks if diarrhoea-dominant. Peppermint oil enteric-coated 187mg TID for spasm and visceral pain (India-available). Re-assess calprotectin at 8 weeks.' },

  { id: 'HISTAMINE', label: 'Histamine intolerance / MCAS', emoji: '🌡️', color: '#7A3B8A', bg: '#F5EEFF', border: '#B57DD4',
    patientDesc: 'Your reactions to fermented foods or wine, combined with allergy and skin symptoms, suggest possible histamine intolerance or mast cell sensitivity.',
    desc: 'Flushing, hives, headache after fermented foods or wine, itching post-eating, nasal congestion — histamine burden exceeds DAO enzyme capacity, often secondary to dysbiosis.',
    detect: (sc, q) => q[QID.im_histamine] >= 2 && (q[QID.im_allergies] >= 2 || q[QID.im_skin_issues] >= 2),
    tests: ['Urine OAT (D-arabinitol + indican markers) · iThrive send-abroad — secondary investigation if clinical picture strong', 'Fecal calprotectin — rule out IBD as mast cell driver', 'Serum tryptase if MCAS suspected (specialist)'],
    avoid: 'CRITICAL STRAIN AVOIDANCE: Avoid L. casei, L. bulgaricus, L. delbrueckii — these are histamine-producing species that will worsen symptoms. Avoid fermented foods (kimchi, kefir, aged cheese, cured meats, wine, vinegar) during treatment phase. High-oxalate foods may also drive MCAS in susceptible patients.',
    strains: ['LGG', 'BIN', 'SBO'],
    protocol: 'LOW-HISTAMINE PROBIOTICS: L. rhamnosus GG + B. infantis 35624 — both are histamine-neutral or histamine-degrading strains. S. boulardii for gut barrier repair. HISTAMINE DEGRADATION SUPPORT: DAO enzyme supplement (porcine-derived, with meals — India import via iHerb). MAST CELL STABILISERS: Quercetin 500mg BD + Vitamin C 1–2g/day (natural antihistamine and mast cell stabilisation). Ligilactobacillus salivarius LS01 (import) — specifically produces histamine deaminase (histamine-degrading enzyme, rare among probiotics). Low-histamine diet 4–8 weeks with systematic reintroduction.' },
];

const PATTERN_BY_ID = Object.freeze(
  PATTERNS.reduce((m, p) => { m[p.id] = p; return m; }, {})
);
export function patternById(id) { return PATTERN_BY_ID[id]; }

/* Detect fired patterns. `answers` may be a positional array or an id-map;
   `extras` carries the derived {pss4Score, sleepScore, bristol, ...}. Returns
   fired pattern objects in canonical order. */
export function detectPatterns(secScores, answers, extras = {}) {
  const q = toAnswerArray(answers);
  return PATTERNS.filter(p => {
    try { return p.detect(secScores, q, extras); }
    catch { return false; }
  });
}
