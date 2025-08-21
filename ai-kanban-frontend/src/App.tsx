// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import LoginPage from "./components/LoginPage";
import BoardApp from "./BoardApp";
import AdminLite from "./admin/AdminLite";
import supabase from "./lib/supabaseClient";

const UID_KEY = "kanban_user_id";
const ROLE_KEY = "kanban_user_role";
const UNAME_KEY = "kanban_username";

type Role = "admin" | "user";

export default function App() {
  const [userId, setUserId] = useState<string | null>(() => {
    try { return localStorage.getItem(UID_KEY); } catch { return null; }
  });
  const [role, setRole] = useState<Role | null>(() => {
    try { return (localStorage.getItem(ROLE_KEY) as Role | null) ?? null; } catch { return null; }
  });
  const [username, setUsername] = useState<string | null>(() => {
    try { return localStorage.getItem(UNAME_KEY); } catch { return null; }
  });
  const [roleLoading, setRoleLoading] = useState<boolean>(false);

  // Helper: fetch profile via RPC (tables are revoked)
  const loadProfile = async (id: string) => {
    setRoleLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_user_profile", { p_user_id: id });
      const row = Array.isArray(data) ? data?.[0] : data;
      if (error) throw error;
      if (row) {
        const r = (row.role as Role) ?? "user";
        const u = (row.username as string) ?? null;
        setRole(r);
        if (u) setUsername(u);
        try {
          localStorage.setItem(ROLE_KEY, r);
          if (u) localStorage.setItem(UNAME_KEY, u);
        } catch {}
      } else {
        setRole("user");
      }
    } catch {
      // fall back to cached role if any
      try {
        const cached = localStorage.getItem(ROLE_KEY) as Role | null;
        setRole(cached ?? "user");
      } catch {
        setRole("user");
      }
    } finally {
      setRoleLoading(false);
    }
  };

  // On mount / when userId changes, (re)load profile
  useEffect(() => {
    if (userId) loadProfile(userId);
    else {
      setRole(null);
      setUsername(null);
    }
  }, [userId]);

  const handleAuthSuccess = (id: string) => {
    setUserId(id);
    try { localStorage.setItem(UID_KEY, id); } catch {}
    // Immediately fetch role so we render Admin screen if needed
    void loadProfile(id);
  };

  const handleLogout = () => {
    setUserId(null);
    setRole(null);
    setUsername(null);
    try {
      localStorage.removeItem(UID_KEY);
      localStorage.removeItem(ROLE_KEY);
      // Keep UNAME_KEY if you want LoginPage to prefill; remove if you don't:
      // localStorage.removeItem(UNAME_KEY);
    } catch {}
  };

  if (!userId) {
    return (
      <LoginPage
        brandName="Kanban"
        // optional: prefill username
        initialUsername={username ?? ""}
        onSignUp={async (username, password) => {
          const { data: id, error } = await supabase.rpc("create_user", {
            p_username: username,
            p_password: password,
          });
          if (error || !id) throw error ?? new Error("signup failed");
          // Do NOT log in automatically; LoginPage shows success + switches to Sign In
        }}
        onSignIn={async (username, password) => {
          const { data: id, error } = await supabase.rpc("login", {
            p_username: username,
            p_password: password,
          });
          if (error) throw error;
          if (!id) throw new Error("INVALID_CREDENTIALS");
          handleAuthSuccess(id as string);
        }}
      />
    );
  }

  // While role is loading, avoid flashing the user board for admins
  if (roleLoading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg border bg-white px-6 py-4 shadow">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            <span className="text-sm text-gray-700">Loading your workspace…</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Admins land on the Admin screen by default
  if (role === "admin") {
    return <AdminLite userId={userId} />;
  }

  // Regular users
  return <BoardApp userId={userId} onLogout={handleLogout} />;
}
