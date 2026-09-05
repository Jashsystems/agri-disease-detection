from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import sqlite3
import uuid
import os
import sys


app = FastAPI(title="Agri Disease Detection API")


# ==================================================
# CORS
# ==================================================

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


# ==================================================
# DATABASE
# ==================================================

DB_NAME = "reports.db"

db = sqlite3.connect(
    DB_NAME,
    check_same_thread=False
)

db.execute("""
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

try:
    db.execute(
        "ALTER TABLE reports ADD COLUMN timestamp TEXT"
    )
    db.commit()
except sqlite3.OperationalError:
    pass


# ==================================================
# ADVISORIES
# ==================================================

advisories = {

    "Bacterial_Spot": {
        "what_it_is":
            "Bacterial spot is a bacterial disease that causes dark spots and lesions on leaves.",

        "what_to_do": [
            "Remove severely affected leaves.",
            "Avoid overhead irrigation.",
            "Keep the field and foliage dry where possible.",
            "Use only locally recommended bactericides or treatments."
        ],

        "safe_dosage":
            "Follow the product label and local agricultural officer recommendations."
    },


    "Early_Blight": {
        "what_it_is":
            "Early blight is a fungal disease that produces dark concentric lesions on leaves.",

        "what_to_do": [
            "Remove heavily infected leaves.",
            "Avoid prolonged leaf wetness.",
            "Maintain adequate spacing and field ventilation.",
            "Use a locally recommended fungicide when necessary."
        ],

        "safe_dosage":
            "Follow the fungicide label and local agricultural officer recommendations."
    },


    "Late_Blight": {
        "what_it_is":
            "Late blight is a serious disease that can rapidly damage leaves and stems under favourable conditions.",

        "what_to_do": [
            "Remove severely infected plant material.",
            "Avoid overhead irrigation.",
            "Improve field ventilation.",
            "Seek agricultural guidance for appropriate fungicide treatment."
        ],

        "safe_dosage":
            "Follow the fungicide label and local agricultural officer recommendations."
    },


    "Leaf_Mold": {
        "what_it_is":
            "Leaf mold is a fungal disease associated with leaf spots and mold growth, especially under humid conditions.",

        "what_to_do": [
            "Improve air circulation around plants.",
            "Avoid excessive humidity and prolonged leaf wetness.",
            "Remove severely affected leaves.",
            "Use locally recommended fungicide treatment if required."
        ],

        "safe_dosage":
            "Follow the fungicide label and local agricultural officer recommendations."
    },


    "Healthy": {
        "what_it_is":
            "The AI model classified the submitted leaf as healthy.",

        "what_to_do": [
            "Continue regular crop monitoring.",
            "Maintain appropriate irrigation.",
            "Monitor nearby plants for early symptoms."
        ],

        "safe_dosage":
            "No disease treatment is indicated from this prediction."
    }
}


# ==================================================
# ML MODEL
# ==================================================

def run_prediction(image_data):
    """
    Loads the real ML predictor only when an image is submitted.

    This keeps FastAPI importable on systems that do not currently
    have TensorFlow installed.

    The demo laptop must have the ML dependencies installed.
    """

    ml_model_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            "ml-model"
        )
    )

    if ml_model_path not in sys.path:
        sys.path.append(ml_model_path)

    try:
        from predict import predict
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=(
                "ML model dependencies are not available. "
                f"Model import failed: {str(e)}"
            )
        )

    try:
        return predict(image_data)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model prediction failed: {str(e)}"
        )


# ==================================================
# DATABASE HELPER
# ==================================================

def row_to_report(row):

    (
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
        confirmed_disease,
        officer_id,
        timestamp
    ) = row

    return {
        "report_id": report_id,
        "crop": crop,
        "stage": stage,
        "image_url": filename,
        "disease": disease,
        "confidence": confidence,
        "status": status,
        "location": {
            "village": village,
            "lat": lat,
            "lng": lng
        },
        "timestamp": timestamp,
        "advisory": advisories.get(disease),
        "confirmed_disease": confirmed_disease,
        "officer_id": officer_id
    }


# ==================================================
# UPLOAD REPORT
# ==================================================

@app.post("/upload-report")
async def upload_report(
    crop: str = Form(...),
    stage: str = Form(...),
    village: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    image_file: UploadFile = File(...)
):

    if (
        not image_file.content_type
        or not image_file.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Only image files are allowed."
        )

    image_data = await image_file.read()

    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )

    report_id = str(uuid.uuid4())

    timestamp = datetime.now(
        timezone.utc
    ).isoformat()

    # ----------------------------------------------
    # REAL AI PREDICTION
    # ----------------------------------------------

    prediction = run_prediction(image_data)

    disease = prediction["disease"]
    confidence = float(
        prediction["confidence"]
    )

    # ----------------------------------------------
    # RISK LOGIC
    # ----------------------------------------------

    if confidence > 80:
        status = "auto_sent"
    else:
        status = "pending_review"

    # ----------------------------------------------
    # DATABASE
    # ----------------------------------------------

    db.execute(
        """
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
            confirmed_disease,
            officer_id,
            timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
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
            None,
            None,
            timestamp
        )
    )

    db.commit()

    return {
        "report_id": report_id,
        "crop": crop,
        "stage": stage,
        "image_url": image_file.filename,
        "disease": disease,
        "confidence": confidence,
        "status": status,
        "location": {
            "village": village,
            "lat": lat,
            "lng": lng
        },
        "timestamp": timestamp,
        "advisory": advisories.get(disease)
    }


# ==================================================
# ADVISORY
# ==================================================

@app.get("/advisory/{report_id}")
def get_advisory(report_id: str):

    cursor = db.execute(
        """
        SELECT
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
            confirmed_disease,
            officer_id,
            timestamp
        FROM reports
        WHERE report_id = ?
        """,
        (report_id,)
    )

    row = cursor.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found."
        )

    report = row_to_report(row)

    if report["advisory"] is None:
        raise HTTPException(
            status_code=404,
            detail="Advisory not available."
        )

    return report["advisory"]


# ==================================================
# OFFICER QUEUE
# ==================================================

@app.get("/officer-queue")
def officer_queue():

    cursor = db.execute(
        """
        SELECT
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
            confirmed_disease,
            officer_id,
            timestamp
        FROM reports
        WHERE status = 'pending_review'
        ORDER BY timestamp DESC
        """
    )

    rows = cursor.fetchall()

    return [
        row_to_report(row)
        for row in rows
    ]


# ==================================================
# CONFIRM / CORRECT CASE
# ==================================================

@app.post("/confirm-case")
def confirm_case(data: dict):

    report_id = data.get("report_id")
    confirmed_disease = data.get(
        "confirmed_disease"
    )
    officer_id = data.get(
        "officer_id",
        "OFF-001"
    )

    if not report_id:
        raise HTTPException(
            status_code=400,
            detail="report_id is required."
        )

    if not confirmed_disease:
        raise HTTPException(
            status_code=400,
            detail="confirmed_disease is required."
        )

    cursor = db.execute(
        """
        SELECT report_id
        FROM reports
        WHERE report_id = ?
        """,
        (report_id,)
    )

    if cursor.fetchone() is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found."
        )

    db.execute(
        """
        UPDATE reports
        SET
            status = 'confirmed',
            confirmed_disease = ?,
            officer_id = ?
        WHERE report_id = ?
        """,
        (
            confirmed_disease,
            officer_id,
            report_id
        )
    )

    db.commit()

    return {
        "message": "Case confirmed successfully.",
        "report_id": report_id,
        "confirmed_disease": confirmed_disease,
        "officer_id": officer_id,
        "status": "confirmed"
    }


# ==================================================
# CONFIRMED CASES
# ==================================================

@app.get("/confirmed-cases")
def confirmed_cases():

    cursor = db.execute(
        """
        SELECT
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
            confirmed_disease,
            officer_id,
            timestamp
        FROM reports
        WHERE status = 'confirmed'
        ORDER BY timestamp DESC
        """
    )

    rows = cursor.fetchall()

    return [
        row_to_report(row)
        for row in rows
    ]


# ==================================================
# HEALTH CHECK
# ==================================================

@app.get("/")
def root():
    return {
        "message":
            "Agri Disease Detection API is running."
    }
