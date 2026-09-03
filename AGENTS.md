# AGENTS.md — Cross-agent auto-install routing

This repository's agent auto-install & configuration protocol is defined in `CLAUDE.md`.

When any agent (Codex, Claude Code, Gemini, Cursor, etc.) executes an "install claude-jixu" task in this repository:

1. Read this repository's `CLAUDE.md` and fully execute the "Agent Auto-Install Protocol" in it.
2. Throughout: automatically copy files, replace placeholders, detect and install dependencies, verify. When user confirmation is needed, use option cards.

The user does not need to pass any file manually — just say "install claude-jixu for me".
