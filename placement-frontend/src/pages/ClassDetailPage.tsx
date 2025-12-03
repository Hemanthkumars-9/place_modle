// ⬆️ very top of src/pages/ClassDetailPage.tsx

import { useParams, Link } from "react-router-dom";
import { useState, useEffect, ChangeEvent } from "react";
import {
  uploadEventsCsv,
  resolveMatch,
  getUnmatched,
  getClassSummary,
  getClassStudents,
  type AttendanceRow,
  type UploadEventsResponse,
  type ClassSummary,
  type StudentRow,
} from "../api/client";


type TabKey = "students" | "events" | "unmatched" | "summary";

export default function ClassDetailPage() {
  const { classId } = useParams();
  const [tab, setTab] = useState<TabKey>("events");
  const [uploadResult, setUploadResult] = useState<UploadEventsResponse | null>(
    null
  );

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

      {tab === "events" && (
        <EventsTab
          classId={classId}
          uploadResult={uploadResult}
          setUploadResult={setUploadResult}
        />
      )}

      {tab === "unmatched" && <UnmatchedTab classId={classId} />}

      {tab === "summary" && <SummaryTab classId={classId} />}
    </div>
  );
}

/** ===== Students Tab ===== */
function StudentsTab({ classId }: { classId: string }) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "placed" | "not_placed" | "internship"
  >("all");

  useEffect(() => {
    setLoading(true);
    setError(null);

    getClassStudents(classId)
      .then((rows) => {
        setStudents(rows || []);
      })
      .catch((err: any) => {
        console.error("getClassStudents failed:", err);
        setError(err.message || "Failed to load students");
      })
      .finally(() => setLoading(false));
  }, [classId]);

  // derived stats
  const placedCount = students.filter((s) => (s.placements ?? 0) > 0).length;

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const name = (s.name || "").toLowerCase();
      const sid = (s.student_id || "").toLowerCase();
      if (!name.includes(q) && !sid.includes(q)) return false;
    }

    if (statusFilter === "placed") {
      return (s.placements ?? 0) > 0;
    }
    if (statusFilter === "not_placed") {
      return (s.placements ?? 0) === 0;
    }
    if (statusFilter === "internship") {
      return (s.internships ?? 0) > 0;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top summary bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Students in {classId}</h3>
          <p className="text-xs text-slate-400">
            Total: <span className="font-semibold">{students.length}</span> •{" "}
            Placed: <span className="font-semibold text-emerald-300">{placedCount}</span> •{" "}
            Not placed:{" "}
            <span className="font-semibold text-amber-300">
              {students.length - placedCount}
            </span>
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
          <input
            className="px-2 py-1 rounded-md border border-slate-600 bg-slate-900 text-xs text-slate-100"
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex rounded-md overflow-hidden border border-slate-600 text-xs">
            <button
              className={`px-3 py-1 ${
                statusFilter === "all"
                  ? "bg-slate-700 text-slate-100"
                  : "bg-slate-900 text-slate-400"
              }`}
              onClick={() => setStatusFilter("all")}
            >
              All
            </button>
            <button
              className={`px-3 py-1 border-l border-slate-600 ${
                statusFilter === "placed"
                  ? "bg-emerald-700 text-emerald-50"
                  : "bg-slate-900 text-slate-400"
              }`}
              onClick={() => setStatusFilter("placed")}
            >
              Placed
            </button>
            <button
              className={`px-3 py-1 border-l border-slate-600 ${
                statusFilter === "not_placed"
                  ? "bg-amber-700 text-amber-50"
                  : "bg-slate-900 text-slate-400"
              }`}
              onClick={() => setStatusFilter("not_placed")}
            >
              Not placed
            </button>
            <button
              className={`px-3 py-1 border-l border-slate-600 ${
                statusFilter === "internship"
                  ? "bg-blue-700 text-blue-50"
                  : "bg-slate-900 text-slate-400"
              }`}
              onClick={() => setStatusFilter("internship")}
            >
              Internship
            </button>
          </div>
        </div>
      </div>

      {/* Main table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
        {loading && (
          <p className="text-xs text-slate-400">Loading students…</p>
        )}

        {error && (
          <p className="text-xs text-red-400 font-semibold mb-2">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-xs text-slate-400">
            No students found for this filter.
          </p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-x-auto max-h-[480px]">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Last Company
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Max LPA
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Events
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const isPlaced = (s.placements ?? 0) > 0;
                  const hasInternship = (s.internships ?? 0) > 0;

                  let statusLabel = "Not placed";
                  let statusClass =
                    "bg-slate-700 text-slate-100 border border-slate-500";

                  if (isPlaced) {
                    statusLabel = "Placed";
                    statusClass =
                      "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40";
                  } else if (hasInternship) {
                    statusLabel = "Internship";
                    statusClass =
                      "bg-blue-600/20 text-blue-300 border border-blue-500/40";
                  }

                  return (
                    <tr
                      key={s.student_id}
                      className="border-t border-slate-700 hover:bg-slate-900/60 transition"
                    >
                      <td className="px-3 py-2">
                        <Link
                          to={`/students/${encodeURIComponent(s.student_id)}`}
                          className="font-mono text-blue-300 hover:underline"
                        >
                          {s.student_id}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-100">
                        {s.name}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {s.last_company ?? "-"}
                      </td>
                      <td className="px-3 py-2">
                        {s.max_lpa !== null && s.max_lpa !== undefined ? (
                          <span className="font-mono">
                            {s.max_lpa}
                            <span className="text-slate-400 text-[10px] ml-0.5">
                              LPA
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {(s.total_events ?? 0).toString()}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          to={`/students/${encodeURIComponent(s.student_id)}`}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}



/** ===== Events Tab ===== */
function EventsTab({
  classId,
  uploadResult,
  setUploadResult,
}: {
  classId: string;
  uploadResult: UploadEventsResponse | null;
  setUploadResult: (res: UploadEventsResponse | null) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔎 Filters
  const [filterCompany, setFilterCompany] = useState("");
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [filterResult, setFilterResult] = useState("ALL");

  const handleFileChange = (e: any) => {
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
      const result = (await uploadEventsCsv(selectedFile)) as UploadEventsResponse;
      console.log("Upload result:", result);
      setUploadResult(result);

      // reset filters on new upload
      setFilterCompany("");
      setFilterEventType("ALL");
      setFilterResult("ALL");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const mergedRows: AttendanceRow[] = uploadResult?.data ?? [];
  const unmatchedCount = mergedRows.filter((r) => !r.matched).length ?? 0;

  // Build dropdown options from data
  const eventTypeOptions = Array.from(
    new Set(
      mergedRows
        .map((r) => (r.event_type ?? "").toString().trim())
        .filter((v) => v.length > 0)
    )
  );
  const resultOptions = Array.from(
    new Set(
      mergedRows
        .map((r) => (r.result ?? "").toString().trim())
        .filter((v) => v.length > 0)
    )
  );

  // Apply filters
  const filteredRows = mergedRows.filter((row) => {
    const company = (row.company ?? "").toString().toLowerCase();
    const evType = (row.event_type ?? "").toString().toLowerCase();
    const res = (row.result ?? "").toString().toLowerCase();

    if (filterCompany.trim()) {
      if (!company.includes(filterCompany.toLowerCase().trim())) {
        return false;
      }
    }
    if (filterEventType !== "ALL") {
      if (evType !== filterEventType.toLowerCase()) {
        return false;
      }
    }
    if (filterResult !== "ALL") {
      if (res !== filterResult.toLowerCase()) {
        return false;
      }
    }
    return true;
  });

  const clearFilters = () => {
    setFilterCompany("");
    setFilterEventType("ALL");
    setFilterResult("ALL");
  };

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
          <p className="mt-2 text-xs text-red-400 font-semibold">{error}</p>
        )}

        {uploadResult && (
          <div className="mt-3 text-xs text-slate-300 space-y-1">
            <p>Total rows in file: {uploadResult.rows}</p>
            <p>Matched: {uploadResult.matched_count}</p>
            <p>Unmatched: {uploadResult.unmatched_count}</p>
            <p>Unmatched (from data): {unmatchedCount}</p>
          </div>
        )}
      </div>

      {/* Merged records + filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Merged Records (last upload)</h3>
          {uploadResult && (
            <span className="text-[11px] text-slate-400">
              Showing {filteredRows.length} of {mergedRows.length} rows
            </span>
          )}
        </div>

        {!uploadResult && (
          <p className="text-xs text-slate-400">
            Upload a CSV to see merged records.
          </p>
        )}

        {/* Filters */}
        {uploadResult && mergedRows.length > 0 && (
          <div className="flex flex-col md:flex-row gap-3 text-xs bg-slate-900/40 border border-slate-700 rounded-lg p-3">
            <div className="flex-1">
              <label className="block text-slate-400 mb-1">
                Company (contains)
              </label>
              <input
                className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-950"
                placeholder="e.g. Amazon"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
              />
            </div>

            <div className="flex-1">
              <label className="block text-slate-400 mb-1">
                Event type
              </label>
              <select
                className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-950"
                value={filterEventType}
                onChange={(e) => setFilterEventType(e.target.value)}
              >
                <option value="ALL">All</option>
                {eventTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t || "(blank)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-slate-400 mb-1">
                Result
              </label>
              <select
                className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-950"
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
              >
                <option value="ALL">All</option>
                {resultOptions.map((r) => (
                  <option key={r} value={r}>
                    {r || "(blank)"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                className="px-3 py-1 rounded border border-slate-600 hover:bg-slate-700"
                type="button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
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
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.attendance_id ?? idx}
                    className="border-t border-slate-700"
                  >
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


/** ===== Unmatched Tab ===== */
function UnmatchedTab({ classId }: { classId: string }) {
  const [unmatchedRows, setUnmatchedRows] = useState<AttendanceRow[]>([]);
  const [attendanceIdInput, setAttendanceIdInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [loadingResolve, setLoadingResolve] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUnmatched = async () => {
    try {
      setLoadingList(true);
      setError(null);
      const res = await getUnmatched();
      setUnmatchedRows((res.data || []) as AttendanceRow[]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load unmatched rows");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUnmatched();
  }, [classId]);

  const handleResolve = async () => {
    setError(null);
    setSuccess(null);

    if (!attendanceIdInput || !studentIdInput) {
      setError("Enter both attendance_id and student_id.");
      return;
    }

    try {
      setLoadingResolve(true);
      await resolveMatch(attendanceIdInput, studentIdInput);
      setSuccess("Match resolved. List refreshed.");
      setAttendanceIdInput("");
      setStudentIdInput("");
      await fetchUnmatched();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Resolve match failed");
    } finally {
      setLoadingResolve(false);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm space-y-4">
      <h3 className="font-semibold mb-2">Unmatched Records</h3>
      <p className="text-xs text-slate-400">
        These rows are currently unmatched in the global attendance log.
        Copy an <code>attendance_id</code> from the table and map it to a{" "}
        <code>student_id</code>.
      </p>

      <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">
            attendance_id
          </label>
          <input
            className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-900 text-xs"
            value={attendanceIdInput}
            onChange={(e) => setAttendanceIdInput(e.target.value)}
            placeholder="e.g. UUID from table"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-400 mb-1">
            student_id to match
          </label>
          <input
            className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-900 text-xs"
            value={studentIdInput}
            onChange={(e) => setStudentIdInput(e.target.value)}
            placeholder="e.g. STU0007"
          />
        </div>
        <button
          className="px-4 py-2 text-xs rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600"
          onClick={handleResolve}
          disabled={loadingResolve}
        >
          {loadingResolve ? "Resolving..." : "Resolve Match"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}
      {success && (
        <p className="text-xs text-emerald-400 font-semibold">{success}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-400">
          {loadingList
            ? "Loading unmatched rows..."
            : `Unmatched count: ${unmatchedRows.length}`}
        </p>
        <button
          className="text-xs px-3 py-1 rounded border border-slate-600 hover:bg-slate-700"
          onClick={fetchUnmatched}
          disabled={loadingList}
        >
          Refresh
        </button>
      </div>

      {unmatchedRows.length === 0 && !loadingList && (
        <p className="text-xs text-slate-400 mt-2">
          No unmatched rows in the log.
        </p>
      )}

      {unmatchedRows.length > 0 && (
        <div className="overflow-x-auto max-h-80 mt-2">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left">attendance_id</th>
                <th className="px-2 py-1 text-left">Student ID</th>
                <th className="px-2 py-1 text-left">Company</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Result</th>
                <th className="px-2 py-1 text-left">LPA</th>
                <th className="px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedRows.map((row, idx) => (
                <tr
                  key={row.attendance_id ?? idx}
                  className="border-t border-slate-700"
                >
                  <td className="px-2 py-1">{row.attendance_id ?? "-"}</td>
                  <td className="px-2 py-1">{row.student_id ?? "-"}</td>
                  <td className="px-2 py-1">{row.company ?? "-"}</td>
                  <td className="px-2 py-1">{row.event_type ?? "-"}</td>
                  <td className="px-2 py-1">{row.result ?? "-"}</td>
                  <td className="px-2 py-1">
                    {row.lpa !== null && row.lpa !== undefined ? row.lpa : "-"}
                  </td>
                  <td className="px-2 py-1">{row.match_status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** ===== Summary Tab ===== */
function SummaryTab({ classId }: { classId: string }) {
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = (await getClassSummary(classId)) as ClassSummary;
      setSummary(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [classId]);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm space-y-4">
      <h3 className="font-semibold mb-2">Summary</h3>

      {loading && (
        <p className="text-xs text-slate-400">Loading class summary...</p>
      )}

      {error && (
        <p className="text-xs text-red-400 font-semibold">{error}</p>
      )}

      {!loading && !error && summary && (
  <>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <SummaryCard
        label="Total Students"
        value={summary.total_students}
      />
      <SummaryCard label="Placed" value={summary.placed_count} />
      <SummaryCard
        label="Internships"
        value={summary.internship_count}
      />
      <SummaryCard label="Trained" value={summary.trained_count} />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
      <SummaryCard
        label="Not Placed"
        value={summary.not_placed_count}
        subtle
      />
      <SummaryCard
        label="Avg LPA (Placed)"
        value={
          summary.avg_lpa_placed !== null &&
          summary.avg_lpa_placed !== undefined
            ? Number(summary.avg_lpa_placed.toFixed(2))
            : 0
        }
        subtle
      />
    </div>

    {/* Company breakdown */}
    <div className="mt-4">
      <h4 className="text-xs font-semibold text-slate-300 mb-2">
        Placement breakdown by company
      </h4>
      {summary.company_breakdown &&
      Object.keys(summary.company_breakdown).length > 0 ? (
        <div className="overflow-x-auto max-h-60">
          <table className="min-w-[240px] text-xs">
            <thead className="bg-slate-900 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left">Company</th>
                <th className="px-2 py-1 text-left">Placed Students</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(summary.company_breakdown).map(
                ([company, count]) => (
                  <tr
                    key={company}
                    className="border-t border-slate-700"
                  >
                    <td className="px-2 py-1">{company}</td>
                    <td className="px-2 py-1">{count}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          No placed students yet for this class, so no company breakdown.
        </p>
      )}
    </div>
  </>
)}

      {!loading && !error && !summary && (
        <p className="text-xs text-slate-400">
          No summary available. Check if students_master and attendance_log have
          data for this class.
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtle,
}: {
  label: string;
  value: number;
  subtle?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        subtle
          ? "border-slate-700 bg-slate-900/40"
          : "border-slate-600 bg-slate-900/70"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-xl font-semibold text-slate-50 mt-1">{value}</div>
    </div>
  );
}
