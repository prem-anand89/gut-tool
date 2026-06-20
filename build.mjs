/* ============================================================================
   build.mjs — OPTIONAL offline bundler. Produces dist/BM_Gut_Suite.html: a
   single self-contained file (all JS + CSS inlined) that runs from a
   double-clicked file:// path, where native ES modules are CORS-blocked.

   The Netlify deployment does NOT need this — it serves /js + /css as modules
   directly. This is purely the "download one file and it works offline" option.

   Implements a tiny lazy module registry so the existing ES modules don't need
   to change. Handles the export/import forms actually used in this project:
   `export const`, `export function`, named imports (with `as`), and `import *`.
   Run:  node build.mjs
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const JS_DIR = 'js';
const CSS = readFileSync('css/app.css', 'utf8');
const ENTRY = 'app.js';

function transform(name, src) {
  const exported = [];
  let out = src;

  // import { a, b as c } from './x.js'  ->  const { a, b: c } = __req('x.js')
  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*['"]\.\/([\w.-]+)['"]\s*;?/g, (_, names, file) => {
    const mapped = names.split(',').map(s => s.trim()).filter(Boolean)
      .map(n => { const m = n.match(/^(\w+)\s+as\s+(\w+)$/); return m ? `${m[1]}: ${m[2]}` : n; }).join(', ');
    return `const { ${mapped} } = __req('${file}');`;
  });
  // import * as NS from './x.js'  ->  const NS = __req('x.js')
  out = out.replace(/import\s*\*\s*as\s*(\w+)\s*from\s*['"]\.\/([\w.-]+)['"]\s*;?/g,
    (_, ns, file) => `const ${ns} = __req('${file}');`);

  // export const NAME / export function NAME  -> strip 'export ', record NAME
  // ([\w$]+) so identifiers like $ and $$ (util.js) are matched too.
  out = out.replace(/export\s+const\s+([\w$]+)/g, (_, n) => { exported.push(n); return `const ${n}`; });
  out = out.replace(/export\s+function\s+([\w$]+)/g, (_, n) => { exported.push(n); return `function ${n}`; });
  // export { a, b }  (not used, but handle defensively)
  out = out.replace(/export\s*\{([^}]*)\}\s*;?/g, (_, names) => {
    names.split(',').map(s => s.trim()).filter(Boolean).forEach(n => exported.push(n.replace(/\s+as\s+\w+/, '')));
    return '';
  });

  const assigns = exported.map(n => `__e.${n} = ${n};`).join(' ');
  return `__modules['${name}'] = function(__e){\n${out}\n${assigns}\nreturn __e;\n};`;
}

const files = readdirSync(JS_DIR).filter(f => f.endsWith('.js'));
const modules = files.map(f => transform(f, readFileSync(join(JS_DIR, f), 'utf8'))).join('\n\n');

const runtime = `
const __modules = {}; const __cache = {};
function __req(name){ if(__cache[name]) return __cache[name]; const e = __cache[name] = {}; __modules[name](e); return e; }
`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Beyond Mechanics · Gut Health Suite (offline)</title>
<style>${CSS}</style>
</head>
<body>
<header class="app-bar">
  <div class="app-logo"><span class="dot"></span>Beyond Mechanics <span class="app-sub">Gut Suite</span></div>
  <div class="app-spacer"></div>
  <div class="mode-switch" id="modeSwitch">
    <button class="mode-btn" data-mode="patient">Patient</button>
    <button class="mode-btn" data-mode="clinician">Clinician</button>
    <button class="mode-btn active" data-mode="database">Patients</button>
  </div>
  <div class="app-chip empty" id="activeChip" style="display:none"><span class="nm" id="activeName"></span><button class="x" id="activeClear">✕</button></div>
</header>
<main>
  <section class="mode" id="mode-patient"></section>
  <section class="mode" id="mode-clinician"></section>
  <section class="mode show" id="mode-database"></section>
</main>
<div id="report"></div>
<div class="toast" id="toast"></div>
<div class="ov" id="overlay"><div class="dlg" id="dlg"></div></div>
<script>
${runtime}
${modules}
__req('${ENTRY}'); // boot
</script>
</body>
</html>`;

mkdirSync('dist', { recursive: true });
writeFileSync('dist/BM_Gut_Suite.html', html);
console.log(`Wrote dist/BM_Gut_Suite.html (${(html.length / 1024).toFixed(0)} KB) from ${files.length} modules.`);
