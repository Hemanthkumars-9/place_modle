from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.matching import load_students
from pathlib import Path
import pandas as pd
import io
import uuid  

from app.class_summary import (
    get_class_summary,
    generate_attendance_log_from_df,
    save_attendance_log,
    load_attendance_log,
)

app = FastAPI()

# CORS for frontend
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

# ---- Very simple in-memory auth ----
USERS = {
    # you can change these emails/passwords
    "tpo@example.com": {"password": "tpo123", "role": "admin"},
    "viewer@example.com": {"password": "viewer123", "role": "viewer"},
}

# token -> email
TOKENS: dict[str, str] = {}


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str
    role: str


@app.post("/api/login", response_model=LoginResponse)
def api_login(body: LoginRequest):
    user = USERS.get(body.email)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = str(uuid.uuid4())
    TOKENS[token] = body.email
    return {"token": token, "email": body.email, "role": user["role"]}


BASE_DIR = Path(__file__).resolve().parent.parent   # go up one level
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
ATTENDANCE_LOG_PATH = DATA_DIR / "attendance_log.csv"
STUDENTS_MASTER_PATH = DATA_DIR / "students_master.csv"

# ========= CLASS SUMMARY =========
@app.get("/api/class_summary/{class_id}")
def api_class_summary(class_id: str):
    return get_class_summary(class_id)

@app.get("/api/students/{student_id}/events")
def api_student_events(student_id: str):
    """
    Return profile + all attendance_log events for a given student_id.
    """
    # Load master students
    try:
        students_df = load_students()
    except FileNotFoundError:
        raise HTTPException(
            status_code=400,
            detail="students_master.csv not found on server",
        )

    students_df.columns = [c.strip().lower() for c in students_df.columns]

    if "student_id" not in students_df.columns:
        raise HTTPException(
            status_code=500,
            detail=f"'student_id' column missing in students_master.csv (columns={list(students_df.columns)})",
        )

    # Normalize & find student
    students_df["student_id"] = students_df["student_id"].astype(str).str.strip()
    target_id = str(student_id).strip()

    student_mask = students_df["student_id"] == target_id
    if not student_mask.any():
        raise HTTPException(
            status_code=404, detail=f"No student found with student_id={target_id}"
        )

    student_row = students_df[student_mask].iloc[0].to_dict()

    # Load attendance log
    log_df = load_attendance_log()
    if log_df is None or log_df.empty:
        events_list = []
    else:
        log_df.columns = [c.strip().lower() for c in log_df.columns]
        if "student_id" not in log_df.columns:
            events_list = []
        else:
            log_df["student_id"] = log_df["student_id"].astype(str).str.strip()
            events = log_df[log_df["student_id"] == target_id].copy()

            # Clean for JSON
            events = events.astype(object)
            events = events.where(pd.notnull(events), None)
            events_list = events.to_dict(orient="records")

    return jsonable_encoder(
        {
            "student": student_row,
            "events": events_list,
        }
    )
@app.get("/api/student/{student_id}")
def api_student_detail(student_id: str):
    """
    Return a single student's basic info + all their attendance_log events
    + a small summary (placements, internships, etc).
    """
    # Load master students
    students_df = load_students()
    students_df.columns = [c.strip().lower() for c in students_df.columns]

    sid = str(student_id).strip()

    student_row = students_df[
        students_df["student_id"].astype(str).str.strip() == sid
    ]

    if student_row.empty:
        student_obj = None
    else:
        student_obj = student_row.iloc[0].to_dict()

    # Load attendance log
    log_df = load_attendance_log()
    if log_df is None or log_df.empty:
        events_df = None
    else:
        log_df.columns = [c.strip().lower() for c in log_df.columns]
        events_df = log_df[
            log_df["student_id"].astype(str).str.strip() == sid
        ]

    # Build events list
    if events_df is None or events_df.empty:
        events_list = []
        summary = {
            "total_events": 0,
            "placements": 0,
            "internships": 0,
            "trainings": 0,
            "max_lpa": None,
            "avg_lpa_placed": None,
            "companies": [],
        }
    else:
        # ensure we have consistent types
        events_df = events_df.copy()
        etype = events_df["event_type"].astype(str).str.lower()
        result = events_df["result"].astype(str).str.lower()

        placed = events_df[(etype == "placement") & (result == "selected")]
        internship = events_df[(etype == "internship") & (result == "selected")]
        training = events_df[(etype == "training")]

        # LPA metrics
        max_lpa = None
        avg_lpa_placed = None
        if "lpa" in events_df.columns:
            try:
                lpa_all = pd.to_numeric(events_df["lpa"], errors="coerce")
                if lpa_all.notna().any():
                    max_lpa = float(lpa_all.max())
            except Exception:
                max_lpa = None

        if "lpa" in placed.columns:
            try:
                lpa_placed = pd.to_numeric(placed["lpa"], errors="coerce")
                if lpa_placed.notna().any():
                    avg_lpa_placed = float(lpa_placed.mean())
            except Exception:
                avg_lpa_placed = None

        # companies
        companies = []
        if "company" in events_df.columns:
            companies = sorted(
                set(
                    events_df["company"]
                    .astype(str)
                    .str.strip()
                    .replace({"": pd.NA})
                    .dropna()
                    .tolist()
                )
            )

        summary = {
            "total_events": int(len(events_df)),
            "placements": int(len(placed)),
            "internships": int(len(internship)),
            "trainings": int(len(training)),
            "max_lpa": max_lpa,
            "avg_lpa_placed": avg_lpa_placed,
            "companies": companies,
        }

        # make events JSON-safe
        events_df = events_df.astype(object)
        events_df = events_df.where(pd.notnull(events_df), None)
        events_list = events_df.to_dict(orient="records")

    return {
        "student": student_obj,
        "events": events_list,
        "summary": summary,
    }

@app.post("/api/upload_students")
async def upload_students(file: UploadFile = File(...)):
    """
    Upload a new students_master.csv and store it in data/students_master.csv.

    Required columns (case-insensitive):
      - student_id
      - name
      - email
      - phone
      - class_id
    """
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    # normalize columns
    df.columns = [c.strip().lower() for c in df.columns]

    required_cols = {"student_id", "name", "email", "phone", "class_id"}
    missing = required_cols - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(sorted(missing))}",
        )

    # basic cleaning
    df["student_id"] = df["student_id"].astype(str).str.strip()
    df["email"] = df["email"].astype(str).str.strip().str.lower()
    df["phone"] = df["phone"].astype(str).str.strip()
    df["class_id"] = df["class_id"].astype(str).str.strip()

    # ensure unique student_id (keep first)
    df = df.drop_duplicates(subset=["student_id"])

    # write to data/students_master.csv
    STUDENTS_MASTER_PATH.parent.mkdir(exist_ok=True, parents=True)
    df.to_csv(STUDENTS_MASTER_PATH, index=False)

    return {
        "rows": int(len(df)),
        "path": str(STUDENTS_MASTER_PATH),
    }
@app.get("/api/classes")
def api_classes():
    """
    Return list of distinct classes from students_master.csv
    with student counts.
    """
    students_df = load_students()
    if students_df is None or students_df.empty:
        return {"classes": []}

    students_df = students_df.copy()
    students_df.columns = [c.strip().lower() for c in students_df.columns]

    if "class_id" not in students_df.columns:
        return {"classes": []}

    students_df["class_id"] = students_df["class_id"].astype(str).str.strip()
    students_df["student_id"] = students_df["student_id"].astype(str).str.strip()

    grouped = (
        students_df.groupby("class_id")["student_id"]
        .nunique()
        .reset_index()
        .rename(columns={"student_id": "total_students"})
    )

    classes = []
    for _, row in grouped.iterrows():
        classes.append(
            {
                "class_id": row["class_id"],
                "total_students": int(row["total_students"]),
            }
        )

    return {"classes": classes}
@app.get("/api/class_students/{class_id}")
def api_class_students(class_id: str):
    """
    Return all students in a given class_id.
    """
    students_df = load_students()
    if students_df is None or students_df.empty:
        return {"rows": 0, "data": []}

    students_df = students_df.copy()
    students_df.columns = [c.strip().lower() for c in students_df.columns]

    if "class_id" not in students_df.columns:
        return {"rows": 0, "data": []}

    students_df["class_id"] = students_df["class_id"].astype(str).str.strip()
    students_df["student_id"] = students_df["student_id"].astype(str).str.strip()

    cid = str(class_id).strip()
    subset = students_df[students_df["class_id"] == cid]

    if subset.empty:
        return {"rows": 0, "data": []}

    subset = subset.astype(object)
    subset = subset.where(pd.notnull(subset), None)

    return {
        "rows": int(len(subset)),
        "data": subset.to_dict(orient="records"),
    }

# ========= UPLOAD EVENTS =========
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

    # Copy for storage
    log_to_store = attendance_df.copy()

    # Clean for JSON
    attendance_df = attendance_df.astype(object)
    attendance_df = attendance_df.where(pd.notnull(attendance_df), None)

    if "matched" in attendance_df.columns:
        matched_count = int(attendance_df["matched"].sum())
        unmatched_count = int((~attendance_df["matched"]).sum())
    else:
        matched_count = 0
        unmatched_count = len(attendance_df)

    # Persist (de-dup by fingerprint_hash inside save_attendance_log)
    save_attendance_log(log_to_store)

    response = {
        "rows": int(len(attendance_df)),
        "matched_count": matched_count,
        "unmatched_count": unmatched_count,
        "data": attendance_df.to_dict(orient="records"),
    }

    return jsonable_encoder(response)

@app.get("/api/classes/{class_id}/students")
def api_class_students(class_id: str):
    """
    Return all students belonging to a given class_id
    from students_master.csv, plus per-student placement summary.
    """
    try:
        students_df = load_students()
    except FileNotFoundError:
        raise HTTPException(
            status_code=400,
            detail="students_master.csv not found on server",
        )

    if students_df is None or students_df.empty:
        return jsonable_encoder({"rows": 0, "data": []})

    students_df = students_df.copy()
    students_df.columns = [c.strip().lower() for c in students_df.columns]

    if "class_id" not in students_df.columns or "student_id" not in students_df.columns:
        raise HTTPException(
            status_code=500,
            detail=f"'class_id' or 'student_id' column missing in students_master.csv (columns={list(students_df.columns)})",
        )

    # normalize
    students_df["class_id"] = students_df["class_id"].astype(str).str.strip()
    students_df["student_id"] = students_df["student_id"].astype(str).str.strip()

    cid = str(class_id).strip()
    subset = students_df[students_df["class_id"] == cid].copy()

    if subset.empty:
        return jsonable_encoder({"rows": 0, "data": []})

    # ---- load attendance log & build per-student stats ----
    log_df = load_attendance_log()
    if log_df is not None and not log_df.empty:
        log_df = log_df.copy()
        log_df.columns = [c.strip().lower() for c in log_df.columns]
        if "student_id" in log_df.columns:
            log_df["student_id"] = log_df["student_id"].astype(str).str.strip()
        else:
            log_df = None
    else:
        log_df = None

    # create extra columns on subset
    subset["total_events"] = 0
    subset["placements"] = 0
    subset["internships"] = 0
    subset["trainings"] = 0
    subset["max_lpa"] = None
    subset["last_company"] = None
    subset["last_result"] = None

    if log_df is not None:
        # we only care about events for these students
        class_student_ids = set(subset["student_id"].tolist())
        log_subset = log_df[log_df["student_id"].isin(class_student_ids)].copy()

        if not log_subset.empty:
            # normalize helper columns
            if "event_type" in log_subset.columns:
                log_subset["event_type_norm"] = (
                    log_subset["event_type"].astype(str).str.lower()
                )
            else:
                log_subset["event_type_norm"] = ""

            if "result" in log_subset.columns:
                log_subset["result_norm"] = (
                    log_subset["result"].astype(str).str.lower()
                )
            else:
                log_subset["result_norm"] = ""

            # loop students and fill stats
            for idx, row in subset.iterrows():
                sid = row["student_id"]
                s_events = log_subset[log_subset["student_id"] == sid]

                if s_events.empty:
                    continue

                etype = s_events["event_type_norm"]
                result = s_events["result_norm"]

                placed = s_events[(etype == "placement") & (result == "selected")]
                internship = s_events[(etype == "internship") & (result == "selected")]
                training = s_events[(etype == "training")]

                subset.at[idx, "total_events"] = int(len(s_events))
                subset.at[idx, "placements"] = int(len(placed))
                subset.at[idx, "internships"] = int(len(internship))
                subset.at[idx, "trainings"] = int(len(training))

                # max LPA (numeric)
                max_lpa = None
                if "lpa" in s_events.columns:
                    try:
                        lpa_vals = pd.to_numeric(
                            s_events["lpa"], errors="coerce"
                        )
                        if lpa_vals.notna().any():
                            max_lpa = float(lpa_vals.max())
                    except Exception:
                        max_lpa = None
                subset.at[idx, "max_lpa"] = max_lpa

                # "last" company / result (by row order)
                last = s_events.dropna(subset=["company"]).tail(1)
                if not last.empty:
                    subset.at[idx, "last_company"] = str(
                        last["company"].iloc[0]
                    )
                    subset.at[idx, "last_result"] = str(
                        last["result"].iloc[0]
                    )

    # Clean for JSON
    subset = subset.astype(object)
    subset = subset.where(pd.notnull(subset), None)

    return jsonable_encoder(
        {
            "rows": int(len(subset)),
            "data": subset.to_dict(orient="records"),
        }
    )


# ========= UNMATCHED QUEUE =========
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

    unmatched = log_df[log_df["matched"] == False]  # noqa: E712

    if unmatched.empty:
        return jsonable_encoder({"rows": 0, "data": []})

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
async def api_resolve_match(body: ResolveMatchRequest):
    log_df = load_attendance_log()
    if log_df is None or log_df.empty:
        raise HTTPException(status_code=400, detail="Attendance log is empty.")

    log_df.columns = [c.strip().lower() for c in log_df.columns]
    log_df["attendance_id"] = log_df["attendance_id"].astype(str).str.strip()

    target_id = str(body.attendance_id).strip()
    mask = log_df["attendance_id"] == target_id

    if not mask.any():
        raise HTTPException(status_code=400, detail=f"No row found with attendance_id={target_id}")

    log_df.loc[mask, "student_id"] = body.student_id
    log_df.loc[mask, "matched"] = True
    log_df.loc[mask, "match_status"] = "MANUAL"
    log_df.loc[mask, "match_score"] = 100

    log_df.to_csv(ATTENDANCE_LOG_PATH, index=False)

    updated_row = log_df.loc[mask].iloc[0].astype(object).where(
        pd.notnull(log_df.loc[mask].iloc[0]), None).to_dict()

    return jsonable_encoder(updated_row)

