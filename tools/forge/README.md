# Forge

A generative image engine built around the idea that camera settings should be
*solved*, not asserted.

Forge is self-contained under `tools/`. It has its own dependencies, its own
test suite and its own TypeScript config, and it is excluded from the site's
build. Nothing here touches the Sophisticated Sips application.

## Why this instead of ComfyUI or Automatic1111

Those tools are good at what they do, and Forge borrows their core idea: a
workflow is a graph, not a form. Where it differs:

| | ComfyUI / A1111 | Forge |
|---|---|---|
| Bad connection | fails partway through a render | `validateGraph` rejects it before any node runs |
| Re-running after a tweak | re-runs broadly | content-addressed cache re-runs only what changed |
| Workflow format | positional JSON, painful to diff | plain objects, reviewable in git |
| `f/1.4` | a string in the prompt | solved: real depth of field, field of view, exposure |
| Impossible exposure | renders it anyway | reported in stops, with the fix named |
| Backend | local GPU only | one graph, local GPU **or** hosted API |
| Driving it | click | click, code, or MCP |

The fourth and fifth rows are the ones that matter most.

### Settings are solved, not asserted

Ask for an 85mm at f/1.2 focused at 2m on a full-frame body and Forge computes
the result from the thin-lens equations: a **3.7cm** deep plane of focus, a
hyperfocal distance of 208m, a 24 degree horizontal field of view, and a
background defocus circle 78x the sensor's circle of confusion.

The prompt then describes *that*, not the dial positions:

> ...short-telephoto portrait compression, **a razor-thin 3.7cm depth of
> field**, **a background dissolved into pure blurred colour**, focus held at
> 2.0m, 24 degree horizontal field of view...

This matters because image models have no optical simulator. They have only
seen pictures described a certain way. Handing them the *outcome* lands the
look far more reliably than handing them the settings that would have produced
it.

### Impossible shots are caught before you pay

Ask for f/1.2 at 1/160, ISO 400, in golden hour and Forge will not render it:

```
these settings meter for EV 5.8, but Golden hour runs about EV 11-14:
5.2 stops overexposed. Fit roughly an ND32 filter, or raise the shutter
speed, to keep this aperture
```

That check found a bug in this project's own test fixtures.

Out-of-range settings are clamped rather than rejected, and always reported:
asking a f/1.2 lens for f/0.7, or a body for ISO 200000, tells you what it did
instead.

## Install

```bash
cd tools/forge
npm install --legacy-peer-deps   # see "Known issues" for the flag
npm test                         # 69 tests
npm run typecheck
```

## Use

### As a library

```ts
import { solveShot, compilePrompt } from "@sips/forge";

const shot = solveShot({
  subject: "a woman in a charcoal wool coat on a rain-slick street",
  camera: "eos_r5",
  lens: "canon_85_12",
  focalMm: 85,
  aperture: 1.2,
  subjectDistanceM: 2,
  shutterSeconds: 1 / 2500,
  iso: 400,
  film: "portra_400",
  lighting: "rembrandt",
});

console.log(shot.dof.totalMm);      // 36.9
console.log(shot.exposure.verdict); // "correct"
console.log(compilePrompt(shot).prompt);
```

### As a graph

```ts
import { builtinRegistry, runGraph, MemoryCache, MockBackend } from "@sips/forge";

const result = await runGraph(
  {
    nodes: [
      { id: "rig", type: "camera_rig", params: { /* as above */ } },
      { id: "prompt", type: "compile_prompt", inputs: { shot: "rig" } },
      { id: "base", type: "render",
        params: { model: "seedream_v4_5", aspectRatio: "16:9", resolution: "2k", seed: 7 },
        inputs: { prompt: "prompt" } },
      { id: "final", type: "resolution_ladder",
        params: { target: "8k", aspectRatio: "16:9" },
        inputs: { image: "base" } },
    ],
    outputs: ["final"],
  },
  builtinRegistry(),
  { backend: new MockBackend(), cache: new MemoryCache(), dryRun: true },
);
```

`dryRun: true` skips every billable node and tells you what it would have run.
Run it that way first, always.

Re-run with one parameter changed and only the affected nodes recompute;
everything else reports `cached`.

### As an MCP server

```bash
npm run build
node dist/mcp/server.js
```

Four tools, none of which spend money:

- `forge_catalog` — bodies, lenses, stocks and lighting, with their constants
- `forge_solve_shot` — solve the optics and compile the prompt
- `forge_plan_ladder` — plan a route to a target resolution
- `forge_plan_render` — all of the above, plus the provider calls to execute

Register it with:

```json
{ "mcpServers": { "forge": { "command": "node",
  "args": ["/absolute/path/to/tools/forge/dist/mcp/server.js"] } } }
```

## About 8K

No current text-to-image model renders 8K in one pass. Anyone claiming
otherwise is upscaling and not saying so.

Forge says so. `planLadder` renders at the chosen model's native ceiling, then
climbs in steps capped at 4x on the longest edge:

```
Seedream 4.5 renders natively to 6144x3456; 1 upscale step carries it to
7680x4320.

Above 4K the added pixels come from the upscaler, not the generator. They
resolve real detail rather than invent it, but do not expect new composition.
```

The result is a genuine 7680x4320 file. Just know which part of it the
generator composed.

## Backends

**`MockBackend`** — deterministic fakes. The whole suite runs on it, so tests
exercise the real graph, cache and ladder without spending anything.

**`DiffusersBackend`** — talks to `python/sidecar.py` on a machine with a GPU.
This is where local beats hosted: real control over sampler, step count,
guidance scale and seed, none of which hosted endpoints expose. Upscaling is a
low-strength img2img pass at the target size, the same "hires fix" A1111
popularised.

```bash
cd python
pip install -r requirements.txt
python sidecar.py --model stabilityai/stable-diffusion-xl-base-1.0 --port 8188
```

**Hosted** — `forge_plan_render` emits the exact provider calls, which you run
through whichever hosted MCP you already have connected. Preflight each with
the provider's own `get_cost` before executing. Forge deliberately holds no API
keys and initiates no paid call.

## What is verified, and what is not

Verified here, by the test suite and by running it:

- The optics maths, pinned to published figures. 50mm f/1.4 at 2m on full frame
  lands on the 1.94-2.07m table values; sunny-16 lands on EV 15.
- Graph validation, content-addressed caching, dry runs, ladder planning.
- The MCP server over stdio: handshake, tool listing, and an 8K 21:9 anamorphic
  plan at 7680x3292.
- `DiffusersBackend`'s request shaping and error handling, against a stub.

**Not verified:** `python/sidecar.py` has never been executed. There is no GPU
in the environment this was built in. It is written against the documented
diffusers API and compiles, but treat the first real run as unproven and check
`/capabilities` before relying on it.

## Known issues

- `npm install` fails with `Cannot read properties of null (reading 'edgesOut')`
  on npm 10.9.7. That is an arborist bug in peer resolution, not a problem with
  these dependencies. `--legacy-peer-deps` avoids it.
- The catalogue is hand-built. Adding a body or lens means adding its real
  sensor and aperture constants, not just a name.
- `MemoryCache` is per-process. A disk-backed `ResultCache` is a small addition
  when cache persistence across runs starts to matter.
