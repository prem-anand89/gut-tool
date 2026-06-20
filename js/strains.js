/* ============================================================================
   strains.js — the probiotic strain database, and ONE ranking function used by
   BOTH the live clinician dashboard and the printed report.

   This is the fix for rebuild brief §8.1: v7 had two independent copies of the
   strain scorer and the report copy was missing seven rules, so a clinician
   could see one ranked list on screen and hand the patient a printed report
   recommending different top strains. There is now exactly one ranker — they
   cannot disagree.

   The ruleset here is the COMPLETE (superset) dashboard ruleset, with one
   deliberate change for the sleep reconciliation (brief §3): the clinician
   `poor_sleep` checkbox no longer feeds an independent strain bonus. Sleep
   influences ranking through the ONE canonical validated sleep score
   (extras.sleepScore) only; `poor_sleep` remains a recordable symptom.

   Strain content (names, CFU, timing, India brands, evidence tier, warnings)
   ported verbatim from v7.
   ========================================================================== */

export const STRAINS = {
  // ── TIER 1: First-line, widely India-available ──────────────────────
  SBO: { name: 'S. boulardii CNCM I-745', ev: 'High', cfu: '250–500mg (≈5B CFU) BD', timing: 'Anytime — with or without food. Safe with antibiotics.',
    indication: "Post-antibiotic restoration, C. diff prevention, Candida control, traveller's diarrhoea, IBS-D",
    india: "Econorm (Dr Reddy's) 250mg sachet/capsule · Sova Plug The Flow 5B CFU sachet · Sporlac Qik — Indian retail / pharmacy",
    patterns: ['FUNGAL', 'SIBO'],
    note: 'Yeast — unaffected by antibiotics. Do NOT refrigerate. Room-temperature stable.' },
  LGG: { name: 'L. rhamnosus GG (ATCC 53103)', ev: 'High', cfu: '3–20B CFU', timing: 'With or without food. 2 hrs apart from antibiotic dose.',
    indication: 'Antibiotic diarrhoea prevention, childhood diarrhoea, mucosal sIgA, eczema prevention in infants, IBS',
    india: 'Superflora GG capsule / sachet (Sundyota Numandis) — first standalone Indian LGG · Darolac (blend) · Sova Gut Set Go',
    patterns: ['LEAKY', 'THYROID', 'AUTOIMMUNE'],
    note: 'Superflora GG is the first standalone Indian LGG product. Shelf-stable, no refrigeration.' },
  LPL: { name: 'L. plantarum 299v', ev: 'High', cfu: '10B CFU', timing: '30 min before meals — fasted for best effect',
    indication: 'IBS bloating and gas (dominant complaint), abdominal discomfort, tight junction repair, portal LPS reduction',
    india: 'Darolac IBS (Aristo Pharma) 10B CFU capsule — ₹42/cap. Indian retail. Single-strain 299v.',
    patterns: ['LEAKY', 'SIBO', 'METABOLIC'],
    warn: 'Velgut is NOT a 299v product — it is a generic multi-strain blend. Darolac IBS is the correct India product.' },
  BCO: { name: 'B. coagulans MTCC 5856', ev: 'Moderate', cfu: '1–2B CFU', timing: 'With meals',
    indication: 'Spore-former — antibiotic-safe, IBS, post-SIBO eradication, dyspepsia, general gut restoration',
    india: 'Sporlac DS / Sporlac Plus (Sanzyme) · Vizylac (Torrent) · Bifilac — Indian retail widely available',
    patterns: ['SIBO', 'IMO'],
    note: 'Spore-former: can be taken AT SAME TIME as antibiotics. Heat-stable. "Lactic Acid Bacillus" on Indian pack = B. coagulans.' },
  BCL: { name: 'B. clausii (4-strain: OC, N/R, SIN, T)', ev: 'High', cfu: '2B spores per ampoule', timing: 'Twice daily. At SAME TIME as antibiotics.',
    indication: 'Antibiotic-associated diarrhoea, gut flora restoration, H. pylori treatment support, childhood AAD',
    india: 'Enterogermina (Sanofi India) — oral suspension ampoules, Indian retail. Most widely prescribed Indian probiotic.',
    patterns: ['SIBO'],
    note: "4-strain combination. Spore-former — fully antibiotic-resistant. UBL also makes Bacipro (B. clausii UBBC-07) — single-strain, different from Enterogermina's 4-strain." },
  // ── TIER 2: Evidence-strong, India-accessible ───────────────────────
  LRE: { name: 'L. reuteri DSM 17938', ev: 'High', cfu: '100M CFU (chewable) / 5 drops (infant)', timing: 'With food',
    indication: 'Infant colic, constipation, H. pylori adjunct, gut motility, cholesterol reduction, oxytocin pathway',
    india: 'BioGaia Protectis chewable tablet (import via iThrive / Amazon Global) · Pyloflush / Sonata LR / Pyloduce (Pylopass™ heat-killed — DSMZ 17648) — Indian pharmacy',
    patterns: ['SIBO', 'PSYCHO'],
    note: 'BioGaia Protectis = live DSM 17938 (infant colic, motility). Pyloflush/Pyloduce = DSMZ 17648 heat-killed (H. pylori adjunct only) — different mechanism, do not substitute. Room-temperature stable (chewable).' },
  BIN: { name: 'B. longum subsp. infantis 35624', ev: 'High', cfu: '1B CFU — exact dose', timing: 'Once daily with food',
    indication: 'IBS all subtypes (pain dominant), immune tolerance, TNF-α and IL-6 reduction, visceral hypersensitivity',
    india: 'Align (Procter & Gamble) — import via Amazon Global · Visbiome (IBD-grade, import specialist distributors)',
    patterns: ['LEAKY', 'AUTOIMMUNE'],
    warn: '1B CFU is the exact studied dose — do NOT substitute a higher-dose generic B. infantis product. Evidence is specifically for this dose and strain designation.' },
  LHE: { name: 'L. helveticus R0052 + B. longum R0175', ev: 'High', cfu: '3B CFU each', timing: 'Bedtime — overnight GABA and tryptophan production',
    indication: 'Chronic psychological stress, mild anxiety, gut-brain axis, cortisol reduction (RCT proven)',
    india: "Probio'Stick (Lallemand Health Solutions) — import via iHerb / Amazon Global. ₹2,100–3,000/30 sachets.",
    patterns: ['PSYCHO'],
    note: 'Dissolve in cool water — never hot. Do not substitute individual strains. Bedtime administration matches the cortisol and sleep evidence.' },
  BLG: { name: 'B. longum BB536', ev: 'High', cfu: '5–20B CFU', timing: 'Evening with food',
    indication: 'Allergic rhinitis, hay fever, pollen allergy, nasal congestion, atopic conditions, IgE reduction, immune regulation',
    india: 'BB536 Products (Morinaga Japan) — import via iHerb. Remune AL (Sundyota Numandis, Indian pharmacy) also contains BB536.',
    patterns: ['THYROID', 'AUTOIMMUNE'],
    note: 'Add to METABOLIC and AUTOIMMUNE — BB536 reduces pro-inflammatory cytokines and improves NK cell activity in atopic/RA conditions.' },
  // ── TIER 3: Condition-specific, some India access ───────────────────
  BCU: { name: 'B. clausii UBBC-07 (single strain)', ev: 'Moderate', cfu: 'Per label', timing: 'Twice daily',
    indication: "Antibiotic-associated diarrhoea, children's upper respiratory tract infections (URTI), immunomodulation",
    india: "Bacipro (Unique Biotech Ltd / Velbiom) — 1mg, bacipro.com. Single-strain — different from Enterogermina's 4-strain combination.",
    patterns: ['SIBO'] },
  NCF: { name: 'L. acidophilus NCFM®', ev: 'High', cfu: 'Per label', timing: 'With food',
    indication: 'Lactose intolerance, IBS, daily gut balance, Candida competitive exclusion',
    india: 'The Stack Daily Gut Balance (The Stack India) — NCFM + PHGG prebiotic. Indian online (D2C). First standalone Indian NCFM product.',
    patterns: ['LEAKY', 'FUNGAL'],
    note: 'First standalone Indian NCFM product (The Stack). Previously import-only.' },
  AKK: { name: 'Akkermansia muciniphila (pasteurised)', ev: 'Emerging', cfu: '100M AFU', timing: 'Before meals, fasted — 30 min before food',
    indication: 'Insulin resistance, metabolic syndrome, gut barrier integrity, NAFLD — cannot be obtained from any food source',
    india: 'Pendulum Akkermansia (Pendulum, USA) — import via Amazon.com or iHerb. ₹4,300–6,000/month.',
    patterns: ['METABOLIC'],
    warn: 'Indian "Akkermansia" generic blends (e.g. Nutrazen Forever Gut) are AVOID — Akkermansia is a strict anaerobe that cannot survive standard capsule manufacturing. Only pasteurised Pendulum product has clinical evidence. Live form not yet commercially approved.' },
  LGA: { name: 'L. gasseri SBT2055 / BNR17', ev: 'High', cfu: '10–20B CFU', timing: 'With food',
    indication: 'Visceral fat reduction, abdominal obesity, weight management support alongside diet and exercise',
    india: 'L. gasseri Products (Japanese brands via iHerb/Amazon Global). Import only. ₹2,100–3,400/30 caps.',
    patterns: ['METABOLIC'],
    note: 'Japanese strain. 12–24 weeks for measurable visceral fat effect. Import only.' },
  VSL: { name: 'VSL#3 — 8-strain (De Simone Formulation)', ev: 'High', cfu: '112B–450B CFU', timing: 'Cold drink or food. Never hot. Refrigerate strictly.',
    indication: 'Ulcerative colitis maintenance, pouchitis (post bowel surgery), paediatric UC',
    india: 'VSL#3 capsule/sachet (Cipla India) — Rx/Hospital prescription. ₹39–46/cap (₹390–460/10). Cold chain essential.',
    patterns: ['AUTOIMMUNE'],
    warn: 'Strict cold chain. Prescribe with gastroenterologist co-management for IBD. Original De Simone Formulation = Visbiome (import, higher dose 450B). Cipla VSL#3 capsule 112.5B per cap; sachet 450B per sachet.' },
};

// Accept a Set or array uniformly.
function has(coll, v) {
  if (!coll) return false;
  return typeof coll.has === 'function' ? coll.has(v) : coll.indexOf(v) >= 0;
}
const inSet = (id, list) => list.indexOf(id) >= 0;

/* ── THE single strain ranker ───────────────────────────────────────────────
   ctx = {
     patternIds : array/Set of fired pattern ids,
     bands      : {GI,IM,BG,ME,HX,SK}  (0–3),
     syms       : array/Set of clinician symptom ids,
     meds       : array/Set of medication ids,
     conds      : array/Set of condition ids,
     extras     : {pss4Score, sleepScore} | null
   }
   Returns ALL strains with a computed score, sorted desc. Callers slice/filter
   (dashboard shows all; report takes score>0, top 6).                         */
export function rankStrains(ctx) {
  const patterns = Array.from(ctx.patternIds || []); // accept Set or array
  const bands = ctx.bands || {};
  const syms = ctx.syms; const meds = ctx.meds; const conds = ctx.conds;
  const extras = ctx.extras;
  const b = (k) => bands[k] || 0;

  return Object.entries(STRAINS).map(([id, s]) => {
    let score = 0;

    // Pattern match boost (+3 per matched pattern)
    patterns.forEach(pid => { if (s.patterns.includes(pid)) score += 3; });

    // Section-severity boosts
    if (b('GI') >= 2 && inSet(id, ['LGG', 'LPL', 'BIN', 'BCO', 'BCL', 'NCF'])) score += b('GI');
    if (b('BG') >= 2 && inSet(id, ['LHE', 'LRE'])) score += b('BG');
    if (b('IM') >= 2 && inSet(id, ['LGG', 'BLG', 'BIN', 'VSL'])) score += b('IM');
    if (b('ME') >= 2 && inSet(id, ['AKK', 'LGA', 'LPL'])) score += b('ME');
    if (b('SK') >= 2 && inSet(id, ['LGG', 'LPL', 'SBO', 'NCF'])) score += b('SK');

    // Symptom-specific boosts
    if (has(syms, 'bloating') && inSet(id, ['LPL', 'BCO'])) score += 2;
    if (has(syms, 'diarrhoea') && inSet(id, ['SBO', 'BCL', 'BCO'])) score += 2;
    if (has(syms, 'constip') && inSet(id, ['BCO', 'LRE'])) score += 2;
    if (has(syms, 'reflux') && has(meds, 'ppi') && id === 'LRE') score += 2;
    if (has(syms, 'anxiety') && id === 'LHE') score += 2;
    if (has(syms, 'brainfog') && id === 'LHE') score += 2;
    // NOTE: clinician `poor_sleep` checkbox intentionally does NOT score here.
    // Sleep enters ranking only through the validated sleepScore below — one
    // canonical sleep signal (rebuild brief §3 reconciliation).

    // Validated stress/sleep (Modifiable Drivers) — the one canonical signal.
    if (extras) {
      if (extras.pss4Score != null && extras.pss4Score >= 10 && inSet(id, ['LHE', 'LRE'])) score += 2;
      if (extras.sleepScore != null && extras.sleepScore >= 7 && inSet(id, ['LHE', 'LRE'])) score += 2;
    }

    if (has(syms, 'weight_gain') && inSet(id, ['AKK', 'LGA'])) score += 2;
    if (has(syms, 'fatty_liver') && inSet(id, ['LPL', 'AKK'])) score += 2;
    if (has(syms, 'thyroid_sym') && id === 'BLG') score += 2;
    if (has(syms, 'eczema') && inSet(id, ['BLG', 'LGG'])) score += 2;
    if (has(syms, 'joint_pain') && inSet(id, ['BIN', 'BLG'])) score += 2;
    if ((has(meds, 'abx_recent') || has(meds, 'abx_multiple')) && inSet(id, ['SBO', 'BCO', 'BCL', 'LGG'])) score += 3;
    if (has(meds, 'hpylori_tx') && inSet(id, ['LRE', 'SBO'])) score += 3;

    // Pattern-level boosts/deprioritise
    if (inSet('POST_INF', patterns) && inSet(id, ['LGG', 'BIN', 'SBO'])) score += 2;
    if (inSet('HISTAMINE', patterns) && inSet(id, ['LGG', 'BIN', 'SBO'])) score += 2;
    if (inSet('HISTAMINE', patterns) && inSet(id, ['BCL', 'BCO'])) score -= 1; // not histamine-specific

    // Condition direct boosts
    if (has(conds, 'hashimotos') && inSet(id, ['BLG', 'LGG'])) score += 2;
    if (has(conds, 'pcos') && inSet(id, ['LPL', 'LGA'])) score += 2;
    if (has(conds, 'nafld') && inSet(id, ['LPL', 'AKK'])) score += 2;
    if (has(conds, 't2dm_ir') && inSet(id, ['AKK', 'LGA'])) score += 2;
    if (has(conds, 'ibd') && inSet(id, ['VSL', 'BIN', 'LGG'])) score += 2;

    return { id, ...s, score };
  }).sort((a, b2) => b2.score - a.score);
}
