// src/lib/edge.ts
import supabase from "./supabaseClient"; // ✅ use the single client you already have
import type { Task, Status /*, Priority*/ } from "../types/task";

// If Priority isn't exported in your types, you can define it here:
// type Priority = "low" | "medium" | "high";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

/* ----------------------------- helpers ----------------------------- */
async function parseJsonSafe<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("request timed out")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

const normalize = (s: string) => s.trim().toLowerCase();
const uniq = (arr: string[]) => Array.from(new Set(arr));

/* ----------------------------- AI endpoints ----------------------------- */

export async function aiAutotag(
  title: string,
  description: string
): Promise<{ tags: string[] }> {
  const res = await withTimeout(
    fetch(`${API_BASE}/api/ai/autotag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ title, description }),
    })
  );

  if (!res.ok) {
    const j = await parseJsonSafe<{ detail?: string }>(res);
    const msg = j?.detail ? `autotag failed: ${j.detail}` : `autotag failed: ${res.status}`;
    throw new Error(msg);
  }

  const payload = (await parseJsonSafe<{ tags?: Array<string | { tag: string }> }>(res)) ?? {};
  const cleaned =
    uniq(
      (payload.tags ?? [])
        .map((t) => (typeof t === "string" ? t : t?.tag || ""))
        .map(normalize)
        .filter(Boolean)
    );

  return { tags: cleaned };
}

export async function aiDescribe(
  title: string,
  description: string
): Promise<{ improved: string }> {
  const res = await withTimeout(
    fetch(`${API_BASE}/api/ai/describe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ title, description }),
    })
  );

  if (!res.ok) {
    const j = await parseJsonSafe<{ detail?: string }>(res);
    const msg = j?.detail ? `describe failed: ${j.detail}` : `describe failed: ${res.status}`;
    throw new Error(msg);
  }

  return (await parseJsonSafe<{ improved: string }>(res)) ?? { improved: "" };
}

/* ----------------------------- Auth / Profile RPCs ----------------------------- */

export async function signUp(username: string, password: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_user", {
    p_username: username,
    p_password: password,
  });
  if (error || !data) throw error ?? new Error("signup failed");
  return data as string; // user id
}

export async function signUpWithRole(
  username: string,
  password: string,
  role: "admin" | "user" = "user"
): Promise<string> {
  const { data, error } = await supabase.rpc("create_user_with_role", {
    p_username: username,
    p_password: password,
    p_role: role,
  });
  if (error || !data) throw error ?? new Error("signup failed");
  return data as string;
}

export async function signIn(username: string, password: string): Promise<string> {
  const { data, error } = await supabase.rpc("login", {
    p_username: username,
    p_password: password,
  });
  if (error) throw error;
  if (!data) throw new Error("INVALID_CREDENTIALS");
  return data as string; // user id
}

export type UserProfile = { id: string; username: string; role: "admin" | "user" };

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.rpc("get_user_profile", { p_user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as UserProfile;
}

/* ----------------------------- Task RPCs ----------------------------- */

// Fetch all tasks for the user (server sorts newest first)
export async function fetchTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase.rpc("get_tasks_for_user", { p_user_id: userId });
  if (error) throw error;
  // RPC can return [] or null; normalize to []
  return (data ?? []) as Task[];
}

// Create a task for the user. The RPC returns only the new id.
// Let your realtime subscription update the UI; we just return the id.
export async function createTaskForUser(
  userId: string,
  input: Partial<Task>
): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc("add_task_for_user", {
    p_user_id: userId,
    p_title: input.title ?? "",
    p_description: input.description ?? "",
    p_status: (input.status as Status) ?? "todo",
    p_tags: input.tags ?? [],
  });
  if (error || !data) throw error ?? new Error("create task failed");
  return { id: data as string };
}

// Update fields if the task belongs to the user. Returns true if updated.
export async function updateTaskForUser(
  userId: string,
  id: string,
  patch: Partial<Task>
): Promise<boolean> {
  const { data, error } = await supabase.rpc("update_task_for_user", {
    p_user_id: userId,
    p_task_id: id,
    p_title: patch.title ?? null,
    p_description: patch.description ?? null,
    p_status: (patch.status as Status) ?? null,
    p_priority: (patch as any).priority ?? null, // keep flexible if not typed
    p_story_points: patch.story_points ?? null,
    p_tags: patch.tags ?? null,
  });
  if (error) throw error;
  // Some clients return { data: true/false }, others return "true"/"false"
  return Boolean(Array.isArray(data) ? data[0] : data);
}

// Move a task between columns (status). Returns true if moved.
export async function moveTaskForUser(
  userId: string,
  id: string,
  status: Status
): Promise<boolean> {
  const { data, error } = await supabase.rpc("move_task_for_user", {
    p_user_id: userId,
    p_task_id: id,
    p_status: status,
  });
  if (error) throw error;
  return Boolean(Array.isArray(data) ? data[0] : data);
}

// Delete a task. Returns true if deleted.
export async function deleteTaskForUser(userId: string, id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_task_for_user", {
    p_user_id: userId,
    p_task_id: id,
  });
  if (error) throw error;
  return Boolean(Array.isArray(data) ? data[0] : data);
}

/* ----------------------------- Deprecated (remove uses) ----------------------------- */
/** @deprecated Use createTaskForUser(userId, input) */
export async function createTask(_input: Partial<Task>): Promise<Task> {
  throw new Error("createTask() is deprecated. Use createTaskForUser(userId, input) via RPC.");
}
/** @deprecated Use updateTaskForUser(userId, id, patch) */
export async function updateTask(_id: string, _patch: Partial<Task>): Promise<Task> {
  throw new Error("updateTask() is deprecated. Use updateTaskForUser(userId, id, patch) via RPC.");
}
