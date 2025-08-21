// src/components/LoginPage.tsx
import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "user";

export default function LoginPage({
  onSignIn,
  onSignUp,
  brandName = "Kanban",
  // NEW (optional): allow choosing a role at signup; keep off by default
  allowAdminSelfSignup = false,
  // NEW (optional): if provided, we'll call this instead of onSignUp during signup
  onSignUpWithRole,
  // NEW (optional): prefill username (e.g., from a deep link)
  initialUsername = "",
}: {
  onSignIn: (username: string, password: string) => Promise<void> | void;
  onSignUp?: (username: string, password: string) => Promise<void> | void;
  brandName?: string;

  allowAdminSelfSignup?: boolean;
  onSignUpWithRole?: (username: string, password: string, role: Role) => Promise<void> | void;
  initialUsername?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [role, setRole] = useState<Role>("user"); // only used on signup if allowed

  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Prefill username from localStorage if present
  useEffect(() => {
    try {
      const cached = localStorage.getItem("kanban_last_username");
      if (!initialUsername && cached) setUsername(cached);
    } catch (e) {
      // localStorage may be unavailable; ignore
      // eslint-disable-next-line no-console
      console.warn("[LoginPage] Could not read localStorage:", e);
    }
  }, [initialUsername]);

  const usernameOk = useMemo(() => username.trim().length >= 3, [username]);
  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!usernameOk) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!passwordOk) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const uname = username.trim().toLowerCase();

    try {
      if (mode === "signin") {
        await onSignIn(uname, password);
        if (remember) {
          try {
            localStorage.setItem("kanban_last_username", uname);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn("[LoginPage] Could not write localStorage:", err);
          }
        }
      } else {
        if (allowAdminSelfSignup && onSignUpWithRole) {
          await onSignUpWithRole(uname, password, role);
        } else {
          if (!onSignUp) throw new Error("Sign up not available");
          await onSignUp(uname, password);
        }
        // ✅ Do NOT auto-redirect; show success & switch to Sign In
        setSuccess("Account created successfully. Please sign in.");
        setMode("signin");
        setPassword("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Show helpful but safe messages
      if (mode === "signin") {
        setError(msg === "INVALID_CREDENTIALS" ? "Invalid username or password." : msg || "Sign in failed.");
      } else {
        setError(msg || "Could not create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Small helper so toggling modes clears banners
  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Subtle background decoration */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              {/* Simple brand mark */}
              <span className="text-xl font-bold">K</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{brandName}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </p>
          </div>

          {/* Banners */}
          {success && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* Card */}
          <div className="rounded-2xl border bg-white p-6 shadow-xl ring-1 ring-black/5">
            {/* Tabs */}
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === "signin" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === "signup" ? "bg-white shadow-sm text-slate-900" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Username</label>
                <input
                  type="text"
                  value={username}
                  autoComplete="username"
                  placeholder="yourname"
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {!usernameOk && username.length > 0 && (
                  <p className="mt-1 text-xs text-rose-600">At least 3 characters.</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-12 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    {showPwd ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {mode === "signup" ? "At least 6 characters." : "\u00A0"}
                </div>
              </div>

              {/* Admin-only: role choice when signing up (optional) */}
              {mode === "signup" && allowAdminSelfSignup && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Tip: for production, avoid public admin self-signup.
                  </p>
                </div>
              )}

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="inline-flex select-none items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Remember me on this device
                </label>
                {/* (Optional future) <button type="button" className="text-sm text-blue-600 hover:text-blue-800">Forgot password?</button> */}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
              >
                {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Switch helper (redundant to tabs, but nice footnote) */}
            <p className="mt-6 text-center text-sm text-slate-600">
              {mode === "signin" ? (
                <>
                  Don’t have an account?{" "}
                  <button
                    onClick={() => switchMode("signup")}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => switchMode("signin")}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-slate-500">
            This demo uses username/password only. For production, add hashing and sessions.
          </p>
        </div>
      </div>
    </div>
  );
}
