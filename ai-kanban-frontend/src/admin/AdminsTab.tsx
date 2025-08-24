// src/components/AdminsTab.tsx
import { useEffect, useMemo, useState } from "react";

type Admin = {
  id: string;
  email: string;
  name?: string | null;
  active: boolean;
  password?: string | null;    // dev-only: stored in localStorage for demo
  lastLoginAt?: string | null; // ISO
  createdAt: string;           // ISO
};

const LS_KEY = "admin_admins_v1";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function nowISO() {
  return new Date().toISOString();
}

function loadAdmins(): Admin[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveAdmins(list: Admin[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export default function AdminsTab() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => setAdmins(loadAdmins()), []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return admins;
    return admins.filter(
      (a) =>
        a.email.toLowerCase().includes(needle) ||
        (a.name || "").toLowerCase().includes(needle)
    );
  }, [admins, q]);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  function update(list: Admin[]) {
    setAdmins(list);
    saveAdmins(list);
  }

  function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    if (admins.some((a) => a.email.toLowerCase() === trimmedEmail)) {
      alert("An admin with that email already exists.");
      return;
    }

    const a: Admin = {
      id: uid(),
      email: trimmedEmail,
      name: name.trim() || null,
      active: true,
      password: null,
      lastLoginAt: null,
      createdAt: nowISO(),
    };
    update([a, ...admins]);
    setEmail("");
    setName("");
  }

  function setPassword(id: string) {
    const admin = admins.find((a) => a.id === id);
    if (!admin) return;

    const p1 = window.prompt(`Set a new password for ${admin.email}:`);
    if (p1 === null) return; // cancelled
    const p2 = window.prompt("Confirm the new password:");
    if (p2 === null) return;

    if (p1 !== p2) {
      alert("Passwords do not match.");
      return;
    }
    if (p1.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    update(
      admins.map((a) => (a.id === id ? { ...a, password: p1 } : a))
    );
    alert("Password set successfully.");
  }

  function toggleActive(id: string) {
    update(
      admins.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  }

  function remove(id: string) {
    const admin = admins.find((a) => a.id === id);
    if (!admin) return;
    if (!confirm(`Remove ${admin.email}? This cannot be undone.`)) return;
    update(admins.filter((a) => a.id !== id));
  }

  return (
    <>
      {/* Create Admin */}
      <section className="card full-span">
        <div className="card-title"><b>Administrators</b></div>
        <p className="card-subtitle">Create and manage admin accounts.</p>

        <form onSubmit={createAdmin} className="form-grid">
          <div className="full-span">
            <label className="label">Admin email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              required
            />
          </div>

          <div className="full-span">
            <label className="label">Name (optional)</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Admin"
            />
          </div>

          <div className="actions">
            <button type="submit" className="btn btn-primary">Create Admin</button>
          </div>
        </form>
      </section>

      {/* Search */}
      <section className="card full-span">
        <div className="card-title"><b>All Admins</b></div>
        <div className="card-subtitle">Set password, enable/disable, or remove.</div>

        <div className="toolbar">
          <input
            className="input"
            placeholder="Search by email or name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search admins"
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="cell-strong">{a.email}</td>
                  <td>{a.name || "—"}</td>
                  <td>{a.active ? "Active" : "Disabled"}</td>
                  <td>{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "—"}</td>
                  <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="row-actions">
                      <button className="btn btn-outline sm" onClick={() => setPassword(a.id)}>
                        Set Password
                      </button>
                      <button className="btn btn-outline sm" onClick={() => toggleActive(a.id)}>
                        {a.active ? "Disable" : "Enable"}
                      </button>
                      <button className="btn btn-danger sm" onClick={() => remove(a.id)}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="empty-state">No admins found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
