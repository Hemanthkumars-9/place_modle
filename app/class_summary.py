import pandas as pd
from app.matching import load_students, load_events, build_lookup, match_student, make_fingerprint


def generate_attendance_log():
    students_df = load_students()
    events_df = load_events()
    
    lookup_id, lookup_email, lookup_name = build_lookup(students_df)
    
    logs = []
    fingerprints = set()

    for _, row in events_df.iterrows():
        fp = make_fingerprint(row)
        if fp in fingerprints:
            continue
        fingerprints.add(fp)

        student_row, status, score = match_student(row, lookup_id, lookup_email, lookup_name)

        logs.append({
            "student_id": student_row["student_id"] if student_row is not None else None,
            "class_id": student_row["class_id"] if student_row is not None else None,
            "event_type": row.get("event_type"),
            "company": row.get("company_or_organizer"),
            "result": row.get("result"),
            "lpa": row.get("lpa"),
            "matched": (status != "UNMATCHED"),
        })

    return pd.DataFrame(logs)


def get_class_summary(class_id):
    log = generate_attendance_log()
    students_df = load_students()

    total = students_df[students_df["class_id"] == class_id].shape[0]

    data = log[log["class_id"] == class_id]
    placed = data[(data["event_type"].str.lower() == "placement") &
                  (data["result"].str.lower() == "selected")]

    internship = data[(data["event_type"].str.lower() == "internship") &
                      (data["result"].str.lower() == "selected")]

    training = data[(data["event_type"].str.lower() == "training")]

    summary = {
        "class_id": class_id,
        "total_students": total,
        "placed_count": placed["student_id"].nunique(),
        "internship_count": internship["student_id"].nunique(),
        "trained_count": training["student_id"].nunique(),
        "not_placed_count": total - placed["student_id"].nunique(),
    }

    return summary
