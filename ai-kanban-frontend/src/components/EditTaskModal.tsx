// src/components/EditTaskModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Task, Status, Priority } from "../types/task";
import { aiAutotag, aiDescribe } from "../lib/edge";

export default function EditTaskModal({
  task,
  onCancel,
  onSave,
}: {
  task: Task;
  onCancel: () => void;
  onSave: (id: string, patch: Partial<Task>) => Promise<void> | void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<Status>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority ?? "medium");
  const [storyPoints, setStoryPoints] = useState<number>(task.story_points ?? 1);

  const [tags, setTags] = useState<string[]>(task.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingImprove, setLoadingImprove] = useState(false);
  const [error, setError] = useState("");

  const tagInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // For minimal patch comparisons
  const initial = useMemo(
    () => ({
      title: task.title ?? "",
      description: task.description ?? "",
      status: task.status as Status,
      priority: (task.priority ?? "medium") as Priority,
      story_points: task.story_points ?? 1,
      tags: task.tags ?? [],
    }),
    [task]
  );

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) return;
    setTags((prev) => [...prev, t].slice(0, 10));
    setTagInput("");
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const onTagKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && !tagInput && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const suggestTags = async () => {
    if (!title.trim() && !description.trim()) return;
    setLoadingTags(true);
    setError("");
    try {
      const res = await aiAutotag(title, description);
      const ai = Array.from(new Set((res?.tags ?? []).map((t: string) => t.toLowerCase())));
      const merged = Array.from(new Set([...(tags ?? []), ...ai])).slice(0, 6);
      setTags(merged);
      tagInputRef.current?.focus();
    } catch (e: unknown) {
      setError("Failed to suggest tags.");
    } finally {
      setLoadingTags(false);
    }
  };

  const improveDescription = async () => {
    if (!title.trim() && !description.trim()) return;
    setLoadingImprove(true);
    setError("");
    try {
      const res = await aiDescribe(title, description);
      if (res?.improved) setDescription(res.improved);
    } catch (e: unknown) {
      setError("Failed to improve description.");
    } finally {
      setLoadingImprove(false);
    }
  };

  const handleSave = async () => {
    setError("");
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      titleRef.current?.focus();
      return;
    }

    const patch: Partial<Task> = {};
    if (t !== initial.title) patch.title = t;
    if ((description ?? "") !== initial.description) patch.description = description ?? "";
    if (status !== initial.status) patch.status = status;
    if ((priority ?? "medium") !== initial.priority) patch.priority = priority;
    if ((storyPoints ?? 1) !== initial.story_points) patch.story_points = storyPoints ?? 1;

    // Compare tags by value
    const sameTags =
      (tags ?? []).length === (initial.tags ?? []).length &&
      JSON.stringify([...tags].sort()) === JSON.stringify([...(initial.tags ?? [])].sort());
    if (!sameTags) patch.tags = tags;

    if (Object.keys(patch).length === 0) {
      onCancel();
      return;
    }

    try {
      await onSave(task.id, patch);
      onCancel();
    } catch (e: unknown) {
      setError("Failed to save changes.");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Task</h2>

        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />

        {/* Tags editor */}
        <div className="row" style={{ alignItems: "flex-start", gap: "0.75rem" }}>
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
            />
          </div>

          <div className="flex-col" style={{ display: "flex", gap: ".5rem" }}>
            <button className="btn-secondary" onClick={suggestTags} disabled={loadingTags}>
              {loadingTags ? "Suggesting…" : "Suggest tags"}
            </button>
            <button className="btn-secondary" onClick={improveDescription} disabled={loadingImprove}>
              {loadingImprove ? "Improving…" : "Improve description"}
            </button>
          </div>
        </div>

        {/* Status / Priority / Points */}
        <div className="row">
          <label>
            Status:
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </label>
          <label>
            Priority:
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Points:
            <input
              type="number"
              min={0}
              value={storyPoints}
              onChange={(e) => setStoryPoints(Number(e.target.value || 0))}
            />
          </label>
        </div>

        {error && (
          <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={!title.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
