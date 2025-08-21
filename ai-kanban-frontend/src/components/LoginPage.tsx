// src/components/LoginPage.tsx
import { useEffect, useMemo, useState } from "react";
import "../css/LoginPage.css";

type Role = "admin" | "user";

export default function LoginPage({
  onSignIn,
  onSignUp,
  brandName = "Kanban",
  allowAdminSelfSignup = false,
  onSignUpWithRole,
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
  const [role, setRole] = useState<Role>("user");

  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("kanban_last_username");
      if (!initialUsername && cached) setUsername(cached);
    } catch (e) {
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
        setSuccess("Account created successfully. Please sign in.");
        setMode("signin");
        setPassword("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (mode === "signin") {
        setError(msg === "INVALID_CREDENTIALS" ? "Invalid username or password." : msg || "Sign in failed.");
      } else {
        setError(msg || "Could not create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="login-container">
      <div className="bg-blur-deco" style={{ top: "-100px", left: "-100px", width: "300px", height: "300px", backgroundColor: "#bfdbfe", borderRadius: "50%" }}></div>
      <div className="bg-blur-deco" style={{ bottom: "-100px", right: "-100px", width: "300px", height: "300px", backgroundColor: "#c7d2fe", borderRadius: "50%" }}></div>

      <div className="login-box">
        <div className="brand-icon">K</div>
        <h1>{brandName}</h1>
        <p className="subtext">{mode === "signin" ? "Welcome back" : "Create your account"}</p>

        {success && <div className="banner success">{success}</div>}
        {error && <div className="banner error">{error}</div>}

        <div className="tabs">
          <button type="button" onClick={() => switchMode("signin")} className={mode === "signin" ? "active" : ""}>Sign In</button>
          <button type="button" onClick={() => switchMode("signup")} className={mode === "signup" ? "active" : ""}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              autoComplete="username"
              placeholder="yourname"
              onChange={(e) => setUsername(e.target.value)}
            />
            {!usernameOk && username.length > 0 && <p className="error-msg">At least 3 characters.</p>}
          </div>

          <div className="form-group" style={{ position: "relative" }}>
            <label>Password</label>
            <input
              type={showPwd ? "text" : "password"}
              value={password}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="password-toggle" onClick={() => setShowPwd((s) => !s)}>
              {showPwd ? "Hide" : "Show"}
            </button>
            <div className="form-hint">{mode === "signup" ? "At least 6 characters." : "\u00A0"}</div>
          </div>

          {mode === "signup" && allowAdminSelfSignup && (
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <div className="form-hint">Tip: for production, avoid public admin self-signup.</div>
            </div>
          )}

          <div className="form-actions">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              /> Remember me on this device
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="bottom-text">
          {mode === "signin" ? (
            <>Don’t have an account? <button onClick={() => switchMode("signup")}>Sign Up</button></>
          ) : (
            <>Already have an account? <button onClick={() => switchMode("signin")}>Sign In</button></>
          )}
        </p>
      </div>
    </div>
  );
}
