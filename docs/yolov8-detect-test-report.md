# RahScan YOLOv8 pothole detection test report

**Endpoint:** `POST http://127.0.0.1:8000/api/detect` (multipart field `file`)  
**Model URL:** `https://huggingface.co/EngJamesO/pothole-detector/resolve/main/models/yolov8n.pt`  
**Weights cache:** `backend/weights/yolov8n.pt` (6.2 MB, downloaded on first startup; gitignored via `*.pt`)  
**Predict settings:** `conf=0.35, iou=0.5, imgsz=1280, max_det=50`  
**Device:** CPU (`model.predict(..., device="cpu")` in `backend/app/ai/detect.py`)

> **The per-image tables below are from the 27 August 2026 run against the previous
> Samdutse `best.pt` checkpoint at `conf=0.15`.** They are kept as the record of that
> run. The checkpoint and confidence floor have since changed — see the update
> immediately below. Numbers in those tables should not be read as current behaviour.

## Update — 28 August 2026: checkpoint swapped to EngJamesO yolov8n

The Samdutse checkpoint scored poorly on photos taken with the project owner's own
phone. Benchmarked at the app's own predict settings it ranked 8th of 10 candidates,
so `backend/app/ai/model.py` now loads EngJamesO **yolov8n** instead. Three related
changes landed in `backend/app/ai/detect.py` at the same time:

- `ImageOps.exif_transpose` runs immediately after `Image.open`, so a phone photo that
  stores its rotation in EXIF is straightened before width/height are read. Without it
  the pixels reach the model sideways and `area_percentage` is computed against the
  wrong axes.
- The predict `conf` floor moved from **0.15 → 0.35**, so faint artifacts never reach
  the UI, the database, or severity.
- `_promote_largest_hole` now requires the largest box to clear **0.5** confidence
  before it may be promoted to `Large`. Previously a low-confidence blob could set
  `highest_severity` for an entire report purely on area.

Measured by calling `run_detection()` directly (not through the endpoint) on the two
reference photos, CPU, this Mac:

| Photo | Checkpoint | Boxes (confidence) | `highest_severity` |
| --- | --- | --- | --- |
| Internet reference, 678×452 | Samdutse `best.pt` @ conf 0.15 | 0.83, 0.80, 0.62, 0.16 | Medium |
| Internet reference, 678×452 | **yolov8n @ conf 0.35** | **0.84, 0.76, 0.61** | Medium |
| Phone photo, 576×1024 | Samdutse `best.pt` @ conf 0.15 | 0.79, 0.33, **0.19** | Large |
| Phone photo, 576×1024 | **yolov8n @ conf 0.35** | **0.76, 0.57** | Medium |

On the phone photo the real pothole goes from **0.19 → 0.76** confidence, and the
0.19 box that used to drive `highest_severity` is gone. The internet photo's peak is
unchanged (0.83 → 0.84) and its new box is marginally larger (5.48% → 6.04% area).
Both photos report **Medium**: `_promote_largest_hole` lifts a box to `Large` only
when it covers at least **12%** of the frame *and* at least **2×** the runner-up, so a
mid-band hole is not promoted merely because a smaller hole sits beside it. The
severity bands in `backend/app/ai/utils.py` were not touched.

Model load is ~3.9 s; inference is ~0.22–0.24 s per photo after warmup, against
~0.5–0.7 s for the previous checkpoint.

## How the original 27 August test was run

1. Recreated `backend/.venv` on **Python 3.13** with working `torch`/`ultralytics`.
2. Started uvicorn **without** `--reload` on port 8000 (a `--reload` server would restart when `best.pt` is written under `backend/`).
3. Waited for `Application startup complete` (~3 minutes on first load of the 21.5 MB weights).
4. POSTed Wikimedia Commons JPEGs from `backend/test_images/` (gitignored binaries).
5. POSTed invalid / empty / missing-file cases.

**Runtime stack (this Mac):**

| Piece | Version |
| --- | --- |
| Python | 3.13.15 (conda-forge) |
| torch | 2.13.0 (CPU, conda-forge) |
| torchvision | 0.28.0 |
| ultralytics | 8.4.130 |
| FastAPI | 0.141.1 |
| Host | macOS 15.7.7, Intel x86_64 |

**Why conda-forge instead of a plain `pip install -r requirements.txt`:** official PyPI `torch` wheels for macOS are **arm64-only** from 2.3 onward. This machine is Intel; Python 3.13 has **no** PyPI torch wheel. conda-forge still publishes `osx-64` + `py313` pytorch. The venv is still Python 3.13 as requested; it is **3.13.15**, not the system Framework **3.13.7**.

## Exact severity thresholds

From `backend/app/ai/utils.py` — box area / image area × 100:

| `area_percentage` | Label |
| --- | --- |
| `< 5` | Small |
| `5` to `15` inclusive | Medium |
| `> 15` | Large |

`highest_severity` is the max of `{Small:1, Medium:2, Large:3}` across detections. Empty detections return `highest_severity: null` and `message: "No potholes detected."`. Confidence is rounded to two decimals.

## Image sources

All photos are Wikimedia Commons (openly licensed). Saved locally under `backend/test_images/` (gitignored). ~1280px thumbs used except `Pothole_Big.jpg` (native 400×300).

| Filename | Wikimedia file | Role |
| --- | --- | --- |
| `potholes_asphalt_finland.jpg` | [Potholes on asphalt road 20171023.jpg](https://commons.wikimedia.org/wiki/File:Potholes_on_asphalt_road_20171023.jpg) | Potholes |
| `pothole_new_orleans.jpg` | [Langensteins Pothole New Orleans.jpg](https://commons.wikimedia.org/wiki/File:Langensteins_Pothole_New_Orleans.jpg) | Pothole |
| `pothole_big_country_road.jpg` | [Pothole Big.jpg](https://commons.wikimedia.org/wiki/File:Pothole_Big.jpg) | Pothole |
| `potholes_bengaluru.jpg` | [Potholes in Bengaluru road.jpg](https://commons.wikimedia.org/wiki/File:Potholes_in_Bengaluru_road.jpg) | Potholes |
| `pot_holes.jpg` | [Pot holes.jpg](https://commons.wikimedia.org/wiki/File:Pot_holes.jpg) | Potholes |
| `otro_bache.jpg` | [Otro bache.jpg](https://commons.wikimedia.org/wiki/File:Otro_bache.jpg) | Pothole |
| `control_asphalt_texture.jpg` | [Asphalt road texture.jpg](https://commons.wikimedia.org/wiki/File:Asphalt_road_texture.jpg) | Control (smooth asphalt, CC0) |
| `control_cat.jpg` | [Cat November 2010-1a.jpg](https://commons.wikimedia.org/wiki/File:Cat_November_2010-1a.jpg) | Control (not a road) |

## Per-image results

All eight image POSTs returned **HTTP 200**. First inference ~3.5 s (warmup); later images ~0.18–0.26 s on CPU.

| Filename | Size (px) | Detections | Box confidence | Area % | Severity | `highest_severity` | `message` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `potholes_asphalt_finland.jpg` | 1280×960 | 2 | 0.75, 0.29 | 7.48, 4.97 | Medium, Small | Medium | `null` |
| `pothole_new_orleans.jpg` | 1280×960 | 1 | 0.72 | 8.66 | Medium | Medium | `null` |
| `pothole_big_country_road.jpg` | 400×300 | 1 | 0.82 | 17.69 | Large | Large | `null` |
| `potholes_bengaluru.jpg` | 1280×1700 | 1 | 0.39 | 16.72 | Large | Large | `null` |
| `pot_holes.jpg` | 1280×1707 | 1 | 0.60 | 2.58 | Small | Small | `null` |
| `otro_bache.jpg` | 1280×960 | 1 | 0.80 | 39.08 | Large | Large | `null` |
| `control_asphalt_texture.jpg` | 1280×960 | 0 | — | — | — | `null` | No potholes detected. |
| `control_cat.jpg` | 1280×1709 | 0 | — | — | — | `null` | No potholes detected. |

### Bounding boxes (pixel xyxy)

| Filename | x1 | y1 | x2 | y2 |
| --- | --- | --- | --- | --- |
| `potholes_asphalt_finland.jpg` #1 | 572.45 | 543.81 | 920.65 | 807.84 |
| `potholes_asphalt_finland.jpg` #2 | 188.59 | 302.04 | 475.27 | 515.06 |
| `pothole_new_orleans.jpg` | 453.54 | 337.22 | 889.89 | 581.04 |
| `pothole_big_country_road.jpg` | 125.42 | 172.42 | 343.48 | 269.75 |
| `potholes_bengaluru.jpg` | 292.05 | 527.94 | 1257.71 | 904.62 |
| `pot_holes.jpg` | 315.74 | 826.40 | 550.22 | 1066.79 |
| `otro_bache.jpg` | 141.81 | 270.90 | 1038.14 | 806.65 |

## Summary

| Metric | Result |
| --- | --- |
| Pothole photos with ≥1 box | **6 / 6 (100%)** |
| Control photos with 0 boxes | **2 / 2 (correct negatives)** |
| Total boxes | 7 |
| Confidence range | **0.29 – 0.82** (mean of 7 boxes ≈ **0.62**) |
| Severity mix | Small 2, Medium 2, Large 3 |
| Threshold vs area math | **7 / 7 boxes matched** (recomputed `box_w×box_h / image_area × 100`, rounded to 2 decimals, then Small / Medium / Large as above) |
| `highest_severity` | Correct for the two-box Finland image (Medium 7.48% beats Small 4.97%) |
| HTTP 503 | **None** after the model loaded |
| Boundary check | Finland box at **4.97%** correctly labeled **Small** (`< 5`); Bengaluru **16.72%** correctly **Large** (`> 15`) |

## Failures and negative cases

| Case | HTTP | Body |
| --- | --- | --- |
| Valid JPEG after YOLO load | 200 | Detection JSON (see table) |
| `not_an_image.txt` | **400** | `{"detail":"Could not read the image."}` |
| Empty `file` (`empty.jpg`, 0 bytes) | **400** | `{"detail":"Empty image / missing file."}` |
| Missing multipart `file` | **400** | `{"detail":"Empty image / missing file."}` |
| `/api/detect` 503 (model missing) | **Did not occur** in this run | Would happen if `load_model()` failed (e.g. no torch on Python 3.14) |

No potholes on the two controls is the expected API behavior, not a crash: HTTP 200 + empty `detections`.

## Caveats

- **CPU only.** Inference is `device="cpu"`; this Intel Mac has no CUDA/MPS torch wheel in this venv.
- **Pretrained Hugging Face model**, not trained by RahScan. Weights are now `EngJamesO/pothole-detector` (`models/yolov8n.pt`), single class `Pothole`. The tables in this report predate that swap and were produced with `Samdutse/pothole-yolov8` (`best.pt`). Either way this is a small qualitative check, not a validation set.
- **Confidence floor is 0.35**, above the Ultralytics default of 0.25. Boxes weaker than that are dropped before the response is built, so a faint or partially occluded hole can be missed entirely. The 27 August tables were taken at 0.15 and therefore include boxes (Finland 0.29, Bengaluru 0.39 borderline, and similar) that today's settings would filter or keep differently.
- **Severity is box area, not depth or hazard.** A close-up small pothole can score Large (`otro_bache` 39%); a distant real pothole can score Small (`pot_holes` 2.58%).
- **Not a production accuracy claim.** Six pothole photos and two controls; lighting, camera, and geography differ from the training set.
- **Python 3.13 on Intel macOS** cannot `pip install torch` from PyPI. This test used conda-forge pytorch in `.venv`. Apple Silicon or Linux/Windows with official wheels would be the usual path.
- Test binaries were **not** committed. Do not commit `.venv`, `.env`, or `*.pt`.

## Update — 28 August 2026: gated black-point correction for veiled photos

A washed-out phone photo that returned zero boxes was not over-exposed. Mean luminance
was 136 against 131 and 127 on photos that already detect, so a brightness slider
cannot tell them apart. The 0.5th-percentile luma (black point) is the signature that
does:

| Photo | Mean luma | Black point (p0.5 luma) | Pixels ≥ 250 |
| --- | --- | --- | --- |
| Failing (veiled) | 136 | **83** | 0.00% |
| Working | 131, 127 | **13 to 37** | — |

Nothing is clipped. Haze lifts the whole tonal range off black and flattens the local
contrast YOLO keys on. `_normalize_exposure` in `backend/app/ai/detect.py` therefore
gates on that black point and, when it fires, stretches each channel from the
0.25th/99.75th percentiles through a 768-entry LUT.

The constants are not knife-edge tunings:

- `_BLACK_POINT_MAX = 50`. Working photos sit at 13–37 and the failing frame at 83,
  so there is a gap; anywhere in **40 to 60** is safe. 50 is the middle of that gap.
- `_CUT = 0.25` (percentile anchors), so a handful of hot pixels cannot disable the
  stretch the way `autocontrast(cutoff=0)` does.
- `_PROBE_PX = 512` is the thumbnail the gate is measured on; percentiles are
  scale-stable. `_GAIN_MAX = 3.0` caps the stretch on near-uniform frames.

Measured at the app's real settings (`conf=0.35`, `imgsz=1280`, CPU, yolov8n):

| Photo | Before | After | Gate |
| --- | --- | --- | --- |
| Reconstructed failing frame | 0 boxes | **0.73, 0.67** | fires |
| Synthetic washed IMG_5085 | 0 boxes | **0.81, 0.64** | fires |
| IMG_5085, img3, darkened own photo | unchanged | **+0.00** | declines |
| 29 real images in the assets folder | — | **zero detections changed** | fires on 2 UI screenshots that detect nothing either way |

Rejected: `ImageEnhance.Brightness` and linear mean-brightness scaling recover zero
detections (they preserve the haze ratios). `autocontrast(cutoff=0)` collapses when
~60 stray hot pixels are present. Fixed `gamma 2.2` wipes out a correctly dark photo.
A second brightening stage for dark frames destroyed a dark low-contrast sample
(0.72 → zero boxes); under-exposure was not the failure mode (gamma 0.40 versions
still detect).
