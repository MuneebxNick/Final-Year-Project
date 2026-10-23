# Cheatsheet

## 1. 30-second summary

RahScan ek Expo app hai. Web aur phone ek codebase. API FastAPI hai. Rows PostgreSQL. Photos Cloudinary. Detection YOLOv8s `newv8s.pt`, CPU. Severity area rule. Lifetime synthetic Random Forest, admin detail par, save nahi. Maintenance 488 synthetic segments, Prophet offline, CSV. Map Leaflet. Login bcrypt aur 7 din JWT.

Detail notes `01` se `09`. Yahan sirf yaad rakhne wali lines.

## 2. One-page summary

**Boot.** `index.ts` → `App` → `sessionStore.hydrate`. Token na ho to Landing. `admin` → `AdminTabs`. `team` → `TeamTabs`. Warna `UserTabs`.

**Citizen report.** `ReportScreen.analyze` → `POST /api/detect` (sirf photo). No box → koi row nahi. `DetectionResultScreen.submit` → Cloudinary → `POST /reports` status `pending`.

**Staff.** Admin assign → `assigned`. Team accept → `inProgress`. Complete → `completed`. Admin verify → `resolved`. Reject → wapas `inProgress`. Escalate → team `unassigned`. Galat jump 409.

**Lifetime.** Card `POST /api/predict/lifetime`. Weather Open-Meteo. Fail: rain 30, 28°C. Days 2–60. DB mein nahi.

**Maintenance.** `GET /api/predictive-maintenance` startup CSV. Prophet request par nahi. Urgent top 20% count. Screen “synthetic” nahi likhti.

**Map.** Heat `resolved` reports chhod deti hai. Weight Small 1, Medium 2, Large 3. Web iframe. Phone WebView.

## 3. Glossary

| Word | Seedha matlab |
| --- | --- |
| YOLO | Photo par box lagane wala model. Hamara `YOLOv8s`, ek class `pothole`. |
| Bounding box | `x1,y1,x2,y2` pixels. App percent mein save karti hai. |
| Confidence | Model kitna sure hai. API 0–1. DB integer percent. |
| mAP50 | Validation par, box tab sahi jab overlap (IoU) ≥ 0.50. Hamara peak 0.75011. |
| Precision | Lagaye hue boxes mein kitne sahi. |
| Recall | Asli holes mein kitne pakde. |
| IoU | Do boxes ka shared area / union. |
| Severity | Small / Medium / Large. Model class nahi. Area percent ka rule. |
| Random Forest | 200 trees ka average. Lifetime din predict karti hai. |
| SLA window | “Itne din mein repair dekh lo.” Sadak tootne ki date nahi. |
| Prophet | Har segment ki monthly line ko ek mahina aage khinchti hai. |
| Segment | Ek area + road. Id `SEG-0001` jaisa. 488 hain. |
| JWT | Login token. HS256. 7 din. Header `Bearer`. |
| bcrypt | Password hash. Plain password column nahi. |
| Heatmap | Map par garmi. Bara hole zyada weight. Leaflet. |
| Cloudinary | Photo ki dukaan. DB mein sirf HTTPS URL. |
| Neon | Hosted Postgres. Free tier, apna server nahi. Hostname code mein nahi. **Unverified** |
| Fallback weather | Open-Meteo fail. Rain 30, temp 28°C, `source: "fallback"`. |
| Synthetic | Formula ya generator ki rows. Asli municipal history nahi. |

## 4. Numbers to remember

### App

| | |
| --- | --- |
| Wide layout | width `>= 900` |
| Web API | `http://localhost:8000` |
| Android emulator | `http://10.0.2.2:8000` |
| Phone fallback | `http://172.20.10.2:8000` ya `EXPO_PUBLIC_API_URL` |
| Session key | `rahscan.session` (web `localStorage` only) |
| Password min | 6 |
| JWT | 7 din, HS256. Empty secret `change-me` |

### Detect

| | |
| --- | --- |
| File | `backend/weights/newv8s.pt`, 22,501,034 bytes |
| Train | 50 epochs, `imgsz=640`, batch 16, Tesla T4, seed shuffle 42 |
| API predict | CPU, `conf=0.35`, `iou=0.5`, `imgsz=1280`, `max_det=50` |
| mAP50 peak | epoch 40: **0.75011** (P 0.74276, R 0.67257, mAP50-95 0.44888) |
| Last epoch | 50: mAP50 0.73176 |
| Small / Medium / Large | `< 5%` / `<= 15%` / `> 15%` |
| Close-up cap | ek box, area `> 15` → Medium. Akeli photo Large nahi |
| Promotion | area `>= 12`, `>= 2×` next, confidence `>= 0.5` → Large |
| Low confidence flag | stored percent `< 50` |

### Lifetime

| | |
| --- | --- |
| Rows | 2500, seed 42. File 2501 lines |
| Formula | `38 - sev*9 - min(bbox,20)*0.12 - road*5 - rain*0.1 - season - temp + N(0,2.5)` |
| Clamp | 2–60 days. This file’s days max 40 |
| Trees | 200. Test MAE 2.0445, RMSE 2.6663, R² 0.9247 |
| Bands | `< 7` Critical, `<= 14` High, `<= 30` Moderate, else Routine |
| Season | Mar–Apr Spring, May–Jun Summer, Jul–Sep Monsoon, Oct–Nov Autumn, Dec–Feb Winter |
| Weather fail | rain 30, 28°C |

### Maintenance

| | |
| --- | --- |
| History | 5856 rows, 5857 lines, 488 × 12 months, Sep 2025–Aug 2026 |
| Patterns | seasonal 196, worsening 147, stable 145 |
| Forecast file | 489 lines, 488 rows |
| Trend in CSV | stable 486, increasing 2, decreasing 0 |
| Risk on that file | High 1, Moderate 407, Low 80 |
| Urgent / Plan / Monitor | 98 / 244 / 146 (`ceil 20%`, `ceil 50%`, rest) |
| Budget | `100000 + rate × predicted`. Highway 150000, Service 90000, Simple 60000 |
| Example | `SEG-0030` Lahore Canal Road, Highway, predicted 65, budget 9,850,000 PKR |

### Workflow

`pending` → assign → `assigned` → accept → `inProgress` → complete → `completed` → verify → `resolved`.

Reject: `completed` → `inProgress`. Escalate: team `unassigned`, status `escalated`.

## 5. Why this technology

Expo: ek codebase web + mobile. Open-Meteo: key nahi, saara Pakistan. Neon + Cloudinary: free tier, server manage nahi. Leaflet: Expo Go aur web. Synthetic: historical data nahi thi. Severity: proposal jaisa rule. Prophet: har segment alag.

## 6. Alternatives and why not

Alag React site, Flutter, Django/Node, MySQL/Mongo/Firebase, OpenWeatherMap, Google Maps, YOLOv8n as the loaded file, neural net, ARIMA/LSTM, apna photo disk. Seedhe jawab note `07b` aur `09`.

## 7. Honest limitations

mAP 0.80 nahi. Pakistan test nahi. Synthetic label screen par nahi. pytest nahi. 5 second detect **Unverified**. Open ML routes. JWT default `change-me`. Unsigned upload. GPS `timeout: 15000` comparison file mein hai, `ReportScreen` mein nahi.

## 8. If you freeze

Bolna: “Yeh code mein hai” aur file ka naam. “Yeh synthetic hai.” “Yeh measure nahi hua.” Guess mat karna.
