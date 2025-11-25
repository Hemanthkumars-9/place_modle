import pandas as pd
import hashlib
import uuid


def norm_str(x):
    if pd.isna(x):
        return ""
    return str(x).strip().lower()


def load_students():
    df = pd.read_csv("data/students_master.csv")
    df.columns = [c.lower() for c in df.columns]
    return df


def load_events():
    df = pd.read_csv("data/event_upload.csv")
    df.columns = [c.lower() for c in df.columns]
    return df


def build_lookup(students_df):
    lookup_id = {}
    lookup_email = {}
    lookup_name = {}

    for _, row in students_df.iterrows():
        sid = norm_str(row["student_id"])
        email = norm_str(row["email"])
        name = norm_str(row["name"])

        if sid:
            lookup_id[sid] = row
        if email:
            lookup_email[email] = row
        if name:
            lookup_name[name] = row

    return lookup_id, lookup_email, lookup_name


def make_fingerprint(row):
    parts = [
        norm_str(row.get("event_type")),
        norm_str(row.get("company_or_organizer")),
        norm_str(row.get("event_date")),
        norm_str(row.get("email")),
        norm_str(row.get("name")),
        norm_str(row.get("result")),
        norm_str(row.get("lpa")),
        norm_str(row.get("attendance_status")),
    ]
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def match_student(row, lookup_id, lookup_email, lookup_name):
    sid = norm_str(row.get("student_id"))
    if sid and sid in lookup_id:
        return lookup_id[sid], "MATCHED_BY_ID", 100

    email = norm_str(row.get("email"))
    if email and email in lookup_email:
        return lookup_email[email], "MATCHED_BY_EMAIL", 95

    name = norm_str(row.get("name"))
    if name and name in lookup_name:
        return lookup_name[name], "MATCHED_BY_NAME", 80

    return None, "UNMATCHED", 0
