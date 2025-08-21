// src/components/AdminLite.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../css/AdminLite.css";
import UserTab from "./UserTab";

type Sprint = {
  id: string;
  name: string;
  start_date: string; // ISO: "YYYY-MM-DD"
  end_date: string;   // ISO
  goals?: string | null;
};

const LS_KEY = "admin_sprints_v1";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export default function AdminLite({
  userId,
  onLogout,
}: {
  userId: string;
  onLogout?: () => void;
}) {
  // =========================
  // SPRINTS (local storage MVP)
  // =========================
  const [items, setItems] = useState<Sprint[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.warn("[AdminLite] Failed to load sprints from localStorage:", e);
    }
  }, []);
  const saveAll = (next: Sprint[]) => {
    setItems(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("[AdminLite] Failed to save sprints to localStorage:", e);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(
    () => items.find((s) => s.id === editingId) || null,
    [items, editingId]
  );

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [goals, setGoals] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setName("");
      setStart("");
      setEnd("");
      setGoals("");
    } else {
      setName(editing.name);
      setStart(editing.start_date);
      setEnd(editing.end_date);
      setGoals(editing.goals ?? "");
    }
  }, [editing]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !start || !end) return;

    if (editing) {
      const next = items.map((s) =>
        s.id === editing.id
          ? { ...s, name: name.trim(), start_date: start, end_date: end, goals: goals || null }
          : s
      );
      saveAll(next);
      setEditingId(null);
    } else {
      const sprint: Sprint = {
        id: uid(),
        name: name.trim(),
        start_date: start,
        end_date: end,
        goals: goals || null,
      };
      saveAll([sprint, ...items]);
    }
  };

  const onDelete = (id: string) => {
    if (!confirm("Delete this sprint?")) return;
    saveAll(items.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // =========================
  // TOP BAR TIMESTAMP
  // =========================
  const [timestamp, setTimestamp] = useState<string>("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
    const tick = () => setTimestamp(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      localStorage.removeItem("kanban_user_id");
      localStorage.removeItem("kanban_user_role");
    } catch (e) {
      console.warn("[AdminLite] Failed to clear auth keys:", e);
    }
    window.location.reload();
  };

  // =========================
  // ROUTING: Sprints vs Users
  // =========================
  type Panel = "sprints" | "users";
  const [panel, setPanel] = useState<Panel>("sprints");

  const jumpToCreate = () => {
    nameInputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="admin-shell">
      {/* ===== Left Sidebar ===== */}
      <aside id="slide-out" className="side-nav z-depth-2">
        <div className="side-profile indigo-700">
          <p className="profile-name">Admin</p>
        </div>

        <nav className="side-links">
          <a
            className={`waves-effect ${panel === "sprints" ? "active" : ""}`}
            href="#!"
            onClick={(e) => {
              e.preventDefault();
              setPanel("sprints");
            }}
          >
            <b>Dashboard</b>
          </a>

          <details className="collapsible" open={panel === "users"}>
            <summary
              className="collapsible-header"
              onClick={() => setPanel("users")}
            >
              <b>Users</b>
            </summary>
          </details>
        </nav>
      </aside>

      {/* ===== Main Column ===== */}
      <div className="main-col">
        {/* Top Nav */}
        <header>
          <nav className="topbar indigo-600">
            <div className="nav-wrapper">
              <a className="brand" href="#!"></a>
              <div className="right-actions">
                <button
                  className="btn btn-dark"
                  onClick={handleLogout}
                  title="Log out"
                  aria-label="Log out"
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>

          <nav className="subbar indigo-700">
            <div className="crumbs">
              <a className="breadcrumb" href="#!">Admin</a>
              <a className="breadcrumb" href="#!">
                {panel === "users" ? "Users" : "Sprints"}
              </a>
            </div>
            <div className="timestamp">{timestamp}</div>
          </nav>
        </header>

        {/* Main content */}
        <main className="content">
          <div className="grid-2">
            {panel === "sprints" ? (
              <>
                {/* Card: Sprint form */}
                <section className="card full-span">
                <div className="card-title">
                    <b>{editing ? "Edit Sprint" : "Sprint Management"}</b>
                  </div>
                  <p className="card-subtitle">
                    Name, dates, and goals. You can connect this to Supabase later.
                  </p>

                  <form onSubmit={onSubmit} className="form-grid">
                    <div className="full-span">
                      <label className="label">Sprint name</label>
                      <input
                        ref={nameInputRef}
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Sprint 12"
                        required
                      />
                    </div>

                    <div>
                      <label className="label">Start date</label>
                      <input
                        type="date"
                        className="input"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="label">End date</label>
                      <input
                        type="date"
                        className="input"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        required
                      />
                    </div>

                    <div className="full-span">
                      <label className="label">Goals (optional)</label>
                      <textarea
                        rows={4}
                        className="textarea"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        placeholder="Improve DnD UX, ship login + admin MVP…"
                      />
                    </div>

                    <div className="actions">
                      {editing && (
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn btn-outline"
                        >
                          Cancel
                        </button>
                      )}
                      <button type="submit" className="btn btn-primary">
                        {editing ? "Save Changes" : "Create Sprint"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Card: Sprints table */}
                <section className="card full-span">
                  <div className="card-title"><b>Sprints</b></div>
                  <p className="card-subtitle">Local list for now. Wire to DB when ready.</p>

                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Dates</th>
                          <th>Goals</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((s) => (
                          <tr key={s.id}>
                            <td className="cell-strong">{s.name}</td>
                            <td>{s.start_date} &rarr; {s.end_date}</td>
                            <td className="max-goals">
                              <div className="line-clamp-2">{s.goals || "—"}</div>
                            </td>
                            <td className="text-right">
                              <div className="row-actions">
                                <button
                                  className="btn btn-outline sm"
                                  onClick={() => setEditingId(s.id)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger sm"
                                  onClick={() => onDelete(s.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!items.length && (
                          <tr>
                            <td colSpan={4} className="empty-state">
                              No sprints yet. Create your first one above.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              // USERS PANEL — now delegated to its own component
              <UserTab />
            )}
          </div>
        </main>

        {/* FAB */}
        {panel === "sprints" && (
          <div className="fab" onClick={jumpToCreate} title="Add sprint" role="button" aria-label="Add sprint">
            <i className="material-icons">add</i>
          </div>
        )}
      </div>
    </div>
  );
}