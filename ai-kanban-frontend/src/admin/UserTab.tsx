// src/components/UserTab.tsx
import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient"; // keep consistent with your current import
import "../css/UserTab.css";

// Mirror the flexible row typing you used in AdminLite
type ProfileRow = {
  id: string;
  role?: string | null;
  created_at?: string | null;
  // Optional fields (exist in some schemas)
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
};

export default function UserTab({
  title = "User Management",
  subtitle = 'Listing users from public.users.',
  initialQuery = "",
}: {
  title?: string;
  subtitle?: string;
  initialQuery?: string;
}) {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState(initialQuery);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      // Use * in case columns change (email dropped, etc.)
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data ?? []);
    } catch (err: any) {
      setUsersError(err?.message ?? "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setUsers(data ?? []);
      } catch (err: any) {
        if (!cancelled) setUsersError(err?.message ?? "Failed to load users");
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [
        u.full_name ?? "",
        u.username ?? "",
        u.email ?? "",
        u.role ?? "",
        u.id ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, userSearch]);

  return (

    <section className="card full-span user-tab">
      <div className="card-title"><b>{title}</b></div>
      <p className="card-subtitle">{subtitle}</p>

      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div className="full-span" style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Search by email, username, role, or id…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
          <div style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadUsers}
              disabled={usersLoading}
              title="Reload users"
            >
              {usersLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {usersLoading && <div className="empty-state">Loading users…</div>}
      {usersError && (
        <div className="empty-state" style={{ color: "#b91c1c" }}>
          Error: {usersError}
        </div>
      )}

      {!usersLoading && !usersError && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Created</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">
                    {u.full_name || u.username || u.email || "—"}
                  </td>
                  <td>{u.role || "user"}</td>
                  <td>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="text-right" title={u.id}>
                    {u.id.slice(0, 8)}…{u.id.slice(-4)}
                  </td>
                </tr>
              ))}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No users match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
