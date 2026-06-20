/* ============================================================================
   labs.js — India lab guide (LAB_TESTS). Ported verbatim from v7.

   This is the authoritative test guide; pattern test-lists in patterns.js are
   written to agree with it (brief §8.2 — serum zonulin already noted here as
   cross-reacting / fecal-preferred, and LEAKY's list now leads with fecal).

   Preserved deliberately (brief §8.6): the "Removed — not available in India"
   category with sensible proxies (LPS/LBP → hsCRP), and GI-MAP gated as a
   ₹30–46k escalation-tier test rather than a first-line ask.

   avail codes: yes=widely available · maj=major cities · spec=specialist lab ·
   send=send abroad · no=not available. priority: first/routine/immune/escalate/removed.
   `always:true` = order regardless of pattern.
   ========================================================================== */

export const LAB_TESTS = [
  { category: 'Stool tests', priority: 'first', color: '#534AB7', bg: '#EEEDFE', tests: [
    { name: 'Fecal calprotectin', desc: 'IBD vs IBS differentiation · intestinal inflammation', opt: '<50 µg/g', avail: 'yes', where: 'Metropolis / SRL / Vijaya / Apollo. Home collection.', cost: '₹2,500–5,500', patterns: ['LEAKY', 'AUTOIMMUNE'], always: true },
    { name: 'H. pylori stool antigen', desc: 'Active H. pylori · more accurate than serology post-treatment', opt: 'Negative', avail: 'yes', where: 'All major chains. Preferred over H. pylori IgG blood test.', cost: '₹600–1,500', patterns: ['SIBO'], always: false },
    { name: 'Stool R/E + culture + sensitivity', desc: 'Pathogen screen · parasites · O&P', opt: 'No pathogens', avail: 'yes', where: 'All chains.', cost: '₹400–1,500', patterns: ['SIBO', 'FUNGAL'], always: false },
    { name: 'Fecal sIgA', desc: 'Mucosal immune competence', opt: 'Lab range', avail: 'spec', where: 'SRL reference labs · Neuberg Diagnostics. Call ahead to confirm.', cost: '₹2,500–4,500', patterns: ['LEAKY', 'THYROID'], always: false },
    { name: 'Fecal zonulin', desc: 'Intestinal permeability — more tissue-specific than serum', opt: 'Lab range', avail: 'send', where: 'iThrive Healing & Beyond → Diagnostic Solutions USA (FedEx, Hyderabad pickup). Also available as standalone (₹14,299).', cost: '₹6,000–15,000', patterns: ['LEAKY', 'AUTOIMMUNE'], always: false },
    { name: 'GI-MAP (full qPCR panel)', desc: 'Comprehensive microbiome + pathogens + sIgA + zonulin + Akkermansia. Gold standard.', opt: 'No pathogens', avail: 'send', where: 'iThrive Healing & Beyond (+91 89565 35768). FedEx pickup Hyderabad. Allow 2–3 weeks.', cost: '₹30,000–46,000', patterns: ['SIBO', 'FUNGAL', 'LEAKY', 'AUTOIMMUNE', 'METABOLIC'], always: false },
    { name: 'Pancreatic elastase (fecal)', desc: 'Exocrine pancreatic insufficiency — underdiagnosed dysbiosis driver', opt: '>200 µg/g', avail: 'maj', where: 'Metropolis reference labs · Neuberg. Call to confirm.', cost: '₹3,500–6,000', patterns: ['SIBO'], always: false },
  ] },
  { category: 'Blood — baseline (always order)', priority: 'routine', color: '#0F6E56', bg: '#E1F5EE', tests: [
    { name: 'hsCRP', desc: 'Low-grade systemic inflammation · metabolic endotoxaemia proxy', opt: '<1 mg/L', avail: 'yes', where: 'Vijaya Diagnostics Hyderabad. All chains.', cost: '₹300–600', patterns: [], always: true },
    { name: 'CBC with differential', desc: 'Anaemia, eosinophilia, lymphopenia — dysbiosis downstream effects', opt: 'Normal differential', avail: 'yes', where: 'All chains. Thyrocare ₹100–150.', cost: '₹150–400', patterns: [], always: true },
    { name: 'Fasting insulin + glucose → HOMA-IR', desc: 'Metabolic dysbiosis · insulin resistance', opt: 'Insulin <10 µIU/mL · HOMA-IR <1.5', avail: 'yes', where: 'Vijaya / Sprint Diagnostics Hyderabad / Dr Lal. HOMA-IR calculated from the two values.', cost: '₹600–1,200', patterns: ['METABOLIC'], always: false },
    { name: 'HbA1c + lipid profile', desc: 'Metabolic context · gut-liver axis', opt: 'HbA1c <5.4% · LDL/TG patterns', avail: 'yes', where: 'All chains.', cost: '₹500–1,000', patterns: ['METABOLIC'], always: false },
    { name: 'Vitamin D (25-OH)', desc: 'Immune-gut axis · dysbiosis reduces D3 conversion', opt: '60–80 ng/mL', avail: 'yes', where: 'Thyrocare ₹250–400. Vijaya / Dr Lal.', cost: '₹300–700', patterns: [], always: true },
    { name: 'B12 + folate', desc: 'SIBO competes for B12 · malabsorption marker', opt: 'B12 >500 pg/mL', avail: 'yes', where: 'All chains.', cost: '₹500–1,000', patterns: ['SIBO'], always: false },
    { name: 'Ferritin + iron studies', desc: 'Gut absorption marker · leaky gut inflammatory iron loss', opt: 'Ferritin >50 µg/L', avail: 'yes', where: 'All chains.', cost: '₹500–1,200', patterns: [], always: true },
    { name: 'Magnesium + zinc', desc: 'Tight junction integrity · frequent malabsorption markers', opt: 'Both mid-normal', avail: 'yes', where: 'Metropolis / SRL / Vijaya.', cost: '₹600–1,500', patterns: ['LEAKY'], always: false },
    { name: 'Liver panel (ALT · AST · GGT · ALP)', desc: 'Gut-liver axis · NAFLD · GGT correlates with dysbiosis', opt: 'GGT <30 · ALT <30 U/L', avail: 'yes', where: 'All chains. Order "LFT."', cost: '₹400–800', patterns: ['METABOLIC'], always: false },
  ] },
  { category: 'Blood — immune & autoimmune', priority: 'immune', color: '#A32D2D', bg: '#FCEBEB', tests: [
    { name: 'Anti-gliadin IgG + IgA (DGP)', desc: 'NCGS / coeliac screen · zonulin trigger · leaky gut driver', opt: 'Negative', avail: 'yes', where: 'Metropolis (DGP IgG ₹1,975). Order alongside tTG IgA.', cost: '₹2,000–4,000', patterns: ['LEAKY', 'THYROID', 'AUTOIMMUNE'], always: false },
    { name: 'tTG IgA + total serum IgA', desc: 'Coeliac screen · always pair with total IgA to detect IgA deficiency', opt: 'tTG IgA negative', avail: 'yes', where: 'Metropolis (₹1,650). Vijaya / Dr Lal.', cost: '₹1,500–3,000', patterns: ['AUTOIMMUNE', 'LEAKY'], always: false },
    { name: 'Serum zonulin', desc: 'Intestinal permeability proxy (cross-reacts with complement — fecal preferred)', opt: '<20 ng/mL', avail: 'spec', where: 'Neuberg Diagnostics Hyderabad (call to confirm). SRL reference labs.', cost: '₹3,000–6,000', patterns: ['LEAKY', 'AUTOIMMUNE'], always: false },
    { name: 'Full thyroid panel (TSH + fT3 + fT4 + anti-TPO + anti-TG)', desc: "Gut-thyroid axis · Hashimoto's autoimmunity", opt: 'TSH 0.5–2.0 mIU/L · anti-TPO <35', avail: 'yes', where: 'Vijaya Diagnostics Hyderabad ₹650–1,800. Thyrocare. Dr Lal.', cost: '₹650–2,000', patterns: ['THYROID', 'AUTOIMMUNE'], always: false },
    { name: 'ANA by IFA (antinuclear antibody)', desc: 'Autoimmune screening — if elevated, triggers specific antibody panel', opt: 'Negative or low titre', avail: 'yes', where: 'Vijaya / Metropolis / SRL. Order IFA method, not ELISA screen.', cost: '₹700–1,500', patterns: ['AUTOIMMUNE'], always: false },
    { name: 'Morning serum cortisol (8–9am)', desc: 'HPA axis stress response — gut dysregulation marker', opt: 'Normal morning range', avail: 'yes', where: 'Vijaya / all chains. Collect 8–9am fasting.', cost: '₹500–1,000', patterns: ['PSYCHO'], always: false },
  ] },
  { category: 'Breath & functional', priority: 'escalate', color: '#185FA5', bg: '#E6F1FB', tests: [
    { name: 'SIBO hydrogen breath test — glucose', desc: 'Proximal SIBO detection · fewer false positives than lactulose', opt: 'H2 rise <12 ppm in 2 hrs', avail: 'maj', where: 'AIG Hospitals Hyderabad · Cygnus Gastro Hyderabad · Manipal Hospitals. Metropolis (H2 only).', cost: '₹1,500–4,000', patterns: ['SIBO'], always: false },
    { name: 'H2+CH4 breath test — lactulose', desc: 'Full SIBO + IMO · confirm CH4 channel before booking', opt: 'H2 <20 ppm · CH4 <10 ppm', avail: 'maj', where: 'AIG Hospitals Hyderabad (confirm CH4 available) · major GI centres.', cost: '₹2,000–5,000', patterns: ['SIBO', 'IMO'], always: false },
    { name: 'Salivary cortisol (CAR — 4 point)', desc: 'HPA axis dysregulation · psychobiotic protocol decision', opt: 'Normal awakening curve', avail: 'spec', where: 'Neuberg Diagnostics. Only if serum cortisol abnormal or psychobiotic pattern confirmed.', cost: '₹3,000–6,000', patterns: ['PSYCHO'], always: false },
    { name: 'Urine OAT — full functional (Mosaic/iThrive)', desc: 'D-arabinitol (Candida) · indican · neurotransmitter metabolites · oxalates', opt: 'Low organics', avail: 'send', where: 'iThrive Healing & Beyond or functional medicine practitioner account. FedEx to USA. Allow 3–4 wks.', cost: '₹12,000–20,000', patterns: ['FUNGAL', 'PSYCHO'], always: false },
  ] },
  { category: 'Removed — not available in India', priority: 'removed', color: '#707070', bg: '#F5F3EE', tests: [
    { name: 'LPS / LBP (serum endotoxin)', desc: 'Not available at any Indian clinical lab. Use hsCRP >1 mg/L as proxy for metabolic endotoxaemia.', opt: 'Removed', avail: 'no', where: 'Use hsCRP as clinical proxy.', cost: '—', patterns: [], always: false, removed: true },
    { name: 'H2S breath test', desc: 'Not available in India. Suspect clinically: diarrhoea-dominant + negative H2/CH4 + strong SIBO picture.', opt: 'Removed', avail: 'no', where: 'Manage empirically.', cost: '—', patterns: [], always: false, removed: true },
    { name: 'Fecal SCFAs standalone', desc: 'Only accessible within GI-MAP or CDSA send-out. Not available as standalone test in India.', opt: 'Removed', avail: 'no', where: 'Included in GI-MAP send-out only.', cost: '—', patterns: [], always: false, removed: true },
  ] },
];

export const AVAIL_LABELS = {
  yes:  { cls: 'av-yes',  label: 'Widely available' },
  maj:  { cls: 'av-maj',  label: 'Major cities' },
  spec: { cls: 'av-spec', label: 'Specialist lab' },
  send: { cls: 'av-send', label: 'Send abroad' },
  no:   { cls: 'av-no',   label: 'Not available' },
};

// Labs relevant to a set of fired patterns (always-order tests + pattern matches),
// excluding the "removed" reference category. Used by dashboard + report alike.
export function relevantLabs(patternIds) {
  const fired = Array.from(patternIds || []);
  const out = [];
  for (const cat of LAB_TESTS) {
    if (cat.priority === 'removed') continue;
    const tests = cat.tests.filter(t => t.always || t.patterns.some(p => fired.includes(p)));
    if (tests.length) out.push({ ...cat, tests });
  }
  return out;
}
