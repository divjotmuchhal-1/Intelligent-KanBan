// src/components/ProfileTab.tsx
import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import "../css/ProfileTab.css"; // <— new CSS

type Availability = "available" | "busy" | "ooo";
type Role = "admin" | "user";

type ProfileRow = {
  id?: string | null;
  user_id?: string | null;
  username?: string | null;
  role?: Role | null;
  full_name?: string | null;
  team?: string | null;
  timezone?: string | null;
  time_zone?: string | null;

  skills?: string[] | null;
  preferred_work_types?: string[] | null;
  constraints?: string[] | null;
  interests?: string[] | null;
  learning_goals?: string[] | null;

  availability_hours_per_week?: number | null;

  completed_tasks_count?: number | null;
  average_completion_time?: string | null;
  feedback_score?: number | null;
};

function toTagArray(v: string | string[] | null | undefined): string[] {
  if (Array.isArray(v)) return v.map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

function TagEditor({
  label,
  value,
  onChange,
  placeholder = "Type a tag and press Enter…",
  icon = "fa fa-tags",
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  icon?: string;
}) {
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    onChange(uniq([...value, t]));
    setInput("");
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  return (
    <div className="form-group full-span">
      <label className="pt-label">{label}</label>
      <div className="pt-tags">
        {value.map((t) => (
          <span className="pt-tag" key={t}>
            {t}
            <button
              type="button"
              className="pt-tag-x"
              aria-label={`remove ${t}`}
              onClick={() => remove(t)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          className="form-control"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
        <i className={icon} aria-hidden="true" />
      </div>
      <small className="pt-hint">Tip: comma or Enter to add. Click × to remove.</small>
    </div>
  );
}

export default function ProfileTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // basics
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [team, setTeam] = useState("");

  // arrays
  const [skills, setSkills] = useState<string[]>([]);
  const [prefTypes, setPrefTypes] = useState<string[]>([]);
  const [avoidTypes, setAvoidTypes] = useState<string[]>([]);
  const [goalTags, setGoalTags] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  // availability / hours / tz
  const [availability, setAvailability] = useState<Availability>("available");
  const [hours, setHours] = useState<number>(35);
  const [tz, setTz] = useState<string>("");

  // read-only signals (optional)
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const [avgCompletion, setAvgCompletion] = useState<string | null>(null);
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);

  // avatar/resume (optional file just for UI feel)
  const [fileLabel, setFileLabel] = useState("");

  // Load profile
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: extData, error: extErr } = await supabase.rpc("get_profile", { p_user_id: userId });
        if (extErr) throw extErr;

        const ext: ProfileRow | null = (Array.isArray(extData) ? extData?.[0] : extData) ?? null;

        if (!cancel && ext) {
          if (ext.username) setUsername(ext.username);
          if (ext.role) setRole(ext.role);
          setFullName(ext.full_name ?? "");
          setTeam(ext.team ?? "");

          setSkills(toTagArray(ext.skills));
          setPrefTypes(toTagArray(ext.preferred_work_types));
          setAvoidTypes(toTagArray(ext.constraints));
          setInterests(toTagArray(ext.interests));
          setGoalTags(toTagArray(ext.learning_goals));

          setHours(Number(ext.availability_hours_per_week ?? 35));
          setTz((ext.time_zone ?? ext.timezone ?? "") || "");

          setCompletedCount(ext.completed_tasks_count ?? null);
          setAvgCompletion(ext.average_completion_time ?? null);
          setFeedbackScore(ext.feedback_score ?? null);
        }

        if (!cancel && (!username || !role)) {
          const { data: basic, error: basicErr } = await supabase.rpc("get_user_profile", { p_user_id: userId });
          if (!basicErr) {
            const row = Array.isArray(basic) ? basic?.[0] : basic;
            if (row?.username && !username) setUsername(row.username);
            if (row?.role && !role) setRole(row.role as Role);
          }
        }
      } catch (e: any) {
        if (!cancel) setError(e?.message ?? "Failed to load profile.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const canSave = useMemo(() => {
    if (!username.trim()) return false;
    if (hours < 0 || hours > 80) return false;
    return true;
  }, [username, hours]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || saving) return;

    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const { error: upErr } = await supabase.rpc("upsert_profile", {
        p_user_id: userId,
        p_full_name: fullName.trim() || null,
        p_title: null,
        p_department: null,
        p_team: team.trim() || null,
        p_location: null,
        p_timezone: tz.trim() || null,
        p_avatar_url: null,
        p_about: null,

        p_skills: skills.length ? skills : null,
        p_strengths: null,
        p_interests: interests.length ? interests : null,
        p_tools: null,
        p_certifications: null,
        p_languages: null,
        p_preferred_work_types: prefTypes.length ? prefTypes : null,
        p_constraints: avoidTypes.length ? avoidTypes : null,
        p_learning_goals: goalTags.length ? goalTags : null,

        p_seniority: null,
        p_experience_years: null,
        p_availability_hours_per_week: Number.isFinite(hours) ? hours : null,
        p_working_hours: null,
        p_prefers_deep_work: null,
        p_communication_style: null,
        p_collaboration_style: null,

        p_velocity_avg: null,
        p_velocity_recent: null,
        p_last_active_at: null,

        p_links: null,
        p_custom: null,
      });
      if (upErr) throw upErr;

      setSavedMsg("Profile saved.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(null), 2500);
    }
  };

  return (
    <div className="profile-screen">
      <form className="form" onSubmit={onSave}>
        <h2>User Profile</h2>

        {/* banners */}
        {error && <div className="pt-banner error">{error}</div>}
        {savedMsg && <div className="pt-banner success">{savedMsg}</div>}
        {loading && <div className="pt-banner neutral">Loading profile…</div>}

        {/* FULL NAME */}
        <div className="form-group">
          <label className="pt-label">Full Name:</label>
          <div className="relative">
            <input
              className="form-control"
              id="fullName"
              type="text"
              pattern="[a-zA-Z\s]+"
              title="Name should only contain letters and spaces."
              placeholder="Type your name here…"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <i className="fa fa-user" aria-hidden="true" />
          </div>
        </div>

        {/* USERNAME */}
        <div className="form-group">
          <label className="pt-label">Username:</label>
          <div className="relative">
            <input
              className="form-control"
              id="username"
              type="text"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <i className="fa fa-id-card" aria-hidden="true" />
          </div>
        </div>

        {/* TEAM */}
        <div className="form-group">
          <label className="pt-label">Team:</label>
          <div className="relative">
            <input
              className="form-control"
              id="team"
              type="text"
              placeholder="frontend_team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
            <i className="fa fa-suitcase" aria-hidden="true" />
          </div>
        </div>

        {/* TIMEZONE */}
        <div className="form-group">
          <label className="pt-label">Time Zone:</label>
          <div className="relative">
            <input
              className="form-control"
              id="timezone"
              type="text"
              placeholder="America/New_York"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
            />
            <i className="fa fa-clock-o" aria-hidden="true" />
          </div>
        </div>

        {/* AVAILABILITY + HOURS */}
        <div className="form-group">
          <label className="pt-label">Availability:</label>
          <div className="relative">
            <select
              className="form-control"
              value={availability}
              onChange={(e) => setAvailability(e.target.value as Availability)}
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="ooo">Out of office</option>
            </select>
            <i className="fa fa-calendar-check-o" aria-hidden="true" />
          </div>
        </div>

        <div className="form-group">
          <label className="pt-label">Hours per week:</label>
          <div className="relative">
            <input
              className="form-control"
              type="number"
              min={0}
              max={80}
              placeholder="35"
              value={Number.isFinite(hours) ? String(hours) : ""}
              onChange={(e) => setHours(Number(e.target.value))}
            />
            <i className="fa fa-hourglass-half" aria-hidden="true" />
          </div>
        </div>

        {/* TAG GROUPS */}
        <TagEditor label="Skills" value={skills} onChange={setSkills} icon="fa fa-code" />
        <TagEditor
          label="Preferred work types"
          value={prefTypes}
          onChange={setPrefTypes}
          icon="fa fa-thumbs-up"
        />
        <TagEditor
          label="Avoid work types"
          value={avoidTypes}
          onChange={setAvoidTypes}
          icon="fa fa-ban"
        />
        <TagEditor
          label="Career goals"
          value={goalTags}
          onChange={setGoalTags}
          icon="fa fa-bullseye"
        />
        <TagEditor
          label="Project interests"
          value={interests}
          onChange={setInterests}
          icon="fa fa-lightbulb-o"
        />

        {/* OPTIONAL FILE (UI only) */}
        <div className="form-group">
          <label className="pt-label">Attachment (optional):</label>
          <div className="relative">
            <div className="input-group">
              <label className="input-group-btn">
                <span className="btn btn-default">
                  Browse…
                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const files = e.target.files;
                      const label =
                        !files || files.length === 0
                          ? ""
                          : files.length > 1
                          ? `${files.length} files selected`
                          : files[0].name;
                      setFileLabel(label);
                    }}
                  />
                </span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Attachment…"
                value={fileLabel}
                readOnly
              />
              <i className="fa fa-link" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="tright">
          <button
            className="movebtn movebtnre"
            type="button"
            onClick={() => {
              // light reset of editable fields
              setFullName("");
              setTeam("");
              setTz("");
              setHours(35);
              setSkills([]);
              setPrefTypes([]);
              setAvoidTypes([]);
              setGoalTags([]);
              setInterests([]);
              setFileLabel("");
            }}
          >
            <i className="fa fa-fw fa-refresh" aria-hidden="true" /> Reset
          </button>

          <button className="movebtn movebtnsu" type="submit" disabled={!canSave || saving}>
            {saving ? "Saving…" : "Submit"}{" "}
            <i className="fa fa-fw fa-paper-plane" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
