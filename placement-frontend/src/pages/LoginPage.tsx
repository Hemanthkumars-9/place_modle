import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function LoginPage() {
  const [email, setEmail] = useState("tpo@example.com");   // so you don't retype
  const [password, setPassword] = useState("tpo123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem("authToken", res.token);
      localStorage.setItem("authEmail", res.email);
      localStorage.setItem("authRole", res.role);

      navigate("/classes");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 text-slate-100 shadow-lg">
        <h1 className="text-xl font-semibold mb-1">Placement Dashboard</h1>
        <p className="text-xs text-slate-400 mb-4">
          Sign in with your TPO account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-2 py-1.5 rounded-md bg-slate-950 border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-2 py-1.5 rounded-md bg-slate-950 border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-semibold">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-3 py-2 text-xs rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 font-semibold"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-2 text-[11px] text-slate-500">
            Demo accounts:
            <br />
            <span className="font-mono">tpo@example.com / tpo123</span>
            <br />
            <span className="font-mono">viewer@example.com / viewer123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
