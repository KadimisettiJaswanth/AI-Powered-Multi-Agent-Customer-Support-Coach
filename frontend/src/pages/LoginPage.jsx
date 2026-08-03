import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/endpoints";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "agent" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "register") {
        await authApi.register(form);
      }
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex w-1/2 bg-navy text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-amber/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-md bg-teal flex items-center justify-center font-display font-bold">C</div>
          <span className="font-display font-semibold">Coach</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Every answer,<br />grounded in a source.
          </h1>
          <p className="text-white/60 mt-4 text-sm leading-relaxed">
            Coach retrieves from your company's documents before it ever suggests a reply --
            no guessing, no hallucinated policy. Every suggestion ships with a citation ledger,
            a confidence score, and a sentiment read so you know exactly what you're sending.
          </p>
        </div>

        <div className="relative z-10 font-mono text-[11px] text-white/40">
          RAG-first · Multi-agent · Never guesses
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-transparent">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-md bg-teal flex items-center justify-center font-display font-bold text-white">C</div>
            <span className="font-display font-semibold text-ink">Coach</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink mb-1">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-sm text-ink-muted mb-6">
            {mode === "login" ? "Sign in to your support workspace." : "Set up agent access in a few seconds."}
          </p>

          {error && <Alert severity="error" className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-ink-muted mb-1.5">
                  Full name
                </label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-card border border-border bg-white text-sm focus:border-teal outline-none"
                  placeholder="Jordan Rivera"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink-muted mb-1.5">
                Email
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-3 py-2.5 rounded-card border border-border bg-white text-sm focus:border-teal outline-none"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-ink-muted mb-1.5">
                Password
              </label>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full px-3 py-2.5 rounded-card border border-border bg-white text-sm focus:border-teal outline-none"
                placeholder="••••••••"
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wide text-ink-muted mb-1.5">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-card border border-border bg-white text-sm focus:border-teal outline-none"
                >
                  <option value="agent">Support Agent</option>
                  <option value="manager">Team Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-teal hover:bg-teal-dark text-white font-medium py-2.5 rounded-card transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <CircularProgress size={16} sx={{ color: "white" }} />}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-ink-muted mt-6 text-center">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-teal-dark font-medium hover:underline"
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
