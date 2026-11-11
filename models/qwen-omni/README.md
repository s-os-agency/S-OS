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
credentials or access rights are created by this package. Existing routes remain
unchanged until a reachable GPU endpoint is available.

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
or run. No application permissions or production routes changed.
