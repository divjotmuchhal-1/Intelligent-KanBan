// src/components/AddTaskModal.tsx
import { useRef, useState } from "react";
import type { Status } from "../types/task";
import { aiAutotag, aiDescribe } from "../lib/edge";

export default function AddTaskModal({
  defaultStatus,
  onCancel,
  onAdd,
}: {
  defaultStatus: Status;
  onCancel: () => void;
  onAdd: (
    title: string,
    description: string,
    status: Status,
    extra?: { tags?: string[] }
  ) => Promise<void> | void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, _setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tagInputRef = useRef<HTMLInputElement>(null);

  // ---- race-proof tags: keep a ref in sync with state and read it on submit
  const latestTagsRef = useRef<string[]>([]);
  const setTagsSafe = (
    nextOrUpdater: string[] | ((prev: string[]) => string[])
  ) => {
    _setTags((prev) => {
      const next =
        typeof nextOrUpdater === "function"
          ? (nextOrUpdater as (p: string[]) => string[])(prev)
          : nextOrUpdater;

      latestTagsRef.current = next;
      return next;
    });
  };

  // Keep ref aligned if state changes outside setTagsSafe (unlikely but safe)
  if (latestTagsRef.current !== tags) {
    latestTagsRef.current = tags;
  }

  // ---- helpers ----
  const normalize = (raw: string) => raw.trim().toLowerCase();
  const uniq = (arr: string[]) => Array.from(new Set(arr));

  const addTag = (raw: string) => {
    const t = normalize(raw);
    if (!t) return;
    setTagsSafe((prev) => {
      if (prev.includes(t)) return prev;
      return prev.length >= 10 ? prev : [...prev, t];
    });
    setTagInput("");
    setError(null);
  };

  const removeTag = (t: string) => {
    setTagsSafe((prev) => prev.filter((x) => x !== t));
  };

  const onTagKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // ------- Suggest tags (mirror description flow, write via setTagsSafe) -------
  const suggestTags = async () => {
    if (!title.trim() && !description.trim()) return;
    setError(null);
    setLoadingSuggest(true);

    try {
      const res = await aiAutotag(title, description);

      const rawTags = (res?.tags ?? []) as Array<string | { tag: string }>;

      const extracted = rawTags.map((t) => (typeof t === "string" ? t : t?.tag || ""));

      const normalized = extracted.map(normalize);

      const filtered = normalized.filter(Boolean);

      const cleaned = uniq(filtered).slice(0, 6);

      if (cleaned.length) {
        setTagsSafe(cleaned);
      } else {
        setError("No tags suggested. Add at least one tag before creating the task.");
      }

      tagInputRef.current?.focus();
    } catch (e) {
      setError("Couldn’t fetch tag suggestions. Please try again.");
    } finally {
      setLoadingSuggest(false);
    }
  };

  // Improve description (unchanged pattern)
  const improveDescription = async () => {
    if (!title.trim() && !description.trim()) return;
    setError(null);
    setLoadingImprove(true);
    try {
      const { improved } = await aiDescribe(title, description);
      if (improved) setDescription(improved);
    } catch (e) {
      setError("Couldn’t improve the description. Please try again.");
    } finally {
      setLoadingImprove(false);
    }
  };

  // Guardrail: do not add until at least one tag exists. Autotag once if empty.
  const handleAdd = async () => {
    const t = title.trim();

    if (!t || creating || loadingSuggest) return;

    // If no tags yet, try to auto-suggest once, then re-check
    const currentlyHasTags = (latestTagsRef.current.length || tags.length) > 0;
    if (!currentlyHasTags) {
      if (title.trim() || description.trim()) {
        await suggestTags();
      } 
    }

    const finalTags = latestTagsRef.current.length ? latestTagsRef.current : tags;

    if (!finalTags.length) {
      setError("Add at least one tag before creating the task.");
      tagInputRef.current?.focus();
      return;
    }

    setCreating(true);
    try {

      // ✅ FIXED: pass the correct shape { tags: finalTags } (not { finalTags })
      await onAdd(t, description, defaultStatus, { tags: finalTags });

      onCancel();
    } catch (e) {
      setError("Failed to create the task. Check console for details.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Add Task</h2>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Task title"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          aria-label="Task description"
        />

        {/* AI helpers */}
        <div className="row" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
          <button
            className="btn-secondary"
            onClick={improveDescription}
            disabled={loadingImprove || creating}
          >
            {loadingImprove ? "Improving…" : "Improve description"}
          </button>
          <button
            className="btn-secondary"
            onClick={suggestTags}
            disabled={loadingSuggest || creating || (!title.trim() && !description.trim())}
            title={!title.trim() && !description.trim() ? "Add a title or description first" : "Suggest tags"}
          >
            {loadingSuggest ? "Suggesting…" : "Suggest tags"}
          </button>
        </div>

        {error && (
          <div
            role="status"
            aria-live="polite"
            className="text-sm"
            style={{ color: "var(--danger)", marginTop: 4 }}
          >
            {error}
          </div>
        )}

        {/* Tags editor */}
        <div className="row" style={{ alignItems: "flex-start", gap: "0.75rem", marginTop: "0.5rem" }}>
          <div style={{ flex: 1 }}>
            <div className="mb-2" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {tags.map((t) => (
                <span key={t} className="badge">
                  {t}
                  <button
                    type="button"
                    className="link"
                    aria-label={`Remove tag ${t}`}
                    onClick={() => removeTag(t)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKeyDown}
              placeholder="Add a tag (press Enter)"
              aria-label="Add a tag"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={creating}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={!title.trim() || creating || loadingSuggest}
            title={!title.trim() ? "Enter a title first" : "Create task"}
          >
            {creating ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
