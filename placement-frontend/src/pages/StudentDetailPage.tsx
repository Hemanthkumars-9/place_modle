// src/pages/StudentDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getStudentProfile } from "../api/client";


type Student = {
  student_id: string;
  name: string;
  email: string;
  phone?: string | number | null;
  class_id?: string | null;
  admission_year?: number | null;
  degree?: string | null;
};

type AttendanceRow = {
  attendance_id?: string;
  event_type?: string | null;
  company?: string | null;
  result?: string | null;
  lpa?: number | null;
  match_status?: string | null;
  match_score?: number | null;
  event_date?: string | null;
};

type StudentSummary = {
  total_events: number;
  placements: number;
  internships: number;
  trainings: number;
  max_lpa: number | null;
  avg_lpa_placed: number | null;
  companies: string[];
};

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [events, setEvents] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState<StudentSummary | null>(null);

  useEffect(() => {
    if (!studentId) return;

    setLoading(true);
    setError(null);

    getStudentProfile(studentId)
      .then((data) => {
        // backend returns { student, events, summary }
        setStudent(data.student);
        setEvents(data.events || []);
        setSummary(data.summary || null);
      })
      .catch((err: any) => {
        console.error("getStudentDetail failed:", err);
        setError(err.message || "Failed to load student detail");
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (!studentId) {
    return (
      <div className="text-red-400 text-sm">
        No studentId in URL. Go back to{" "}
        <button
          className="underline text-blue-400"
          onClick={() => navigate("/classes")}
        >
          Classes
        </button>
        .
      </div>
    );
  }

  if (loading) {
    return <div className="text-slate-200 text-sm">Loading student...</div>;
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">
        Error: {error}{" "}
        <button
          className="underline text-blue-400 ml-2"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-slate-300 text-sm">
        No student found for ID <span className="font-mono">{studentId}</span>.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-semibold">{student.name}</h2>
          <p className="text-slate-400 text-sm">
            ID: <span className="font-mono">{student.student_id}</span>
            {student.class_id && (
              <>
                {"  •  "}
                Class:{" "}
                <Link
                  to={`/classes/${encodeURIComponent(student.class_id)}`}
                  className="text-blue-400 hover:underline"
                >
                  {student.class_id}
                </Link>
              </>
            )}
          </p>
        </div>
        <button
          className="text-xs text-slate-400 hover:text-slate-200 underline"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </header>

      {/* Top cards: profile + summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile */}
        <div className="md:col-span-1 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
          <h3 className="font-semibold mb-3">Student Profile</h3>
          <div className="space-y-1 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Name:</span> {student.name}
            </div>
            <div>
              <span className="text-slate-400">Email:</span> {student.email}
            </div>
            <div>
              <span className="text-slate-400">Phone:</span>{" "}
              {student.phone ?? "-"}
            </div>
            <div>
              <span className="text-slate-400">Degree:</span>{" "}
              {student.degree ?? "-"}
            </div>
            <div>
              <span className="text-slate-400">Admission Year:</span>{" "}
              {student.admission_year ?? "-"}
            </div>
            <div>
              <span className="text-slate-400">Class:</span>{" "}
              {student.class_id ?? "-"}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="md:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
          <h3 className="font-semibold mb-3">Placement Summary</h3>
          {!summary ? (
            <p className="text-xs text-slate-400">
              No events found for this student yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Total Events</p>
                <p className="text-xl font-semibold">
                  {summary.total_events ?? 0}
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Placements</p>
                <p className="text-xl font-semibold">
                  {summary.placements ?? 0}
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Internships</p>
                <p className="text-xl font-semibold">
                  {summary.internships ?? 0}
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Trainings</p>
                <p className="text-xl font-semibold">
                  {summary.trainings ?? 0}
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Max LPA</p>
                <p className="text-xl font-semibold">
                  {summary.max_lpa ?? "-"}
                </p>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Avg LPA (Placed)</p>
                <p className="text-xl font-semibold">
                  {summary.avg_lpa_placed ?? "-"}
                </p>
              </div>
              <div className="md:col-span-2 bg-slate-900/60 rounded-lg p-3">
                <p className="text-slate-400 mb-1">Companies</p>
                <p className="text-xs text-slate-200">
                  {summary.companies && summary.companies.length > 0
                    ? summary.companies.join(", ")
                    : "-"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

            {/* Applications / Events table – styled like dashboard screenshot */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm">
        <h3 className="font-semibold mb-3">Applications</h3>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400">
            No placement / internship / training events recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[420px]">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-900 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    COMPANY
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    TYPE
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    STATUS
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    LPA
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-300">
                    MATCH
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, idx) => {
                  const result = (ev.result || "").toLowerCase();
                  let statusColor =
                    "bg-slate-700 text-slate-100 border border-slate-500";
                  if (result === "selected") {
                    statusColor =
                      "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40";
                  } else if (result === "rejected") {
                    statusColor =
                      "bg-red-600/20 text-red-300 border border-red-500/40";
                  } else if (result === "shortlisted") {
                    statusColor =
                      "bg-violet-600/20 text-violet-300 border border-violet-500/40";
                  } else if (result === "in process" || result === "in_process") {
                    statusColor =
                      "bg-amber-600/20 text-amber-300 border border-amber-500/40";
                  } else if (result === "applied") {
                    statusColor =
                      "bg-blue-600/20 text-blue-300 border border-blue-500/40";
                  }

                  const typeLabel = ev.event_type ?? "-";

                  return (
                    <tr
                      key={ev.attendance_id ?? idx}
                      className="border-t border-slate-700 hover:bg-slate-900/60 transition"
                    >
                      <td className="px-3 py-2 text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-100">
                            {ev.company ?? "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-100">
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusColor}`}
                        >
                          {ev.result ?? "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {ev.lpa !== null && ev.lpa !== undefined ? (
                          <span className="font-mono">
                            {ev.lpa}
                            <span className="text-slate-400 text-[10px] ml-0.5">
                              LPA
                            </span>
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {ev.matched ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-500/40">
                            MATCHED
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-amber-600/20 text-amber-300 border border-amber-500/40">
                            UNMATCHED
                          </span>
                        )}
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

