import pandas as pd
import hashlib


def norm_str(x):
    if pd.isna(x):
        return ""
    return str(x).strip().lower()


def load_students() -> pd.DataFrame:
    df = pd.read_csv("data/students_master.csv")
    df.columns = [c.strip().lower() for c in df.columns]
    return df


def load_events() -> pd.DataFrame:
    df = pd.read_csv("data/event_upload.csv")
    df.columns = [c.strip().lower() for c in df.columns]
    return df


def build_lookup(students_df: pd.DataFrame):
    lookup_id = {}
    lookup_email = {}
    lookup_phone = {}
    lookup_name = {}

    for _, row in students_df.iterrows():
        sid = norm_str(row.get("student_id"))
        email = norm_str(row.get("email"))
        phone = norm_str(row.get("phone"))
        name = norm_str(row.get("name"))

        if sid:
            lookup_id[sid] = row
        if email:
            lookup_email[email] = row
        if phone:
            lookup_phone[phone] = row
        if name:
            lookup_name[name] = row

    return lookup_id, lookup_email, lookup_phone, lookup_name


def make_fingerprint(row) -> str:
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


def match_student(row, lookup_id, lookup_email, lookup_phone, lookup_name):
    # 1) student_id
    sid = norm_str(row.get("student_id"))
    if sid and sid in lookup_id:
        return lookup_id[sid], "MATCHED_BY_ID", 100

    # 2) email
    email = norm_str(row.get("email"))
    if email and email in lookup_email:
        return lookup_email[email], "MATCHED_BY_EMAIL", 95

    # 3) phone (if present)
    phone = norm_str(row.get("phone"))
    if phone and phone in lookup_phone:
        return lookup_phone[phone], "MATCHED_BY_PHONE", 90

    # 4) name
    name = norm_str(row.get("name"))
    if name and name in lookup_name:
        return lookup_name[name], "MATCHED_BY_NAME", 80

    return None, "UNMATCHED", 0
