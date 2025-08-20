import { useState } from "react";

export default function LoginPage({
  onSignIn,
  onSignUp,
  brandName = "Kanban",
}: {
  onSignIn: (email: string, password: string) => Promise<void> | void;
  onSignUp?: (email: string, password: string) => Promise<void> | void;
  brandName?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        await onSignIn(email, password);
      } else {
        if (!onSignUp) throw new Error("Sign up not available");
        await onSignUp(email, password);
      }
    } catch (e) {
      setError("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-black/90" />
          <h1 className="text-2xl font-bold">{brandName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-800"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>

          {error && <div className="text-center text-sm text-red-600">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "signin" ? (
            <span>
              Don’t have an account?{" "}
              <button className="link" onClick={() => setMode("signup")} type="button">
                Sign Up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button className="link" onClick={() => setMode("signin")} type="button">
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
