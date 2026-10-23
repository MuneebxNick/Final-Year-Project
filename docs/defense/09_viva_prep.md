# Viva prep

## 1. 30-second summary

RahScan ek Expo app hai, ek FastAPI, PostgreSQL, aur Cloudinary. Detection YOLOv8s hai. Severity area rule hai. Lifetime synthetic Random Forest hai, admin detail par. Maintenance 488 synthetic segments ki Prophet CSV hai.

Purani SRS aur proposal `docs/implementation_vs_spec.md` se compare hain. Kai cheezein Changed hain. Teen REQ Not implemented hain: Pakistan images, mAP 0.80, synthetic label on screen.

Analogy: viva ek map hai. Jo code mein hai woh bolna. Jo CSV mein hai woh synthetic bolna. Jo measure nahi hua woh Unverified bolna.

## 2. Files and what each does

- `docs/implementation_vs_spec.md` — purani proposal PDF aur purani SRS PDF versus code. Status: Matches, Changed, Extended, Not implemented, Unverified.
- `docs/RahScan_Updated_SRS.md` aur `docs/RahScan_Updated_Proposal.md` — baad ki “as built” writing. Viva mein purani PDF aur nayi file mix mat karo.
- Notes `01` se `08` — architecture, screens, API, detection, lifetime, maintenance, workflow, technologies, traces.
- `docs/yolov8-detect-test-report.md` — purana yolov8n test. Current `newv8s.pt` ka mAP nahi.

`implementation_vs_spec.md` REQ-4 GPS `timeout: 15000` likhti hai. `ReportScreen.requestLocation` ab sirf `Location.Accuracy.Balanced` bhejti hai. Timeout code mein nahi (note 01). Us ek line par code jeetta hai.

## 3. Demo script (paanch minute)

Seed emails `backend/seed.py`: `demo@rahscan.local`, `admin@rahscan.local`, `road@rahscan.local`. Password `backend/.env` ke `DEMO_CITIZEN_PASSWORD`, `ADMIN_PASSWORD`, `TEAM_PASSWORD`. Khali hon to `Settings` default. Values yahan nahi.

API port 8000 pehle se chalu ho. Web `npm run web`. Phone par `EXPO_PUBLIC_API_URL`.

| Waqt | Kya dikhana | Kya bolna |
| --- | --- | --- |
| 0:00 | `LandingScreen` | Teen raste: citizen, signup, Municipal Authority. Account zaroori hai. Purani REQ-1 bina login ke thi. Humne badla. |
| 0:30 | Citizen `LoginScreen` | `POST /auth/login`. Role citizen na ho to andar nahi. Token 7 din. |
| 0:50 | `HomeScreen` phir `ReportScreen` | Photo `quality: 0.8`. City, area, address zaroori. GPS optional. |
| 1:20 | Analyze | `POST /api/detect`. CPU, YOLOv8s, `conf=0.35`. No box ho to “No potholes detected.” Row nahi banti. |
| 1:50 | `DetectionResultScreen` Submit | Pehle Cloudinary, phir `POST /reports`. Status `pending`. Confidence percent. |
| 2:20 | My Reports detail | Timeline “Submitted”. Push nahi. Dobara fetch par update. |
| 2:40 | Sign out. `AdminLoginScreen` admin | Dashboard counts client par, `GET /admin/reports`. |
| 3:10 | Ek report kholo | Lifetime card. Bolna: yeh SLA window hai, photo se tootne ki date nahi. Weather Open-Meteo. Fallback 30 aur 28°C, screen source nahi dikhati. |
| 3:40 | Assign `roadMaintenance` | `TRANSITIONS`. Status `assigned`. |
| 4:00 | Team `road@rahscan.local` | Accept `inProgress`. Photo aur note. Complete `completed`. |
| 4:25 | Admin verify | `resolved`. Heat se yeh point hat jata hai. Citizen map agle focus par. |
| 4:40 | Predictive tab | “Yeh live reports nahi. 488 synthetic segments. Urgent top 20% count hai, 7 din nahi. Budget illustrative hai. Screen par synthetic likha nahi. Yeh limit hai.” |

Agar detect slow ho ya model 503 de, bolo weights `newv8s.pt` missing hain ya CPU `imgsz=1280` hai. Number 5 second ka claim mat karo. Measure nahi hua.

## 4. Key logic

### Real, synthetic, aur jo hai hi nahi

| Cheez | Kya hai | Evidence |
| --- | --- | --- |
| Login, teen roles, reports, events | Real rows PostgreSQL | `models.py`, `workflow.py` |
| Photo | Real file Cloudinary par. DB mein URL | `uploadReportPhoto`, `create_report` |
| Boxes aur severity | Real image par YOLOv8s, phir area rules | `run_detection`, `severity_from_area` |
| Training images | Real public Kaggle photos. Pakistan fine-tune nahi | `model_metadata.json` |
| mAP50 0.75011 | Real validation number us public split par. Pakistani test nahi | `results.csv` epoch 40 |
| Lifetime labels | Synthetic formula, 2500 rows, seed 42 | `_days_until_critical` |
| Lifetime number on screen | Real forest call, live Open-Meteo. Save nahi | `predict_lifetime` |
| Maintenance history | Synthetic 488 × 12 months | `generate_rows` |
| Forecast list | Real Prophet fit, phir CSV. Request par fit nahi | `forecast_segment`, `load_maintenance` |
| High risk count 1 | Is CSV par rule ka result | note 06 |
| 5s detect, 3s inference, 0.80 mAP, pytest, 30 min logout, 10 MB cap | Not implemented ya Unverified | comparison file section 5 aur 9 |

### Proposal / purani SRS se farq

Justification chhoti hai. Lambi table `implementation_vs_spec.md` hai.

| Farq | Purani spec | Code | Kyun |
| --- | --- | --- | --- |
| Account | REQ-1 bina login | `require_citizen` | Report kis user ki hai, yeh `submitted_by` se. SRS khud baad mein citizen role bhi kehti hai. Comparison section 1. |
| Model | REQ-9 YOLOv8n, RDD, Colab | `newv8s.pt`, Chitholian + smooth roads, Kaggle T4 | Jo file load hoti hai yahi hai. n notebook load nahi. s kyun behtar **Unverified** |
| mAP | REQ-14 ≥ 0.80 Pakistan | 0.75011 public val | Number neeche hai. Pakistan test hai hi nahi. Chhupana nahi |
| Severity | Sirf 5% aur 15% | Plus close-up cap aur 12% promotion | Qareebi akeli photo hamesha Large na ho |
| Workflow | Pending → In Progress → Resolved | assigned, completed, escalated, team, reject | Field team alag hai. Resolved se wapas koi line nahi |
| Weather | OpenWeatherMap, “No live weather data” | Open-Meteo, fallback 30 / 28°C, card source nahi dikhati | API key nahi. Saara Pakistan. Label na hona limit hai |
| Lifetime | Har box, save on report | Ek call detail par, SLA 2–60, save nahi | Historical failure data nahi thi. Formula training label hai |
| Maintenance | 7 / 8–20 / 20+ days, live SQL, synthetic label | Top 20% / next 50% by count, CSV, label nahi | Historical data nahi thi. REQ-45 Not implemented |
| UI | Alag React.js | Expo, ek codebase web + mobile | |
| Map cities | Lahore, Karachi, aur Faisalabad ya Rawalpindi | Jo coords hon | Spec khud do shehar lists deti hai. Comparison section 1 |
| Tests | pytest, Pakistani mAP | Automated suite nahi | Unverified speed budgets |

REQ counts us file se: Matches 9, Changed 28, Extended 1 (REQ-29 team), Not implemented 3 (REQ-10, REQ-14, REQ-45), Unverified 3 (REQ-6, REQ-15, REQ-31). BR-5 aur BR-8 bhi Not implemented.

## 5. Why this technology

Chhoti table. Detail note `07b_technologies.md`.

| Tech | Kyun | Alternative | Trade-off |
| --- | --- | --- | --- |
| Expo + RN + web | Ek codebase web + mobile | Alag React site, Flutter | Cleartext dev flags. Chrome path script mein |
| FastAPI | Python models isi process. **(inferred)** | Django, Node | Start command **Unverified** |
| PostgreSQL | Rows + JSONB. Neon: free tier, server nahi. Host **Unverified** | MySQL, MongoDB, Firebase | Pehli CREATE repo mein nahi |
| Cloudinary | Free tier, server nahi | Apna disk | Unsigned preset |
| YOLOv8s | Boxes. Loaded file yahi | YOLOv8n, Faster R-CNN | mAP 0.75. s versus n **Unverified** |
| Area rules | Proposal jaisa rule-based | Teesri class | Close-up Large nahi rehta |
| Random Forest | Tabular synthetic days. **(inferred)** | Neural net | R² formula seekhta hai, sadak nahi |
| Prophet per segment | Har area ka forecast | ARIMA, LSTM, ek model | 12 points. Zyada tar trend stable |
| Leaflet | Expo Go aur web | Google Maps | CDN tiles |
| Open-Meteo | Key nahi. Saara Pakistan | OpenWeatherMap | Fallback chipka nahi screen par |
| bcrypt + JWT | Hash aur 7 din bearer | Cookie session | `change-me`, open routes |

## 6. Alternatives and why not

Note `07b` section 6 wahi jawab hai: React.js site, Flutter, Django/Node, MySQL/MongoDB, Firebase, OpenWeatherMap, Google Maps, doosra detector, neural net, ARIMA/LSTM, apna image disk.

Yahan ek line: humne woh chuna jo ek student server aur ek codebase par chalta hai. Jahan spec behtar thi aur code nahi pahuncha (0.80 mAP, Pakistan images, synthetic label, tests), woh excuse nahi. Woh gap hai.

## 7. Honest limitations

1. Synthetic lifetime aur maintenance. UI “synthetic” nahi likhti. Predictive lede budget ko illustrative kehti hai.
2. mAP 0.80 aur Pakistani held-out test nahi.
3. pytest nahi. 5 second aur 3 second **Unverified**.
4. Open routes, default JWT secret, unsigned upload, citizen ko saare unresolved points. Note 07.
5. Lifetime save nahi. Maintenance live `reports` nahi padhti.
6. Prophet: 486 stable, 2 increasing, High risk 1 segment.
7. Citizen timeline live nahi. Agli fetch par.
8. Comparison file ka GPS timeout 15000 current code se match nahi karta.

## 8. Likely viva questions

Jawaban chhote hain. Number ya file yaad na ho to “note 04” bolo, guess mat karo.

### Architecture

1. **App kahan se start hoti hai?** `index.ts` `registerRootComponent`, phir `App`. `sessionStore.hydrate`.
2. **Teen portals?** Citizen `UserTabs`, admin `AdminTabs`, team `TeamTabs`. Role se boot route.
3. **Expo kyun?** Ek codebase web + mobile.
4. **API file?** `backend/app/main.py` object `app`. `lifespan` schema, YOLO, forest, CSV.
5. **Tables?** `users`, `reports`, `report_events`.
6. **FastAPI kyun?** Python model isi process mein. **(inferred)**
7. **Neon kyun?** Free tier, server manage nahi. Hostname code mein nahi. **Unverified**
8. **Photo kahan?** Cloudinary URL. DB mein bytes nahi.
9. **Map?** Leaflet. Web iframe. Phone WebView. Expo Go aur web.
10. **Realtime kyun nahi?** Socket nahi. Admin `upsert`. Citizen agla GET.

### Detection

11. **Kaun sa model?** `load_model` `newv8s.pt`. Base `yolov8s.pt`. SHA export `best.pt` jaisa (note 04).
12. **Dataset?** Chitholian potholes, XML class `pothole`. Hemanthhari smooth, khali labels, cap 665. Split 70/10/20, seed 42.
13. **mAP?** Epoch 40 validation mAP50 0.75011. Precision 0.74276. Recall 0.67257. mAP50-95 0.44888.
14. **0.80 kyun nahi?** Public split par number neeche hai. Pakistan test Not implemented (REQ-14).
15. **Precision aur recall?** Sahi boxes / lagaye hue boxes. Pakde hue holes / asli holes.
16. **Small Medium Large?** `< 5`, `<= 15`, `> 15`.
17. **Close-up?** Ek box aur area `> 15` to Large Medium ban jata hai. Akeli photo Large nahi rehti.
18. **Promotion?** Do ya zyada boxes. Bari area `>= 12`, doosri se `>= 2×`, confidence `>= 0.5`, pehle Large na ho.
19. **0.35 aur 0.5?** 0.35 se neeche box girta hai. 0.5 sirf Large promotion.
20. **Detect aur save alag?** No pothole par row nahi. Save Cloudinary ke baad.

### Lifetime

21. **Days ka matlab?** Repair SLA window. Physical failure date nahi. Docstring aur card yahi kehte hain.
22. **Formula?** `38 - severity*9 - min(bbox,20)*0.12 - road*5 - rain*0.1 - season cut - temp penalty + noise`, phir 2–60.
23. **Synthetic kyun?** Historical data nahi thi.
24. **Forest score?** Test 500 rows. MAE 2.04 din. RMSE 2.67. R² 0.92. Yeh formula par hai.
25. **Traffic?** CSV mein road ki copy. API client traffic ignore karti hai. Highway High, Service Medium, Simple Low.
26. **Weather fail?** Rain 30, temp 28°C, season Karachi month, `source` fallback. Card source nahi dikhati.
27. **Bands?** `< 7` Critical, `<= 14` High, `<= 30` Moderate, else Routine.
28. **Save kyun nahi?** `create_report` forest call nahi karti. Dobara kholo to naya weather ho sakta hai.

### Maintenance

29. **Live reports?** Nahi. `generate_rows`. `load_maintenance` CSV.
30. **Kitne?** 488 segments, 62 cities, 12 months, Sep 2025–Aug 2026.
31. **Patterns?** Seasonal 196, worsening 147, stable 145. Weights 40/30/30. Seed 42.
32. **Prophet?** Har segment. Seasonality off. 3 changepoints. Agla month `yhat`.
33. **Request par kyun nahi?** 488 fits offline. API list return karti hai.
34. **Urgent?** Predicted desc. `ceil(20%)` = 98. Plan 244. Monitor 146. 7 din wale cuts nahi.
35. **High risk sirf ek?** Trend `increasing` aur ratio `>= 1.5`. 486 stable hain. Worsening bhi aksar stable likha gaya.
36. **Budget?** `100000 + rate × predicted`. Highway 150000, Service 90000, Simple 60000. Severity nahi. Illustrative.

### Data aur workflow

37. **Status line?** pending → assigned → inProgress → completed → resolved. Reject completed se inProgress. Escalate team `unassigned`.
38. **Galat jump?** 409. `_cas_update` purana status maangta hai.
39. **Overdue?** Deadline past, status completed ya resolved nahi.
40. **Citizen note?** Sirf complete event ki note. Reject reason nahi.
41. **Heat?** Resolved hat ti hai. Weight 1, 2, 3. Card resolved rakh sakti hai.
42. **Reference?** `RS-` plus `ref_number`, chaar digits.

### Security

43. **Password?** bcrypt `password_hash`. Plain column nahi. Min length 6.
44. **Token?** JWT HS256, 7 din, `sub`, email, role. Guard DB user padhta hai.
45. **Khuli routes?** Detect, lifetime, predictive, weather, geocode, health.
46. **Map privacy?** `GET /reports/locations` har unresolved point. Photo aur naam nahi.
47. **Secret?** `JWT_SECRET` khali ho to `change-me`.
48. **Upload?** Unsigned Cloudinary preset. Admin is route se 403.

### Testing aur aage

49. **Tests?** Automated pytest nahi. Purani detect report doosre checkpoint ki hai. Speed budgets Unverified.
50. **Aage kya?** Pakistan images aur naya mAP. Synthetic label screen par. Lifetime save. Maintenance ko `reports` se jodna. Open routes band. Signed upload. JWT secret. Phone session. Yeh list kaam hai, abhi code nahi.

### Tough questions

**Aap ne 80% mAP claim kiya hai?** Nahi. Validation mAP50 0.75011 hai, 0.80 se kam, Pakistani roads par nahi. REQ-14 Not implemented.

**YOLOv8n SRS mein hai, aap s kyun chala rahe ho?** Jo weights load hoti hain `newv8s.pt` hain. n notebook alag hai aur runtime nahi. s behtar kyun, `model.py` nahi likhta. **Unverified**.

**Random Forest ne kya seekha?** Synthetic formula, noise ke sath. R² 0.92 is liye uncha hai. Asli sadak ka record nahi.

**Prophet ne worsening kyun nahi pakdi?** 147 worsening mein se 145 ka trend `stable` hai. Step `0.25` se chhota move stable reh jata hai. Yearly seasonality off hai.

**Dashboard jhoot kyun bolta hai?** Numbers model ke hain, lekin history synthetic hai aur label nahi. REQ-45 aur BR-8 Not implemented. Demo mein main yeh khud bolta hoon.

**Citizen bina login ke SRS mein tha.** Code account maangta hai. `submitted_by` ke liye. Purani SRS khud do jagah alag kehti hai (comparison section 1).

**5 second mein detect?** Measure nahi hua `newv8s.pt` par. CPU, `imgsz=1280`. Main time claim nahi karta.

**Data leak?** Koi bhi detect aur lifetime call kar sakta hai. Koi citizen saare unresolved points dekh sakta hai. Token 7 din, blacklist nahi. Default secret `change-me`.

**Aap production kaise bejoge?** HTTPS, strong JWT secret, un routes par auth, signed Cloudinary, synthetic banner, paging, tests. Yeh abhi nahi hai. **(inferred)** plan hai, feature nahi.
