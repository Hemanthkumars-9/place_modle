// src/pages/StudentTrackerPage.tsx

import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export default function StudentTrackerPage() {
  const [studentId, setStudentId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = studentId.trim();
    if (!trimmed) return;
    navigate(`/students/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="space-y-4 text-slate-100">
      <header>
        <h2 className="text-2xl font-semibold mb-1">Student Tracking</h2>
        <p className="text-sm text-slate-400">
          Enter a student ID to see their profile and all placement / internship
          applications.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row gap-3 text-sm"
      >
        <input
          className="flex-1 px-3 py-2 rounded-md border border-slate-600 bg-slate-900"
          placeholder="e.g. STU0007"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-medium"
        >
          Track
        </button>
      </form>

      <p className="text-xs text-slate-500">
        Tip: you can also click a Student ID from any class&apos;s Students tab
        to open the same tracking view.
      </p>
    </div>
  );
}
