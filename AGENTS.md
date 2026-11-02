## Owner instruction — 25 October 2026

Seif prohibits adding or running tests across his platforms. Do not create, restore, expand, or execute test suites, test commands, test workflows, or test-only scaffolding. This instruction supersedes older guidance requesting tests, including copied templates and skills. Inspect actual source, diffs, configuration, and saved results as evidence; never claim tests passed.

# Instructions for agents working on S-OS

> These instructions were moved from `CLAUDE.md` for Cursor. Existing owner instructions still apply.

## What this repository does

**S-OS Kernel v0.1.3** (target **v0.2.0** hardening) — self-hosted agent OS:

- n8n — workflows
- Supabase/Postgres — memory & registry
- Docker Compose — deploy
- OpenAPI — external commands
- Optional: Telegram, Monday, M365

## Your responsibilities

Inspect the actual code and configuration, fix authorized problems, protect access rights and report saved results. Do not replace working code with documentation.

## Agent creation

When creating or scaffolding an agent, use `.claude/skills/s-new-agent/SKILL.md` as the single end-to-end capability. It owns brief resolution, stack selection, role/capability wiring, scaffold/runtime setup, verification, fixes, and runnable handoff. Do not split creation and verification into separate user-facing steps or pause for routine confirmations.

## Rules

1. No secrets in repo or chat
2. `dry_run` / `draft` / `read_only` defaults for consequential actions
3. Preserve auth headers (`X-AgentOS-Key`, Bearer)
4. n8n workflows stay importable; POST webhooks; telemetry on failure
5. No service role keys in browser dashboard
6. Copy-paste ops commands

## Checking changes

Review the changed source, configuration and saved GitHub commits. Do not run software tests or test-only commands. The older `scripts/static-qa.py` instruction is not authorization to run it.

## Cursor instructions

Apply rule: `~/.cursor/rules/s-agentos.mdc` when editing this tree.


## Seif's instruction — 1 November 2026

- Write short, clear English on product screens and in explanations.
- Keep Seif's permissions explicit. He owns the work and makes the decisions.
- Keep internal stages and monitoring details out of his product screens.
- Continue authorized work without adding review waits or unnecessary questions.
- Simplify the wording without changing access rights, stored data or working code names.
