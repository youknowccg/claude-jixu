---
name: jixu
description: One-shot session handoff for Claude Code — 3-question self-check card → 6-step retro → handoff note → ready-to-paste bridge sentence. Invoke when the context is nearly full and you want to start a new session, or when the user says "handoff / continue / new session / summarize / wrap up / lock-and-leave / generate a handoff note / bridge sentence / handoff". No long prompt copy-pasting needed.
author: youknowccg
license: MIT
---

# jixu — Fully Automated Session Handoff

## Trigger

- User types `/jixu`
- User says handoff signals such as "handoff", "continue", "new session", "context is nearly full", "summarize", "wrap up", "lock and leave", "generate a handoff note", "bridge sentence", "handoff", and expects the full handoff flow — proactively suggest it.

## Orchestration (this skill is an orchestrator, not a standalone flow)

Running `/jixu` will **attempt** to trigger mechanisms already configured on the user's machine, rather than replacing them. The open-source version does **detection + graceful degradation + one-time notice** for missing mechanisms: if detected, use it; if not, **mention once** "you are missing X, see README to install it", then still run the 6-step framework without stopping just because a dependency is missing (no repeated nagging, one notice is enough).

- **Dependency skills (install separately; only invoked when detected; see README dependency list)**:
  - Step 1 of the retro → `self-improving-agent` (invoke via the Skill tool; no text-substitution allowed)
  - Step 2 of the retro → `dream-memory`
  - Step 6 of the retro → `neat-freak`
  - If one of the dependency skills is missing: that step degrades to "execute manually per the flow description", and the user is told which dependency is missing.
- **Optional hooks (take effect automatically if configured on the machine; if not configured, **mention once** then skip)**:
  - Retro protocol reminder hook: injects the retro reminder when the `/jixu` message lands — same content as this skill's Step 2; dual insurance, no conflict
  - Self-check counter/marker hook: after Step 1 completes, an ack can be written to reset the counter (see Step 1); ignored if not configured
  - Exit-check hook: if configured, it cross-checks against today's LEARNINGS.md entries etc.; if not, this skill's exit self-check checklist alone governs
  - Automatic git backup / dual-repo automatic backup: after LEARNINGS.md, memory files, or rules are written, commit them to the local git repo automatically (optional)
  - Memory-size sentinel: when writing memories, obey the memory write discipline — net additions must be paired with equivalent compression (optional; if not configured, self-discipline applies)
- **Dedup handling**: if both the hook reminder and this skill demand a retro in the same turn, run it only once — do not repeat Step 2.
- This skill itself **adds no new dependencies and changes no global rules** — it only orchestrates existing mechanisms.

## Execution Order (fixed, irreversible)

1. Step 1: 3-question self-check (honest self-answers + AskUserQuestion card)
2. Step 2: 6-step retro (execute each step; if an exit-check hook is configured it provides a backstop; completion judged by the self-check checklist at the end of this file)
3. Step 3: Handoff note (three forms: Conclusions + Evidence + Checklist)
4. Step 4: Ready-to-paste bridge sentence

Invoking /jixu counts as a wrap-up scenario; run the full flow from the start — do not skip Step 1.

---

## Step 1: 3-Question Self-Check

1. **Answer each question honestly** (this session is treated as a delivery point — do not ask "is it delivered"):
   - What are you least sure about right now?
   - What is the biggest thing you missed about the current situation?
   - What have you not realized?
   - Each answer with evidence; anything unverified/uncertain must be explicitly marked "unverified / speculation" — never manufacture false certainty.
   - Follow the user's preferred language for output.
2. **Decidable items → AskUserQuestion card** (unless there truly are none, in which case say so explicitly):
   - Mutually exclusive options + one recommended (recommended option first + tag), each option stating its consequence
   - Even information-type questions get crafted options (e.g., a "unsure, leave a TODO" fallback), max 4 options + Other
   - No plain-text questions that make the user type their own answer
3. **Write the ack flag to reset the reminder** (if the self-check counter hook is configured locally; otherwise skip):
   - Extract the real sid from the cache file name (do not rely on the possibly-empty `SESSION_ID` environment variable):
     ```
     ls <CLAUDE_HOME>/cache/selfcheck-nudge-*.json
     ```
     Take the file matching this session / most recently modified (mtime); the UUID in the file name is the sid. Then:
     ```
     node -e "require('fs').writeFileSync(process.env.USERPROFILE + '/.claude/cache/selfcheck-ack-' + '<sid>' + '.flag', String(Date.now()))"
     ```
     Note: `<CLAUDE_HOME>` is a placeholder replaced with the user's Claude config root; `<sid>` is the real session ID extracted from the file name.
   - After writing, read back to verify the flag file exists.
4. After the user decides, proceed to Step 2.

## Step 2: 6-Step Retro (execute each step, none may be omitted)

### Step 1: Extract lessons — invoke self-improving-agent
- Use the Skill tool, `skill="self-improving-agent"` (not the Agent tool — the corresponding agent type may not exist)
- No manual grep/file-writing to replace it
- Completion criterion: `<PROJECT_ROOT>/.learnings/LEARNINGS.md` gains an entry with **today's ID and all 8 standard fields** (Logged/Priority/Status/Area/Summary/Details/Suggested Action/Metadata) — "today" per the exit-check implementation: before 3am, an entry from yesterday is also accepted

### Step 2: dream-memory consolidation
- Run `dream-memory`: consolidate recent logs/sessions/memories into durable topical memories, normalize dates, prune expired entries
- Keep causal information; do not compress the project memory directory
- Not machine-checked at exit but must NOT be silently skipped; note in the retro report that it ran

### Step 3: changelog update
- Update the corresponding project changelog memories (changelog_*.md / feedback memories)
- Completion criterion: the related memory file was modified today (before 3am, "yesterday" counts)

### Step 4: deep config sync (optional — depends on whether the user maintains a config directory)
- Go to the user's config directory (do **not** sweep everywhere), diff A(hooks/settings)/B(skills/routing)/C(MCP) per category, change only affected items
- Sync the known-good backup + hash baseline (compute sha256 with Node, not Python)
- Completion criterion: hash baseline matches the actual config hash ("today" per exit-check implementation; feedback memory modified today also counts)
- If the user keeps no config directory / does not maintain this layer, skip and mark "not applicable".

### Step 5: tool/script update check
- **Tools**: 24h cooldown: read `<MEMORY_DIR>/.tool_update_last_check` (placeholder — replace with the user's memory directory); if <24h since last check, skip and say so; only accept stable releases, reject alpha/beta/rc/canary/next/dev/snapshot/nightly; verify the version number against the registry before upgrading (LLMs hallucinate version numbers), reject future-dated versions; updates must be verified, roll back on failure, and failures after rollback are marked [CRITICAL]
- **Script manifest check** (prevents "old script running new requirements"):
  1. **Run the validator** (shipped with this skill; maintains the single manifest per project):
     ```
     node <SKILL_DIR>/scripts/check-scripts-manifest.js <project root>
     ```
     Behavior:
     - No scripts-manifest.md at the project root → reports "first /jixu will --init to generate it"
     - With a manifest → four report categories: `[drift]` (registered mtime ≠ disk mtime; auto-refreshed — the manifest only records disk state, safe), `[missing]` (registered but gone from disk; kept pending user confirmation), `[unregistered]` (on disk but not registered), `[version]` (count of scripts without a version comment in their header)
     - Generate the manifest: `node <SKILL_DIR>/scripts/check-scripts-manifest.js <project root> --init`
  2. **Requirements changes must update the script too**: when requirements change, update the script and add a version comment at the top (`# v1.2.3 fixes X`)
  3. **Check the version before running a script**: if an old and a new script coexist (`_v2` / `_b` suffix) → prefer the newest; if a script's mtime is earlier than the requirement change → suspect old script, check the manifest/changelog first
  4. **Verify afterwards**: are the mtimes of all scripts run this session later than the requirement change? Report projects with many missing version comments.

### Step 6: neat-freak project knowledge closeout (conditional)
- If this session is a project-dev session (has code or project-doc deliverables) → neat-freak lightweight path (inventory → reconcile → rule files → residue list → report, within 10 minutes)
- If this is a pure global-config/consulting session → skip, note in the retro report "Step 6 not applicable (pure config/consulting session)"
- Deletion candidates require user confirmation before removal; memories are read-only by default
- If neat-freak was already run in this session → cite the result, do not rerun

Note: the retro report must list the per-step status of Steps 1–6 at the end; Steps 2 and 6 are not machine-checked but must state whether they ran or are not applicable.

## Step 3: Handoff Note

1. **Locate the current project root** (ask yourself: what is this session about?), and `ls` to verify the directory exists before writing.
2. **Write only the three forms "Conclusions + Evidence + Checklist"**; classify each paragraph first — anything that fits none of the three, delete:
   - Conclusions: current state, what was decided, what to do next
   - Evidence: verifiable facts (git hash, actual command output, file path:line, log fields, user's words + time)
   - Checklist: checkable if-then items (trigger condition → do what → how to verify)
3. **Keep misjudgments, but compress them to three lines**: "❌ Wrong conclusion → ✅ Truth → Preventive action". Leave out the reasoning process (it stays in the session archive).
4. **Evidence must be verifiable**: a conclusion with no evidence is marked "speculative · unconfirmed", never written as "user-decided". Paths/script names/line numbers must be `ls`-verified before being written.
5. **Must cover**:
   - Done (deliverables + key file paths)
   - To-do (next-step list)
   - Lessons (in conclusion form)
   - Background agent/process state (background tasks / scheduled tasks / running scripts — inventory first)
   - Key paths (specific paths of cloud functions / artifacts / scripts, directly findable)
   - Extracted requirement details & user constraints (especially constraints the user emphasized)
6. **Naming**: `handoff-note_<project/milestone>_<YYYYMMDD>[-suffix_keyword].md` — dates as YYYYMMDD without dashes; if a same-name file already exists for the same project/date, **add a suffix to avoid overwriting**: first `YYYYMMDD.md`, second `YYYYMMDD_b.md` (or `_v2` / `_timeHHMM`, matching directory conventions); `ls` to check for clashes before writing.
7. **Location**: a `handoff-notes/` folder under the project root (create if missing). Not scattered in the project root, not mixed across projects. If the project has a mirror-copy directory configured (see README deployment notes), sync one copy there as needed.
8. After writing, `ls` to confirm the file exists and tell the user the full path.

## Step 4: Ready-to-Paste Bridge Sentence

The retro report must end with **a sentence the user can copy directly into a new session**:
- Content: one-sentence status + done highlights + pointer to the to-do checklist + key paths (cloud functions/artifacts/scripts) + background process state + the new session's first task; plus the **full path of the handoff note**.
- Example: `...see the handoff note at <project-root>/handoff-notes/handoff-note_<project>_<YYYYMMDD>.md`.
- A missing bridge sentence makes the retro incomplete — must be added.

---

## Exit Self-Check Checklist (verify each item when done)

- [ ] All three questions answered honestly (evidence shown, unverified marked)
- [ ] Self-check ack reset (if the self-check counter hook is configured locally; flag file confirmed to exist)
- [ ] LEARNINGS.md has an entry with today's ID and all 8 fields
- [ ] changelog memory modified today
- [ ] Config sync done, hashes match (or "no changes")
- [ ] Tool/script update check done or clear skip reason (<24h)
- [ ] neat-freak run or marked "not applicable"
- [ ] Handoff note written, three forms self-checked, covering done/to-do/lessons/background-process/requirement details/constraints
- [ ] Bridge sentence includes the full handoff note path
- [ ] All output in the user's preferred language

## Context Tips

- Before running this skill, check the memory index line-count reminder; obey the memory write discipline when writing memories (net increase paired with equivalent compression).
- This skill is flow orchestration; it adds no dependencies and changes no global rules.

## Maintenance Note (author-internal, for future maintenance reference)

This skill may be state-coupled with the self-check/retro protocol (`jixu trigger → write marker → exit check on retro artifacts`). Therefore any change on one side should also be reviewed against the two related spots (this file; plus the criteria and injection text of the self-check/retro protocol hooks). If the message contains escape phrases like "skip the retro", jixu should not write the retro marker (escape takes precedence). When maintaining: after editing this file or the protocol hooks, run the corresponding regression tests to confirm; any criteria change in the hooks must be tested with a "mention but not use" sample ("use the jixu feature to schedule something" type sentences must evaluate to false).
