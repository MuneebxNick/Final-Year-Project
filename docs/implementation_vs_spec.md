# RahScan: implementation vs specification

Read-only comparison of the current codebase with:

- `docs/FYP_Proposal_newFinal.pdf` (16 pages)
- `docs/RahScan SRS Final Draft.pdf` (45 pages)

No application code was changed for this note. Diagram pages were rendered and read as images because text extraction drops the figures. Training evidence is the notebook and artifacts under `backend/data/kaggle/`, plus the weights file the API loads.

Status words mean:

| Status | Meaning |
| --- | --- |
| Matches | The coded behavior follows the spec on this point. |
| Changed | The feature exists, and a rule, formula, endpoint, dataset, or technology differs. |
| Extended | The spec behavior is present and the code adds behavior the spec does not describe. |
| Not implemented | The spec item has no corresponding behavior in the code or saved artifacts. |
| Unverified | The repo does not contain a measurement or artifact that confirms the claim. |

---

## 1. Contradictions inside the documents

These are conflicts between the proposal and the SRS, or between two passages of the same PDF. They are independent of the code.

| Item | Where it conflicts |
| --- | --- |
| Cities on the heatmap | Proposal scope and dashboard: Lahore, Karachi, and Faisalabad. SRS product scope, heatmap, and operating description: Lahore, Karachi, and Rawalpindi. SRS introduction also writes “Rawalpinda”. |
| Local fine-tune set | Proposal methodology: 200–300 images from Lahore. Proposal Phase 1: Karachi and Lahore. SRS assumptions and REQ-10: 500–700 images from Lahore and Karachi. |
| Which YOLO variant ships | SRS §1.2 and §2.5 lock **YOLOv8n**. The proposal trains **YOLOv8n and YOLOv8s** and keeps the better one. SRS §3.3 also says both variants are trained on Colab. |
| Repair status order | Proposal scope: “In Progress → Pending → Resolved”. SRS §2.2, REQ-28, and BR-2: Pending → In Progress → Resolved, and Resolved cannot reopen. |
| Large-pothole cutoff | Proposal methodology, REQ-18–REQ-20, and the severity stimulus for Small/Medium use **under 5%**, **5–15%**, and **above 15%**. SRS §4.3.2 then says **“>50% area calculated”** is Large. |
| Citizen account | SRS §4.1 and REQ-1: no registration and no login. SRS §5.3: role-based access with a citizen role that submits reports and sees its own results. The use-case diagram has no signup. |
| Internet | SRS §2.3: the citizen interface “doesn't require internet connection”. SRS §2.4 and §2.7: uploads, the dashboard, and weather need a stable internet connection. |
| “No pothole” vs safety | SRS §4.2.2 and the proposal flowchart end with “No potholes detected” / “No Action Required”. SRS §5.2 says the system must never indicate that a road has no pothole from a single image. |
| What the lifetime model is trained on | SRS §2.1 says the Random Forest was trained on RDD2022. RDD2022 is the detection dataset. The proposal and SRS §4.5 say the regressor is trained on synthetic deterioration rows. |
| Missing requirement number | Functional requirements jump from REQ-37 to REQ-39. There is no REQ-38. Between REQ-35 and REQ-36 there is an unnumbered requirement (recommended repair date and a human-readable urgency reason). |
| Weather label | SRS §4.5.2 says a missing weather API is marked **“NO LIVE DATA”**. REQ-37 says seasonal defaults and that the prediction is marked. The two sentences do not give the same marker string. |
| Maintenance urgency rule | SRS §4.6.2: Urgent = expected within 7 days, Plan Repair = 8–20 days, Monitor = 20+ days. REQ-42 only says “according to the time until the next expected pothole event” and does not repeat those day cuts. |
| Reference identities | Several SRS reference numbers point at different papers than the same titles in the proposal. Examples: SRS [8] is attributed to Chengula et al. while the proposal’s matching title is Ruseruka et al. [6]; SRS [11] Etak and Soomro matches the proposal’s Lee, Le, and Kim [7]; SRS [12] Fakhri and Dezfoulian matches Piryonesi and EL-Diraby [9]; SRS [13] Marcelino et al. matches Cano-Ortiz et al. [10]; SRS [14] Matarira et al. matches Basnet et al. [11]. SRS [16] is dated 2018 in the reference list and 2017 in §2.5. |
| Cover email | Proposal: `muneebulhassan112255@gmail.com`. SRS: `muneebawang@gmail.com`. |
| Lifetime module citation | SRS §1.1 cites Jocher et al. [5] for the Pothole Lifetime Prediction module. Jocher is the YOLOv8 citation. Lifetime prediction is elsewhere attributed to Pedregosa et al. [18]. |
| “Tree” deterioration | SRS §2.1 says the second layer “predicts the deterioration of the trees”. Surrounding sentences are about potholes. |
| Scikit-learn stack | SRS §2.1 calls Scikit-learn a “Java library”. The citation [18] is the Python scikit-learn paper. |
| Diagram vs text on storage | The ER, class, and database diagrams store detections, lifetime predictions, road segments, and maintenance forecasts as PostgreSQL tables with `is_flagged` and `is_synthetic`. The DFD does the same (`D2`–`D5`). The narrative API list never defines a detections or predictions resource. |
| Admin credential | REQ-23 and the admin UI text say username and password. The sequence diagram’s login step does not name the identifier. The implementation uses email (see REQ-23). |

---

## 2. Functional requirements (REQ-1–REQ-45)

REQ-38 does not exist in the SRS. The unnumbered sentence after REQ-35 is a separate row.

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| REQ-1 | A report form with no install and no login, in any modern browser. | The web UI is Expo web (no install). Submitting a report requires a citizen account. The public landing offers Get Started, Sign up, and Municipal Authority. “Report a Pothole” is on the signed-in home screen. | Changed | `App.tsx` boot route; `src/screens/LandingScreen.tsx`; `src/screens/HomeScreen.tsx`; `backend/app/routers/reports.py` `create_report` uses `require_citizen` |
| REQ-2 | JPG or PNG upload, maximum 10 MB. | The picker accepts `mediaTypes: ['images']` at `quality: 0.8`. There is no byte-size check and no JPG/PNG allow-list. The API decodes whatever Pillow can open. Stored photos are Cloudinary HTTPS URLs, uploaded as WebP (`format: "webp"`). | Changed | `src/screens/ReportScreen.tsx` `pick`; `backend/app/ai/detect.py` `run_detection`; `backend/app/routers/uploads.py` `UPLOAD_FORMAT` |
| REQ-3 | Show a preview of the selected image before submit. | The chosen URI is rendered with a React Native `Image` on the report form. | Matches | `src/screens/ReportScreen.tsx` (`photoUri` preview) |
| REQ-4 | If location is empty, show an error. The stimulus text is “Please enter the road location before submitting.” | The form requires city, area, and street address, with messages “Enter the city”, “Enter the area”, and “Enter the street address”. GPS is optional (`timeout: 15000`). The server rejects an empty city (`"City is required"`). Empty area or address can pass the API if the client is bypassed (`area: str`, `address` default `""`). | Changed | `ReportScreen.tsx` `analyze`; `backend/app/routers/reports.py` `create_report`; `backend/app/schemas.py` `ReportCreate` |
| REQ-5 | A loading screen while the upload is in progress and detection is running. | “Analyze photo” shows a spinner on the button (`loading={analyzing}`). There is no full-screen loading route. | Changed | `src/screens/ReportScreen.tsx`; `src/components/Buttons.tsx` `PrimaryButton` |
| REQ-6 | Annotated result back to the citizen within 5 seconds under normal server load. | Detection is synchronous `model.predict(..., device="cpu")`. No timeout of 5 seconds is coded, and this repo has no timing run against `newv8s.pt`. `docs/yolov8-detect-test-report.md` times an older yolov8n checkpoint and says those numbers are not current. | Unverified | `backend/app/ai/detect.py` `run_detection`; `docs/yolov8-detect-test-report.md` |
| REQ-7 | The result screen shows pothole count, each severity, and a confirmation that the report was submitted. | After analysis, `DetectionResultScreen` lists “Pothole 1…n” with a severity badge and the photo overlays. Submission is a later “Submit Report” action that then resets navigation to My Reports. That screen does not show a “report submitted” confirmation. | Changed | `src/screens/DetectionResultScreen.tsx` |
| REQ-8 | Plain-language errors. Stimulus strings: invalid image “Please upload a valid image file (JPG, PNG).”; server “Something went wrong. Please try again.” | Citizen copy is plain (“Add a photo of the road damage.”, “Could not analyze the photo”, “Could not read the image.”, “Empty image / missing file.”). Those are different sentences, and API `detail` text is shown as-is. | Changed | `ReportScreen.tsx` `analyze`; `backend/app/routers/detect.py`; `backend/app/ai/detect.py` |
| REQ-9 | YOLOv8n (Jocher et al.) is the detection network. | Startup loads Ultralytics YOLO from `backend/weights/newv8s.pt`. That file’s SHA-256 matches `backend/data/kaggle/newv8strainingonpotholes/output/pothole_training/exports/pothole_detector_best.pt` (22,501,034 bytes). Training metadata names the base architecture YOLOv8s, started from `yolov8s.pt`. A separate RDD notebook trains YOLOv8n and is not what `load_model()` opens. | Changed | `backend/app/ai/model.py` `LOCAL_WEIGHTS`; `backend/data/kaggle/pothole-detector-meta/model_metadata.json`; `backend/data/kaggle/newv8strainingonpotholes/newv8strainingonpotholes.ipynb` |
| REQ-10 | Trained on RDD2022 (more than 47,000 images) plus 500–700 local Lahore and Karachi images. | The loaded checkpoint’s training set is Kaggle `chitholian/annotated-potholes-dataset` plus smooth-road negatives from `hemanthhari/road-surface-dataset`, split 70% / 10% / 20% (`train_end = int(0.70*n)`, `val_end = int(0.80*n)`, seed 42). RDD2022 appears only in `backend/data/kaggle/rdd-baseline/` (`aliabdelmenam/rdd-2022`), which is not the loaded weights. No 500–700-image Pakistan folder is in the repo. | Not implemented | `newv8strainingonpotholes.ipynb` cells that set `pothole_data` / `road_data` and the 0.70/0.80 split; `rdd-baseline/kernel-metadata.json`; `model_metadata.json` `training_dataset` |
| REQ-11 | One inference may return multiple potholes. | Every box from `result.boxes` is returned, with `max_det=50`. | Matches | `backend/app/ai/detect.py` `run_detection` |
| REQ-12 | Bounding boxes are drawn on the output image. | The API returns pixel `xyxy` boxes. The client draws numbered rectangles on top of the photo. The server does not return an annotated image file. | Changed | `backend/app/routers/detect.py`; `src/api/detect.ts` `xyxyToPercent`; `src/components/PhotoWithBoundingBox.tsx` |
| REQ-13 | A confidence score in [0, 1] for every pothole. | Detection JSON uses `round(float(box.conf[0]), 2)`, so two decimal places in [0, 1]. The value saved on the report is `Math.round(confidence * 100)` and the column is an integer. | Changed | `backend/app/ai/detect.py`; `src/api/detect.ts` `mapYoloToDraft`; `backend/app/models.py` `Report.confidence` |
| REQ-14 | mAP@0.5 ≥ 80 on a held-out Pakistani road test set. | No Pakistani held-out evaluation is in the repo. The training log for this checkpoint’s run (`args.yaml` matches the notebook: YOLOv8s, 50 epochs, `imgsz=640`, batch 16, `pothole_v1`) peaks at validation **mAP50 = 0.75011** (epoch 40), precision 0.74276, recall 0.67257. Epoch 50 is mAP50 0.73176. That validation split is the public Kaggle mix, and 0.75011 is below 0.80. | Not implemented | `backend/data/kaggle/pothole-detector-meta/results.csv`; `args.yaml`; `model_metadata.json` |
| REQ-15 | Detection inference finishes in under 3 seconds on standard server hardware. | Inference is forced to CPU (`device="cpu"`) at `imgsz=1280`. No measurement for `newv8s.pt` is stored. The August test report’s 0.22–0.24 s figures are for a different checkpoint. | Unverified | `backend/app/ai/detect.py`; `docs/yolov8-detect-test-report.md` |
| REQ-16 | If no pothole is found, return a response and do not raise. | HTTP 200 with `detections: []`, `highest_severity: null`, `message: "No potholes detected."`. The client shows that message and does not open the result screen. | Matches | `backend/app/ai/detect.py` `run_detection`; `ReportScreen.tsx` `analyze` |
| REQ-17 | Three labels, Small / Medium / Large, from box area over full-image area. | `severity_from_area` implements that ratio. Two extra rules then change the label: a single hole that fills the frame is capped from Large to Medium, and in a multi-hole photo a dominant hole can be promoted to Large. | Changed | `backend/app/ai/utils.py` `severity_from_area`, `classify_severity`; `backend/app/ai/detect.py` `_promote_largest_hole` |
| REQ-18 | Area under 5% is Small. | Base rule: `percentage < 5` returns `"Small"`. Promotion does not relabel a hole downward, and the close-up cap only relabels Large. A box under 5% stays Small. | Matches | `backend/app/ai/utils.py` `severity_from_area` |
| REQ-19 | Area from 5% through 15% is Medium. | Base rule: `percentage <= 15` is Medium, so 5.00 and 15.00 are Medium. Promotion can relabel a Medium box to Large when area ≥ 12%, it is at least 2× the next box, and confidence ≥ 0.5. | Changed | `utils.py` `severity_from_area`; `detect.py` `_PROMOTE_MIN_AREA_PCT = 12.0`, `_PROMOTE_RATIO = 2.0`, `_PROMOTE_MIN_CONFIDENCE = 0.5` |
| REQ-20 | Area above 15% is Large, and that detection is flagged for immediate repair. | Base rule: area above 15 is Large. A single close-up (width or height ≥ 20% of the frame, or area > 15%) is forced back to Medium. There is no immediate-repair flag column or status. | Changed | `utils.py` `CLOSEUP_SPAN_PCT = 20.0`, `CLOSEUP_AREA_PCT = 15.0`; `models.py` `Report` has no immediate-repair field |
| REQ-21 | Store the YOLO confidence with the severity for each detection. | The report row stores one integer percent plus one box. Every box is also stored in `reports.detections` (JSONB) with per-box confidence as an integer percent. There is no `detections` table. | Changed | `backend/app/models.py` `Report.confidence`, `Report.detections`; `backend/app/routers/reports.py` `create_report` |
| REQ-22 | Show severity and confidence on the citizen result screen and on the admin report detail. | Admin detail shows `Confidence` as `{report.confidence}%`. The citizen result screen shows severity badges only. `PhotoWithBoundingBox` does not render confidence. | Changed | `src/screens/AdminReportDetailScreen.tsx`; `src/screens/DetectionResultScreen.tsx` |
| REQ-23 | Dashboard access requires username and password. Only authenticated users reach admin features. | Login is email plus password (minimum 6 characters). Admin API routes use `require_admin`. JWT is HS256 with `exp` 7 days. `POST /auth/admin/login` does not check `role == "admin"`; the admin screen rejects a non-admin session after login. | Changed | `backend/app/auth.py` `create_token`; `backend/app/routers/auth.py` `admin_login`; `src/screens/AdminLoginScreen.tsx` |
| REQ-24 | Overview panel: total reports, counts by severity, resolution rate, weekly and monthly trends. | Dashboard cards: Total, Pending, In Progress, Awaiting-verification completed, Resolved. Severity breakdown with counts and percents. Resolution rate is `round(resolved / total * 100)`. Weekly is the last 7 days; monthly is the last 6 calendar months. | Matches | `src/screens/AdminDashboardScreen.tsx`; `src/data/adminInsights.ts` `resolutionRate`, `trendSeries`, `severityShare` |
| REQ-25 | Leaflet heatmap of pothole density and severity for Lahore, Karachi, and Rawalpindi. | Leaflet 1.9.4 plus leaflet.heat 0.2.0 run inside a WebView. The map is centered on Pakistan at `[30.0, 69.0]`, zoom 5. Any report with coordinates is plotted. `cities = ['Lahore', 'Karachi', 'Rawalpindi']` is declared and not used to filter the map. | Changed | `src/components/AdminLeafletHeatmap.tsx`; `src/models/report.ts` `cities`; `src/screens/AdminMapScreen.tsx` |
| REQ-26 | High density/severity zones are red and low zones are green. Clicking a red zone highlights those reports and scrolls the report table. | Heat weights are Small=1, Medium=2, Large=3 (`radius: 28`, `blur: 22`, `max: 3`). The heat layer uses the leaflet.heat default palette because no `gradient` is set. Circle markers are `#1B9A5B` / `#E08A1E` / `#E24B4A`. A click selects the nearest report’s city and area and opens an area card on the map screen. It does not scroll `AdminReportsScreen`. | Changed | `AdminLeafletHeatmap.tsx` `SEVERITY_WEIGHT`, `heatLayer`, `severityColor`; `AdminMapScreen.tsx` `onSelectReport` |
| REQ-27 | Filter and sort reports by city, severity, date range, and repair status. | Municipal queue filters: city (from data), severity, status, date range All / 7 days / 30 days, plus report-id search and sort Newest / Oldest / Severity. Filtering is in the client over the full list returned by `GET /admin/reports`. | Matches | `src/screens/AdminReportsScreen.tsx` |
| REQ-28 | An administrator moves a report along Pending → In Progress → Resolved. | Statuses are `pending`, `assigned`, `inProgress`, `completed`, `escalated`, `resolved`. Admin assign moves pending/escalated/assigned/inProgress to `assigned`. Only the assigned team can accept (`assigned` → `inProgress`) or complete (`inProgress` → `completed`). Admin verify moves `completed` → `resolved`. Admin reject moves `completed` → `inProgress`. There is no direct Pending/In Progress/Resolved control. | Changed | `backend/app/services/workflow.py` `TRANSITIONS`; `backend/app/routers/admin.py`; `backend/app/routers/team.py` |
| REQ-29 | Record repair-team details from the report detail view. | Admin detail assigns one of `roadMaintenance`, `emergencyRepair`, `inspection`, with a due date and optional note. The team later accepts, completes with a photo and note, or escalates. | Extended | `AdminReportDetailScreen.tsx` `assign`; `workflow.py` `assign_report`, `accept_report`, `complete_report`, `escalate_report` |
| REQ-30 | Dashboard shows a 30-day maintenance forecast grouped by urgency, with a repair budget. | `AdminPredictiveScreen` loads `GET /api/predictive-maintenance` and groups Urgent / Plan Repair / Monitor with a PKR budget. Urgency is a percentile of predicted report volume, not “days until the next pothole”. The screen does not say the numbers are synthetic. | Changed | `src/screens/AdminPredictiveScreen.tsx`; `backend/app/ml/maintenance.py` `_assign_categories`, `_budget_estimate_pkr` |
| REQ-31 | Reports and heatmap data display within 5 seconds on a normal network. | The admin list and map load the full report collection with no paging and no coded deadline. No timing result is in the repo. | Unverified | `backend/app/routers/admin.py` `list_reports`; `src/data/reportStore.ts` |
| REQ-32 | A lifetime prediction is produced automatically for each detected pothole when the report is stored. | `POST /api/detect` and `POST /reports` do not call the lifetime model and do not write a prediction row. `LifetimePredictionCard` calls `POST /api/predict/lifetime` when an admin opens the detail screen, using the worst box only. | Changed | `backend/app/routers/detect.py`; `backend/app/routers/reports.py`; `src/components/LifetimePredictionCard.tsx` |
| REQ-33 | Inputs are severity, box area, road type, traffic density, live rain probability and temperature, and season. | The model vector is those seven fields. Traffic sent by the client is ignored; density is derived from road class (Highway=High, Service Road=Medium, Simple Road=Low). Box area is capped at 20% before prediction. Weather comes from Open-Meteo, not OpenWeatherMap. | Changed | `backend/app/ml/lifetime.py` `FEATURE_ORDER`, `BBOX_CAP_PCT`, `traffic_density_from_road_type`, `predict_lifetime`; `backend/app/services/weather_service.py` |
| REQ-34 | Deterioration uses a scikit-learn Random Forest regressor. | `RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)` is trained in `train_lifetime_model.py` and loaded from `backend/app/ml/models/lifetime_model.pkl`. | Matches | `backend/app/ml/train_lifetime_model.py` `train_model`; `backend/app/ml/lifetime.py` `load_lifetime_model` |
| REQ-35 | Output the number of days until critical severity for each detection. | The API field is `days_until_critical`. The code treats it as a repair SLA window and clamps it with `max(2, min(60, round(raw)))`. It is computed for the report’s primary box, not for every box. | Changed | `backend/app/ml/lifetime.py` `predict_lifetime` |
| Unnumbered (after REQ-35) | A recommended repair date and a human-readable urgency reason. | Response fields: `recommended_repair_deadline` (Asia/Karachi date plus the day count), `urgency_note` / `priority_band` in {Critical, High, Moderate, Routine}, and `contributing_factors` as `Severity: … · Road class: … · Rain: …% · Temp: …°C · Season: …`. Bands: days &lt; 7 Critical, ≤ 14 High, ≤ 30 Moderate, else Routine. | Changed | `backend/app/ml/lifetime.py` `_priority_band`, `_contributing_factors`; `backend/app/schemas.py` `LifetimePredictResponse` |
| REQ-36 | Lifetime output appears on the admin report detail for each submitted report. | The detail screen mounts `LifetimePredictionCard`, which requests a live prediction. Nothing is read from a predictions table. | Matches | `src/screens/AdminReportDetailScreen.tsx`; `LifetimePredictionCard.tsx` |
| REQ-37 | If OpenWeatherMap is down, use seasonal default weather and mark that prediction. | There is no OpenWeatherMap client. Open-Meteo failure returns rain **30**, temperature **28.0°C**, season from the Asia/Karachi month, and `source: "fallback"`. The card does not display `weather.source` or the words “No live weather data”. | Changed | `backend/app/services/weather_service.py` `_FALLBACK_RAIN`, `_FALLBACK_TEMP`, `get_weather`; `LifetimePredictionCard.tsx` |
| REQ-38 | Not in the SRS. Numbering goes from REQ-37 to REQ-39. | No separate requirement text to implement. | — | SRS §4.5.3 and §4.6.3 |
| REQ-39 | Analyze historical road-damage rows in PostgreSQL and find repeat patterns by road section. | Forecasts are read from `backend/app/ml/data/maintenance_forecasts_v2.csv` at startup. That file is produced from `synthetic_maintenance_data_v2.csv` (488 segments × 12 months, September 2025–August 2026). Live `reports` rows are not an input. | Changed | `backend/app/ml/maintenance.py` `load_maintenance`; `backend/app/ml/generate_maintenance_data_v2.py`; `backend/app/ml/train_maintenance_model.py` |
| REQ-40 | Use Facebook Prophet for the segment forecast. | `Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=False, n_changepoints=3, changepoint_prior_scale=0.05)` fits offline, one model per segment, `periods=1`, `freq="MS"`. The API does not fit Prophet on request. `prophet>=1.1.0` is in `backend/requirements.txt`. | Changed | `backend/app/ml/train_maintenance_model.py` `forecast_segment`; `backend/requirements.txt` |
| REQ-41 | A 30-day forecast naming segments where a new pothole is statistically likely. | Each cached row has `predicted_reports_next_30_days = max(0, round(yhat))` for the next month. The UI prints “~N reports expected in next 30 days”. The history is synthetic, not observed RahScan reports. | Changed | `train_maintenance_model.py` `forecast_segment`; `AdminPredictiveScreen.tsx` |
| REQ-42 | Classify each segment Urgent, Plan Repair, or Monitor by time until the next pothole. The stimulus uses 7 days, 8–20 days, and 20+ days. | After sorting by predicted count descending: Urgent is the first `ceil(0.2 * n)` rows, Plan Repair the next `ceil(0.5 * n)`, and the rest Monitor. A separate risk string uses trend and predicted/historical ratio: increasing and ratio ≥ 1.5 → “High risk within 1-2 weeks”; increasing or stable and ratio ≥ 1.0 → “Moderate risk within 3-4 weeks”; otherwise “Low risk (30+ days)”. | Changed | `backend/app/ml/maintenance.py` `_assign_categories`, `derive_risk_window` |
| REQ-43 | Budget over 30 days from the count and severity of expected potholes. | `budget = 100_000 + per_report * predicted_reports_next_30_days`, with per-report cost Highway 150,000, Service Road 90,000, Simple Road 60,000 PKR. Severity is not in the formula. | Changed | `backend/app/ml/maintenance.py` `_BUDGET_BASE`, `_COST_PER_REPORT`, `_budget_estimate_pkr` |
| REQ-44 | The full 30-day forecast and budget appear on a Predictive Maintenance panel. | Admin tab “Predictive” lists every returned segment with category, risk window, 30-day count, historical average, trend, and `Estimated budget`. | Matches | `src/screens/AdminTabs.tsx`; `src/screens/AdminPredictiveScreen.tsx` |
| REQ-45 | Forecasts that use synthetic history are clearly marked synthetic on the dashboard. | The panel has no synthetic label, badge, or disclaimer. The CSV has no `is_synthetic` column. | Not implemented | `AdminPredictiveScreen.tsx`; `maintenance.py` `_FORECAST_COLUMNS` |

---

## 3. Business rules (BR-1–BR-8)

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| BR-1 | Only staff change a saved report. Citizens submit and view results. | Citizens can create and read their own reports. Status changes require `admin` or `team`. A third role, `team`, can accept, complete, and escalate. | Extended | `backend/app/auth.py` `require_citizen`, `require_admin`, `require_team`; `workflow.py` |
| BR-2 | The only path is Pending → In Progress → Resolved. Resolved never reopens. A new photo of the same road is a new report. | Resolved has no outgoing transition. Completed work can be rejected back to `inProgress`. Assign, escalate, and reassign also exist. Nothing merges a second report into an old one. | Changed | `workflow.py` `TRANSITIONS` |
| BR-3 | Every image must have a location. A report without a location is rejected. | The form blocks submit without city, area, and street address. The API requires a non-empty city. Coordinates may be null, and a typed address is not required by the schema. | Changed | `ReportScreen.tsx` `analyze`; `reports.py` `create_report`; `schemas.py` `ReportCreate` |
| BR-4 | Every detected pothole gets a lifetime prediction, including Small ones. | One prediction is requested for the worst box when an admin opens the report. Other boxes on the same photo are not sent to the model. Small is an allowed severity and is not filtered out. | Changed | `LifetimePredictionCard.tsx` `worstPotholeIndex`; `lifetime.py` `canonicalize_severity` |
| BR-5 | Maintenance forecasts run only for segments with at least two damage records. One record is reported as not enough data. | All 488 synthetic segments are forecast from 12 monthly rows. There is no minimum-count check against `reports` and no “not enough data” state. | Not implemented | `train_maintenance_model.py` `train_forecasts`; `maintenance.py` `list_segments` |
| BR-6 | Confidence below 0.50 is still shown to administrators, with a warning. | Report confidence is stored as a percent. `LOW_CONFIDENCE_THRESHOLD = 50`, so values under 50 (model score under 0.50) add “Low confidence” on the queue and “Low detection confidence” plus “Prediction reliability: Low” on the detail card. Boxes under the detect floor of 0.35 never reach the database. | Matches | `src/models/report.ts` `isLowConfidence`; `AdminReportsScreen.tsx`; `AdminReportDetailScreen.tsx`; `detect.py` `conf=0.35` |
| BR-7 | The system does not dispatch crews or send notifications by itself. | Assignment, acceptance, and completion happen only through authenticated API calls from the dashboard or team screens. No mail, SMS, or push sender is in the backend. | Matches | `backend/app/routers/admin.py`; `backend/app/routers/team.py` |
| BR-8 | Synthetic maintenance data is labeled on the dashboard so it is not used as real repair evidence. | The predictive panel shows the cached numbers as the forecast. It does not label them synthetic. | Not implemented | `AdminPredictiveScreen.tsx` |

---

## 4. Proposal scope, methodology, and deliverables

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Citizen reporting | Web form: photo and location from a computer or phone, no special hardware. | Expo web plus iOS/Android projects. Photo from camera or library. Location is city, area, address, optional GPS, road type, landmark, and notes. An account is required. | Extended | `app.json`; `ReportScreen.tsx`; `LandingScreen.tsx` |
| Live detection | Real-time YOLOv8 trained on a large public set and fine-tuned on Pakistani road images. | CPU inference on a YOLOv8s checkpoint trained on the Chitholian annotated pothole set plus Hemanthhari smooth-road images. Pakistan fine-tune images are not in that training metadata. | Changed | `model.py`; `model_metadata.json` `training_dataset` |
| Severity and confidence | Boxes, labels Small/Medium/Large, confidence shown to administrators. | Boxes, those three labels (with the close-up and promotion exceptions), confidence on the admin detail as a percent. | Changed | `utils.py`; `AdminReportDetailScreen.tsx` |
| Stored reports | Reports, locations, severity, and timestamps in a structured database. | `reports` in PostgreSQL: photo URL, city, area, road type, status, team, severity, confidence, address, lat/lng, boxes, JSONB detections, submitter, timestamps, deadline, completion photo. | Extended | `backend/app/models.py` `Report` |
| Heatmap cities | Density across Lahore, Karachi, and Faisalabad. | Map of whatever coordinates exist. The maintenance generator includes Lahore, Karachi, Faisalabad, Rawalpindi, and other cities. The map is not limited to three cities. | Changed | `AdminLeafletHeatmap.tsx`; `generate_maintenance_data_v2.py` `CITIES` |
| Workflow in the proposal | Stages written as In Progress → Pending → Resolved, plus team assignment. | See REQ-28. The implemented order starts at `pending`. | Changed | `workflow.py` `TRANSITIONS` |
| Low-quality flags | Flag incomplete location or low-confidence detections. | UI warnings, not database columns. Incomplete means missing coordinates or a blank address (`isIncompleteLocation`). Low confidence is under 50 percent. | Changed | `src/models/report.ts` `isIncompleteLocation`, `isLowConfidence` |
| Dataset step | RDD2022 (47,000+ images, 10+ countries in the proposal; SRS later says six countries) plus 200–300 Lahore photos. Roboflow annotation, versioning, and augmentation (rotation, brightness, blur, flip, rain, haze). Train/val/test split. | Shipped detector training does not use RDD2022 or Roboflow. XML labels are converted in the notebook. Ultralytics `augment=True` uses the library defaults recorded in `args.yaml` (mosaic 1.0, fliplr 0.5, HSV, translate, scale, erasing). Split is 70/10/20. A separate RDD2022 baseline notebook exists and is not the loaded model. | Changed | `newv8strainingonpotholes.ipynb`; `pothole-detector-meta/args.yaml`; `rdd-baseline/kernel-metadata.json` |
| Training step | Train YOLOv8n and YOLOv8s on Google Colab GPU. Tune learning rate, image size, batch, epochs. Report mAP@0.5, precision, recall, F1. Export weights into the backend. | The loaded run is Kaggle, Nvidia Tesla T4, YOLOv8s, 50 epochs, image size 640, batch 16, `lr0=0.01`, `lrf=0.01`, patience 15. Validation metrics are in `results.csv` (no F1 column). Weights are `backend/weights/newv8s.pt`. Runtime prediction uses image size 1280, not 640. An RDD YOLOv8n notebook exists and is not loaded. | Changed | `newv8strainingonpotholes/kernel-metadata.json`; `args.yaml`; `results.csv`; `detect.py` `imgsz=1280` |
| Backend step | FastAPI, PostgreSQL, REST for upload, inference, reports, filters, status, heatmap coordinates, and predictions. | FastAPI 1.0.0 with PostgreSQL via SQLAlchemy and psycopg. Routes differ from the SRS path list (section 7). | Changed | `backend/app/main.py`; section 7 of this file |
| Lifetime step | Random Forest on synthetic data. Features: severity, box size, road type, traffic density, OpenWeatherMap rain and temperature, season. Outputs days to critical, a repair deadline, and a plain urgency explanation, stored on the report and shown on the dashboard. | Random Forest on 2,500 synthetic rows (`SEED = 42`). Label formula: `38 - severity*9 - min(bbox,20)*0.12 - road_type*5 - (rain/100)*10 - season_cut - temperature_penalty + N(0, 2.5)`, then clamp to 2–60. Season cuts: Winter 0, Spring 1, Summer 2, Monsoon 6, Autumn 1.5. Temperature penalties: ≥40°C → 5, ≥35°C → 3, ≤5°C and rain ≥40 → 4, ≤8°C → 2. Weather is Open-Meteo. The result is not stored on the report. | Changed | `backend/app/ml/generate_training_data.py` `_days_until_critical`, `N_ROWS`; `weather_service.py`; `models.py` |
| Maintenance step | Prophet on segments that have enough history. 30-day forecast. Priorities Urgent / Plan Repair / Monitor. Budget. Synthetic history at the start, labeled as such. | Prophet offline, 12 synthetic months per segment, cached CSV, percentile priorities, road-type budget, no synthetic label. See REQ-39–REQ-45. | Changed | `train_maintenance_model.py`; `maintenance.py`; `AdminPredictiveScreen.tsx` |
| Dashboard step | React.js, Leaflet heatmap, filters, statistics, repair assignment. | React 19 runs inside Expo / React Native Web, not a standalone React.js SPA. Leaflet is loaded from unpkg inside a WebView. Stats, filters, and assignment exist, with the workflow in REQ-28. | Changed | `package.json`; `AdminLeafletHeatmap.tsx`; `AdminDashboardScreen.tsx` |
| Testing step | Unit tests for APIs, severity, prediction, and queries. Integration test from upload through the dashboard. Held-out Pakistani images reported with mAP, precision, recall, and failure cases. Supervisor review each sprint. | No `pytest` or `def test_` in the repo. `docs/yolov8-detect-test-report.md` is a manual note about an older checkpoint. The training notebook contains a val/test evaluation; its saved notebook outputs do not include a printed Pakistani mAP. | Not implemented | repository search for `def test_` / `pytest`; `docs/yolov8-detect-test-report.md` |
| Deliverable: curated RDD2022 + Pakistan set | Annotated training set for YOLOv8. | The artifact tied to the loaded weights is the Chitholian + smooth-road mix. RDD2022 is a separate unused-by-runtime notebook. | Not implemented | `model_metadata.json`; `rdd-baseline/` |
| Deliverable: detection model | Real-time boxes, severity, confidence. | Present, with the model, threshold, and severity exceptions above. | Changed | `detect.py`; `utils.py` |
| Deliverable: backend | REST, database, inference pipeline. | Present. Route names and persistence differ from the SRS. | Changed | `backend/app/main.py` |
| Deliverable: lifetime engine | Severity, traffic, and live weather per pothole. | Present as an on-demand SLA score with derived traffic and Open-Meteo. | Changed | `lifetime.py` |
| Deliverable: 30-day maintenance | Forecasts and budgets from historical damage. | Present from synthetic history and a fixed budget formula. | Changed | `maintenance.py` |
| Deliverable: admin dashboard | Heatmap, filterable table, statistics, assignment. | Present, plus a team portal, deadlines, and verify/reject. | Extended | `AdminTabs.tsx`; `TeamTabs.tsx` |
| Deliverable: citizen web UI | Upload, location, annotated result at submit time. | Upload and annotated result happen on Analyze. The database write happens on a second Submit. Login is required. | Changed | `ReportScreen.tsx`; `DetectionResultScreen.tsx` |
| Milestones / Gantt | Six sequential months: data, YOLO training, FastAPI, prediction, React dashboard, testing and documentation. The Gantt chart repeats those six bars with no overlap. | The repo contains all six areas in one tree. Sprint reviews and the month-by-month schedule are not recorded in code. Whether each phase finished in that month is not something the repository can prove. | Unverified | Proposal pages 13–14 (Gantt); the modules exist in `backend/` and `src/` |

Proposal flowchart (page 12), compared with the code:

| Step on the flowchart | What the code does | Status | Evidence |
| --- | --- | --- | --- |
| Start → upload image and location → FastAPI → YOLOv8 | Signed-in citizen analyzes first (`POST /api/detect`), then submits (`POST /reports`). Location is checked in the client before detect. | Changed | `ReportScreen.tsx` `analyze`; `main.py` |
| Pothole detected? No → “No Action Required” | Returns “No potholes detected.” and does not create a report. | Matches | `detect.py`; `ReportScreen.tsx` |
| Yes → boxes, Small/Medium/Large, confidence, store in PostgreSQL | Boxes and labels are computed at detect time. PostgreSQL insert is the later submit, and it stores Cloudinary metadata rather than the image bytes. | Changed | `reports.py` `create_report` |
| Then lifetime and maintenance in parallel, then admin heatmap, then assign team, then “Issue Resolved” | Lifetime runs when the admin detail opens. Maintenance is a precomputed table, not a step on each new report. Assignment and resolution are separate staff actions. | Changed | `LifetimePredictionCard.tsx`; `maintenance.py` `load_maintenance`; `workflow.py` |

---

## 5. Non-functional requirements

### 5.1 Performance

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Detection round trip | Annotate a submitted image within 5 seconds (SRS §5.1). REQ-6 is the same 5 seconds. REQ-15 is inference under 3 seconds. | CPU predict at image size 1280. No current benchmark is stored. | Unverified | `detect.py`; `docs/yolov8-detect-test-report.md` |
| Dashboard load | Full dashboard, heatmap, and table within 5 seconds. REQ-31 repeats this. | Full-list fetch, no paging, no measured budget. | Unverified | `admin.py` `list_reports` |
| API read latency | Report, trend, coordinate, and heatmap reads within 3 seconds. | No timeout or test asserts a 3-second budget. | Unverified | `backend/app/main.py` |
| Concurrent users | At least 50 citizens reporting at once without loss of stability or response time. | No load test and no worker/concurrency setting in the app. Uvicorn is not configured in code. | Unverified | `backend/requirements.txt` lists `uvicorn[standard]`; no load-test file |
| Database queries | Filter and aggregate queries within 2 seconds for up to 10,000 reports. | Queries are unpaginated `SELECT` of reports. No 10,000-row timing is stored. | Unverified | `admin.py` `list_reports`; `reports.py` |
| Lifetime latency | Forecast within 2 seconds, including the weather call and the model. | Weather HTTP timeout is 8.0 seconds, then a fallback. The 2-second budget is not enforced. | Unverified | `weather_service.py` `_TIMEOUT = 8.0`; `lifetime.py` |
| Maintenance latency | Full 30-day forecast within 10 seconds of the dashboard request. | The handler returns an in-memory list built at startup from CSV. A 10-second generation step does not run on the request. Timing is still unmeasured. | Unverified | `maintenance.py` `list_segments`; `predict.py` `predictive_maintenance` |
| Image size | Uploads up to 10 MB without timeout. | No 10 MB limit or acceptance test. Picker quality is 0.8. | Not implemented | `ReportScreen.tsx` `launchImageLibraryAsync` / `launchCameraAsync` |

### 5.2 Safety

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| No false safety assurance | Do not declare a road safe, or free of potholes, from one image. | A miss returns the message “No potholes detected.” The report is not saved. The UI does not add a “road is safe” claim beyond that sentence. | Changed | `detect.py` message `"No potholes detected."` |
| Low-confidence review | Score below 0.50 is marked in the database and on the dashboard before a crew is sent. | The warning is computed in the UI from the stored percent. There is no `is_flagged` column. Assign is still allowed on a low-confidence report. | Changed | `report.ts` `LOW_CONFIDENCE_THRESHOLD`; `models.py` |
| Incomplete location | Incomplete or unclear locations are marked for administrators. | Flag text “Incomplete location” when coordinates are missing or the address is blank. A complete typed address with no GPS is flagged because `!report.coords` is true. | Changed | `report.ts` `isIncompleteLocation` |
| Persist after processing | Save the report as soon as processing succeeds, so a closed browser does not lose it. | Detection is not saved. The row is inserted only when the citizen presses Submit and Cloudinary upload succeeds. | Changed | `DetectionResultScreen.tsx` `submit`; `reports.py` `create_report` |
| Weather failure must not stop detection | Seasonal defaults, prediction completed, marked “No live weather data”. | Detection never calls weather. Lifetime catches Open-Meteo failure and still returns a number with `source: "fallback"`. The screen does not show that marker. | Changed | `weather_service.py` `get_weather`; `LifetimePredictionCard.tsx` |
| Urgent forecasts stay until an admin handles them | Urgent maintenance items remain until manually addressed. No recommendation should create an unsafe road condition. | Forecast rows are static. There is no acknowledge/dismiss action. The copy is a budget and a risk window, not a dispatch order. | Not implemented | `AdminPredictiveScreen.tsx`; `maintenance.py` |

### 5.3 Security

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Admin authentication | Username and password. Admin-only APIs reject anonymous callers. | Email and password. Admin routers depend on `require_admin`. Passwords shorter than 6 characters are rejected by the schema. | Changed | `schemas.py` `LoginRequest`; `auth.py` `require_admin` |
| Role-based access | Citizens submit and see their own results. Admins see every report, the heatmap, predictions, status, and the forecast. Citizens cannot edit admin data. | Three roles: `citizen`, `admin`, `team`. Citizens read only their reports (`submitted_by == user.id`), except `GET /reports/locations`, which returns every unresolved point to any citizen. `POST /api/detect`, `POST /api/predict/lifetime`, `GET /api/predictive-maintenance`, and `GET /api/weather/{location}` do not require a token. | Changed | `reports.py` `list_locations`; `detect.py`; `predict.py`; `auth.py` |
| Input validation, SQL injection, XSS | Validate images and form fields. Reject malicious uploads. Parameterized SQL. Sanitize output. | Pillow must decode the image. Pydantic validates JSON bodies. SQLAlchemy uses bound parameters. React Native text nodes escape string children. There is no malware scanner and no content-type allow-list. | Changed | `detect.py` `InvalidImageError`; `schemas.py`; `models.py` |
| HTTPS in production | Development may use HTTP. Production frontend-to-API traffic is HTTPS. | CORS defaults include `http://localhost:8081`. `app.json` sets Android `usesCleartextTraffic: true` and iOS arbitrary loads. No production HTTPS redirect is coded. | Unverified | `backend/app/config.py` `cors_origins`; `app.json` |
| Database not on the public internet | PostgreSQL is reached only by local TCP from the API host. Credentials live in environment variables. | `DATABASE_URL` is read from the environment. The engine always sets `connect_args={"sslmode": "require"}`, which is a remote TLS connection rather than a local socket. The default `jwt_secret` in code is `"change-me"` if `JWT_SECRET` is empty. | Changed | `backend/app/config.py`; `backend/app/db.py` `get_engine`; `backend/.env.example` |
| Weather API key | OpenWeatherMap key is a server environment variable, never in the client or a public repo. | Open-Meteo is called with no key. Cloudinary cloud name, API key, and secret are server settings. The upload route returns only the cloud name and an unsigned preset, not the API secret. | Changed | `weather_service.py`; `config.py`; `uploads.py` `signature` |
| Session timeout | Admin session ends after 30 minutes of inactivity, then the user is sent to login. | JWT lifetime is 7 days from issue (`timedelta(days=7)`). The client stores `rahscan.session` in `localStorage` and signs out only when `/auth/me` returns 401. There is no idle timer. | Not implemented | `backend/app/auth.py` `create_token`; `src/data/sessionStore.ts` |
| Password storage | A recognized hash. No plaintext passwords in the database. | `bcrypt.hashpw` with `bcrypt.gensalt()` (library default cost; the call does not pass a rounds argument). `verify_password` uses `bcrypt.checkpw`. The seed writes hashes, not the raw passwords. | Matches | `backend/app/auth.py` `hash_password`; `backend/seed.py` |

### 5.4 Software quality

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Reliability | ≥ 95% uptime during the demo. A failed module must not crash the process. Critical errors are logged. | Model, lifetime, and maintenance loaders log and leave the feature unavailable (HTTP 503) instead of failing startup. Detection and lifetime errors become HTTP 400/500/503. Uptime is not measured in the repo. | Unverified | `model.py` `load_model`; `lifetime.py` `load_lifetime_model`; `maintenance.py` `load_maintenance`; `main.py` `lifespan` |
| Usability | A citizen can report with no instructions. Everyday English. Consistent admin layout. | Labels and errors are short English sentences. The report screen also tells the user how to stand and frame the photo. Whether that meets “no instructions” is a judgment, not a test result. | Unverified | `ReportScreen.tsx` lede; `LandingScreen.tsx` |
| Maintainability | Separate modules for detection, severity, prediction, database, and routing, with enough comments. Schema can gain fields without a rewrite. | Those areas are separate packages (`ai/`, `ml/`, `routers/`, `models.py`). `ensure_schema()` adds columns with `ADD COLUMN IF NOT EXISTS` rather than migrations. | Matches | `backend/app/main.py`; `backend/app/db.py` `ensure_schema` |
| Scalability / pagination | Above 10,000 reports, list APIs paginate. | List endpoints return every row. No `limit` or `offset` parameter exists. | Not implemented | `admin.py` `list_reports`; `reports.py` `my_reports`; search of `src/` for pagination |
| Portability | Ubuntu 22.04+, Python 3.10+, dependencies in a requirements file. | `backend/requirements.txt` pins minimum versions (FastAPI, Ultralytics, scikit-learn, Prophet, psycopg, bcrypt, PyJWT). Python itself is not pinned. The UI is an Expo app, which the SRS does not list. | Changed | `backend/requirements.txt`; `package.json` |
| Testability | Unit tests for detection, severity, prediction, and every API, run from the command line. | Those modules are importable, and the training scripts are command-line tools. No automated test suite is in the repo. | Not implemented | repository search for `pytest` and `def test_` |
| Correctness | Detection, severity, and prediction follow the trained model and the programmed rules. | Detection uses the loaded YOLO weights and then the severity rules in `utils.py` / `detect.py`. Lifetime uses the loaded forest. Maintenance serves the cached CSV. Unused client functions `predictLifetime`, `predictiveSegments`, and `mockDetect` in `src/models/report.ts` are not called. | Matches | `detect.py`; `lifetime.py`; `maintenance.py`; call-site search of `src/` |
| Error display | Users never see raw stack traces. | Handlers return a `detail` string. FastAPI’s default validation error shape can still reach the client through `api()` in `src/api/client.ts`. A production `debug` flag is not set in `main.py`. | Changed | `src/api/client.ts` `detailMessage`; `backend/app/main.py` |

### 5.5 Documentation the SRS promises

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| User manual | Step-by-step citizen guide in non-technical language. | No user manual file in the repo. | Not implemented | `docs/` contains the two PDFs and `yolov8-detect-test-report.md` |
| Admin guide | Login, filters, heatmap, predictions, status, assignment. | No admin guide file in the repo. | Not implemented | `docs/` |
| Technical API document | Endpoints, payloads, schema, integrations. | No standalone API document. FastAPI’s generated schema is available only when the server is running (`title="RahScan API"`). | Not implemented | `backend/app/main.py` |
| Final project report | Design, implementation, tests, and metrics for LGU. | Not in this repository. | Unverified | `docs/` |

### 5.6 Operating environment and constraints

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Browsers | Chrome, Firefox, Edge, Safari on Windows, macOS, Linux, Android, iOS. No plugins. | The web target is Expo web (`expo start --web`). Native projects exist. Leaflet’s script is loaded from unpkg inside a WebView, which is not a browser plugin. Cross-browser certification is not in the repo. | Unverified | `package.json` scripts; `app.json`; `AdminLeafletHeatmap.tsx` |
| Server | Ubuntu 22.04+, Python 3.10+, FastAPI, PostgreSQL 14+. | The code is FastAPI plus PostgreSQL. OS and Postgres major version are not declared in the repo. The DB URL uses `sslmode=require`. | Unverified | `db.py`; `requirements.txt` |
| Training environment | Google Colab free GPU. | Saved kernels request Kaggle GPU (`enable_gpu: true`, Tesla T4 on the YOLOv8s kernel). | Changed | `newv8strainingonpotholes/kernel-metadata.json` |
| Free / open-source stack | Tools and libraries must be free. Weather from OpenWeatherMap’s free tier. | Ultralytics, scikit-learn, Prophet, FastAPI, PostgreSQL, Leaflet, and Expo are the libraries in use. Weather is the no-key Open-Meteo API. Cloudinary is an extra hosted service. | Changed | `requirements.txt`; `package.json`; `weather_service.py` |
| Hardware | YOLOv8n on CPU or a low-end GPU. At least 20 GB disk for images, Postgres, and weights. | The loaded model is YOLOv8s and `predict` sets `device="cpu"`. `newv8s.pt` is about 21 MB. Disk capacity of a deployment host is not in the repo. | Changed | `detect.py` `device="cpu"`; weights file size 22,501,034 bytes |
| Camera | The browser file dialog only. The server does not talk to the camera. | Web uses the image library picker. Native can open the camera through `expo-image-picker`. The server receives bytes only. | Extended | `ReportScreen.tsx` `pick`; `app.json` camera permission strings |

---

## 6. Tech stack and external services

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Frontend | React.js SPA for citizens and admins. | Expo SDK ~57.0.15, React 19.2.3, React Native 0.86.2, React Navigation 7, `react-native-web`. | Changed | `package.json` |
| Maps | Leaflet.js inside the React admin app. | Leaflet 1.9.4 and leaflet.heat 0.2.0 from `https://unpkg.com`, inside `react-native-webview`. | Changed | `AdminLeafletHeatmap.tsx` `buildMapHtml` |
| API | FastAPI, JSON, multipart image upload. | FastAPI, Pydantic v2, `python-multipart`. The client uses `fetch` (`src/api/client.ts`), not Axios. | Matches | `requirements.txt`; `src/api/client.ts` |
| Detection library | Ultralytics YOLOv8 8.x, weights loaded at startup. | `ultralytics>=8.3.0`. `load_model()` runs in the FastAPI lifespan. | Matches | `requirements.txt`; `main.py` `lifespan`; `model.py` |
| Lifetime library | scikit-learn Random Forest. | `scikit-learn>=1.5.0`, `joblib`, `pandas`. | Matches | `requirements.txt`; `train_lifetime_model.py` |
| Maintenance library | Facebook Prophet. | `prophet>=1.1.0`, used by the offline trainer. | Matches | `requirements.txt`; `train_maintenance_model.py` |
| Database | PostgreSQL 14+ through a Python driver, not exposed to browsers. | SQLAlchemy 2 and `psycopg` 3. Browsers talk only to FastAPI. Major version 14 is not pinned. | Changed | `requirements.txt`; `db.py` |
| Weather | OpenWeatherMap free tier: rain probability and temperature. | Open-Meteo geocoding `https://geocoding-api.open-meteo.com/v1/search` and forecast `https://api.open-meteo.com/v1/forecast` (`current=temperature_2m,weather_code`, `hourly=precipitation_probability`, `timezone=Asia/Karachi`). | Changed | `weather_service.py` |
| Geocoding | A text location string. The SRS does not name a second geo provider. | Reverse geocode uses Nominatim (`https://nominatim.openstreetmap.org/reverse`) and Photon (`https://photon.komoot.io/reverse`), timeout 10 seconds. | Extended | `backend/app/services/geocode_service.py`; `backend/app/routers/geocode.py` |
| Images | Server storage of uploaded images (`image_path` in the diagrams). | Cloudinary. Unsigned preset default `rahscan_reports_unsigned`, folder `rahscan/reports`, delivery format WebP. | Changed | `config.py`; `uploads.py`; `src/api/cloudinary.ts` |
| Auth tokens | Session login. The SRS does not name JWT. | PyJWT HS256, bearer header, 7-day expiry. | Extended | `auth.py`; `requirements.txt` `PyJWT`, `bcrypt` |
| Annotation tool | Roboflow for labels, versions, and augmentation. | The loaded training notebook converts Pascal VOC XML itself. No Roboflow client is in the application code. | Not implemented | `newv8strainingonpotholes.ipynb`; search of `backend/app` |
| Training host | Google Colab. | Kaggle kernels under `backend/data/kaggle/`. | Changed | `kernel-metadata.json` files in that tree |

---

## 7. API endpoints

The SRS §3.4 list is the left column. None of those six paths exist under that spelling. The running app mounts the routes in `backend/app/main.py`.

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| `POST /upload` | Image plus location string. Runs YOLO, saves the report, returns the annotated result. | Split into `POST /api/detect` (image only, no save) and `POST /reports` (citizen JSON plus Cloudinary URL). | Changed | `backend/app/routers/detect.py`; `backend/app/routers/reports.py` |
| `GET /reports` | All reports, optional filters for city, severity, date range, and status. | `GET /admin/reports` returns every report to an admin, with no query filters. `GET /reports/me` returns the caller’s reports. Filtering is in `AdminReportsScreen`. | Changed | `admin.py` `list_reports`; `reports.py` `my_reports` |
| `GET /reports/{id}` | One report, including detection, lifetime prediction, and status. | `GET /admin/reports/{report_id}` and citizen `GET /reports/{report_id}` (owner only). The payload has detections and status. Lifetime is not in the body. | Changed | `admin.py` `get_report`; `reports.py` `get_report`; `schemas.py` `AdminReportDetail` |
| `PUT /reports/{id}/status` | Admin updates repair status. | No PUT status route. Status changes are `POST /admin/reports/{id}/assign`, `/verify`, `/reject`, and `POST /team/reports/{id}/accept`, `/complete`, `/escalate`. | Changed | `admin.py`; `team.py` |
| `GET /heatmap` | Coordinates and severity for the Leaflet layer. | `GET /reports/locations` returns lat, lng, severity, city, and area for unresolved reports. It requires a citizen token. The admin map uses the admin report list, which already includes coordinates. | Changed | `reports.py` `list_locations`; `AdminMapScreen.tsx` |
| `GET /maintenance-forecast` | Prophet 30-day forecast and budgets. | `GET /api/predictive-maintenance` with optional `province`, `city`, and `category`. No authentication dependency. | Changed | `backend/app/routers/predict.py` `predictive_maintenance` |
| Lifetime call | The sequence diagram shows the backend calling weather and the forest while handling the upload. | `POST /api/predict/lifetime` is a separate JSON call. The card sends severity, box percent, road type, derived traffic, and a location string. | Changed | `predict.py` `predict_pothole_lifetime`; `src/api/predict.ts` |
| Other routes present | Not in the SRS endpoint list. | `GET /health`. `GET /api/weather/{location}`. `GET /api/geocode/reverse`. `POST /uploads/signature`. `POST /auth/signup`, `POST /auth/login`, `POST /auth/admin/login`, `GET /auth/me`. `GET /team/stats`. `POST /ai/detect` returns 410 with “This dummy detector has been retired. Use POST /api/detect with an image.” | Extended | `backend/app/main.py`; `backend/app/routers/ai.py` |

---

## 8. Database schema

SRS Figure 5.6.3 (and the matching ER diagram, Figure 5.6.1) specifies these tables: `road_segments`, `reports`, `detections`, `lifetime_predictions`, `maintenance_forecasts`, `repair_logs`, `admin_users`.

The application creates three tables: `users`, `reports`, `report_events`. `ensure_schema()` alters those tables. Forecasts and the lifetime training set are CSV files. The lifetime model is `lifetime_model.pkl` plus `feature_encoders.json`.

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| `admin_users` | `user_id` serial, unique `username`, `password_hash`, `role` default `'admin'`, `created_at`. | `users`: UUID `id`, `name`, unique `email`, `password_hash`, `role` check (`citizen`, `admin`, `team`), nullable `team`, `created_at`. Citizens and field teams share this table. | Changed | `backend/app/models.py` `User`; `db.py` `users_role_check` |
| `reports` | Serial `report_id`, `location`, `city`, timestamp, status default Pending, `image_path`, `is_location_flagged`, FK `segment_id`. | UUID `id`, integer `ref_number` from `reports_ref_number_seq`, `photo_url`, `photo_public_id`, `city`, `area`, `road_type`, `status`, `assigned_team`, `timeline_stage`, `severity`, integer `confidence`, `description`, `landmark`, `address`, nullable `lat`/`lng`, one bbox (`bbox_left/top/width/height`), JSONB `detections`, `submitted_by` FK to `users`, `created_at`, `deadline_at`, `assignment_note`, completion photo fields. No `segment_id` and no `is_location_flagged`. | Changed | `models.py` `Report`; `db.py` `ensure_schema` |
| `detections` | One row per box: coordinates, severity, float confidence, `is_flagged`, FK to report. | No table. Boxes live in `reports.detections` JSONB. The primary box is also copied into the float bbox columns and the integer confidence column. | Changed | `models.py` `Report.detections`; `reports.py` `create_report` |
| `lifetime_predictions` | `prediction_id`, FK to detection, predicted days, repair deadline, urgency text, `weather_data_used` boolean, `created_at`. | No table. Each admin page view calls the model and discards the result when the screen closes. | Not implemented | `models.py`; `LifetimePredictionCard.tsx` |
| `road_segments` | `segment_id`, name, city, `total_damage_count`. | No table. Segment ids exist only inside the maintenance CSV. | Not implemented | `maintenance.py` `_FORECAST_COLUMNS` |
| `maintenance_forecasts` | FK to segment, date, urgency, float budget, `is_synthetic` default false, `generated_at`. | CSV columns: `segment_id`, `province`, `city`, `area`, `road_type`, `predicted_reports_next_30_days`, `historical_avg_reports_per_30_days`, `trend_direction`. Category, risk window, and budget are computed in `load_maintenance()`. 488 segments. No `is_synthetic`. | Changed | `maintenance_forecasts_v2.csv` (489 lines including the header); `maintenance.py` |
| `repair_logs` | `log_id`, report FK, admin user FK, `action_taken`, `action_timestamp`. | `report_events`: UUID `id`, `report_id` FK cascade, nullable `actor_id`, `event_type`, `from_status`, `to_status`, `note`, `photo_url`, `assigned_team`, `deadline_at`, `created_at`. Event types include submitted, assigned, accepted, completed, verified, rejected, escalated. | Changed | `models.py` `ReportEvent`; `workflow.py` `_EVENT_TYPE` |
| Status values stored | Diagrams: Pending / In Progress / Resolved. | Strings `pending`, `assigned`, `inProgress`, `completed`, `escalated`, `resolved`, plus `timeline_stage` values `submitted`, `underReview`, `repairAssigned`, `inProgress`, `resolved`. | Changed | `schemas.py` `ReportStatus`; `workflow.py` `timeline_stage_for` |
| Identifiers | Serial integers. | UUID primary keys, plus a human `ref_number` on reports. | Changed | `models.py` |

Encoder integers stored beside the lifetime model (`feature_encoders.json`): severity Small=0, Medium=1, Large=2; road Simple Road=0, Service Road=1, Highway=2; traffic Low=0, Medium=1, High=2; season Winter=0, Spring=1, Summer=2, Monsoon=3, Autumn=4.

---

## 9. Diagrams

| Item | Spec says | What is implemented | Status | Evidence |
| --- | --- | --- | --- | --- |
| Proposal flowchart (page 12) | Citizen upload → FastAPI → YOLOv8 → if no pothole, stop; else boxes, severity, confidence, PostgreSQL, then lifetime and maintenance, admin heatmap, assign team, end at resolved. | The branch for “no pothole” matches. Storage, prediction, and resolution are separate later steps, and maintenance does not run on each new photo. | Changed | `detect.py`; `reports.py`; `maintenance.py` `load_maintenance` |
| Proposal Gantt (page 14) | Six non-overlapping month bars: dataset; YOLOv8 training; backend and AI; lifetime and maintenance; React and Leaflet; testing and documentation. | The repository holds dataset notebooks, weights, API, both predictors, and the Expo UI together. The calendar itself is not verifiable from code. | Unverified | Proposal page 14; tree under `backend/` and `src/` |
| Figure 4.1 Use case | Actors: Citizen (open UI, upload, enter location, submit, view result), Admin (login, heatmap, filter, detail, status Pending→In Progress→Resolved, assign team, forecast, lifetime), YOLOv8 (detect, boxes, severity, confidence), OpenWeatherMap included by the lifetime use case. | Citizen and admin use cases exist, with signup and a field-team actor added. Status and weather provider differ. YOLO is a library call, not a separate actor. | Changed | `App.tsx` routes; `weather_service.py`; `TeamTabs.tsx` |
| Figure 4.2 Activity | Validate image and location; YOLO; if confidence &lt; 0.50, flag; save to PostgreSQL; call OpenWeatherMap; Random Forest; save prediction; update maintenance; return annotated result; admin reviews and sets Pending→In Progress→Resolved. | Validation is split between the client and Pillow. Low confidence is a UI warning after save. Weather is Open-Meteo and only runs on the later lifetime request. Maintenance is not updated from the new report. Admin status flow is the longer state machine. | Changed | `ReportScreen.tsx`; `detect.py`; `lifetime.py`; `workflow.py` |
| Figure 4.3 State machine | States include SUBMITTED, REJECTED (bad input), PROCESSING, NO_POTHOLE_FOUND, DETECTED, PREDICTION_GENERATED, PENDING, IN_PROGRESS, RESOLVED, and a parallel FLAGGED region when confidence &lt; 0.50 or location is incomplete. Resolved is final. Invalid input returns an error. | HTTP errors cover a bad image. A miss is a JSON message, not a stored `NO_POTHOLE_FOUND` report. There is no `PREDICTION_GENERATED` status. Stored statuses add assigned, completed, and escalated. `rejected` is an event that sends `completed` back to `inProgress`, which is a different meaning of “rejected” than the diagram. Flagging is not a state. | Changed | `workflow.py` `TRANSITIONS`; `detect.py` |
| Figure 4.4 Sequence | React → `POST /upload` → FastAPI validates → YOLO → severity → save report and detections → OpenWeatherMap → Random Forest → save prediction → annotated image back to the citizen → admin `GET /reports` → heatmap and table. | The client posts `POST /api/detect`, then later `POST /reports`. Weather and the forest run on `POST /api/predict/lifetime` from the admin card. The admin list is `GET /admin/reports`. | Changed | `src/api/detect.ts`; `src/api/predict.ts`; `main.py` |
| Figure 4.5 DFD | Level 0: citizen and admin around process 0, plus OpenWeatherMap. Level 1 processes: validate, YOLO, severity, lifetime, save, maintenance, serve dashboard. Stores D1 reports, D2 detections, D3 predictions, D4 road segments, D5 maintenance forecasts, all PostgreSQL. | Process split is real (detect, severity, lifetime, maintenance, admin reads) but D2–D5 are not PostgreSQL tables. Weather is Open-Meteo. | Changed | `models.py`; `maintenance.py`; `weather_service.py` |
| Figure 4.6 Component | Frontend package: Citizen UI and Admin Dashboard, both React.js. Backend: FastAPI gateway, YOLOv8, severity, scikit-learn lifetime, Prophet maintenance. Data: PostgreSQL holding reports, detections, predictions, segments, forecasts, users. External: OpenWeatherMap, Roboflow (training only), Google Colab (training only). | The same three runtime ideas exist (UI, API, predictors). UI is Expo. Images are Cloudinary. Maps use a WebView. Training artifacts point at Kaggle, not Colab or Roboflow. PostgreSQL does not hold the five analytical stores. | Changed | `package.json`; `main.py`; `kernel-metadata.json` |
| Figure 5.6 Architecture | Three layers. Presentation: citizen form and result; admin heatmap, table, statistics, maintenance panel. Application: `POST /upload`, `GET /reports`, `PUT /reports/status`, `GET /heatmap`, `GET /maintenance-forecast`, plus YOLO, severity, Random Forest, Prophet. Data: reports, detections, predictions, segments, forecasts, admin users. Training-only arrows from RDD2022, Roboflow, and Colab. OpenWeatherMap at runtime. | Presentation and a FastAPI application layer exist. Endpoint names, the weather provider, the training source, and the physical tables differ, as in sections 7 and 8. | Changed | `main.py`; `model_metadata.json`; `models.py` |
| Figure 5.6.2 Class | Classes `Report`, `Detection`, `LifetimePrediction`, `AdminUser`, `RoadSegment`, `MaintenanceForecast`, `RepairLog`, `YOLOv8DetectionEngine`, `PotholeLifetimePredictionModel`, `PredictiveMaintenanceModel`, with the methods drawn on the figure (`calculateSeverity`, `flag`, `generateForecast`, `assignRepairTeam`, and others). | Persistence is SQLAlchemy `User`, `Report`, `ReportEvent`. Behavior is functions: `run_detection`, `classify_severity`, `predict_lifetime`, `list_segments`, `assign_report`. There are no classes with the diagram’s method names. | Changed | `models.py`; `detect.py`; `utils.py`; `lifetime.py`; `maintenance.py`; `workflow.py` |
| Figure 5.6.1 ER | REPORT 1—M DETECTION 1—1 LIFETIME_PREDICTION; REPORT M—1 ROAD_SEGMENT 1—M MAINTENANCE_FORECAST; REPORT 1—M REPAIR_LOG M—1 ADMIN_USER. Attributes as listed in section 8. | `users` 1—M `reports` 1—M `report_events`. Detections are JSONB. Predictions, segments, and forecasts are not entities in the database. | Changed | `models.py` relationships |
| Figure 5.6.3 Database | Physical types: serial keys, `confidence_score FLOAT`, `is_flagged BOOLEAN DEFAULT FALSE`, `is_synthetic BOOLEAN DEFAULT FALSE`, status default `'Pending'`, role default `'admin'`. | UUID keys, `confidence INTEGER`, no flag or synthetic booleans, no status default of Pending in the ORM (the insert sets `status="pending"`). | Changed | `models.py`; `reports.py` `create_report` |

---

## 10. Behavior in the code that the spec does not describe

These are implemented and are outside the proposal and the SRS.

| Item | What the code does | Evidence |
| --- | --- | --- |
| Citizen accounts | Signup and login, demo user `demo@rahscan.local`. | `backend/app/routers/auth.py` `signup`; `backend/seed.py` |
| Field team portal | Three teams, their own login chip, queue, accept / complete / escalate, completion photo. | `TeamTabs.tsx`; `team.py`; `seed.py` |
| Extra statuses | `assigned`, `completed` (“Awaiting verification”), `escalated`, overdue deadlines. | `workflow.py`; `src/models/report.ts` `reportStatusLabels` |
| Audit trail | `report_events` with actor, note, and photo. | `models.py` `ReportEvent` |
| Public reference numbers | `reports.ref_number` sequence, shown as the report id in the admin queue. | `models.py` `Report.ref_number`; `db.py` |
| Road class | Highway, Service Road, Local Road. Local is encoded as “Simple Road” for the model. | `schemas.py` `RoadType`; `lifetime.py` `_ROAD_ALIASES` |
| GPS and reverse geocode | Browser geolocation, then Nominatim or Photon to fill city, area, and address. | `ReportScreen.tsx`; `geocode_service.py` |
| Cloudinary | Photos and completion photos are remote URLs, WebP on upload. | `uploads.py`; `cloudinary.ts` |
| Close-up cap and dominant-hole promotion | Single-hole close-ups cannot stay Large. A dominant hole at ≥12% area, ≥2× the next hole, and confidence ≥ 0.5 can become Large. | `utils.py`; `detect.py` |
| EXIF orientation | `ImageOps.exif_transpose` before width and height are read. | `detect.py` `run_detection` |
| Detect thresholds | `conf=0.35`, `iou=0.5`, `imgsz=1280`, `max_det=50`, CPU only. | `detect.py` |
| Lifetime as an SLA | Output is documented in code as a repair window, clamped to 2–60 days, not a physical failure date. Bbox contribution is capped at 20%. | `lifetime.py` module docstring; `generate_training_data.py` |
| Nationwide synthetic maintenance | Provinces and cities beyond the three-city heatmap, 488 segments, 12 months. | `generate_maintenance_data_v2.py` |
| Separate risk window | “High risk within 1-2 weeks”, “Moderate risk within 3-4 weeks”, “Low risk (30+ days)” in addition to the percentile category. | `maintenance.py` `derive_risk_window` |
| Citizen map | Signed-in users can open a map of unresolved report locations. | `UserMapScreen.tsx`; `GET /reports/locations` |
| Retired stub | `POST /ai/detect` answers 410. | `backend/app/routers/ai.py` |
| Unused client formulas | `predictLifetime`, `predictiveSegments`, and `mockDetect` in `src/models/report.ts` have no call sites. The live prediction path is the API. | `src/models/report.ts`; search of `src/` |

---

## 11. Summary

### Counts

Every comparison row in sections 2–9, except the REQ-38 gap row (that number is missing from the SRS, so it has no status):

| Status | Rows |
| --- | --- |
| Matches | 18 |
| Changed | 94 |
| Extended | 9 |
| Not implemented | 18 |
| Unverified | 18 |
| Total | 157 |

Numbered requirements REQ-1–REQ-37 and REQ-39–REQ-45 (44 rows):

| Status | Count | Requirements |
| --- | --- | --- |
| Matches | 9 | REQ-3, REQ-11, REQ-16, REQ-18, REQ-24, REQ-27, REQ-34, REQ-36, REQ-44 |
| Changed | 28 | REQ-1, REQ-2, REQ-4, REQ-5, REQ-7, REQ-8, REQ-9, REQ-12, REQ-13, REQ-17, REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-25, REQ-26, REQ-28, REQ-30, REQ-32, REQ-33, REQ-35, REQ-37, REQ-39, REQ-40, REQ-41, REQ-42, REQ-43 |
| Extended | 1 | REQ-29 |
| Not implemented | 3 | REQ-10, REQ-14, REQ-45 |
| Unverified | 3 | REQ-6, REQ-15, REQ-31 |

Business rules:

| Status | Count | Rules |
| --- | --- | --- |
| Matches | 2 | BR-6, BR-7 |
| Changed | 3 | BR-2, BR-3, BR-4 |
| Extended | 1 | BR-1 |
| Not implemented | 2 | BR-5, BR-8 |

The proposal, non-functional, stack, API, schema, and diagram tables are mostly Changed. Further Not implemented rows include the 10 MB upload cap, acknowledgement of urgent forecasts, the 30-minute idle logout, pagination, automated tests, the user/admin/API manuals, Roboflow on the shipped training path, the `lifetime_predictions` and `road_segments` tables, and a synthetic-data label. Further Unverified rows include every numeric performance budget, 95% uptime, browser certification, the host Ubuntu and PostgreSQL versions, and the six-month Gantt.

### Deviations most likely to be questioned

1. **The detector is YOLOv8s trained on the Chitholian pothole set plus smooth-road negatives, on Kaggle.** The SRS fixes YOLOv8n, RDD2022, 500–700 Pakistan images, and Colab. The best saved validation mAP50 for this run is **0.75011**, on that public validation split, which is below the SRS bar of 80 and is not a Pakistani held-out test.
2. **Citizens must register.** REQ-1 and §4.1 say there is no account.
3. **The repair workflow is not Pending → In Progress → Resolved.** It is pending → assigned → in progress → completed → resolved, with reject back to in progress and a separate field-team role. The proposal’s arrow even reverses Pending and In Progress.
4. **Lifetime prediction is an on-demand SLA score, not a stored “days until the hole becomes critical”.** Traffic is copied from road class. Box area is capped at 20%. Weather is Open-Meteo with fallback rain 30 and 28°C, and the screen never shows “No live weather data”.
5. **Predictive maintenance does not read PostgreSQL and does not use the 7 / 8–20 / 20+ day rule.** It serves 488 synthetic segments, ranked by predicted count (top 20% Urgent, next 50% Plan Repair), with budget `100000 + road-type cost × predicted reports`. The dashboard does not mark the data synthetic (REQ-45, BR-5, BR-8).
6. **The published API and the ER diagram are not the schema.** There is no `POST /upload`, `PUT /reports/{id}/status`, `GET /heatmap`, or `GET /maintenance-forecast`, and no tables for detections, lifetime predictions, road segments, or maintenance forecasts.
7. **Sessions last 7 days, not 30 idle minutes.** Passwords are bcrypt hashes, which does match the hashing rule.
8. **Severity is not only the 5% / 15% rule.** A close-up single hole is capped at Medium, and a dominant hole can be promoted to Large at 12% area.

### Gaps a viva is likely to press

- How the loaded weights relate to RDD2022, and why mAP@0.5 ≥ 80 on Pakistani roads is not in the repo.
- Why the SRS says YOLOv8n and OpenWeatherMap while the process loads `newv8s.pt` and Open-Meteo.
- Why a citizen cannot submit without an account, given REQ-1.
- What “days until critical” means if the trainer’s own comment calls it a repair SLA clamped to 2–60 days, and why it is not saved.
- Why Prophet output is a cached CSV, how Urgent is chosen, and where the UI says the history is synthetic.
- Where `is_flagged`, `is_synthetic`, and the diagram’s seven tables went.
- Where the unit tests, the 5-second and 3-second measurements, and the 30-minute session timeout are.
- The internal document conflicts in section 1, especially the 15% vs 50% Large rule, the Faisalabad vs Rawalpindi city list, the 200–300 vs 500–700 local images, and the missing REQ-38.
