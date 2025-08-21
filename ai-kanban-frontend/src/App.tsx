// src/App.tsx
import { useEffect, useState } from "react";
import LoginPage from "./components/LoginPage";
import BoardApp from "./BoardApp";
import supabase from "./lib/supabaseClient";

const UID_KEY = "kanban_user_id";
const ROLE_KEY = "kanban_user_role";
const UNAME_KEY = "kanban_username";

export default function App() {
  const [userId, setUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(UID_KEY);
    } catch {
      return null;
    }
  });

  // Optional: cache role for admin gating elsewhere
  const [role, setRole] = useState<"admin" | "user" | null>(null);

  // Load role/username when logged in (for admin features later)
  useEffect(() => {
    (async () => {
      if (!userId) {
        setRole(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role, username")
          .eq("id", userId)
          .single();

        if (!error && data) {
          const r = (data.role as "admin" | "user") ?? "user";
          setRole(r);
          try {
            localStorage.setItem(ROLE_KEY, r);
            if (data.username) localStorage.setItem(UNAME_KEY, data.username);
          } catch {
            /* ignore localStorage write errors */
          }
        } else if (error) {
          // fallback to cached role if available
          const cached = (localStorage.getItem(ROLE_KEY) as "admin" | "user" | null) ?? null;
          setRole(cached);
        }
      } catch {
        const cached = (localStorage.getItem(ROLE_KEY) as "admin" | "user" | null) ?? null;
        setRole(cached);
      }
    })();
  }, [userId]);

  const handleAuthSuccess = (id: string) => {
    setUserId(id);
    try {
      localStorage.setItem(UID_KEY, id);
    } catch {
      /* ignore localStorage write errors */
    }
  };

  const handleLogout = () => {
    setUserId(null);
    setRole(null);
    try {
      localStorage.removeItem(UID_KEY);
      localStorage.removeItem(ROLE_KEY);
      // keep username so LoginPage can prefill it next time
    } catch {
      /* ignore localStorage write errors */
    }
  };

  if (!userId) {
    return (
      <LoginPage
        brandName="Kanban"
        onSignUp={async (username, password) => {
          const { data: id, error } = await supabase.rpc("create_user", {
            p_username: username,
            p_password: password,
          });
          if (error) throw error;
          if (!id) throw new Error("Could not create account");
          // Do not auto-login; LoginPage shows success and switches to Sign In
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

  // If you later add an isAdmin prop to BoardApp, pass: isAdmin={role === "admin"}
  return <BoardApp userId={userId} onLogout={handleLogout} />;
}
