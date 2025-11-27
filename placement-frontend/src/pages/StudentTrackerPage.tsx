import { useState } from "react";

export default function StudentTrackerPage() {
  const [studentId, setStudentId] = useState("");

  return (
    <div style={{ color: "white" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
        Student Tracking
      </h2>
      <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "12px" }}>
        Enter a student ID to view their details (UI only for now).
      </p>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #374151",
            backgroundColor: "#020617",
            color: "white",
          }}
          placeholder="STU0001"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
        <button
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "white",
            cursor: "pointer",
          }}
        >
          Track
        </button>
      </div>
    </div>
  );
}
