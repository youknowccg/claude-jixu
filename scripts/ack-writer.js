#!/usr/bin/env node
// v1.3: 2026-09-09 introduced — replaces the old inline `node -e` command (LLM-side string concatenation is an injection anti-pattern; also fixes USERPROFILE being Windows-only)
// ack-writer.js — write the self-check ack flag that resets the reminder counter (jixu Step 1.3)
// Usage: node ack-writer.js [session-id]   (no arg = the most recent selfcheck-nudge-*.json in the cache dir)
'use strict';
const fs = require('fs');
const path = require('path');

const home = process.env.USERPROFILE || process.env.HOME; // v1.3: Unix fix
if (!home) { console.log('[ack] no home directory found; skip'); process.exit(0); }
const cacheDir = path.join(home, '.claude', 'cache');

let sid = process.argv[2] || '';
if (!sid) {
  // pick the most recently modified selfcheck-nudge-*.json (the session this ack belongs to)
  let files = [];
  try {
    files = fs.readdirSync(cacheDir)
      .filter(f => /^selfcheck-nudge-[\w.-]+\.json$/.test(f))
      .map(f => ({ f, m: fs.statSync(path.join(cacheDir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
  } catch (e) {}
  if (!files.length) { console.log('[ack] no selfcheck-nudge-*.json in the cache; nothing to reset'); process.exit(0); }
  sid = files[0].f.replace(/^selfcheck-nudge-/, '').replace(/\.json$/, '');
}
// v1.3: the sid is never pasted into a shell command anymore, but still validate it — hex/dashes only, 8-64 chars
if (!/^[0-9a-fA-F-]{8,64}$/.test(sid)) {
  console.log('[ack] suspicious session id rejected: ' + String(sid).replace(/[^\w.-]/g, '?'));
  process.exit(1);
}

const flag = path.join(cacheDir, 'selfcheck-ack-' + sid + '.flag');
try {
  fs.writeFileSync(flag, String(Date.now()));
  console.log('[ack] wrote ' + flag);
} catch (e) {
  console.log('[ack] write failed: ' + e.message);
  process.exit(1);
}
