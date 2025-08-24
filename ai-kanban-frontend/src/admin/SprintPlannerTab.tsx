import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import "../css/SprintsTab.css"; // reuse styling if you want

type Sprint = { id: string; name: string; start_date: string; end_date: string; goals?: string | null };
type UserRow = { id: string; username?: string | null; full_name?: string | null; email?: string | null; role?: string | null };

type TaskInsert = {
  title: string;
  description?: string | null;
  status?: string | null;      // 'todo' | 'inprogress' | 'done'
  sprint_id: string | null;
  assignee_id: string | null;
  tags?: string[] | null;
};

export default function SprintPlannerTab() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>("");

  // quick-assign form state
  const [assignee, setAssignee] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [desc, setDesc] = useState<string>("");

  // optional: show per-user tasks in this sprint
  const [preview, setPreview] = useState<{[userId: string]: number}>({}); // counts
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [{ data: sp, error: se }, { data: us, error: ue }] = await Promise.all([
          supabase.from("sprints").select("*").order("start_date", { ascending: false }),
          supabase.from("users").select("id, username, full_name, email, role").order("created_at", { ascending: false }),
        ]);
        if (se) throw se;
        if (ue) throw ue;

        if (!cancelled) {
          setSprints((sp ?? []) as Sprint[]);
          setUsers((us ?? []) as UserRow[]);
          if (!selectedSprint && sp?.length) setSelectedSprint(sp[0].id);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optionally load per-user counts for the chosen sprint
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedSprint) return;
      const { data, error } = await supabase
        .from("tasks")
        .select("assignee_id, id", { count: "exact", head: false })
        .eq("sprint_id", selectedSprint);
      if (error) return; // non-blocking
      if (cancelled) return;

      const counts: {[uid: string]: number} = {};
      (data ?? []).forEach((t: any) => {
        const uid = t.assignee_id as string | null;
        if (!uid) return;
        counts[uid] = (counts[uid] ?? 0) + 1;
      });
      setPreview(counts);
    })();
    return () => { cancelled = true; };
  }, [selectedSprint, refreshKey]);

  const sprint = useMemo(() => sprints.find(s => s.id === selectedSprint) ?? null, [sprints, selectedSprint]);

  const canAssign = !!(selectedSprint && assignee && title.trim());

  const assignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAssign) return;

    const payload: TaskInsert = {
      title: title.trim(),
      description: desc.trim() || null,
      status: "todo",
      sprint_id: selectedSprint,
      assignee_id: assignee,
      tags: null,
    };

    const { error } = await supabase.from("tasks").insert([payload]);
    if (error) {
      alert(error.message);
      return;
    }
    setTitle("");
    setDesc("");
    setRefreshKey((k) => k + 1);
  };

  return (
    <section className="card full-span">
      <div className="card-title"><b>Sprint Planner</b></div>
      <p className="card-subtitle">Assign tasks to users for a selected sprint.</p>

      {loading && <div className="sp-banner neutral">Loading…</div>}
      {err && <div className="sp-banner error">Error: {err}</div>}

      {/* Controls */}
      <div className="form-grid" style={{ marginBottom: 12 }}>
        <div>
          <label className="label">Sprint</label>
          <select
            className="input"
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
          >
            {!sprints.length && <option value="">No sprints</option>}
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.start_date} → {s.end_date})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select
            className="input"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
          >
            <option value="">Select a user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.full_name || u.username || u.email || u.id.slice(0, 8))}
                {preview[u.id] ? ` • ${preview[u.id]} task(s)` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick assign form */}
      <form className="form-grid" onSubmit={assignTask}>
        <div className="full-span">
          <label className="label">Task title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Implement drag handle, fix hover state…"
            required
          />
        </div>

        <div className="full-span">
          <label className="label">Description (optional)</label>
          <textarea
            className="textarea"
            rows={3}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Acceptance criteria, context, links…"
          />
        </div>

        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={!canAssign}>
            Assign to User
          </button>
        </div>
      </form>

      {/* (Optional) Mini roster */}
      {sprint && (
        <div className="table-container" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Tasks in this sprint</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.full_name || u.username || u.email || u.id.slice(0, 8)}</td>
                  <td>{preview[u.id] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
