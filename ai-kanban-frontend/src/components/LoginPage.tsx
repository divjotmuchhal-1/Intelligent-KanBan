import { useMemo, useState } from "react";

export default function LoginPage({
  onSignIn,
  onSignUp,
  brandName = "Kanban",
}: {
  onSignIn: (username: string, password: string) => Promise<void> | void;
  onSignUp?: (username: string, password: string) => Promise<void> | void;
  brandName?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameOk = useMemo(() => username.trim().length >= 3, [username]);
  const passwordOk = useMemo(() => password.length >= 6, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!usernameOk) { setError("Username must be at least 3 characters."); return; }
    if (!passwordOk) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (mode === "signin") {
        await onSignIn(username.trim().toLowerCase(), password);
      } else {
        if (!onSignUp) throw new Error("Sign up not available");
        await onSignUp(username.trim().toLowerCase(), password);
        // ✅ Show success and prompt user to sign in
        setSuccess("Account created successfully. Please sign in.");
        setMode("signin");
        setPassword("");
      }
    } catch {
      setError(mode === "signin" ? "Invalid username or password." : "Could not create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{brandName}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        {success && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              value={username}
              autoComplete="username"
              placeholder="Enter your username"
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative mt-1">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-12 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {mode === "signup" ? "At least 6 characters." : "\u00A0"}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          {mode === "signin" ? (
            <>
              Don’t have an account?{" "}
              <button
                onClick={() => { setError(null); setSuccess(null); setMode("signup"); }}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setError(null); setSuccess(null); setMode("signin"); }}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
