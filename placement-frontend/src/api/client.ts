// src/api/client.ts

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export type LoginResult = {
  token: string;
  email: string;
  role: string;
};

// -------- LOGIN --------
export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }), // must be email/password
  });

  if (!res.ok) {
    let message = "Invalid email or password";
    try {
      const data = await res.json();
      if (data?.detail) message = data.detail;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}


export type UploadEventsResponse = {
  rows: number;
  matched_count: number;
  unmatched_count: number;
  data: AttendanceRow[];
};

export type ClassSummary = {
  class_id: string;
  total_students: number;
  placed_count: number;
  internship_count: number;
  trained_count: number;
  not_placed_count: number;
};

export type StudentRow = {
  student_id: string;
  name: string;
  email: string;
  phone: number | string;
  class_id: string;
  admission_year: number;
  degree: string;

  // new summary fields from backend:
  total_events?: number;
  placements?: number;
  internships?: number;
  trainings?: number;
  max_lpa?: number | null;
  last_company?: string | null;
  last_result?: string | null;
};


export type ClassInfo = {
  class_id: string;
  total_students: number;
};

export type StudentSummary = {
  total_events: number;
  placements: number;
  internships: number;
  trainings: number;
  max_lpa: number | null;
  avg_lpa_placed: number | null;
  companies: string[];
};

export type StudentProfile = {
  student: StudentRow;
  events: AttendanceRow[];
  summary: StudentSummary;
};

/* ---------- Events CSV upload ---------- */

export async function uploadEventsCsv(
  file: File
): Promise<UploadEventsResponse> {
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

/* ---------- Students master upload ---------- */

export async function uploadStudentsCsv(
  file: File
): Promise<{ rows: number; path: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload_students`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("uploadStudentsCsv failed:", res.status, text);
    throw new Error(`uploadStudentsCsv failed: ${res.status} ${text}`);
  }

  return res.json();
}

/* ---------- Classes list ---------- */

export async function getClasses(): Promise<ClassInfo[]> {
  const res = await fetch(`${API_BASE}/api/classes`, { method: "GET" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getClasses failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Backend might return { classes: [...] } or just [...]
  return (data.classes ?? data) as ClassInfo[];
}

/* ---------- Students by class ---------- */

export async function getClassStudents(
  classId: string
): Promise<StudentRow[]> {
  const res = await fetch(
    `${API_BASE}/api/classes/${encodeURIComponent(classId)}/students`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getClassStudents failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // backend returns { rows, data: [...] }
  return (data.data ?? []) as StudentRow[];
}

/* ---------- Unmatched rows ---------- */

export async function getUnmatched(): Promise<{
  rows: number;
  data: AttendanceRow[];
}> {
  const res = await fetch(`${API_BASE}/api/unmatched`, {
    method: "GET",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getUnmatched failed: ${res.status} ${text}`);
  }

  return res.json();
}

/* ---------- Resolve match ---------- */

export async function resolveMatch(
  attendanceId: string,
  studentId: string
): Promise<AttendanceRow> {
  const payload = {
    attendance_id: attendanceId,
    student_id: studentId,
  };

  const res = await fetch(`${API_BASE}/api/resolve_match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("resolveMatch failed:", res.status, text);
    throw new Error(`Failed to resolve match: ${res.status} ${text}`);
  }

  return res.json();
}

/* ---------- Class summary ---------- */

export async function getClassSummary(
  classId: string
): Promise<ClassSummary> {
  const res = await fetch(
    `${API_BASE}/api/class_summary/${encodeURIComponent(classId)}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getClassSummary failed: ${res.status} ${text}`);
  }

  return res.json();
}
/* ---------- Student profile + events ---------- */

export async function getStudentProfile(
  studentId: string
): Promise<StudentProfile> {
  const res = await fetch(
    `${API_BASE}/api/student/${encodeURIComponent(studentId)}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("getStudentProfile failed:", res.status, text);
    throw new Error(`getStudentProfile failed: ${res.status} ${text}`);
  }

  return res.json();
}
