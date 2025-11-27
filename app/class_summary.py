import os
import uuid
import pandas as pd
from app.matching import (
    load_students,
    load_events,
    build_lookup,
    match_student,
    make_fingerprint,
)

LOG_PATH = "data/attendance_log.csv"


def generate_attendance_log_from_df(events_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build an attendance log DataFrame from a given events DataFrame.
    Used both for the default CSV and for uploaded CSVs.
    """
    students_df = load_students()
    lookup_id, lookup_email, lookup_phone, lookup_name = build_lookup(students_df)

    logs = []
    fingerprints = set()

    for _, row in events_df.iterrows():
        fp = make_fingerprint(row)
        if fp in fingerprints:
            # skip duplicate rows in same upload
            continue
        fingerprints.add(fp)

        student_row, status, score = match_student(
            row, lookup_id, lookup_email, lookup_phone, lookup_name
        )

        logs.append(
            {
                "attendance_id": str(uuid.uuid4()),
                "fingerprint_hash": fp,
                "student_id": student_row["student_id"] if student_row is not None else None,
                "class_id": student_row["class_id"] if student_row is not None else None,
                "event_type": row.get("event_type"),
                "company": row.get("company_or_organizer"),
                "result": row.get("result"),
                "lpa": row.get("lpa"),
                "matched": (status != "UNMATCHED"),
                "match_status": status,
                "match_score": score,
            }
        )

    return pd.DataFrame(logs)


def generate_attendance_log() -> pd.DataFrame:
    """
    Existing behavior: use the default event_upload.csv from /data.
    This is only used to bootstrap attendance_log if it doesn't exist.
    """
    events_df = load_events()
    return generate_attendance_log_from_df(events_df)


def save_attendance_log(new_log_df: pd.DataFrame) -> None:
    """
    Append new attendance rows into data/attendance_log.csv,
    de-duplicating by fingerprint_hash if present.
    """
    if new_log_df is None or new_log_df.empty:
        return

    if os.path.exists(LOG_PATH):
        old_df = pd.read_csv(LOG_PATH)
        combined = pd.concat([old_df, new_log_df], ignore_index=True)
    else:
        combined = new_log_df.copy()

    if "fingerprint_hash" in combined.columns:
        combined = combined.drop_duplicates(subset=["fingerprint_hash"])
    else:
        combined = combined.drop_duplicates()

    combined.to_csv(LOG_PATH, index=False)


def load_attendance_log() -> pd.DataFrame:
    """
    Load the persistent attendance log.
    If it doesn't exist yet, bootstrap it from event_upload.csv.
    """
    if os.path.exists(LOG_PATH):
        return pd.read_csv(LOG_PATH)

    # bootstrap from the default CSV once
    base_log = generate_attendance_log()
    if not base_log.empty:
        base_log.to_csv(LOG_PATH, index=False)
    return base_log


def get_class_summary(class_id: str):
    log = load_attendance_log()
    students_df = load_students()

    total = students_df[students_df["class_id"] == class_id].shape[0]

    if log.empty:
        placed_unique = internship_unique = training_unique = 0
    else:
        data = log[log["class_id"] == class_id]

        if data.empty:
            placed_unique = internship_unique = training_unique = 0
        else:
            etype = data["event_type"].astype(str).str.lower()
            result = data["result"].astype(str).str.lower()

            placed = data[(etype == "placement") & (result == "selected")]
            internship = data[(etype == "internship") & (result == "selected")]
            training = data[(etype == "training")]

            placed_unique = placed["student_id"].nunique()
            internship_unique = internship["student_id"].nunique()
            training_unique = training["student_id"].nunique()

    summary = {
        "class_id": class_id,
        "total_students": int(total),
        "placed_count": int(placed_unique),
        "internship_count": int(internship_unique),
        "trained_count": int(training_unique),
        "not_placed_count": int(max(total - placed_unique, 0)),
    }

    return summary
def resolve_match(attendance_id: str, new_student_id: str) -> dict:
    """
    Manually resolve an unmatched (or wrong) row by assigning a student_id.
    Updates attendance_log.csv and returns the updated row as dict.
    """
    log_df = load_attendance_log()
    if log_df is None or log_df.empty:
        raise ValueError("Attendance log is empty")

    # Find the row by attendance_id
    if "attendance_id" not in log_df.columns:
        raise ValueError("attendance_id column missing in log")

    mask = log_df["attendance_id"].astype(str) == str(attendance_id)
    if not mask.any():
        raise ValueError(f"No row found with attendance_id={attendance_id}")

    # Validate student exists
    students_df = load_students()
    student_mask = students_df["student_id"].astype(str) == str(new_student_id)
    if not student_mask.any():
        raise ValueError(f"No student found with student_id={new_student_id}")

    student_row = students_df[student_mask].iloc[0]

    # Update the row
    idx = log_df[mask].index[0]
    log_df.at[idx, "student_id"] = str(student_row["student_id"])
    log_df.at[idx, "class_id"] = student_row["class_id"]
    log_df.at[idx, "matched"] = True
    log_df.at[idx, "match_status"] = "MANUAL"
    log_df.at[idx, "match_score"] = 100

    # Save back to CSV
    log_df.to_csv(LOG_PATH, index=False)

    # Return updated row as dict
    updated_row = log_df.loc[idx].to_dict()
    return updated_row
