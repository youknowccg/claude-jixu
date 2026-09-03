# claude-jixu

A one-shot session handoff skill for Claude Code — when the context is nearly full, you want to start a new session, wrap up, or generate a handoff note, a single `/jixu` runs the whole suite. It works in any language, and fits teams that wrap up sessions with a review-and-handoff routine.

Author: youknowccg · License: MIT

## What it is

`jixu` is an **orchestrator-style Claude Code skill** that chains the scattered "wrap up / handoff" flow into one pipeline:

```text
3-question self-check card → 6-step retro → handoff note → ready-to-paste bridge sentence
```

It does not re-implement those mechanisms itself; it **orchestrates** the other skills and optional hooks (see dependency list).

## How to trigger

- User types `/jixu`
- User says handoff signals such as "handoff", "new session", "context is nearly full", "wrap up", "wrap up", "lock and leave", "generate a handoff note", "bridge sentence", "handoff"

## The 6-step retro at a glance

Step 2 of jixu is the "retro", which fully contains 6 steps:

| Step | What it does | Dependency | Optional? |
|------|--------------|------------|-----------|
| Step 1 | Extract lessons → write to LEARNINGS.md (8 fields) | self-improving-agent skill | Needs install |
| Step 2 | Consolidate memories into durable topical memory | dream-memory skill | Needs install |
| Step 3 | Update changelog / feedback memories | None (local memory files) | Mandatory |
| Step 4 | Deep config sync (A/B/C three-category diff) | None (local config dir) | Optional |
| Step 5 | Tool / script update check | ships check-scripts-manifest.js | Mandatory |
| Step 6 | neat-freak project knowledge closeout | neat-freak skill | Conditional |

Note: this table lists all 6 steps so you can see what jixu actually does. Only Steps 1, 2 and 6 require **separately installed external skills** (see dependency list below); Steps 3 and 5 use local operations or the bundled script; Step 4 is optional.

## Dependency list (important)

jixu is an orchestrator — it **needs external dependencies to fully run**. When a dependency is missing it **degrades** (runs the flow framework + one notice about which dependency is missing), without interrupting the flow.

### Dependency skills (install separately; invoked only after detection via the `Skill` tool)

| Phase | Dependency skill | Description |
|-------|------------------|-------------|
| Retro Step 1 | `self-improving-agent` | Extract lessons, write to LEARNINGS.md |
| Retro Step 2 | `dream-memory` | Memory consolidation |
| Retro Step 6 | `neat-freak` | Project knowledge closeout |

Install (any of):
- If you have the source repo of that skill: install to your user skills directory per its README;
- Or fetch from a community/skill marketplace and place into `~/.claude/skills/<name>/`.

### Optional hooks (only take effect when configured locally; auto-skip when absent)

- Retro protocol reminder hook
- Self-check counter / marker hook
- Exit-check hook (backstop cross-check on today's LEARNINGS.md entries etc.)
- Auto git backup / dual-repo auto backup
- Memory-size sentinel

If these hooks are not configured, jixu will **mention once** that you are missing them, then still run the 6-step framework — only the "machine cross-check" layer is absent, and the completion criteria fall back to the self-check checklist at the end of SKILL.md.

## Install (zero manual steps)

One-liner: tell your agent "install github.com/youknowccg/claude-jixu" or "install this skill". The agent reads `CLAUDE.md` / `AGENTS.md` in the repo and automatically copies files, replaces placeholders, detects dependencies and verifies — no commands needed from you, at most a few permission card confirmations.

Prefer manual? Steps:

```bash
mkdir -p ~/.claude/skills/jixu/scripts
cp SKILL.md            ~/.claude/skills/jixu/SKILL.md
cp scripts/check-scripts-manifest.js ~/.claude/skills/jixu/scripts/
```

If you use a Claude Code variant, replace `~/.claude` with the matching config directory (e.g. `$HOME/.config/claude`).

## Placeholders

Paths inside `SKILL.md` use placeholders; replace them with your actual environment (the agent automates this during install):

| Placeholder | Meaning | Example (Windows / Unix) |
|-------------|---------|--------------------------|
| `<CLAUDE_HOME>` | Claude config root | `C:\Users\you\.claude` / `~/.claude` |
| `<SKILL_DIR>` | This skill's install dir | `~/.claude/skills/jixu` |
| `<PROJECT_ROOT>` | Current project root | the actual project root of the session |
| `<MEMORY_DIR>` | Project memory dir | `<CLAUDE_HOME>/projects/<project>/memory` |
| `<USER_CONFIG_DIR>` | User config dir (optional) | your local config backup dir |

## Repository layout

```text
claude-jixu/
├── SKILL.md                          flow orchestration (sanitized open-source version)
├── CLAUDE.md                         agent auto-install protocol (loaded by Claude Code on entry)
├── AGENTS.md                         cross-agent auto routing (points to CLAUDE.md)
├── README.md
└── scripts/
    └── check-scripts-manifest.js     project script manifest validator (bundled, no external deps)
```

## Disclaimer

- This repository contains no user privacy data. All local paths, usernames and project names are replaced with placeholders before publishing; replace them with your own environment as described in the placeholder table.
- The core flow has been self-tested on the author's machine (including sanitization checks); **cross-environment uniformity has not been fully tested**. If it fails on another environment, please file an issue — the author will follow up.

## License

[MIT](./LICENSE) © 2026 youknowccg
