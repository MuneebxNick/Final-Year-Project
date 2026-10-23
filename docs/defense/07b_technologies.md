# Tools aur technologies

## 1. 30-second summary

RahScan ek Expo app hai aur ek FastAPI process. Web aur phone same screens hain. Photos Cloudinary par hain. Rows PostgreSQL mein hain. Detection YOLOv8s hai. Severity area rule hai. Lifetime Random Forest hai. Maintenance har segment ka Prophet hai, request se pehle CSV mein.

Neeche pehle chhoti table hai. Phir har group. Formula aur metrics notes 04, 05, aur 06 mein hain. Status aur JWT note 07 mein hain.

Analogy: ek toolbox. Har tool ek kaam karta hai. Web aur phone ke liye doosri toolbox nahi kholi.

### Summary

| Technology | Used for | Main alternative | Why ours |
| --- | --- | --- | --- |
| Expo, React Native, react-native-web | Citizen, admin, team UI | Alag React website + alag app | Ek codebase web + mobile |
| React Navigation 7 | Stack aur tabs | React Router sirf web | `App.tsx` isi se screens badalta hai. Wajah **(inferred)** |
| FastAPI | JSON API, models isi process mein | Django ya Node | Python weights isi process mein load hote hain. **(inferred)** |
| PostgreSQL, SQLAlchemy, psycopg | `users`, `reports`, `report_events` | MySQL, MongoDB, Firebase | Relational rows aur JSONB. Neon: free tier, server manage nahi. Host **Unverified** |
| Cloudinary | Report aur completion photos | Apna disk | Free tier, server manage nahi |
| Ultralytics YOLOv8s | `newv8s.pt` boxes | YOLOv8n, doosra detector | Loaded file yahi hai. s versus n **Unverified** |
| Area rules | Small / Medium / Large | Severity as a YOLO class | Proposal jaisa rule-based |
| Random Forest | Repair window, din | Neural net, seedha formula | Tabular synthetic labels. Forest **(inferred)** |
| Prophet per segment | Agla mahina, 488 areas | ARIMA, LSTM, ek model saare Pakistan par | Time-series forecast har segment ka. Offline CSV |
| Leaflet + OSM | Heatmap | Google Maps | Expo Go aur web dono, iframe / WebView |
| Open-Meteo | Rain, temp, place search | OpenWeatherMap | API key nahi. Saara Pakistan |
| Nominatim, phir Photon | GPS se city / area | Google Geocoding | Code yahi call karta hai. Wajah **Unverified** |
| bcrypt + PyJWT | Password hash, 7 din token | Sessions in the DB, cookies | Code yahi hai. Library wajah **Unverified** |
| Kaggle, Tesla T4 | YOLOv8s training notebook | Colab | `kernel-metadata.json` `NvidiaTeslaT4` |

## 2. Files and what each does

Versions `package.json` aur `backend/requirements.txt` se hain. Pin `>=` hai Python par, exact install **Unverified**.

### Frontend

**Expo ~57.0.15, React 19.2.3, React Native 0.86.2, react-native-web ^0.21.2, react-dom 19.2.3.**

Expo React Native ko start, web, aur native build deta hai. `index.ts` `registerRootComponent`. Scripts `expo start --web`, `expo run:android`, `expo run:ios`. `app.json` name RahScan, package `com.rahscan.app`.

Kyun: ek codebase web + mobile.

Alternatives: alag React.js site. Flutter. Bare React Native bina Expo. Section 6.

Nuksan: `npm start` Chrome ka Mac path hardcode karta hai. Android `usesCleartextTraffic: true`. iOS local HTTP allow karta hai (`app.json`).

Production: public HTTPS API. Cleartext band. Start script se local Chrome path hatao. **(inferred)**

**TypeScript ~6.0.3.** `tsconfig.json` `strict: true`. Types compile time par. Runtime par JS.

Kyun **(inferred)**: screens aur API shapes ek language mein hain.

Alternative: plain JavaScript. Types miss ho jati. **(inferred)**

Nuksan: Python models ke sath shared types nahi. Frontend apni types `src/models/report.ts` mein rakhti hai.

Production: yahi reh sakta hai.

**React Navigation 7.** `@react-navigation/native` ^7.3.17, `native-stack` ^7.18.9, `bottom-tabs` ^7.18.17. `App.tsx` stack. `UserTabs`, `AdminTabs`, `TeamTabs`.

Kyun **(inferred)**: Expo apps mein yahi navigation common hai.

Alternatives: React Router (web only). Ek hi flat screen list.

Nuksan: role guard har screen par nahi. Boot aur login par hai (note 02).

Production: deep link par role check. **(inferred)**

**expo-image-picker ~57, expo-location ~57, expo-file-system ~57.** `ReportScreen` `pick` aur GPS. `appendPhoto` phone `File`. `app.json` camera, photo, location strings.

Kyun **Unverified**. Kaam: photo, GPS, file bytes.

Alternatives: browser `<input type="file">` sirf web. Native camera alag code.

Nuksan: wide web camera sheet skip karti hai, seedha gallery (`ReportScreen.openPhotoSource`).

Production: yahi Expo modules theek hain jab tak permissions strings sach hon.

**react-native-webview 13.16.1.** `NativeLeafletHeatmap`, `NativeLocationPicker`.

Kyun: Leaflet HTML. Expo Go aur web dono.

Alternative: `react-native-maps`. Section 6.

Nuksan: map ek chhoti website hai. unpkg aur OSM offline nahi.

**react-native-svg 15.15.4.** `TrendChart`, `ShareCharts`.

Kyun **Unverified**.

Alternative: chart library, ya HTML canvas. Extra dependency. **(inferred)**

**@expo/vector-icons ^15, gesture-handler ~2.32, safe-area-context ~5.7, expo-status-bar.** `App.tsx` `GestureHandlerRootView` aur `SafeAreaProvider`. Icons tabs aur sidebar par.

Kyun **(inferred)**: Expo template ke sath aate hain.

`react-native-screens` `package.json` mein hai. `src` mein seedha import nahi mila.

**expo-linear-gradient ~57.** `package.json` mein hai. Koi `src` file import nahi karti. Use nahi hoti.

### Backend

**FastAPI >=0.115, Pydantic >=2.10, pydantic-settings >=2.6.** `main.py` object `app`. `schemas.py` bodies. `Settings` `backend/.env`.

Kyun **(inferred)**: detection aur ML isi Python process mein (`lifespan`).

Alternatives: Django, Flask, Node. Section 6.

Nuksan: exact uvicorn command repo script nahi karti. **Unverified**

**uvicorn[standard] >=0.32.** `requirements.txt`. Process yahi chalati hai. Start line **Unverified**.

Production: `--reload` ke baghair, ek se zyada worker tab jab cache (weather, geocode, forecasts) share na hon. Do processes alag memory hain (notes 03, 05). **(inferred)**

**SQLAlchemy >=2.0.36, psycopg[binary] >=3.2.** `get_engine`, `User`, `Report`, `ReportEvent`. URL `postgresql://` ko `postgresql+psycopg://` banati hai. `sslmode=require`. `pool_pre_ping=True`. `pool_recycle=300`. `prepare_threshold=None`.

Kyun: PostgreSQL. `prepare_threshold` ki wajah file mein nahi. **Unverified**

**python-multipart >=0.0.18.** `detect_potholes` `UploadFile`.

**httpx >=0.27.** `get_weather`, `reverse_geocode`.

**Pillow >=10.** `run_detection` `Image.open`, `ImageOps.exif_transpose`.

OpenCV notebook ki `pip install opencv-python-headless` line hai (`newv8strainingonpotholes.ipynb` cell 0). `requirements.txt` mein nahi. API Pillow use karti hai.

### Database aur storage

**PostgreSQL.** Teen tables note 03. `detections` JSONB. `ensure_schema` ALTER aur `report_events` CREATE. `users` / `reports` ka pehla CREATE repo mein nahi. **Unverified**

**Neon.** Naam `backend/app` mein nahi. Student ki wajah: free tier, server manage nahi. Host **Unverified**.

Alternatives: MySQL, MongoDB, Firebase, SQLite, apna Postgres. Section 6.

Nuksan: `DATABASE_URL` khali ho to `get_engine` crash. Free tier sleep kar sakta hai. Sleep ka code nahi. **Unverified**

Production: secret URL env mein, backup, aur pehli migration repo mein. **(inferred)**

**Cloudinary.** `signature`, `uploadReportPhoto`. Unsigned preset. Folder constant `rahscan/reports`. Format `webp`. Client unsigned par folder nahi bhejta (note 07).

Kyun: free tier, server manage nahi.

Nuksan: unsigned preset. `signature` HMAC nahi bharta.

Production: signed upload, preset private. **(inferred)**

### AI / ML

**Ultralytics >=8.3, YOLOv8s.** `load_model` `backend/weights/newv8s.pt`. Train `YOLO("yolov8s.pt")`, 50 epochs, `imgsz=640`. API `conf=0.35`, `iou=0.5`, `imgsz=1280`, `device="cpu"`, `max_det=50`. Metrics note 04: best validation mAP50 0.75011.

Kyun: boxes. s versus n **Unverified**.

**Severity rules.** `severity_from_area`. Proposal jaisa rule-based. Model class sirf `pothole`.

**scikit-learn >=1.5 RandomForestRegressor, joblib >=1.4, pandas >=2.2, numpy.** `train_lifetime_model.py`. Numpy `requirements.txt` mein alag pin nahi. 200 trees. Test MAE 2.0445, R² 0.9247 synthetic labels par (note 05). `lifetime_model.pkl`.

Kyun forest **(inferred)**: chhota tabular set, temp penalty steps.

**Prophet >=1.1.** `forecast_segment`. Har `segment_id`. Seasonality off. Startup CSV. 488 segments (note 06).

Kyun: time-series forecast har segment ka. Precompute is liye ke request 488 fits na kare. Speed **(inferred)**. Docstring sirf “startup reads CSV” kehti hai.

### Maps, geo, weather

**Leaflet 1.9.4, leaflet.heat 0.2.0, OSM tiles.** `buildMapHtml`. unpkg. Weights small 1, medium 2, large 3.

Kyun: Expo Go aur web.

Nuksan: tiles aur scripts internet maangte hain.

Production: tiles khud host karna, ya library pin jo CDN na ho. **(inferred)**

**Open-Meteo.** Geocoding search `countryCode=PK`. Forecast temp aur rain. Timeout 8s. Fallback rain 30, temp 28°C. Season Karachi month, API se nahi (note 05).

Kyun: API key nahi. Saara Pakistan.

**Nominatim, Photon.** `geocode_service.reverse_geocode`. Pehle Nominatim, fail par Photon. Timeout 10s. Lifetime is function ko call nahi karti.

Kyun **Unverified**.

Nuksan: Nominatim usage policy ka rate limit code mein nahi. **Unverified**

### Auth aur security

**bcrypt >=4.2, PyJWT >=2.10.** `hash_password`, `create_token` HS256, 7 din. `HTTPBearer`.

Kyun **Unverified**.

Nuksan: default secret `change-me`. Open detect aur ML routes. Note 07.

Production: strong `JWT_SECRET`, un routes par token ya rate limit, phone par secure storage. **(inferred)**

### Training aur dev tools

**Kaggle notebook** `newv8strainingonpotholes`. `kernel-metadata.json`: `enable_gpu: true`, `machine_shape` `NvidiaTeslaT4`. Datasets `chitholian/annotated-potholes-dataset`, `hemanthhari/road-surface-dataset`.

**Python generators** stdlib only: `generate_training_data.py`, `generate_maintenance_data_v2.py`. Seed 42.

**seed.py** demo users. Sample reports nahi.

**Chrome path** `package.json` scripts. Dev machine. App logic nahi.

## 3. Data flow

Request ka rasta note 03 hai. Yahan sirf kaun sa tool kis step par hai.

1. Expo screen photo `expo-image-picker` se leti hai.
2. `fetch` (`src/api/client.ts`) FastAPI ko file deti hai.
3. Pillow image kholti hai. Ultralytics `predict`. `severity_from_area` label.
4. Cloudinary URL. SQLAlchemy `reports` row.
5. Admin card Open-Meteo, phir joblib forest.
6. Predictive tab Prophet CSV, pandas startup par ek dafa.
7. Map WebView ya iframe Leaflet.

## 4. Key logic

Yeh numbers pehle notes se hain. Yahan sirf tool ke sath.

| Tool | Number |
| --- | --- |
| Detect | `conf=0.35`, `iou=0.5`, `imgsz=1280`, CPU, max 50 |
| Train YOLO | 50 epochs, `imgsz=640`, batch 16, Tesla T4 |
| mAP50 peak | 0.75011 epoch 40, validation split |
| Severity | `< 5` Small, `<= 15` Medium, `> 15` Large |
| Forest | 200 trees, bbox cap 20, days clamp 2–60 |
| Prophet | 488 models, 12 months, `periods=1`, `freq="MS"` |
| JWT | 7 din, HS256 |
| Weather fallback | rain 30, 28°C |

## 5. Why this technology

Seedhi wajahen, notes 01–07 jaisi.

| Choice | Wajah |
| --- | --- |
| Expo | Ek codebase web + mobile |
| Open-Meteo | API key nahi. Saara Pakistan |
| Neon + Cloudinary | Free tier, server manage nahi. Neon host **Unverified** |
| Leaflet WebView / iframe | Expo Go aur web |
| Synthetic CSVs | Historical data nahi thi |
| Severity rules | Proposal jaisa rule-based |
| Prophet per segment | Time-series forecast har segment ka |
| FastAPI, forest, YOLOv8s versus n | **(inferred)** ya **Unverified**, upar sections |

## 6. Alternatives and why not

Har tool ke 2–3 alternatives section 2 mein hain. Viva ke seedhe jawab yahan hain.

**React.js ki alag website kyun nahi?** `package.json` ek Expo app hai. `react-native-web` browser chalati hai. Doosri React site same screens dubara likhti.

**Flutter kyun nahi?** Flutter bhi ek codebase de sakta hai. Yeh repo TypeScript hai. API Python hai. Flutter UI alag language hoti. **(inferred)** ke team ne JS screens rakhi hain. Repo Flutter choose na karne ka essay nahi likhti.

**Django ya Node kyun nahi?** `main.py` FastAPI hai. YOLO, sklearn, aur Prophet Python hain (`requirements.txt`). Node unhen isi process mein load nahi karti. Django ek bara stack hai. Yahan routes `APIRouter` hain. **(inferred)**

**MySQL ya MongoDB kyun nahi?** Engine PostgreSQL URL maangta hai. `detections` JSONB hai. Reports user se FK model mein hai. Events `ON DELETE CASCADE` create SQL mein hai. MySQL JSONB nahi deta. Mongo documents hain. Yahan teen tables hain.

**Firebase kyun nahi?** Auth `users` table aur JWT hai. Files Cloudinary hain. Forecast CSV hai. Firebase is repo mein import nahi. **(inferred)** ke relational reports aur Python models ek API par chahiye thay.

**OpenWeatherMap kyun nahi?** `get_weather` Open-Meteo bulati hai. API key nahi. Saara Pakistan.

**Google Maps kyun nahi?** `buildMapHtml` Leaflet aur OSM tiles hai. Expo Go aur web dono chalte hain. Team maps link `google.com/maps` kholta hai (`TeamReportDetailScreen.mapsUrl`). Woh heatmap nahi hai.

**YOLOv8 ke ilawa detector kyun nahi?** Loaded file `newv8s.pt` hai. Notebook `yolov8s.pt` se fine-tune karti hai. YOLOv8n folder maujood hai, `load_model` nahi kholta. Faster R-CNN ya classification box `xyxy` nahi deti. s behtar kyun hai **Unverified**. Purani test report `yolov8n` ki hai. Woh current load nahi (note 04).

**Neural net, Random Forest kyun nahi?** Lifetime 7 numbers se din predict karti hai. 2500 synthetic rows. `train_model` forest fit karti hai. Neural net is script mein nahi. Labels formula hain, is liye gehra net asli sadak nahi seekhega. **(inferred)**

**ARIMA ya LSTM, Prophet kyun nahi?** `forecast_segment` Prophet hai. ARIMA aur LSTM import nahi. 12 mahine LSTM ke liye chhote hain. **(inferred)**. Ek model saare Pakistan par nahi, kyunki har `segment_id` alag fit hai.

**Apne server par images kyun nahi?** `photo_url` HTTPS string hai. Bytes Postgres mein nahi. Cloudinary. Free tier, apna file server nahi.

## 7. Honest limitations

1. Neon hostname code mein nahi. **Unverified**
2. `expo-linear-gradient` install hai, use nahi.
3. OpenCV sirf training notebook ke pip line mein hai. API Pillow hai.
4. Python versions `>=` hain. Jo machine par install hai, woh pin nahi.
5. Kaggle tree aur `*.pt` gitignore hain.
6. Synthetic lifetime aur maintenance. UI “synthetic” nahi likhti (notes 05, 06).
7. Security gaps note 07: open routes, `change-me`, unsigned upload, `localStorage`.
8. Map CDN par hai. Offline **Unverified**
9. Production changes upar **(inferred)** hain. Code unhen abhi nahi karta.

Notes 01–07 se koi number yahan nahi badla. Purani note edit nahi ki.

## 8. Likely viva questions

**Ek line mein stack?** Expo UI, FastAPI, PostgreSQL, Cloudinary, YOLOv8s, forest, Prophet CSV, Leaflet, Open-Meteo.

**Web aur phone alag kyun nahi?** Ek Expo codebase.

**Database Neon kyun?** Free tier, server manage nahi. Code sirf Postgres `DATABASE_URL` kehta hai. Host **Unverified**.

**Weather?** Open-Meteo. Key nahi. Fallback 30 aur 28°C.

**Map?** Leaflet. Iframe web. WebView phone.

**Detector?** YOLOv8s `newv8s.pt`. Severity alag rule.

**Forest kyun, net kyun nahi?** Chhoti tabular synthetic table. Net script mein nahi.

**Prophet request par kyun nahi?** 488 fits offline. API CSV padhti hai.

**Images apne server par kyun nahi?** Cloudinary URL. Free tier.
