/* ============================================================================
   app.js — controller. Owns the DB + active patient, switches modes, and gives
   each UI surface a shared context (ctx). Save / export / merge-import flows and
   the clinician handoff live here. Entry point loaded by index.html.
   ========================================================================== */

import { loadDB, saveDB, exportDB as serializeDB, mergeImport, recomputeVisit, uid } from './storage.js';
import { SCHEMA_VERSION } from './schema.js';
import { severityOf } from './scoring.js';
import { $, $$, el, esc, toast, fmtDate, dialogForm, dialogConfirm } from './util.js';
import * as Patient from './ui-patient.js';
import * as Clinician from './ui-clinician.js';
import * as Database from './ui-database.js';
import { printReport } from './report.js';

const App = {
  db: loadDB(),
  mode: 'database',
  activeId: null,
};

// ── shared context handed to every UI module ───────────────────────────────
const ctx = {
  get db() { return App.db; },
  uid,
  persist() { saveDB(App.db); },
  setMode,
  activePatient: () => App.db.patients.find(p => p.id === App.activeId) || null,
  setActive(id) { App.activeId = id; updateChip(); },
  saveVisit,
  openClinicianWithVisit,
  newQuestionnaire,
  editVisit,
  printReport: (visit) => printReport(visit, ctx.activePatient()),
  exportDB,
  exportPatient,
  importDB,
  refresh,
};

// Start a fresh questionnaire (optionally scoped to a specific patient).
function newQuestionnaire(patientId) {
  if (patientId != null) App.activeId = patientId;
  Patient.reset();
  setMode('patient');
  updateChip();
}

// Load a saved visit's answers into the questionnaire for review / editing.
function editVisit(visit, patientId) {
  if (patientId != null) App.activeId = patientId;
  Patient.loadVisit(visit);
  setMode('patient');
  updateChip();
}

function setMode(name) {
  App.mode = name;
  $$('.mode').forEach(m => m.classList.remove('show'));
  $('#mode-' + name).classList.add('show');
  $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === name));
  refresh();
  window.scrollTo(0, 0);
}

function refresh() {
  if (App.mode === 'patient') Patient.render();
  else if (App.mode === 'clinician') Clinician.render();
  else Database.render();
}

function updateChip() {
  const chip = $('#activeChip'); const p = ctx.activePatient();
  if (p) { chip.style.display = 'flex'; $('#activeName').textContent = p.name || 'Patient'; }
  else chip.style.display = 'none';
}

// ── Save a visit snapshot to a patient record ──────────────────────────────
async function saveVisit(snapshot) {
  // Normalise: questionnaire-sourced visits recompute cleanly; manual clinician
  // visits (no answers) keep their entered bands.
  // Preserve the snapshot's id (set when editing an existing visit) so the save
  // updates in place; only mint a new id for genuinely new visits.
  let visit = snapshot.answers
    ? recomputeVisit(snapshot)
    : { ...snapshot, id: snapshot.id || uid(), schemaVersion: SCHEMA_VERSION, severity: severityOf(snapshot.total || 0).label };
  if (!visit.id) visit.id = uid();

  let patient = ctx.activePatient();
  let askedViaForm = false;
  if (!patient) {
    const r = await dialogForm('Save visit — which patient?', [
      { key: 'name', label: 'Patient name (new or existing)', placeholder: 'Name' },
      { key: 'ref', label: 'Reference / ID', placeholder: 'optional' },
    ], { okLabel: 'Save visit' });
    if (!r || !r.name) return;
    askedViaForm = true;
    patient = App.db.patients.find(p => (p.name || '').toLowerCase() === r.name.toLowerCase());
    if (!patient) {
      patient = { id: uid(), name: r.name, ref: r.ref || '', dob: '', sex: '', notes: '', created: Date.now(), visits: [] };
      App.db.patients.push(patient);
    }
    App.activeId = patient.id;
  }

  patient.visits = patient.visits || [];
  const existingIdx = patient.visits.findIndex(v => v.id === visit.id);
  const isUpdate = existingIdx >= 0;

  // Confirm for an already-active patient (the picker form is its own confirm).
  // Phrased so an in-place update is never a silent surprise.
  if (!askedViaForm) {
    const msg = isUpdate
      ? `Update this existing visit for ${patient.name}? (Overwrites the saved answers and results for this session.)`
      : `Save this visit to ${patient.name}?`;
    if (!(await dialogConfirm(msg, { title: isUpdate ? 'Update visit' : 'Save visit', okLabel: isUpdate ? 'Update' : 'Save' }))) return;
  }

  if (isUpdate) patient.visits[existingIdx] = visit;
  else patient.visits.push(visit);
  patient.visits.sort((a, b) => (a.date || 0) - (b.date || 0));
  if (!isUpdate) App.db.meta.visitsSinceExport = (App.db.meta.visitsSinceExport || 0) + 1;
  ctx.persist();
  updateChip();
  toast(isUpdate ? `Visit updated for ${patient.name}` : `Visit saved to ${patient.name}`);
  Database.showList();
  setMode('database');
  maybeRemindExport();
}

function openClinicianWithVisit(visit, patientId) {
  if (patientId != null) App.activeId = patientId;
  // Load state BEFORE switching in, so the first render shows the visit.
  Clinician.loadVisit(visit);
  setMode('clinician');
  updateChip();
}

// ── Export (stamped) ────────────────────────────────────────────────────────
async function exportDB() {
  let label = App.db.meta.deviceLabel;
  if (!label) {
    const r = await dialogForm('Name this device', [{ key: 'label', label: 'Device label (e.g. "Prem-laptop")', placeholder: 'device' }], { okLabel: 'Export' });
    if (!r) return;
    label = r.label || 'device';
    App.db.meta.deviceLabel = label; ctx.persist();
  }
  const json = serializeDB(App.db, label);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `beyondmechanicsgutdb_${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  App.db.meta.visitsSinceExport = 0; ctx.persist();
  toast('Backup exported');
}

// ── Export a single patient (importable — merges back as one patient) ────────
function exportPatient(patient) {
  if (!patient) return;
  const label = App.db.meta.deviceLabel || 'device';
  // Serialize a one-patient DB so the file imports/merges cleanly elsewhere.
  const oneDb = { ...App.db, patients: [patient] };
  const json = serializeDB(oneDb, label);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const safe = (patient.name || 'patient').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const a = el('a', { href: url, download: `bmgut_${safe}_${new Date().toISOString().slice(0, 10)}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast(`Exported ${patient.name || 'patient'}`);
}

// ── Import (MERGE) ──────────────────────────────────────────────────────────
function importDB() {
  const input = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  input.onchange = () => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let result;
      try { result = mergeImport(App.db, reader.result); }
      catch (e) { toast('Import failed — not a valid backup file'); return; }
      const ok = await dialogConfirm(
        `Merge this backup?\n\n+ ${result.added.patients} new patient(s)\n+ ${result.added.visits} new visit(s)\n\nExisting visits are kept; nothing is overwritten.`,
        { title: 'Import / merge', okLabel: 'Merge' });
      if (!ok) return;
      App.db = result.db; ctx.persist(); updateChip(); refresh();
      toast(`Merged: +${result.added.patients} patients, +${result.added.visits} visits`);
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input); input.click(); input.remove();
}

function maybeRemindExport() {
  const every = App.db.meta.remindEvery || 5;
  if ((App.db.meta.visitsSinceExport || 0) >= every) {
    toast(`${App.db.meta.visitsSinceExport} visits since last backup — consider Export.`);
  }
}

// ── boot ────────────────────────────────────────────────────────────────────
function boot() {
  Patient.init(ctx); Clinician.init(ctx); Database.init(ctx);
  $('#modeSwitch').addEventListener('click', e => { const b = e.target.closest('.mode-btn'); if (b) setMode(b.dataset.mode); });
  $('#activeClear').addEventListener('click', () => { App.activeId = null; updateChip(); if (App.mode === 'database') refresh(); });
  ctx.persist(); // persist any migration that happened on load
  setMode('database');
}
boot();
