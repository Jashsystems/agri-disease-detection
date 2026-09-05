from fastapi import FastAPI,HTTPException,Form,UploadFile, File
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
    officer_id TEXT
)
""")

conn.commit()

app = FastAPI()
reports={}
@app.get("/")
def home():
    return {"message": "SIH Backend is running"}
@app.post("/upload-report")
def report(crop: str = Form(...),stage: str = Form(...),village: str = Form(...),
lat: float = Form(...),
lng: float = Form(...),image_file: UploadFile = File(...)
): 
   location = {
    "village": village,
    "lat": lat,
    "lng": lng
   }
   report_id=str(uuid.uuid4())
   disease = "Leaf Blight"
   confidence = 70
   status="auto_sent"if confidence>80 else "pending_review"
   report = {
    "report_id": report_id,
    "filename": image_file.filename,
    "crop": crop,
    "stage": stage,
    "location": location,
    "disease": disease,
    "confidence": confidence,
    "status": status
     }
   cursor.execute("""
    INSERT INTO reports (
    report_id, filename, crop, stage,
    village, lat, lng,
    disease, confidence, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    status
    ))
   conn.commit()
   reports[report_id]=report
   return report
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
@app.get("/advisory/{report_id}")
def advisory(report_id: str):
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
        report = {
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
        }

        queue.append(report)

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
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    cursor.execute(
        """
        UPDATE reports
        SET status = ?, confirmed_disease = ?, officer_id = ?
        WHERE report_id = ?
        """,
        (
            "confirmed",
            data["confirmed_disease"],
            data["officer_id"],
            report_id
        )
    )

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
        "officer_id": row[11]
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
        report = {
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
            "officer_id": row[11]
        }

        confirmed.append(report)

    return confirmed
