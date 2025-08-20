import { useState } from "react";
import LoginPage from "./components/LoginPage";
import BoardApp from "./BoardApp";
import supabase from "./lib/supabaseClient";

const STORAGE_KEY = "kanban_user_id";

export default function App() {
  const [userId, setUserId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const handleAuthSuccess = (id: string) => {
    setUserId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const handleLogout = () => {
    setUserId(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
          if (error || !id) throw error || new Error("signup failed");
          // show success; user must sign in (handled in LoginPage)
        }}
        onSignIn={async (username, password) => {
          const { data: id, error } = await supabase.rpc("login", {
            p_username: username,
            p_password: password,
          });
          if (error || !id) throw error || new Error("login failed");
          handleAuthSuccess(id as string);
        }}
      />
    );
  }

  return <BoardApp userId={userId} onLogout={handleLogout} />;
}
