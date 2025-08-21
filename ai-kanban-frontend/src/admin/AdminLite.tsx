import { useEffect, useMemo, useState } from "react";

type Sprint = {
  id: string;
  name: string;
  start_date: string; // ISO date: "YYYY-MM-DD"
  end_date: string;   // ISO date
  goals?: string | null;
};

const LS_KEY = "admin_sprints_v1";

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

export default function AdminLite({ userId }: { userId: string }) {
  // ---- local storage for now (replace later with Supabase RPCs) ----
  const [items, setItems] = useState<Sprint[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch(e) {    
          console.warn("[AdminLite] Failed to load sprints from localStorage:", e);
    }
  }, []);
  const saveAll = (next: Sprint[]) => {
    setItems(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch (e){
        console.warn("[AdminLite] Failed to save sprints to localStorage:", e);
    }
  };

  // ---- UI state ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => items.find((s) => s.id === editingId) || null, [items, editingId]);

  // ---- form state ----
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [goals, setGoals] = useState("");

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

  // ---- handlers ----
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !start || !end) return;

    if (editing) {
      const next = items.map((s) =>
        s.id === editing.id ? { ...s, name: name.trim(), start_date: start, end_date: end, goals: goals || null } : s
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-semibold">Admin</h1>
          <div className="text-sm text-gray-500">user: <span className="font-medium">{userId.slice(0, 8)}…</span></div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Sprint form */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">{editing ? "Edit Sprint" : "Create Sprint"}</h2>
            <p className="text-sm text-gray-500">Name, dates, and goals. You can connect this to Supabase later.</p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Sprint name</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint 12"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Start date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Goals (optional)</label>
              <textarea
                rows={3}
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Improve DnD UX, ship login + admin MVP…"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editing ? "Save Changes" : "Create Sprint"}
              </button>
            </div>
          </form>
        </div>

        {/* Sprint list */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Sprints</h2>
              <p className="text-sm text-gray-500">Local list for now. Wire to DB when ready.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Dates</th>
                  <th className="px-3 py-2 text-left">Goals</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{s.name}</td>
                    <td className="px-3 py-2">
                      {s.start_date} &rarr; {s.end_date}
                    </td>
                    <td className="px-3 py-2 max-w-[28rem]">
                      <div className="line-clamp-2 text-gray-600">{s.goals || "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50"
                          onClick={() => setEditingId(s.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-md bg-rose-600 px-3 py-1.5 text-xs text-white hover:bg-rose-700"
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
                    <td colSpan={4} className="px-3 py-10 text-center text-gray-500">
                      No sprints yet. Create your first one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roadmap note */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Next steps (when you’re ready)</h3>
          <ul className="mt-2 list-disc pl-6 text-sm text-gray-600">
            <li>Replace localStorage with Supabase RPC: <code>upsert_sprint</code> &amp; a <code>list_sprints</code> view.</li>
            <li>Add a simple “Attach tasks to sprint” action from your backlog page.</li>
            <li>Show a minimal Recommendations panel (accept/reject) for the selected sprint.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
