#!/usr/bin/env node
// v1.2: 2026-09-02 added .mjs to the whitelist (user projects exist with .mjs scripts that need registration); v1.1: fix — re-read version comment on drift refresh (commented version column only updated after the comment was added) + [version] stat follows refresh + version regex compatible with v2/v2.3 (no-decimal shapes)
// check-scripts-manifest.js — project script manifest validator (jixu step-5 / script update check)
// Usage: node check-scripts-manifest.js <absolute project root path> [--init]
//   No scripts-manifest.md and no --init → only report "no manifest; /jixu will auto-generate it"
//   No scripts-manifest.md with --init → scan project scripts, generate the manifest (records current disk state)
//   With a manifest → validate: missing/drift/unregistered, output three report categories (no auto-deletion; missing entries await user confirmation)
// Manifest format (scripts-manifest.md, auto-maintained by jixu, only records, never touches scripts):
//   # scripts-manifest.md — project script manifest (auto-maintained by jixu; do not hand-edit)
//   | relative path | version comment | registered mtime (UTC) | registered at (UTC) |
//   | a.py | v1.2: fixed X | 2026-09-02T15:20:00Z | 2026-09-02T15:20:01Z |
'use strict';
const fs = require('fs');
const path = require('path');

const MANIFEST_NAME = 'scripts-manifest.md';
const SCRIPT_EXTS = ['.py', '.js', '.sh', '.bat', '.mjs'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'venv', 'env', '__pycache__', '.venv', 'dist', 'build', 'target'];
const MAX_DEPTH = 3;

// —— argument parsing ——
const args = process.argv.slice(2);
const init = args.includes('--init');
const root = args.find(a => !a.startsWith('--'));
if (!root || !fs.existsSync(root)) {
  console.log('Usage: node check-scripts-manifest.js <project root> [--init]');
  process.exit(1);
}

// —— utilities ——
const rel = p => path.relative(root, p).replace(/\\/g, '/');
function mtimeIso(p) {
  try { return new Date(fs.statSync(p).mtimeMs).toISOString().replace(/\.\d{3}Z$/, 'Z'); } catch (e) { return null; }
}
function readVersion(p) {
  // find a version comment within the first 10 lines of a script header: v1.2.3 / version:xxx
  try {
    const head = fs.readFileSync(p, 'utf8').split('\n').slice(0, 10).join('\n');
    const m = head.match(/(?:^|\s)(v\d+\.?\d*|v?\d+\.\d+(?:\.\d+)?)(?:[:(\s])/) || head.match(/(?:^|\s)version[:]\s*(\S+)/);
    return m ? m[0].trim() : '(no version comment)';
  } catch (e) { return '(read failed)'; }
}
// scan project scripts (exclude dependency/backup dirs, depth ≤3)
function scanScripts() {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(e.name)) walk(fp, depth + 1);
      } else if (SCRIPT_EXTS.includes(path.extname(e.name).toLowerCase())) {
        out.push(fp);
      }
    }
  };
  walk(root, 0);
  return out;
}
// parse the manifest
function parseManifest(mf) {
  const rows = [];
  try {
    for (const line of fs.readFileSync(mf, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t.startsWith('|') || t.indexOf('|') === t.lastIndexOf('|')) continue;
      const cells = t.split('|').map(c => c.trim()).filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
      // only 4-column rows (first header row skipped)
      if (cells.length === 4 && cells[0] !== 'relative path' && cells[0] !== '---') {
        rows.push({ rel: cells[0], version: cells[1], mtime: cells[2], loggedAt: cells[3] });
      }
    }
  } catch (e) {}
  return rows;
}

const manifestPath = path.join(root, MANIFEST_NAME);
const hasManifest = fs.existsSync(manifestPath);

if (!hasManifest) {
  const scripts = scanScripts();
  if (init) {
    const lines = ['# scripts-manifest.md — project script manifest (auto-maintained by jixu)', '# Format: | relative path | version comment | registered mtime (UTC) | registered at (UTC) |', '| relative path | version comment | registered mtime (UTC) | registered at (UTC) |'];
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    for (const s of scripts) {
      lines.push(`| ${rel(s)} | ${readVersion(s)} | ${mtimeIso(s)} | ${now} |`);
    }
    fs.writeFileSync(manifestPath, lines.join('\n') + '\n', 'utf8');
    console.log(`[init] manifest generated: ${manifestPath} (${scripts.length} scripts)`);
  } else {
    console.log(`[warn] no manifest ${MANIFEST_NAME}; the first /jixu will --init to generate it`);
  }
  process.exit(0);
}

// —— validation pass ——
const rows = parseManifest(manifestPath);
const disk = new Set(scanScripts().map(rel));
const report = { missing: [], drifted: [], unregistered: [] };
const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
let changed = false;

for (const r of rows) {
  const abs = path.join(root, r.rel);
  if (!fs.existsSync(abs)) { report.missing.push(r.rel); continue; }
  const realMtime = mtimeIso(abs);
  if (realMtime !== r.mtime) report.drifted.push({ rel: r.rel, expect: r.mtime, actual: realMtime });
}
for (const p of disk) {
  if (!rows.some(r => r.rel === p)) report.unregistered.push(p);
}

// auto-refresh drifted entries' registered mtime (the manifest only records disk state, safe; missing entries are not deleted, await user confirmation)
if (report.drifted.length) {
  const lines = fs.readFileSync(manifestPath, 'utf8').split('\n');
  const updated = lines.map(l => {
    const t = l.trim();
    if (!t.startsWith('|') || t.indexOf('|') === t.lastIndexOf('|')) return l;
    // same-source parse as parseManifest: 4 cells after trimming leading/trailing empty cells
    const cells = t.split('|').map(c => c.trim()).filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
    if (cells.length !== 4 || cells[0] === 'relative path') return l;
    const cellRel = cells[0];
    const d = report.drifted.find(x => x.rel === cellRel);
    if (d) {
      changed = true;
      // re-read the version comment on refresh (it is also part of the disk state; otherwise a newly-added comment never updates the version column)
      return `| ${cellRel} | ${readVersion(path.join(root, cellRel))} | ${d.actual} | ${now} |`;
    }
    return l;
  });
  fs.writeFileSync(manifestPath, updated.join('\n'), 'utf8');
}

console.log('=== Script Manifest Validation Report ===');
console.log(`Manifest: ${rel(manifestPath)} | registered ${rows.length} entries | ${disk.size} scripts on disk`);
console.log(`[drift] drifted (auto-refreshed to the current disk state): ${report.drifted.length} entries`);
for (const d of report.drifted) console.log(`  · ${d.rel} (registered=${d.expect} → disk=${d.actual})`);
console.log(`[missing] registered but missing on disk: ${report.missing.length} entries (awaiting user confirmation, entries kept)`);
for (const m of report.missing) console.log(`  · ${m}`);
console.log(`[unregistered] on disk but not registered: ${report.unregistered.length} entries`);
for (const u of report.unregistered) console.log(`  · ${u}`);
const finalRows = changed ? parseManifest(manifestPath) : rows;
const noVer = finalRows.filter(r => r.version === '(no version comment)').length;
console.log(`[version] no version comment in header: ${noVer}/${rows.length} entries (recommend adding a # vX.Y comment to core scripts to prevent old scripts running new requirements)`);
console.log(changed ? '[act] manifest auto-refreshed; no manual action needed' : '[act] manifest up to date, no refresh needed');
process.exit(0);
