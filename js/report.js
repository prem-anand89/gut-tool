/* ============================================================================
   report.js — export-only print/PDF report, generated from a canonical visit
   snapshot (same record the dashboard uses). The patient-facing report stays
   plain-language and omits Rx specifics; the strain table comes from the ONE
   shared ranker, so it can never disagree with the on-screen list (brief §8.1).
   ========================================================================== */

import { SECTIONS, sectionMax } from './schema.js';
import { severityOf, indexPct } from './scoring.js';
import { patternById } from './patterns.js';
import { rankStrains } from './strains.js';
import { deriveClinicianFlags } from './clinician-derive.js';
import { pss4Band, sleepBand, painBand } from './scales.js';
import { esc, fmtDate } from './util.js';

export function printReport(visit, patient) {
  const total = visit.total || 0;
  const sv = severityOf(total);
  const secScores = visit.secScores || SECTIONS.reduce((o, s) => { o[s.id] = 0; return o; }, {});
  const patterns = (visit.patterns || []).map(patternById).filter(Boolean);

  // Use the visit's clinician flags if present (saved from the dashboard);
  // otherwise derive them from intake exactly as the dashboard does, so the
  // report's ranker inputs match the on-screen list (keeps brief §8.1 closed).
  let syms = visit.syms, meds = visit.meds;
  if ((!syms || !meds) && visit.answers) {
    const d = deriveClinicianFlags(visit.answers, visit.extras);
    syms = syms || [...d.syms]; meds = meds || [...d.meds];
  }
  const ranked = rankStrains({
    patternIds: visit.patterns || [],
    bands: visit.bands || SECTIONS.reduce((o, s) => { o[s.id] = 0; return o; }, {}),
    syms: syms || [], meds: meds || [], conds: visit.conds || [],
    extras: visit.extras || null,
  }).filter(s => s.score > 0).slice(0, 6);

  const name = (patient && patient.name) || 'Patient';
  const now = fmtDate(Date.now());

  const domainRows = SECTIONS.map(s => {
    const sc = secScores[s.id] ?? 0; const max = sectionMax(s.id); const p = Math.round(sc / max * 100);
    return `<div style="display:grid;grid-template-columns:150px 1fr 60px;gap:8px;align-items:center;padding:3px 0;font-size:9pt">
      <span>${esc(s.full)}</span>
      <span style="height:12px;background:#f0efea;border-radius:4px;overflow:hidden;display:block"><span style="display:block;height:100%;width:${p}%;background:${s.color}"></span></span>
      <span style="text-align:right">${sc}/${max}</span></div>`;
  }).join('');

  // Patient-facing report → plain-language patientDesc (not clinician `desc`).
  const patternCards = patterns.length ? patterns.map(p => `
    <div class="rcard">
      <h4 style="color:${p.color};font-size:9.5pt;margin-bottom:3px">${p.emoji} ${esc(p.label)}</h4>
      <div style="font-size:8.5pt;color:#333;line-height:1.5">${esc(p.patientDesc)}</div>
      <div style="font-size:8pt;color:#185FA5;margin-top:4px"><b>Suggested tests:</b> ${p.tests.map(esc).join(' · ')}</div>
    </div>`).join('') : '<div style="font-size:9pt;color:#777">No specific patterns flagged at this visit.</div>';

  // Modifiable drivers (stress / sleep / pain / stool) from the visit's extras.
  const ex = visit.extras || {};
  const ps = pss4Band(ex.pss4Score ?? null);
  const sl = sleepBand(ex.sleepScore ?? null);
  const pn = painBand(ex.nrsPain ?? null);
  const driverDefs = [
    ['🧠 Stress (PSS-4)', ps ? ps.l : '—', ps ? ps.c : '#999'],
    ['😴 Sleep (Sleep-4)', sl ? sl.l : '—', sl ? sl.c : '#999'],
    ['⚡ Pain (NRS)', pn ? pn.l : '—', pn ? pn.c : '#999'],
    ['🫙 Bristol stool', ex.bristol != null ? ('Type ' + ex.bristol) : '—', '#15140f'],
  ];
  const driverCards = driverDefs.map(([label, val, color]) => `
    <div style="flex:1;min-width:110px;border:1px solid #e0ddd6;border-radius:6px;padding:8px 10px;text-align:center">
      <div style="font-size:11pt;font-weight:700;color:${color}">${esc(val)}</div>
      <div style="font-size:7.5pt;color:#777;margin-top:2px">${esc(label)}</div>
    </div>`).join('');

  const strainRows = ranked.length ? ranked.map((s, i) => `
    <tr><td>${i + 1}</td><td><b>${esc(s.name)}</b><br><span style="color:#666">${esc(s.indication)}</span></td>
    <td>${esc(s.cfu)}</td><td>${esc(s.india)}</td></tr>`).join('') : '';

  document.getElementById('report').innerHTML = `
    <div class="rh">
      <div class="rbrand">Beyond Mechanics<small>Gut Health Suite</small></div>
      <div class="rmeta"><b>${esc(name)}</b><br>${now}<br>Code: ${esc(visit.code || '')}</div>
    </div>
    <div class="rhero">
      <div><div class="big" style="color:${sv.color}">${indexPct(total)}%</div>
      <div style="font-size:8pt;color:#666">Dysbiosis Index · raw ${total}/120</div></div>
      <div style="flex:1"><span class="pill ${sv.cls}" style="font-size:11pt">${esc(sv.label)}</span>
      <div style="font-size:9pt;color:#3a3a37;margin-top:6px;line-height:1.5">${esc(sv.desc)}</div></div>
    </div>
    <h2>Domain breakdown</h2>${domainRows}
    <h2>Modifiable drivers</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${driverCards}</div>
    <h2>Patterns to review with your clinician</h2>${patternCards}
    ${strainRows ? `<h2>Strain shortlist</h2><table><tr><th>#</th><th>Strain &amp; indication</th><th>Dose</th><th>India availability</th></tr>${strainRows}</table>` : ''}
    <div class="rfoot">
      Educational screening tool — not a diagnosis. The Dysbiosis Index <i>suggests</i> patterns of gut imbalance; it is not a lab-grade measurement.
      Strain, dosing and testing details are for review by a qualified clinician before use. Prescription-only medicines require a prescribing doctor.
    </div>`;

  document.body.classList.add('printing');
  const cleanup = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 60);
}
