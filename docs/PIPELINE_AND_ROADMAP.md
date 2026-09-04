# 🌱 Crop Disease Detection & Advisory System
## Low-Level Pipeline + Team Roadmap

**Problem Statement:** Early detection and management of crop diseases and pest infestations
**Organization:** Government of Maharashtra — Maharashtra State Innovation Society
**Repo:** `agri-disease-detection`

---

## 1. SYSTEM ARCHITECTURE (High Level)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│  FRONTEND   │─────▶│   BACKEND    │─────▶│  AI MODEL   │─────▶│  RISK LOGIC  │
│  (React)    │◀─────│  (FastAPI)   │◀─────│ (predict)   │◀─────│ (confidence) │
└─────────────┘      └──────┬───────┘      └─────────────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   DATABASE   │
                      │  (SQLite)    │
                      └──────────────┘
```

---

## 2. LOW-LEVEL DATA PIPELINE (Step by Step)

### STEP 1 — Farmer Input Capture
- Farmer opens app → selects **"Farmer" mode**
- Uploads/takes photo of affected crop
- Selects: crop type (dropdown), growth stage (dropdown)
- App auto-captures location (mock GPS for prototype: hardcoded village name + lat/lng)
- **Output of this step:** `{image_file, crop, stage, location}`

### STEP 2 — Upload to Backend
- Frontend sends `POST /upload-report` with the above data (multipart form or base64 image)
- **Backend receives** → generates a unique `report_id` → saves image temporarily

### STEP 3 — AI Prediction
- Backend calls the ML model's `predict(image)` function
- Model returns: `{disease: "Leaf Blight", confidence: 87}`
- **Output of this step:** disease label + confidence score (0–100)

### STEP 4 — Confidence-Tier Risk Logic (no weather API — hardcoded logic)
```
IF confidence > 80:
    status = "auto_sent"
    → advisory generated immediately from hardcoded advisory dictionary
ELIF confidence >= 50 AND confidence <= 80:
    status = "pending_review"
    → advisory generated AND sent, but ALSO flagged to officer queue
ELSE (confidence < 50):
    status = "pending_review"
    → NOT sent to farmer yet, only visible to officer, farmer sees "Under Expert Review"
```

### STEP 5 — Advisory Lookup
- Backend looks up `disease` in hardcoded advisory dictionary:
```python
ADVISORY_DB = {
  "Leaf Blight": {
    "what_it_is": "Fungal infection common in humid conditions",
    "what_to_do": ["Remove affected leaves", "Improve field drainage", "Apply copper-based fungicide"],
    "safe_dosage": "2g per liter water, spray every 7 days"
  },
  # ... 4-5 more diseases
}
```
- **Output:** full advisory object attached to the report

### STEP 6 — Save to Database
- Full report record saved to SQLite `reports` table:
  `report_id, crop, stage, disease, confidence, status, location, timestamp, advisory_json`

### STEP 7 — Response to Farmer
- Backend returns report object to frontend
- Frontend Result screen shows:
  - If `auto_sent` → full advisory
  - If `pending_review` → "Under Expert Review" message

### STEP 8 — Officer Review (for pending_review cases)
- Officer opens app → selects **"Officer" mode**
- `GET /officer-queue` → returns all `pending_review` reports
- Officer clicks a case → sees image, AI's guess, confidence
- Officer clicks **Confirm** (keeps AI's diagnosis) or **Correct** (selects real diagnosis from dropdown)
- `POST /confirm-case` → updates record: `status = "confirmed"`, `confirmed_disease`, `officer_id`, `confirmed_at`

### STEP 9 — Map + Dashboard
- `GET /confirmed-cases` → returns all confirmed reports with `location + disease`
- Frontend plots each as a colored pin on Leaflet map (color = disease type)
- Dashboard shows aggregate stats: total cases, high-risk count, villages covered

### STEP 10 — Follow-Up Loop (cosmetic for prototype)
- A few days after advisory, farmer gets a prompt: "Did this help?"
- For demo purposes, this can be a local-only UI interaction (no need to wire to backend unless time permits)

---

## 3. API CONTRACT (LOCKED — everyone builds against this)

| Endpoint | Method | Who calls it | Purpose |
|---|---|---|---|
| `/upload-report` | POST | Farmer frontend | Submit photo + form data, triggers AI + risk logic |
| `/advisory/{report_id}` | GET | Farmer frontend | Fetch advisory result for a report |
| `/officer-queue` | GET | Officer frontend | List all pending_review cases |
| `/confirm-case` | POST | Officer frontend | Officer confirms/corrects a diagnosis |
| `/confirmed-cases` | GET | Officer frontend (map) | All confirmed cases for map/dashboard |

### Report Object Shape (used everywhere)
```json
{
  "report_id": "string",
  "crop": "string",
  "stage": "string",
  "image_url": "string",
  "disease": "string",
  "confidence": 87,
  "status": "auto_sent | pending_review | confirmed",
  "location": { "village": "string", "lat": 0.0, "lng": 0.0 },
  "timestamp": "ISO string",
  "advisory": {
    "what_it_is": "string",
    "what_to_do": ["string"],
    "safe_dosage": "string"
  }
}
```

---

## 4. ROADMAP (3-Day Sprint)

### 🗓️ DAY 1 — Build in Isolation
| Person | Task |
|---|---|
| AI/ML | Collect images, train model in Teachable Machine, test predict() function |
| Backend Lead | Scaffold FastAPI project, stub all 5 endpoints with mock responses matching the contract above |
| Risk Logic | Write confidence-tier function + hardcoded advisory dictionary (5-6 diseases) + SQLite schema |
| Frontend (Farmer) | Build 3 screens using mock JSON data (no real backend calls yet) |
| Frontend (Officer) | Build queue, detail, and map screens using mock JSON data |
| Integration Lead | Write 15-20 seed report objects covering all diseases/villages/statuses |

**End of Day 1 checkpoint:** Everyone should have something visually/functionally working in isolation, even if disconnected.

### 🗓️ DAY 2 — Integration
| Person | Task |
|---|---|
| AI/ML | Hand off working model file to Backend Lead |
| Backend Lead | Plug in real model + risk logic + database, replace stub responses with real logic |
| Risk Logic | Support backend integration, verify advisory lookups work correctly |
| Frontend (Farmer) | Swap mock fetch calls for real `/upload-report` and `/advisory/{id}` calls |
| Frontend (Officer) | Swap mock calls for real `/officer-queue`, `/confirm-case`, `/confirmed-cases` |
| Integration Lead | Load seed data into actual database, start end-to-end testing |

**End of Day 2 checkpoint:** Full flow works — upload → advisory/queue → officer confirms → map updates.

### 🗓️ DAY 3 — Polish, Test, Rehearse
| Person | Task |
|---|---|
| All | Bug fixes flagged by Integration Lead |
| Frontend (both) | UI polish — animations, loading states, responsiveness check |
| Integration Lead | Full run-through 3-5 times, write demo script (exact click order + talking points) |
| Everyone | Rehearse: who talks about which part during the live demo |
| Everyone | Make sure PPT slides match exactly what the prototype shows |

---

## 5. FOLDER STRUCTURE (already set up in repo)

```
agri-disease-detection/
├── frontend/         → React app (farmer + officer views), single file or split components
├── backend/          → FastAPI app, endpoints, database models
├── ml-model/          → Trained model file(s), training script, predict() function
├── risk-logic/        → confidence_tier.py, advisory_data.py
├── demo-data/          → seed_data.json (15-20 mock reports)
├── docs/              → PPT, this roadmap, architecture diagrams
└── README.md
```

---

## 6. GOLDEN RULES FOR THE TEAM

1. **Don't wait on each other on Day 1.** Frontend builds against the locked JSON contract using mock data — doesn't need backend to be ready.
2. **No weather API, no real auth, no cloud deployment needed.** Confidence-tier logic + local SQLite + everything running on localhost is enough for a prototype demo.
3. **`git pull` before you start work, every session.** Avoids overwriting teammates' changes.
4. **Stick to your folder.** Reduces merge conflicts.
5. **If a feature isn't in the contract above, don't build it** unless there's spare time on Day 3 — scope creep is the #1 risk for a 3-day build.
6. **Seed data matters as much as real logic.** A demo with an empty map/dashboard looks broken even if the code is perfect — Integration Lead's seed data is not optional.

---

## 7. STRETCH GOALS (only if Day 3 has spare time)
- Multilingual toggle (Marathi/Hindi) beyond 2-3 key strings
- Simple bar chart on dashboard (cases per village/disease)
- Basic "confirm/correct" history log per officer
- Follow-up screen wired to backend instead of local-only

**Do not attempt these until the core flow (Steps 1–9 above) is fully working end-to-end.**
