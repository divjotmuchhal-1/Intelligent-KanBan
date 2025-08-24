import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import "../css/SprintsTab.css";

type Sprint = {
  id: string;
  name: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string;   // "YYYY-MM-DD"
  goals?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StatusFilter = "all" | "active" | "upcoming" | "completed";

function parseDate(d: string) {
  // sprint dates are DATE (no time). Force local midnight for reliable compare.
  return new Date(`${d}T00:00:00`);
}

function statusOf(s: Sprint): "active" | "upcoming" | "completed" {
  const today = new Date();
  const start = parseDate(s.start_date);
  const end = parseDate(s.end_date);
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "active";
}

export default function SprintsTab() {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI controls
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Load once + subscribe for live updates
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("sprints")
        .select("*")
        .order("start_date", { ascending: false });

      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setSprints((data || []) as Sprint[]);
      }
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("public:sprints:user-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sprints" },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sprints.filter((s) => {
      const st = statusOf(s);
      const okFilter = filter === "all" || st === filter;
      const okQuery =
        !needle ||
        s.name.toLowerCase().includes(needle) ||
        (s.goals ?? "").toLowerCase().includes(needle);
      return okFilter && okQuery;
    });
  }, [sprints, query, filter]);

  return (
    <div className="sprints-screen">
      <header className="sprints-header">
        <h2>Sprints</h2>
        <p className="hint">Read-only view for all users. Live from the database.</p>
      </header>

      {/* banners */}
      {error && <div className="sp-banner error">Error: {error}</div>}
      {loading && <div className="sp-banner neutral">Loading sprints…</div>}

      {/* Toolbar */}
      <div className="sp-toolbar">
        <input
          className="sp-input"
          placeholder="Search by name or goals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search sprints"
        />
        <select
          className="sp-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Goals</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="sp-empty">No sprints match your filters.</td>
              </tr>
            )}
            {filtered.map((s) => {
              const st = statusOf(s);
              const start = new Date(`${s.start_date}T00:00:00`).toLocaleDateString();
              const end = new Date(`${s.end_date}T00:00:00`).toLocaleDateString();
              return (
                <tr key={s.id}>
                  <td className="sp-strong">{s.name}</td>
                  <td>{start} → {end}</td>
                  <td>
                    <span className={`sp-badge ${st}`}>{st}</span>
                  </td>
                  <td>
                    {s.goals ? (
                      <details className="sp-goals">
                        <summary className="sp-goals-summary">View goals</summary>
                        <div className="sp-goals-body">{s.goals}</div>
                      </details>
                    ) : (
                      <span className="sp-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
