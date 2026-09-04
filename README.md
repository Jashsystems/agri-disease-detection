# 🌱 Crop Disease Detection & Advisory System

**Prototype for:** Government of Maharashtra — Maharashtra State Innovation Society
**Theme:** Agriculture, FoodTech & Rural Development
**Problem Statement:** Early detection and management of crop diseases and pest infestations

## Overview
Farmers often detect crop diseases only after visible damage has spread, while expert advice and lab diagnosis are rarely immediately available. This prototype provides an AI-assisted, farmer- and officer-friendly system for early disease detection, contextual risk assessment, expert validation, and geospatial outbreak monitoring.

## How It Works
1. **Farmer uploads a crop photo** with crop type, growth stage, and location
2. **AI model classifies** the disease and returns a confidence score
3. **Confidence-tier logic** decides the next step:
   - High confidence → advisory sent directly to farmer
   - Low/medium confidence → case flagged for officer/expert review
4. **Officer confirms or corrects** the diagnosis via a review queue
5. **Confirmed cases** are plotted on a hotspot map for regional disease surveillance
6. **Farmer gets a follow-up prompt** to report whether the treatment worked

## Tech Stack
| Layer | Tool |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | Python (FastAPI) |
| AI Model | Image classification (Teachable Machine / TensorFlow) |
| Database | SQLite |
| Map | Leaflet.js |
| Charts | Recharts |

## Project Structure

agri-disease-detection/
├── frontend/ → React app (farmer + officer views)
├── backend/ → FastAPI server & endpoints
├── ml-model/ → Disease classification model & training scripts
├── risk-logic/ → Confidence-tier logic & advisory content
├── demo-data/ → Seed data for map/dashboard demo
├── docs/ → PPT, architecture notes, problem statement
└── README.md


## Team & Roles
| Role | Responsibility |
|---|---|
| AI/ML | Train & export disease classification model |
| Backend Lead | Build FastAPI endpoints, integrate model + risk logic |
| Risk Logic | Confidence-tier rules, hardcoded advisory content, database |
| Frontend (Farmer) | Upload, advisory, and follow-up screens |
| Frontend (Officer) | Case queue, confirmation, and hotspot map/dashboard |
| Integration & Demo | Seed data, end-to-end testing, demo script |

## Getting Started
```bash
git clone https://github.com/Jashsystems/agri-disease-detection.git
cd agri-disease-detection
git pull   # always pull before starting work
```

## Status
🚧 Prototype in development

