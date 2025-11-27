export const API_BASE = "http://127.0.0.1:8000"; // FastAPI URL

export type AttendanceRow = {
  attendance_id?: string;
  student_id: string | null;
  class_id: string | null;
  event_type: string | null;
  company: string | null;
  result: string | null;
  lpa: number | null;
  matched: boolean;
  match_status: string | null;
  match_score: number | null;
  // allow extra columns without TS crying
  [key: string]: any;
};

export type UploadEventsResponse = {
  rows: number;
  matched_count: number;
  unmatched_count: number;
  data: AttendanceRow[];
};

export async function uploadEventsCsv(file: File): Promise<UploadEventsResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload_events`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed: ${res.status} ${text}`);
  }

  return res.json();
}
