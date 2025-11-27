import { Link } from "react-router-dom";

const MOCK_CLASSES = [
  { id: "CSE-A-2025", name: "CSE A 2025", totalStudents: 10 },
  { id: "ECE-A-2025", name: "ECE A 2025", totalStudents: 5 },
  { id: "MECH-A-2025", name: "MECH A 2025", totalStudents: 5 },
];

export default function ClassesPage() {
  return (
    <div style={{ color: "white" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>Classes</h2>
      <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "16px" }}>
        Select a class to view students, events, and summaries.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        {MOCK_CLASSES.map((cls) => (
          <Link
            key={cls.id}
            to={`/classes/${cls.id}`}
            style={{
              borderRadius: "12px",
              border: "1px solid #374151",
              padding: "12px",
              textDecoration: "none",
              color: "white",
            }}
          >
            <h3 style={{ fontSize: "18px", marginBottom: "4px" }}>
              {cls.name}
            </h3>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "4px" }}>
              ID: {cls.id}
            </p>
            <p style={{ fontSize: "14px" }}>
              Total students: {cls.totalStudents}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
