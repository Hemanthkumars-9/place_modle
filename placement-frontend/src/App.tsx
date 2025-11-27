import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import ClassesPage from "./pages/ClassesPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import StudentTrackerPage from "./pages/StudentTrackerPage";

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "white",
          display: "flex",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            width: "240px",
            backgroundColor: "#020617",
            borderRight: "1px solid #1f2937",
            padding: "16px",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>
            Placement Dashboard
          </h1>
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Link to="/classes" style={{ color: "white", textDecoration: "none" }}>
              Classes
            </Link>
            <Link to="/track" style={{ color: "white", textDecoration: "none" }}>
              Student Tracking
            </Link>
          </nav>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: "24px" }}>
          <Routes>
            <Route path="/" element={<Navigate to="/classes" replace />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/classes/:classId" element={<ClassDetailPage />} />
            <Route path="/track" element={<StudentTrackerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
