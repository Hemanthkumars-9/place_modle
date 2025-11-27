import { useParams } from "react-router-dom";
import { useState, ChangeEvent } from "react";
import { uploadEventsCsv } from "../api/client";

type TabKey = "students" | "events" | "unmatched" | "summary";
type AttendanceRow = {
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
  [key: string]: any;
};

type UploadEventsResponse = {
  rows: number;
  matched_count: number;
  unmatched_count: number;
  data: AttendanceRow[];
};


export default function ClassDetailPage() {
  const { classId } = useParams();
  const [tab, setTab] = useState<TabKey>("events"); // default to events tab

  if (!classId) {
    return (
      <div className="text-red-400">
        Invalid class. No classId in route.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Class: {classId}</h2>
          <p className="text-slate-400 text-sm">
            Manage students, uploads, and placement activity.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-4">
        {[
          { key: "students", label: "Students" },
          { key: "events", label: "Events / Upload" },
          { key: "unmatched", label: "Unmatched" },
          { key: "summary", label: "Summary" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabKey)}
            className={`px-4 py-2 text-sm border-b-2 ${
              tab === t.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "students" && <StudentsTab classId={classId} />}
      {tab === "events" && <EventsTab classId={classId} />}
      {tab === "unmatched" && <UnmatchedTab classId={classId} />}
      {tab === "summary" && <SummaryTab classId={classId} />}
    </div>
  );
}

/** ===== Students Tab ===== */
function StudentsTab({ classId }: { classId: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
      <p className="text-slate-300">
        Students view will go here. If this class has never had events, this
        becomes the default dashboard showing the student roster.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        (Later: call /api/classes/{classId}/students and show table.)
      </p>
    </div>
  );
}

/** ===== Events Tab (stub for now) ===== */
function EventsTab({ classId }: { classId: string }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadEventsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    console.log("Selected file:", file);
    setSelectedFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    console.log("Upload button clicked");
    if (!selectedFile) {
      setError("Please choose a CSV file first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await uploadEventsCsv(selectedFile);
      console.log("Upload result:", result);
      setUploadResult(result);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const mergedRows: AttendanceRow[] = uploadResult?.data ?? [];
  const unmatchedCount =
    mergedRows.filter((r) => !r.matched).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Upload panel */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
        <h3 className="font-semibold mb-2">Upload Event CSV</h3>
        <p className="text-xs text-slate-400 mb-3">
          Upload placement / internship / training data. The backend will try to
          match students by ID, email, phone, or name.
        </p>

        <input
          type="file"
          accept=".csv"
          className="block text-sm text-slate-200"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="mt-3 px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload & Merge"}
        </button>

        {error && (
          <p className="mt-2 text-xs text-red-400 font-semibold">
            {error}
          </p>
        )}

        {uploadResult && (
          <div className="mt-3 text-xs text-slate-300 space-y-1">
            <p>Total rows in file: {uploadResult.rows}</p>
            <p>Matched: {uploadResult.matched_count}</p>
            <p>Unmatched: {uploadResult.unmatched_count}</p>
            <p>
              Unmatched (from data):{" "}
              {unmatchedCount}
            </p>
          </div>
        )}
      </div>

      {/* Merged records */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
        <h3 className="font-semibold mb-2">Merged Records</h3>

        {!uploadResult && (
          <p className="text-xs text-slate-400">
            Upload a CSV to see merged records.
          </p>
        )}

        {uploadResult && mergedRows.length === 0 && (
          <p className="text-xs text-slate-400">
            No records returned from backend.
          </p>
        )}

        {uploadResult && mergedRows.length > 0 && (
          <div className="overflow-x-auto max-h-80">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Student ID</th>
                  <th className="px-2 py-1 text-left">Class</th>
                  <th className="px-2 py-1 text-left">Company</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Result</th>
                  <th className="px-2 py-1 text-left">LPA</th>
                  <th className="px-2 py-1 text-left">Matched</th>
                  <th className="px-2 py-1 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {mergedRows.map((row, idx) => (
                  <tr key={row.attendance_id ?? idx} className="border-t border-slate-700">
                    <td className="px-2 py-1">{row.student_id ?? "-"}</td>
                    <td className="px-2 py-1">{row.class_id ?? "-"}</td>
                    <td className="px-2 py-1">{row.company ?? "-"}</td>
                    <td className="px-2 py-1">{row.event_type ?? "-"}</td>
                    <td className="px-2 py-1">{row.result ?? "-"}</td>
                    <td className="px-2 py-1">
                      {row.lpa !== null && row.lpa !== undefined
                        ? row.lpa
                        : "-"}
                    </td>
                    <td className="px-2 py-1">
                      {row.matched ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-600/30 text-emerald-300">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-300">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-slate-300">
                      {row.match_status ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


/** ===== Unmatched Tab (placeholder) ===== */
function UnmatchedTab({ classId }: { classId: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
      <h3 className="font-semibold mb-2">Unmatched Records</h3>
      <p className="text-xs text-slate-400 mb-3">
        Later this will show unmatched rows for this class from the global
        attendance log.
      </p>
    </div>
  );
}

/** ===== Summary Tab (placeholder) ===== */
function SummaryTab({ classId }: { classId: string }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
      <h3 className="font-semibold mb-2">Summary</h3>
      <p className="text-xs text-slate-400 mb-3">
        Class summary cards and charts (placed, internships, average LPA,
        company breakdown) will go here using /api/class_summary/{classId}.
      </p>
    </div>
  );
}
