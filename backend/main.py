import os
import sys
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware


# ============================================================
# PROJECT PATHS
# ============================================================

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, os.path.join(_ROOT, "risk-logic"))

from risk_logic import determine_risk, should_send_advisory
from advisory_data import get_advisory


# ============================================================
# DATABASE
# ============================================================

conn = sqlite3.connect("reports.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS reports (
    report_id TEXT PRIMARY KEY,
    filename TEXT,
    crop TEXT,
    stage TEXT,
    village TEXT,
    lat REAL,
    lng REAL,
    disease TEXT,
    confidence REAL,
    status TEXT,
    confirmed_disease TEXT,
    officer_id TEXT,
    timestamp TEXT
)
""")

# Add timestamp column if using an older database
try:
    cursor.execute("ALTER TABLE reports ADD COLUMN timestamp TEXT")
    conn.commit()
except sqlite3.OperationalError:
    pass

conn.commit()


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(title="SIH Agri Disease Detection API")

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ML PREDICTION
# ============================================================

def run_prediction(image_data):
    """
    Load the ML model only when prediction is actually required.

    This allows the FastAPI backend to start on systems where
    TensorFlow/NumPy are not installed.
    """

    ml_dir = Path(_ROOT) / "ml-model"

    if str(ml_dir) not in sys.path:
        sys.path.insert(0, str(ml_dir))

    try:
        from predict import predict
        return predict(image_data)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {exc}"
        )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def home():
    return {
        "message": "SIH Backend is running"
    }


# ============================================================
# UPLOAD REPORT
# ============================================================

@app.post("/upload-report")
def upload_report(
    crop: str = Form(...),
    stage: str = Form(...),
    village: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    image_file: UploadFile = File(...)
):
    report_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()

    image_data = image_file.file.read()

    image_path = UPLOAD_DIR / f"{report_id}_{image_file.filename}"
    image_path.write_bytes(image_data)

    # Run real ML prediction
    result = run_prediction(image_data)

    disease = result["disease"]
    confidence = result["confidence"]

    # Determine confidence-based workflow
    status = determine_risk(confidence)
    send_advisory = should_send_advisory(confidence)

    # Generate advisory only when confidence threshold allows it
    advisory = get_advisory(disease) if send_advisory else None

    report = {
        "report_id": report_id,
        "filename": image_file.filename,
        "crop": crop,
        "stage": stage,
        "image_url": f"/uploads/{report_id}_{image_file.filename}",
        "disease": disease,
        "confidence": confidence,
        "status": status,
        "location": {
            "village": village,
            "lat": lat,
            "lng": lng
        },
        "timestamp": timestamp,
        "advisory": advisory
    }

    cursor.execute("""
        INSERT INTO reports (
            report_id,
            filename,
            crop,
            stage,
            village,
            lat,
            lng,
            disease,
            confidence,
            status,
            timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        report_id,
        image_file.filename,
        crop,
        stage,
        village,
        lat,
        lng,
        disease,
        confidence,
        status,
        timestamp
    ))

    conn.commit()

    return report


# ============================================================
# ADVISORY
# ============================================================

@app.get("/advisory/{report_id}")
def get_advisory_for_report(report_id: str):

    cursor.execute(
        "SELECT * FROM reports WHERE report_id = ?",
        (report_id,)
    )

    row = cursor.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    disease = row[7]

    advisory = get_advisory(disease)

    return advisory


# ============================================================
# OFFICER QUEUE
# ============================================================

@app.get("/officer-queue")
def officer_queue():

    cursor.execute(
        "SELECT * FROM reports WHERE status = ?",
        ("pending_review",)
    )

    rows = cursor.fetchall()

    queue = []

    for row in rows:
        queue.append({
            "report_id": row[0],
            "filename": row[1],
            "crop": row[2],
            "stage": row[3],
            "location": {
                "village": row[4],
                "lat": row[5],
                "lng": row[6]
            },
            "disease": row[7],
            "confidence": row[8],
            "status": row[9]
        })

    return queue


# ============================================================
# CONFIRM CASE
# ============================================================

@app.post("/confirm-case")
def confirm_case(data: dict):

    report_id = data["report_id"]

    cursor.execute(
        "SELECT * FROM reports WHERE report_id = ?",
        (report_id,)
    )

    row = cursor.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    cursor.execute("""
        UPDATE reports
        SET status = ?,
            confirmed_disease = ?,
            officer_id = ?
        WHERE report_id = ?
    """, (
        "confirmed",
        data["confirmed_disease"],
        data["officer_id"],
        report_id
    ))

    conn.commit()

    cursor.execute(
        "SELECT * FROM reports WHERE report_id = ?",
        (report_id,)
    )

    row = cursor.fetchone()

    return {
        "report_id": row[0],
        "filename": row[1],
        "crop": row[2],
        "stage": row[3],
        "location": {
            "village": row[4],
            "lat": row[5],
            "lng": row[6]
        },
        "disease": row[7],
        "confidence": row[8],
        "status": row[9],
        "confirmed_disease": row[10],
        "officer_id": row[11],
        "timestamp": row[12]
    }


# ============================================================
# CONFIRMED CASES
# ============================================================

@app.get("/confirmed-cases")
def confirmed_cases():

    cursor.execute(
        "SELECT * FROM reports WHERE status = ?",
        ("confirmed",)
    )

    rows = cursor.fetchall()

    confirmed = []

    for row in rows:
        confirmed.append({
            "report_id": row[0],
            "filename": row[1],
            "crop": row[2],
            "stage": row[3],
            "location": {
                "village": row[4],
                "lat": row[5],
                "lng": row[6]
            },
            "disease": row[7],
            "confidence": row[8],
            "status": row[9],
            "confirmed_disease": row[10],
            "officer_id": row[11],
            "timestamp": row[12]
        })

    return confirmed
