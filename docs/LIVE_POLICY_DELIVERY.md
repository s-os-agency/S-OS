# Policy updates to running sessions

## Current boundary

This implementation adds a persistent inbox and live SSE stream to the existing
Context v2 service. It does not create another model worker or restart current
tasks. A running session must have the receiver attached to its runtime's existing
message-injection interface. Merely merging this code or saving policy in Notion
does not deliver anything to a model.

No live deployment or real agent delivery has been verified. The available
server connection rejected session discovery with HTTP 401 Unauthorized.

## Connect the existing runner

Keep the existing Context v2 service and its principal-key authentication.
Register or reuse the real session through `POST /v2/sessions` as its principal.
Run `receiveControl` from `context-v2/src/control-receiver.js` concurrently with
the current task. Pass the configured service URL, that session's existing ID and
principal token, an AbortSignal, and `inject` from the runtime adapter.

The adapter accepts `{type, sessionId, revision, digest, text, source}`. It must
insert the update into **that existing session**, preserve its task state, and
return the runtime message/receipt reference. It must deduplicate by session,
revision and digest across process restarts. It must not return success on queueing
outside the runtime or spawn a replacement task. A platform without a supported
live input API remains unconnected; do not simulate an acknowledgement for it.

The command-line receiver additionally supports server-side configuration:
`S_CONTROL_URL`, `S_CONTROL_SESSION_ID`, `S_CONTROL_TOKEN`, and an absolute
`S_CONTROL_ADAPTER_MODULE` path exporting `inject`. Credentials stay outside Git.
Only HTTPS or local loopback HTTP is accepted. No public exposure is needed.

## Publish and inspect

- `POST /v2/control/publish` (owner authentication) accepts `{text, source}`.
  Publish the actual canonical policy text and its source reference. Identical
  source/text is idempotent. This endpoint is the hook for a future authenticated
  Notion change listener; no automatic Notion subscription is claimed here.
- All registered sessions get durable delivery rows, including disconnected
  sessions. Receivers connect to their session's `/events` stream. Undelivered
  updates replay on connection and unacknowledged application retries every
  15 seconds. A new session receives the latest revision upon subscription.
- `/receipt` requires the matching principal and event nonce. `received` means
  receiver acknowledgement. `applied` also requires a runtime evidence reference.
- `GET /v2/control/status` (owner authentication) lists connected, pending,
  offered-unacknowledged, receiver-acknowledged and application-reported states.
  It deliberately reports `behavioralComplianceVerified: false`. Runtime receipts
  establish delivery, not behavioral compliance.

The list covers registered sessions only, not every agent listed in Notion.
Reconcile real runtime session IDs against the fleet registry before claiming
fleet-wide coverage. No missing receipt blocks unrelated authorized work, and
silence is never acceptance. The current task and receiver run independently.

## Rollback and verification limits

Stop the receiver and revert the server import and control routes to disable live
delivery. Existing tasks and Context v2 data are retained; the additive control
tables may remain for evidence. No automated tests were added or run. JavaScript
syntax and the source diff were inspected; this is not a live acceptance receipt.
