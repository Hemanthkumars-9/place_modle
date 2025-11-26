import pandas as pd
from app.matching import (
    load_students,
    load_events,
    build_lookup,
    match_student,
    make_fingerprint,
)


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
    """
    events_df = load_events()
    return generate_attendance_log_from_df(events_df)


def get_class_summary(class_id: str):
    log = generate_attendance_log()
    students_df = load_students()

    total = students_df[students_df["class_id"] == class_id].shape[0]

    data = log[log["class_id"] == class_id]

    if data.empty:
        placed_unique = 0
        internship_unique = 0
        training_unique = 0
    else:
        etype = data["event_type"].str.lower()
        result = data["result"].str.lower()

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
