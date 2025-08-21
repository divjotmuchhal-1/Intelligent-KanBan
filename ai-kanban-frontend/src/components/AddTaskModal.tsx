import { useMemo, useState } from "react";
import type { Status } from "../types/task";

type Owner = { id: string; username: string };

export default function AddTaskModal({
  defaultStatus = "todo",
  onCancel,
  onAdd,
  // NEW (optional)
  isAdmin = false,
  owners = [],
}: {
  defaultStatus?: Status;
  onCancel: () => void;
  onAdd: (
    title: string,
    description: string,
    status: Status,
    extra?: { tags?: string[]; ownerId?: string; assignedTo?: string; priority?: "low" | "medium" | "high"; story_points?: number | null }
  ) => void | Promise<void>;
  isAdmin?: boolean;
  owners?: Owner[];
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [tagsText, setTagsText] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [storyPoints, setStoryPoints] = useState<number | "">("");
  const [ownerId, setOwnerId] = useState<string>("");

  const canSave = useMemo(() => title.trim().length > 0, [title]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await onAdd(title.trim(), desc.trim(), status, {
      tags,
      priority,
      story_points: storyPoints === "" ? null : Number(storyPoints),
      ownerId: isAdmin && ownerId ? ownerId : undefined,
    });
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-semibold">Add Task</h3>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Implement login…"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Context, acceptance criteria…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {isAdmin && owners.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Owner (created_by)</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">(Me)</option>
                {owners.map((u) => (
                  <option value={u.id} key={u.id}>
                    @{u.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Story Points</label>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={storyPoints}
                onChange={(e) => {
                  const v = e.target.value;
                  setStoryPoints(v === "" ? "" : Number(v));
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="ui, auth"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
