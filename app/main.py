from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.encoders import jsonable_encoder
import pandas as pd
import io

from app.class_summary import get_class_summary, generate_attendance_log_from_df

app = FastAPI()


@app.get("/api/class_summary/{class_id}")
def api_class_summary(class_id: str):
    return get_class_summary(class_id)


@app.post("/api/upload_events")
async def upload_events(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    try:
        content = await file.read()
        events_df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    # Normalize columns
    events_df.columns = [c.strip().lower() for c in events_df.columns]
    print("DEBUG events_df.columns:", list(events_df.columns))

    required_cols = {
        "student_id",
        "name",
        "email",
        "company_or_organizer",
        "event_type",
        "event_date",
        "result",
    }
    missing = required_cols - set(events_df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in CSV: {', '.join(sorted(missing))}",
        )

    attendance_df = generate_attendance_log_from_df(events_df)
    print("DEBUG attendance_df.columns:", list(attendance_df.columns))

    if attendance_df.empty:
        response = {
            "rows": 0,
            "matched_count": 0,
            "unmatched_count": 0,
            "data": [],
        }
        return jsonable_encoder(response)

    # 🔑 CRITICAL FIX: convert to object before replacing NaN
    attendance_df = attendance_df.astype(object)
    attendance_df = attendance_df.where(pd.notnull(attendance_df), None)

    if "matched" in attendance_df.columns:
        matched_count = int(attendance_df["matched"].sum())
        unmatched_count = int((~attendance_df["matched"]).sum())
    else:
        matched_count = 0
        unmatched_count = len(attendance_df)

    response = {
        "rows": int(len(attendance_df)),
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "data": attendance_df.to_dict(orient="records"),
    }

    return jsonable_encoder(response)
