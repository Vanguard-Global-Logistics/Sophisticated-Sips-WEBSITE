"""
Forge local backend: a diffusers sidecar.

This is the half of Forge that hosted APIs cannot provide. Running the model
locally exposes the knobs that actually matter for reproducibility -- sampler,
step count, guidance scale, seed, LoRA weights -- none of which a hosted
text-to-image endpoint surfaces. Forge's optics engine composes the prompt; this
process turns it into pixels under settings you control exactly.

Run it on the machine with the GPU:

    pip install -r requirements.txt
    python sidecar.py --model stabilityai/stable-diffusion-xl-base-1.0 --port 8188

Then point Forge at it with FORGE_DIFFUSERS_URL=http://<host>:8188.

Note on verification: this file has not been executed against a GPU. It is
written against the documented diffusers API, but treat the first run as
unverified and check /capabilities before relying on it.
"""

from __future__ import annotations

import argparse
import base64
import gc
import io
import logging
import os
import threading
import uuid
from dataclasses import dataclass
from typing import Any, Literal

import torch
from diffusers import (
    AutoPipelineForImage2Image,
    AutoPipelineForText2Image,
    DDIMScheduler,
    DPMSolverMultistepScheduler,
    EulerAncestralDiscreteScheduler,
    EulerDiscreteScheduler,
    UniPCMultistepScheduler,
)
from fastapi import FastAPI, HTTPException
from PIL import Image
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("forge.sidecar")

# Schedulers exposed by name. These are the ones whose behaviour is stable
# across diffusers releases; adding more is a one-line change here.
SCHEDULERS: dict[str, Any] = {
    "euler": EulerDiscreteScheduler,
    "euler_ancestral": EulerAncestralDiscreteScheduler,
    "dpmpp_2m": DPMSolverMultistepScheduler,
    "unipc": UniPCMultistepScheduler,
    "ddim": DDIMScheduler,
}

SchedulerName = Literal["euler", "euler_ancestral", "dpmpp_2m", "unipc", "ddim"]


class Txt2ImgRequest(BaseModel):
    prompt: str
    negative_prompt: str | None = None
    width: int = Field(1024, ge=128, le=4096)
    height: int = Field(1024, ge=128, le=4096)
    steps: int = Field(30, ge=1, le=200)
    guidance_scale: float = Field(6.0, ge=0.0, le=30.0)
    seed: int | None = None
    scheduler: SchedulerName = "dpmpp_2m"
    # Number of images per call. Kept small by default because VRAM, not time,
    # is the usual ceiling.
    batch_size: int = Field(1, ge=1, le=8)


class Img2ImgRequest(Txt2ImgRequest):
    # Base64 PNG, no data: prefix.
    image_b64: str
    strength: float = Field(0.5, ge=0.0, le=1.0)


class ImageResponse(BaseModel):
    id: str
    width: int
    height: int
    image_b64: str
    seed: int


@dataclass
class LoadedPipelines:
    model_id: str
    device: str
    dtype: str
    txt2img: Any
    img2img: Any


class PipelineHolder:
    """
    Owns the pipelines and serialises access to them.

    diffusers pipelines are not safe to call concurrently from several threads
    on one device, and a second request arriving mid-denoise is the usual cause
    of a CUDA out-of-memory that looks random. One lock removes that whole class
    of failure at the cost of throughput this workload does not need.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._loaded: LoadedPipelines | None = None

    def load(self, model_id: str, device: str, dtype: torch.dtype) -> None:
        with self._lock:
            log.info("loading %s onto %s (%s)", model_id, device, dtype)
            txt2img = AutoPipelineForText2Image.from_pretrained(
                model_id,
                torch_dtype=dtype,
                use_safetensors=True,
            ).to(device)
            # Reuses the already-resident weights rather than loading a second
            # copy, which would roughly double VRAM for no benefit.
            img2img = AutoPipelineForImage2Image.from_pipe(txt2img)
            txt2img.set_progress_bar_config(disable=True)
            img2img.set_progress_bar_config(disable=True)
            self._loaded = LoadedPipelines(
                model_id=model_id,
                device=device,
                dtype=str(dtype),
                txt2img=txt2img,
                img2img=img2img,
            )
            log.info("loaded %s", model_id)

    @property
    def loaded(self) -> LoadedPipelines:
        if self._loaded is None:
            raise HTTPException(status_code=503, detail="no model loaded")
        return self._loaded

    def run(self, kind: Literal["txt2img", "img2img"], **kwargs: Any) -> tuple[list[Image.Image], int]:
        loaded = self.loaded
        scheduler_name = kwargs.pop("scheduler")
        seed = kwargs.pop("seed")
        batch_size = kwargs.pop("batch_size")

        with self._lock:
            pipe = loaded.txt2img if kind == "txt2img" else loaded.img2img

            scheduler_cls = SCHEDULERS.get(scheduler_name)
            if scheduler_cls is None:
                raise HTTPException(
                    status_code=400,
                    detail=f"unknown scheduler {scheduler_name!r}; known: {sorted(SCHEDULERS)}",
                )
            # from_config keeps the model's own scheduler settings (timestep
            # spacing, beta schedule) and swaps only the algorithm.
            pipe.scheduler = scheduler_cls.from_config(pipe.scheduler.config)

            # An explicit seed is what makes a render reproducible, so when the
            # caller does not supply one we mint it here and return it, rather
            # than letting torch pick an unrecorded seed.
            if seed is None:
                seed = int.from_bytes(os.urandom(4), "big")
            generator = torch.Generator(device=loaded.device).manual_seed(seed)

            try:
                result = pipe(
                    generator=generator,
                    num_images_per_prompt=batch_size,
                    **kwargs,
                )
            except torch.cuda.OutOfMemoryError as exc:
                # Free what we can so the next request has a chance, and say
                # plainly what to change rather than surfacing a bare CUDA error.
                gc.collect()
                torch.cuda.empty_cache()
                raise HTTPException(
                    status_code=507,
                    detail=(
                        "out of VRAM; reduce width, height or batch_size, "
                        "or load a smaller model"
                    ),
                ) from exc

            return list(result.images), seed


holder = PipelineHolder()
app = FastAPI(title="Forge diffusers sidecar", version="0.1.0")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "model_loaded": holder._loaded is not None}


@app.get("/capabilities")
def capabilities() -> dict[str, Any]:
    loaded = holder.loaded
    return {
        "model": loaded.model_id,
        "device": loaded.device,
        "dtype": loaded.dtype,
        "schedulers": sorted(SCHEDULERS),
        "max_edge_px": 4096,
        "supports": ["txt2img", "img2img"],
    }


def _encode(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def _respond(images: list[Image.Image], seed: int) -> list[ImageResponse]:
    return [
        ImageResponse(
            id=uuid.uuid4().hex,
            width=image.width,
            height=image.height,
            image_b64=_encode(image),
            # Each image in a batch advances the generator, so record the offset
            # that reproduces this specific frame rather than the batch's base.
            seed=seed + index,
        )
        for index, image in enumerate(images)
    ]


@app.post("/txt2img", response_model=list[ImageResponse])
def txt2img(request: Txt2ImgRequest) -> list[ImageResponse]:
    images, seed = holder.run(
        "txt2img",
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        width=request.width,
        height=request.height,
        num_inference_steps=request.steps,
        guidance_scale=request.guidance_scale,
        scheduler=request.scheduler,
        seed=request.seed,
        batch_size=request.batch_size,
    )
    return _respond(images, seed)


@app.post("/img2img", response_model=list[ImageResponse])
def img2img(request: Img2ImgRequest) -> list[ImageResponse]:
    try:
        source = Image.open(io.BytesIO(base64.b64decode(request.image_b64))).convert("RGB")
    except Exception as exc:  # noqa: BLE001 - any decode failure is a client error
        raise HTTPException(status_code=400, detail=f"image_b64 is not a decodable image: {exc}")

    images, seed = holder.run(
        "img2img",
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        image=source,
        strength=request.strength,
        num_inference_steps=request.steps,
        guidance_scale=request.guidance_scale,
        scheduler=request.scheduler,
        seed=request.seed,
        batch_size=request.batch_size,
    )
    return _respond(images, seed)


def main() -> None:
    parser = argparse.ArgumentParser(description="Forge diffusers sidecar")
    parser.add_argument("--model", default="stabilityai/stable-diffusion-xl-base-1.0")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8188)
    parser.add_argument(
        "--device",
        default="cuda" if torch.cuda.is_available() else "cpu",
        help="cuda, mps or cpu",
    )
    parser.add_argument(
        "--dtype",
        default="float16",
        choices=["float16", "bfloat16", "float32"],
        help="float16 suits most CUDA cards; use float32 on CPU",
    )
    args = parser.parse_args()

    dtype = {"float16": torch.float16, "bfloat16": torch.bfloat16, "float32": torch.float32}[
        args.dtype
    ]
    if args.device == "cpu" and dtype is torch.float16:
        # float16 on CPU is either unsupported or ruinously slow depending on
        # the build; silently producing a 40-minute render helps nobody.
        log.warning("float16 on CPU is not usable; falling back to float32")
        dtype = torch.float32

    holder.load(args.model, args.device, dtype)

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
