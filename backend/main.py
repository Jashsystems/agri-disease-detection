from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from risk_logic import determine_risk, should_send_advisory
from prediction import predict
from datetime import datetime
import sqlite3
import uuid


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
    confidence INTEGER,
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

app = FastAPI()


advisories = {
    "Leaf Blight": {
        "what_it_is": "A fungal disease affecting crop leaves.",
        "what_to_do": [
            "Remove severely affected leaves.",
            "Avoid excessive moisture on leaves."
        ],
        "safe_dosage": "Follow the fungicide label dosage."
    }
}


@app.get("/")
def home():
    return {"message": "SIH Backend is running"}


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

    result = predict(image_data)

    disease = result["disease"]
    confidence = result["confidence"]

    status = determine_risk(confidence)
    send_advisory = should_send_advisory(confidence)

    if send_advisory:
        advisory = advisories.get(disease)
    else:
        advisory = None

    report = {
        "report_id": report_id,
        "filename": image_file.filename,
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


@app.get("/advisory/{report_id}")
def get_advisory(report_id: str):
    cursor.execute(
        "SELECT * FROM reports WHERE report_id = ?",
        (report_id,)
    )

    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Report not found")

    disease = row[7]

    if disease not in advisories:
        raise HTTPException(
            status_code=404,
            detail="Advisory not available"
        )

    return advisories[disease]


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


@app.post("/confirm-case")
def confirm_case(data: dict):
    report_id = data["report_id"]

    cursor.execute(
        "SELECT * FROM reports WHERE report_id = ?",
        (report_id,)
    )

    row = cursor.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Report not found")

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
