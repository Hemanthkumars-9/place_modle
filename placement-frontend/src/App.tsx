import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";
import ClassesPage from "./pages/ClassesPage";
import ClassDetailPage from "./pages/ClassDetailPage";
import StudentTrackerPage from "./pages/StudentTrackerPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import LoginPage from "./pages/LoginPage";

// Simple auth guard that checks localStorage
function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

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
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                marginBottom: "4px",
              }}
            >
              Placement Dashboard
            </h1>
            <p style={{ fontSize: "11px", color: "#9ca3af" }}>
              Admin & student tracking
            </p>
          </div>

          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            <Link
              to="/classes"
              style={{ color: "white", textDecoration: "none" }}
            >
              Classes
            </Link>
            <Link
              to="/track"
              style={{ color: "white", textDecoration: "none" }}
            >
              Student Tracking
            </Link>
          </nav>

          <button
            style={{
              marginTop: "auto",
              fontSize: "12px",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #4b5563",
              backgroundColor: "transparent",
              color: "#e5e7eb",
              cursor: "pointer",
              textAlign: "left",
            }}
            onClick={() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("authEmail");
              localStorage.removeItem("authRole");
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "24px" }}>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/classes" replace />} />

            {/* Protected routes */}
            <Route
              path="/classes"
              element={
                <RequireAuth>
                  <ClassesPage />
                </RequireAuth>
              }
            />
            <Route
              path="/classes/:classId"
              element={
                <RequireAuth>
                  <ClassDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/track"
              element={
                <RequireAuth>
                  <StudentTrackerPage />
                </RequireAuth>
              }
            />
            <Route
              path="/students/:studentId"
              element={
                <RequireAuth>
                  <StudentDetailPage />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
