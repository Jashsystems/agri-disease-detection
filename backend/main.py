from fastapi import FastAPI,HTTPException,Form,UploadFile, File
import uuid
app = FastAPI()
reports={}
@app.get("/")
def home():
    return {"message": "SIH Backend is running"}
@app.post("/upload-report")
def report(crop: str = Form(...),stage: str = Form(...),location: str = 
Form(...),image_file: UploadFile = File(...)
):
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
   reports[report_id]=report
   return report
@app.get("/advisory/{report_id}")
def advisory( report_id: str):
    if report_id not in reports:
     raise HTTPException(status_code=404, detail="Report not found")
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
    report=reports[report_id]
    disease=report["disease"]
    return advisories[disease]
@app.get("/officer-queue")
def officer_queue():
      queue=[]
      for report in reports.values():
       if(report["status"]=="pending_review"):
         queue.append(report)
      return queue
