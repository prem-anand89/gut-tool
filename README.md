# Beyond Mechanics — Gut Health Suite (rebuild)

A clean, single-source rebuild of the BM Gut Suite. One unified tool — patient
questionnaire, clinician dashboard, and patient database — working on phone,
tablet, and laptop. Educational / personal use only, **not a diagnosis** and not
for commercial use.

## Architecture — one source of truth

Every v7 bug traced to duplicated truth (two question lists, a bridging map, two
strain rankers, a self-contradicting lab list). This rebuild makes that
impossible: one schema generates every surface, and all derived data is computed
by shared pure functions called from everywhere.

| File | Role |
|------|------|
| `js/schema.js` | **The single source of truth** — 40 keyed questions (`section_concept` ids, append-only), per-question scale + `clinicianFlag`. Section maxes and the flat index are *computed*, never hand-declared. |
| `js/scales.js` | 0–3 answer vocabularies + the validated instruments (PSS-4, sleep-4, Bristol, NRS pain). |
| `js/scoring.js` | Dysbiosis Index, bands, severity, code string — pure functions. |
| `js/patterns.js` | One pattern set: ID-based detectors **and** clinician content (tests/avoid/strains/protocol). |
| `js/strains.js` | Strain DB + **one** ranking function (closes the §8.1 dashboard/report drift). |
| `js/labs.js` | India lab guide. |
| `js/clinician-derive.js` | Clinician taxonomy + schema-driven intake→clinician auto-fill. |
| `js/storage.js` | localStorage, stamped export, **merge-import**, 42→40 migration. |
| `js/ui-*.js`, `js/report.js`, `js/app.js` | Surfaces + controller. |

### Clinical corrections folded in (rebuild brief §8)
- **§8.1** single strain ranker → dashboard and printed report can't disagree.
- **§8.2/§8.3** LEAKY leads with fecal zonulin (serum demoted with its caveat).
- **§8.3** iodine caution retargeted to *excess/supplemental* + pregnancy/lactation exception; 5-HTP + SSRI serotonin-syndrome contraindication; evidence-tier hedges on speculative items.
- **§8.4** clinician view gated as physician-co-management decision support.
- PSS-4 reverse-scored items render correctly; sleep reconciled to one canonical signal.

## Storage & sync
Local-only by design. **Export** writes a stamped JSON backup; **Import merges**
(by patient + visit id) so a colleague's file *adds* visits instead of
overwriting yours — the manual sync path between two devices. Old backups
(42-question generation) migrate automatically (the two retired single-item
sleep/stress questions are dropped; all derived values recomputed).

## Run / deploy
- **Netlify (recommended):** publish the repo root. No build step — native ES
  modules. Config in `netlify.toml`.
- **Local dev:** serve over http (`npx serve` or `python3 -m http.server`) and
  open `index.html`. (ES modules need a server, not `file://`.)
- **Offline single file:** `node build.mjs` → `dist/BM_Gut_Suite.html`, a
  self-contained file that runs from a double-click, no server.
