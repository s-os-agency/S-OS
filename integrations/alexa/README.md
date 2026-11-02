# Alexa Home GitHub

Existing S-OS integration, branch `Alexa-Home-GitHub`. Invocation: **Alexa, open S Home**.

## Implemented

- Read repository status for `s-os-agency/S-OS`.
- Read latest GitHub Actions workflow result (does not start a workflow).
- Draft an issue by voice; writes are **disabled by default**.
- Optional explicitly enabled issue creation requires a second spoken confirmation within 60 seconds.
- Standalone `POST /alexa` HTTP adapter behind an existing public HTTPS reverse proxy.
- Amazon SDK signature and timestamp verification, explicit Skill ID and Alexa account-user allowlist, bounded body size and request deduplication.

Workflow dispatch and an AI/MCP bridge are **not implemented**. The existing adapter calls GitHub directly. Do not mistake code availability for a deployed Alexa connection.

## Runtime configuration

Requires Node 22 or later. Install dependencies with `npm ci --omit=dev --ignore-scripts` and launch with `npm start` from this directory. Supply environment variables through the existing runtime's protected secret mechanism; `.env.example` documents names but is not automatically loaded. Never paste tokens into chat or commit live values.

Required: `ALEXA_SKILL_ID`, comma-separated `ALEXA_ALLOWED_USER_IDS`, and `GITHUB_TOKEN`. Missing configuration fails startup. GitHub target is fixed to `s-os-agency/S-OS`; an unrelated owner/repository is rejected.

Keep `ALEXA_ENABLE_ISSUE_WRITES=false` until the operator explicitly authorizes write access. Reading workflow results needs repository-scoped Actions read; GitHub metadata read is sufficient for repository status. Issue creation additionally needs repository-scoped Issues write, not account-wide access or Contents/Pull requests write. Do not create or broaden credentials automatically.

The allowlist binds to the Alexa account's skill user ID, **not an identified human speaker**: anyone able to speak to the allowed household device may invoke enabled commands. Keep writes disabled if that risk is unacceptable. Do not expose private project information on an uncontrolled/shared device.

If writes are authorized, set `ALEXA_REPLAY_DIR` to a private absolute directory on persistent local storage. Request claims use exclusive file creation and are retained for 10 minutes, preventing replay across restarts. Use **one service process**: spoken confirmations are intentionally process-local, expire in 60 seconds, and disappear on restart. No automatic retries for uncertain issue creation; inspect GitHub first. Never place replay state on ephemeral storage or delete it to bypass replay rejection. Shared filesystem claims are not a substitute for a reviewed multi-instance deployment.

## Existing-server deployment boundary

No new cloud project, VM, DNS, public access grant, or replacement of another service is implied. The service defaults to **127.0.0.1:8788**; check that port is free before starting. Do not change the existing Control Room on 9443 or n8n. `/health` reports process readiness only, not GitHub or Alexa end-to-end success.

After confirming the existing runtime and HTTPS route, proxy **only `/alexa`** to this service. Preserve the raw request body and Amazon `Signature-256` and `SignatureCertChainUrl` headers; do not apply a JSON parser first. Do not make n8n, the Control Room, or the entire Tailscale machine public. Private Tailscale URLs alone are not reachable by Alexa's cloud service.

In the existing **Alexa Home GitHub** Custom Skill: keep Development mode, import `interaction-model.json` for English US, build the model, set the verified public HTTPS `/alexa` endpoint and matching trusted certificate option. Do not enter the GitHub repository URL or an unverified example domain.

Verification must include a real signed request from Alexa's simulator followed by the home device reading repository status and latest workflow. Until both work, report deployment as incomplete. Confirm issue writes separately only if authorized.

Rollback: stop only this adapter and revert its specific proxy route, then return this directory to the prior branch commit. Preserve replay claims and existing unrelated services. No changes to repository root Compose or shared infrastructure are needed by this package.

Reference: https://developer.amazon.com/en-US/docs/alexa/alexa-skills-kit-sdk-for-nodejs/host-web-service.html
