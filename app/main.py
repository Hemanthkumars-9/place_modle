from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware 
import pandas as pd
import io

from app.class_summary import (
    get_class_summary,
    generate_attendance_log_from_df,
    save_attendance_log,
    load_attendance_log,
    resolve_match,   
)


app = FastAPI()
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

    # Keep a copy to save to CSV with proper types
    log_to_store = attendance_df.copy()

    # Convert to object & clean for JSON
    attendance_df = attendance_df.astype(object)
    attendance_df = attendance_df.where(pd.notnull(attendance_df), None)

    if "matched" in attendance_df.columns:
        matched_count = int(attendance_df["matched"].sum())
        unmatched_count = int((~attendance_df["matched"]).sum())
    else:
        matched_count = 0
        unmatched_count = len(attendance_df)

    # Persist to attendance_log.csv (de-dup by fingerprint_hash)
    save_attendance_log(log_to_store)

    response = {
        "rows": int(len(attendance_df)),
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "data": attendance_df.to_dict(orient="records"),
    }

    return jsonable_encoder(response)


@app.get("/api/unmatched")
def api_unmatched():
    """
    Return all unmatched attendance rows from the persistent log.
    This is your admin review queue.
    """
    log_df = load_attendance_log()

    if log_df is None or log_df.empty:
        return jsonable_encoder({"rows": 0, "data": []})

    if "matched" not in log_df.columns:
        return jsonable_encoder({"rows": 0, "data": []})

    unmatched = log_df[log_df["matched"] == False]  # noqa: E712  (explicit False)

    if unmatched.empty:
        return jsonable_encoder({"rows": 0, "data": []})

    # Clean for JSON
    unmatched = unmatched.astype(object)
    unmatched = unmatched.where(pd.notnull(unmatched), None)

    return jsonable_encoder(
        {
            "rows": int(len(unmatched)),
            "data": unmatched.to_dict(orient="records"),
        }
    )
class ResolveMatchRequest(BaseModel):
    attendance_id: str
    student_id: str


@app.post("/api/resolve_match")
def api_resolve_match(payload: ResolveMatchRequest):
    """
    Admin resolves an unmatched (or incorrect) row by assigning a student_id.
    """
    try:
        updated_row = resolve_match(
            attendance_id=payload.attendance_id,
            new_student_id=payload.student_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Clean for JSON
    df = pd.DataFrame([updated_row]).astype(object)
    df = df.where(pd.notnull(df), None)
    return jsonable_encoder(df.to_dict(orient="records")[0])
