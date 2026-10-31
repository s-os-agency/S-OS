# S-OS — Agent execution instructions

**Portfolio:** 5/16 (source row 5); **Lead agent:** ChatGPT; **specialty:** Command routing, schemas, auditable API; **independent reviewer:** Gemini (GCP orchestration review).
**Repository:** https://github.com/s-os-agency/S-OS
**Authoritative gates:** https://docs.google.com/spreadsheets/d/1MMk4Tx0k5rS7e_vOIFg-Dg022VEqXsdwqHibT9-3uOI/edit#gid=20261034
**Release dashboard:** https://docs.google.com/spreadsheets/d/1MMk4Tx0k5rS7e_vOIFg-Dg022VEqXsdwqHibT9-3uOI/edit#gid=20261035
**Disposition:** INTEGRATE; **accountable proposed engineering role:** Platform Engineering Lead.

## Mandatory operating rules
- Existing root AGENTS.md owner instruction controls: do not add, restore or run software test suites, test-only workflows or scaffolding. Existing spreadsheet references to tests are superseded: obtain real source/build/configuration and operational readback evidence within the owner policy. Never claim tests were run or passed.
- Inspect canonical README, source, existing diffs and deployments before changes. Make the smallest reversible implementation change required. Do not merely write plans or invent launch statuses.
- The named lead is a proposed execution assignment, **not proof of an active external agent session**, OpenRouter invocation, or authority to use another agent's account. A reviewer is an independent second-pass assignment, not an approval already provided.
- Use only scoped provider access actually available. No blind deployment, destructive migrations, new permissions, purchases or exposure of credentials. Preserve backups and rollback.
- Attach evidence URL, UTC date, version/commit, deployed environment and observed result to the corresponding Exact Completion Gates row. Mark VERIFIED only for evidence-backed completion. Leave other gates OPEN; no fabricated real customer, revenue, PayPal or Ziina status.
- Production launch requires a provider-backed deployment receipt and actual live runtime observation, not a green document or UI screenshot.

## Exact execution order

### Gate 5.1 — SOURCE
**Action:** Run schema validation, static QA and build; verify current OpenAPI and command envelope match code.
**Acceptance outcome:** Automated tests pass and documented API version matches deployed code.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

### Gate 5.2 — POLICY
**Action:** Enforce scoped approval mode, idempotency, action-level permission and durable command/event schema.
**Acceptance outcome:** Unauthorized live command and duplicate replay rejected with audit.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

### Gate 5.3 — DATA
**Action:** Verify command and event storage, correlation IDs, status transitions and failure receipts.
**Acceptance outcome:** Persisted command-to-event lineage survives restart and maps to one worker outcome.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

### Gate 5.4 — INTEGRATE
**Action:** Link gateway to canonical n8n workflow and Passport-authorized worker; avoid parallel dashboard launch.
**Acceptance outcome:** One authorized dry-run command produces worker result and signed receipt.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

### Gate 5.5 — DEPLOY
**Action:** Deploy control plane to approved protected endpoint with configuration, health checks and rollback.
**Acceptance outcome:** Live build SHA, HTTPS health, auth check, rollback and monitoring evidence.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

### Gate 5.6 — LIVE PROOF
**Action:** Submit approved end-to-end command and independently fetch audit receipt + Control Room projection.
**Acceptance outcome:** Evidence shows request/decision/worker execution/completion and timestamps from actual live host.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

### Gate 5.7 — COMMERCIAL
**Action:** Treat as internal engine unless specific paid customer deliverable is proven.
**Acceptance outcome:** Customer and revenue claims require linked contract/delivery/settled transaction; no standalone sale assumed.
**Evidence required:** actual source/commit, environment, timestamp, direct output/receipt, and reviewer; record in sheet. **Initial state: OPEN.**

## Completion handoff
Update each gate's verification state in Google Sheets and attach proof. Distinguish implementation from launch, customer acceptance from inquiries and settled payments from checkout creation. The lead produces the change receipt; the reviewer checks evidence independently. Do not announce completion until all required applicable gates pass. Report any unavoidable external authorization boundary specifically.

**Agent document author:** GPT-6 (instructions only; not a launch attestation).
