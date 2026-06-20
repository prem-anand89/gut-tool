/* ============================================================================
   storage.js — localStorage persistence, export, MERGE-import, and migration.

   Storage decision (rebuild brief §1, resolved with the user): local-only with
   first-class JSON export/import. Because you and a colleague work from
   different places, import is a MERGE (by patient id + visit id), not a replace
   — so importing a colleague's file ADDS their visits instead of wiping yours.
   This makes manual export/import a real sync path between two devices.

   Every saved record carries schemaVersion. Migration handles TWO generations
   (brief §6):
     - 42-question (pre-v7): drop the two retired single-item questions —
       BG idx 21 "poor sleep" and HX idx 34 "high chronic stress" — leaving 40
       that line up with the current schema order. (Your existing backup is
       this generation.)
     - 40-question (v7/current): positions already match QUESTIONS order.
   Raw answers + extras are kept as ground truth; everything derived
   (secScores, bands, code, patterns, severity) is RECOMPUTED cleanly.
   ========================================================================== */

import { SCHEMA_VERSION, QTOTAL } from './schema.js';
import { computeScores, buildCode, severityOf } from './scoring.js';
import { detectPatterns } from './patterns.js';
import { pss4Score as calcPss4, sleepScore as calcSleep } from './scales.js';

const KEY = 'beyondmechanicsgutdb';

// Indices removed when collapsing the 42-question generation down to 40.
// Descending so splicing the first doesn't shift the second.
const LEGACY_REMOVE_42 = [34, 21];

export function blankDB() {
  return { patients: [], meta: { schemaVersion: SCHEMA_VERSION, remindEvery: 5, visitsSinceExport: 0 } };
}

// ── load / save ─────────────────────────────────────────────────────────────
export function loadDB() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (!raw) return blankDB();
  let db;
  try { db = JSON.parse(raw); } catch { return blankDB(); }
  return migrateDB(db);
}

export function saveDB(db) {
  db.meta = db.meta || {};
  db.meta.schemaVersion = SCHEMA_VERSION;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {
    console.warn('[BM storage] save failed', e);
  }
  return db;
}

// ── id helper ───────────────────────────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── MIGRATION ──────────────────────────────────────────────────────────────
   Normalise a raw answers array to the current 40-question schema order. */
export function migrateAnswers(answers) {
  if (!Array.isArray(answers)) return new Array(QTOTAL).fill(0);
  let a = answers.slice();
  if (a.length === 42) {
    for (const idx of LEGACY_REMOVE_42) a.splice(idx, 1); // → 40
  }
  // Pad/truncate defensively to exactly QTOTAL.
  if (a.length < QTOTAL) a = a.concat(new Array(QTOTAL - a.length).fill(0));
  if (a.length > QTOTAL) a = a.slice(0, QTOTAL);
  return a.map(v => (v == null ? 0 : v));
}

// Recompute every derived field for a visit from its raw answers + extras.
export function recomputeVisit(visit) {
  const origLen = Array.isArray(visit.answers) ? visit.answers.length : null;
  const answers = migrateAnswers(visit.answers);
  const extras = visit.extras || {};
  const pss4Score = extras.pss4Score != null ? extras.pss4Score : calcPss4(extras.pss4);
  const sleepScore = extras.sleepScore != null ? extras.sleepScore : calcSleep(extras.sleep);

  const { secScores, bands, total } = computeScores(answers);
  const detectExtras = {
    bristol: extras.bristol ?? null, pss4Score, sleepScore,
    nrsPain: extras.nrsPain ?? null, painRegion: extras.painRegion ?? null,
  };
  const fired = detectPatterns(secScores, answers, detectExtras);
  const patternIds = fired.map(p => p.id);

  return {
    ...visit,
    answers,
    extras: { ...extras, pss4Score, sleepScore },
    secScores, bands, total,
    severity: severityOf(total).label,
    patterns: patternIds,
    code: buildCode(secScores, total, patternIds),
    schemaVersion: SCHEMA_VERSION,
    _migratedFrom: origLen && origLen !== QTOTAL ? `${origLen}q` : (visit._migratedFrom || `${QTOTAL}q`),
  };
}

// Migrate a whole DB. Idempotent: re-running on current-gen data is a no-op
// in substance (it just recomputes derived fields, which are stable).
export function migrateDB(db) {
  if (!db || !Array.isArray(db.patients)) return blankDB();
  const alreadyCurrent = db.meta && db.meta.schemaVersion === SCHEMA_VERSION;
  const patients = db.patients.map(p => ({
    ...p,
    visits: (p.visits || []).map(v => {
      // Skip recompute only if visit is already stamped current AND looks intact.
      if (alreadyCurrent && v.schemaVersion === SCHEMA_VERSION &&
          Array.isArray(v.answers) && v.answers.length === QTOTAL) return v;
      return recomputeVisit(v);
    }),
  }));
  return { patients, meta: { ...blankDB().meta, ...(db.meta || {}), schemaVersion: SCHEMA_VERSION } };
}

/* ── EXPORT ──────────────────────────────────────────────────────────────────
   Stamped with schemaVersion + timestamp + device label so a colleague's file
   is self-describing on import. */
export function exportDB(db, deviceLabel) {
  const payload = {
    ...db,
    meta: {
      ...(db.meta || {}),
      schemaVersion: SCHEMA_VERSION,
      exportedFrom: deviceLabel || 'unknown-device',
      date: Date.now(),
    },
  };
  return JSON.stringify(payload, null, 2);
}

/* ── MERGE-IMPORT ────────────────────────────────────────────────────────────
   Merge an imported DB into the current one. Patients matched by id; within a
   patient, visits matched by visit id (deduped). Imported data is migrated
   first. Returns {db, added:{patients,visits}, updated}.                       */
export function mergeImport(currentDb, importedRaw) {
  let imported;
  if (typeof importedRaw === 'string') {
    imported = JSON.parse(importedRaw); // may throw — caller handles
  } else {
    imported = importedRaw;
  }
  imported = migrateDB(imported);
  const cur = migrateDB(currentDb);

  const byId = new Map(cur.patients.map(p => [p.id, p]));
  let addedPatients = 0, addedVisits = 0, updated = 0;

  for (const ip of imported.patients) {
    let target = byId.get(ip.id);
    if (!target) {
      target = { ...ip, visits: [] };
      cur.patients.push(target);
      byId.set(ip.id, target);
      addedPatients++;
    } else {
      // Fill in blanks on existing patient meta without clobbering edits.
      ['name', 'ref', 'dob', 'sex'].forEach(k => { if (!target[k] && ip[k]) { target[k] = ip[k]; updated++; } });
    }
    const haveVisit = new Set((target.visits || []).map(v => v.id));
    for (const iv of (ip.visits || [])) {
      const vid = iv.id || uid();
      if (haveVisit.has(vid)) continue;
      target.visits = target.visits || [];
      target.visits.push({ ...iv, id: vid });
      haveVisit.add(vid);
      addedVisits++;
    }
    // Keep each patient's visits in chronological order.
    (target.visits || []).sort((a, b) => (a.date || 0) - (b.date || 0));
  }

  return { db: cur, added: { patients: addedPatients, visits: addedVisits }, updated };
}
