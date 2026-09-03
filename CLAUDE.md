# claude-jixu — Agent Auto-Install Protocol

This file is the built-in **auto-install configuration** of `claude-jixu` (a Claude Code session handoff / wrap-up skill). Claude Code reads this file automatically when entering the repo; any agent (Claude Code / Codex etc.) receiving a "install claude-jixu for me" request should also read and execute this protocol.

## Trigger conditions

The user says "install the jixu skill from GitHub", "install this skill", "install claude-jixu", or provides this repository's URL.

## What you do (fully automatic, zero manual work for the user)

1. **Probe the machine first**:
   - Windows: `echo $USERPROFILE`; Unix-like: `echo $HOME`
   - Claude Code installed: `claude --version` (if absent, tell the user this is a hard prerequisite)
   - Locate this repo's root (containing SKILL.md, scripts/, AGENTS.md)
2. **Copy to the skills directory**:
   - Target `skills/jixu/`:
     - Windows: `$USERPROFILE\.claude\skills\jixu\`
     - Unix-like: `~/.claude/skills/jixu/`
   - Copy `SKILL.md` → `skills/jixu/SKILL.md`
   - Copy the whole `scripts/` → `skills/jixu/scripts/`
3. **Replace placeholders**: in `skills/jixu/SKILL.md`, replace every `<CLAUDE_HOME>` with the machine's actual Claude config root; `<SKILL_DIR>` with this skill's directory (i.e. `skills/jixu`). `<PROJECT_ROOT>`, `<MEMORY_DIR>`, `<USER_CONFIG_DIR>` are used at runtime per project — keep them.
4. **Detect the three dependency skills**: `self-improving-agent`, `dream-memory`, `neat-freak` (`skills/<name>/`). For any missing one, clearly tell the user "it's recommended to install <the missing one> (see README dependency list)", and ask whether to install it on their behalf — do not silently skip.
5. **Explain the optional hooks**: if `hooks/` or the associated hooks (retro protocol reminder, self-check counter/marker, exit check, auto git backup, memory-size sentinel) exist, they take effect at runtime; if none, tell the user "jixu will mention the missing parts proactively, but the 6-step framework still runs".
6. **Verify**:
   - `ls skills/jixu/` — confirm `SKILL.md` and `scripts/` are in place
   - `node skills/jixu/scripts/check-scripts-manifest.js` (run once against any project dir containing .py/.js/.sh/.bat files) — no errors
   - Confirm `SKILL.md` no longer contains `<CLAUDE_HOME>` (placeholder replacement succeeded)
7. **Report**: which files were installed, the placeholder replacement results, each of the three dependencies' status, and the verification outcome.

## Permissions and cards

Anything needing user confirmation (installing a missing dependency, writing to the user directory, changing config) — ask via an **option card** (e.g. AskUserQuestion) in one go; do not do it silently.

## Completion criteria

- [ ] `skills/jixu/SKILL.md` exists
- [ ] `skills/jixu/scripts/check-scripts-manifest.js` exists
- [ ] `<CLAUDE_HOME>` / `<SKILL_DIR>` in `SKILL.md` replaced with actual paths
- [ ] `check-scripts-manifest.js` runs under node
- [ ] Status of all three dependency skills is explicit (installed / missing-and-reported)

## Notes

- Use only values you actually probed; do not hardcode anything from memory.
- On permission errors or a confusing environment, stop and ask the user — do not force through.
- If the user is already using this skill rather than installing, this protocol must not interfere with normal usage.
