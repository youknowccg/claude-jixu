# jixu: Open-Source vs Local Version — What Differs

> Note: this file describes the **types of difference between the open-source version and the author's local version**, to help understand the relationship. For privacy, no local paths, usernames, internal codenames or real project names appear anywhere — it only talks about "what was changed".

## Summary in one sentence

**The core flow of the two is identical** (both are the "3-question self-check → 6-step retro → handoff note → ready-to-paste bridge sentence" session-handoff logic). The difference is not in the flow but in how implementation details are bound, and in what is exposed publicly.

## Main differences

| Dimension | Local version | Open-source version |
|-----------|---------------|---------------------|
| **Path style** | Hardcoded local absolute paths (with user dirs, drive letters) | All replaced with **placeholders** such as `<CLAUDE_HOME>`, `<SKILL_DIR>`, `<PROJECT_ROOT>`, `<MEMORY_DIR>`, to be replaced by the installer for their own environment |
| **Dependency handling** | Assumes private skills and self-check/retro hooks are already deployed locally; hard-calls them | Changed to **dependency detection**: when a dependency is missing, **mentions once** "it is recommended to install XX", then **degrades** to executing the flow framework without interruption |
| **Internal information** | Contains machine-specific collaboration details and non-public content (internal codenames, collaborators, real business project names) | **All deleted**; only generic, publicly describable flow remains |
| **Maintenance warnings** | Has a "three-part coordinated maintenance" section (state-coupled with self-check/retro hooks; changes must be synced) | Generalized to a "maintenance note" pointing at no concrete local file |
| **Install entry** | Depends on an existing runtime, no separate install instructions | New `CLAUDE.md` (agent auto-install protocol) + `AGENTS.md` (cross-agent auto routing) — "tell your agent one sentence and it auto-installs" |
| **Public docs** | No README/LICENSE | New `README.md` (intro, 6-step retro overview, dependency list, zero-step install, placeholder table, disclaimer) and `LICENSE` (MIT) |
| **Author marker** | None | Marked `youknowccg` (MIT) |

## Unchanged parts

- **Script** `scripts/check-scripts-manifest.js`: identical on both sides (project script manifest validator, used in jixu Step 5).
- **Core flow**: 3-question self-check, 6-step retro (① extract lessons → ② memory consolidation → ③ changelog → ④ config sync → ⑤ tool/script check → ⑥ project closeout), handoff note (Conclusions/Evidence/Checklist), ready-to-paste bridge sentence.
- **Trigger**: `/jixu` + wrap-up signal words.

## Why this design

1. **Desensitive**: the local version hides many absolute paths and internal details that could identify the individual/organization/business; the open-source version must remove them (placeholder substitution + deletion of non-public content).
2. **Portable**: with placeholders, anyone's Claude Code can install it, no longer tied to this machine's directory structure.
3. **Ready out of the box**: with `CLAUDE.md`/`AGENTS.md` added, other users can have their own agent install it without manually editing paths.
4. **Honest degradation**: when a dependency is missing, it does not fake a full run — it clearly states what is missing so the user can fill it in.

## Future maintenance suggestions

- For future flow changes, **sync the open-source and local versions** (where the core logic is identical); but parts **local-only** (absolute paths, internal hook details) stay in the local version and do not enter the open-source one.
- The open-source version should only ever expose "generic flow + placeholders"; anything machine-specific must be sanitized before publishing.
