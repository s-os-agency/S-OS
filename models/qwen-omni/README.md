# Qwen Omni model for this resource

This repository contains the installer, local inference server, request client,
and pinned model lock. The actual model bytes are distributed from the shared
GitHub Release in `s-os-agency/s-agent-passport`, not from Hugging Face at install
time. Large release assets are joined back into their original safetensors files.
Every part and reconstructed file is checked against SHA-256 values.

## Install the actual weights

Run from this repository on an authorized machine with at least 26 GB free disk:

```sh
bash models/qwen-omni/install.sh /srv/s-omni/weights /srv/s-omni/model-receipt.json
```

The installer is Python standard-library only and requires no HF or GitHub token.
It saves the original model license and card next to the weights. Reuse one model
installation for several resources on the same host instead of duplicating 22 GB.

## Serve from the GPU host

CUDA GPU capacity is still required. Plan for approximately 48 GB VRAM for short
multimodal requests, plus free disk for dependencies. CPU service repositories
can call a shared GPU worker instead of loading the model themselves.

```sh
python3.11 -m venv models/qwen-omni/.venv
. models/qwen-omni/.venv/bin/activate
python -m pip install -r models/qwen-omni/runtime/requirements.txt
python models/qwen-omni/runtime/serve.py --receipt /srv/s-omni/model-receipt.json
```

The service binds only to `127.0.0.1:8091`. It needs an existing authorized gateway
with identity, scope and revocation enforcement before remote exposure. No new
credentials or access rights are created by this package. The command integration below remains disabled until a reachable GPU gateway is configured.

## Request a real response

```sh
python models/qwen-omni/runtime/request.py --prompt 'Summarize the capabilities of a creative studio.' --output /srv/s-omni/response-001.json
```

For another host, use its existing approved HTTPS gateway in `S_OMNI_BASE_URL` and
existing scoped token in `S_OMNI_BEARER_TOKEN`. Never put tokens in this repository
or browser code. Node 20+/Worker applications can import
`models/qwen-omni/runtime/client.mjs`.

Inputs: text, images, audio and video. Outputs: text and speech, not generated
images/video. No GPU inference is claimed from a successful weight download.

See `PROVENANCE.json` for the exact upstream revision, actual GitHub weight
release, source commit and contributor/execution trace. No software tests added
or run. No application permissions changed. Source integration does not activate a running deployment.

## S-OS command gateway integration

The command workflow has an explicit opt-in dispatch route. Existing commands
keep their original behavior. Configure the n8n service environment with
`S_OMNI_ENABLED=true`, `S_OMNI_BASE_URL` (an approved HTTPS gateway base URL),
and `S_OMNI_BEARER_TOKEN` (its existing scoped token). Recreate n8n with the
updated Compose configuration and import the updated command workflow when
deployment is authorized. Restarting an existing container alone does not
apply changed environment values.

Send the normal authenticated command envelope with `action: "execute_task"`,
`run_mode: "live"`, `approval_status: "approved"`, an `objective`, and
`context.model_provider: "qwen_omni"`. Optional `context.omni` fields are
`media`, `audio_output`, `use_audio_in_video`, and `max_tokens` (1–512).
Media uses the worker's byte-only format: `mime_type` and `data_base64`.
No caller-selected URL, bearer token, unrelated context, metadata or operator
key is forwarded. The model receives only the objective and explicit Omni options.

Draft, dry-run and read-only commands never invoke the GPU. Disabled or missing
configuration returns 503 for live Omni requests. The HTTP node uses a
180-second timeout, refuses redirects and does not retry. Responses must match
the pinned model and revision before reporting observed inference. Errors return
a generic 502 without upstream diagnostics or credentials.

The current gateway carries `idempotency_key` for correlation but does not
provide durable deduplication. Live Omni commands containing a key fail closed
with 409 `idempotency_not_supported`. Requests without a key are one-shot and
are not deduplicated. Do not automatically resubmit after a timeout or uncertain response:
the GPU may already have processed the request. Model output is returned as data,
never executed as a command.

Docker's loopback is not the GPU host's loopback. Use the existing authorized
HTTPS access layer reachable from n8n; do not expose port 8091 or weaken access
controls to make this connection. No endpoint, token, GPU process, workflow
import or live inference has been configured by this source change.
