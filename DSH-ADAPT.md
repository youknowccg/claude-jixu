# DSH-ADAPT — DeepSeek Harness Adaptation Notes

> claude-jixu's subject matter is the "human-facing wrap-up flow", not bound to a single agent.
> This note documents how it lands on DeepSeek Harness (DSH), for cross-agent reuse.

## 1. Understanding the differences (why you cannot copy it as-is)

| Dimension | Claude Code (CC) | DeepSeek Harness (DSH) |
|---|---|---|
| Skill carrier | `skills/jixu/SKILL.md` (auto routing: `/jixu` slash command + trigger words) | No `skills/` dir, no auto skill loading; relies on the global instruction file (AGENTS.md) + command plugins |
| Slash commands | Built-in command system | Command plugin mechanism (below) |
| Retro steps | 6 steps | **7 steps** (one extra "preset sync" step) |
| Handoff note | project root | primary + mirror copy dual dirs (shared projects) |

Conclusion: on the DSH side, jixu is split into two layers — a **rule layer** (trigger conditions written into the global instruction file) plus a **command layer** (the `/jixu` command plugin).

## 2. Rule layer: trigger conditions in the global instruction file

In the DSH global instruction file (AGENTS.md — the DSH equivalent of CC's CLAUDE.md/rules), append to the "Session Wrap-Up Protocol" section's **trigger conditions**:

```
- The user says "jixu", "handoff", "continue", "context is nearly full", "handoff", or uses the /jixu command — equivalent to CC's /jixu;
  run the full 7 steps (3-question self-check → 7-step retro → handoff note → bridge sentence), no handoff-note-only runs;
```

Word-triggered actions are themselves executed by the model (DSH has no hook system; the global instruction file IS the mechanism layer). Keep aligned with CC's wrap-up trigger word list.

## 3. Command layer: the /jixu command plugin

### Mechanism (source-verified, not guessed)

1. **Command registration**: inside the Cordis plugin's `apply(ctx)`, call
   `ctx.commands.register({ name: "jixu", description: "...", handler })`
   — the service comes from `@deepseek-ai/dsh-commands`;
   the Web UI `/` menu pulls via the `commands.list` RPC in real time — **once registered, it appears in the menu**, no UI config needed.
2. **Why the command cannot just emit flow text**: the command handler's result is a UI passthrough (the command slot of `session.prompt`), which **never reaches the model**; the handler must inject the instruction into the session so the model picks it up and executes. The established official pattern (cf. `/goal` in `@deepseek-ai/dsh-command-goal`, `submitObjectiveAttachments`):

   ```js
   invocation.agent.followup(createUserMessage({
     content: [{ type: "text", text: "[ /jixu session-handoff command ] ..." }],
     source: { kind: "user" },
   }));
   ```

   `followup` = send("next-turn", wakeup=true) — queue the next turn and wake the driver
   (implementation: `dsh-agent-loop`'s `send`/`followup`/`steer`/`inject` trio);
   `createUserMessage` comes from `@deepseek-ai/dsh-llm`, generating a user message with stable id/role.
3. **Loading**: the plugin package (`type: module`, `main: lib/index.js`, package `dsh.bundle.patch` pointing to a cordis patch file; the patch `insert`s the plugin line) → registered into the profile's `bundles` list (the `dsh.profile.bundles` array in the profile's package.json, with dependencies using `link:` to local source) → `pnpm install` → restart DSH → the `/` menu shows the command.
4. **Execution**: after `/jixu` is triggered, the model sees the injected "session-handoff command" instruction on the next turn, and executes the **local step-count version** (7 steps on DSH) per the global instruction file's wrap-up protocol — the plugin does not duplicate the protocol body; it points at the single-authority global instruction file, and the step-count difference between the two sides lives in each side's global instruction file.

### Validation

- Plugin logic can be tested with a zero-dependency mock (stub `createUserMessage` + mock `commands.register` to capture the handler; assert three paths: argument error / normal followup injection / fallback on inject failure).
- After loading the command, DSH must be restarted (bundle patches assemble at boot); takes effect in new sessions.

## 4. Sanitization and boundaries

- Any cross-agent public content must not contain: internal absolute paths, usernames, internal codenames, port numbers, project codenames.
- This note's mechanism descriptions all use public generic terms (`@deepseek-ai/dsh-commands`, `createUserMessage`, `followup` etc. are public APIs of open-source packages).

## 5. Equivalence with CC /jixu

The DSH-side 3-question self-check (with ask_user_question card hardening), 7-step retro, handoff note (three forms: Conclusions/Evidence/Checklist, dual-dir sync), and ready-to-paste bridge sentence (including the handoff note path) — these four items are exactly CC's four jixu steps; the DSH side already has equivalent clauses in the global instruction file's "Session Wrap-Up Protocol" and "3-Question Self-Check Protocol" sections; the command layer only provides the `/jixu` quick entry and word-trigger alignment.
