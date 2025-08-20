// src/lib/edge.ts
import { createClient } from "@supabase/supabase-js";
import type { Task } from "../types/task";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// --- Supabase client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnon) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnon ?? "");

// --- Helpers ---
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

// --- AI endpoints ---

// Make autotag logic mirror describe (same fetch/error handling),
// but return a *cleaned* string[] no matter what the backend sends.
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

  // Accept string[] or { tag: string }[]
  const payload = (await parseJsonSafe<{ tags?: Array<string | { tag: string }> }>(res)) ?? {};
  const cleaned =
    uniq(
      (payload.tags ?? [])
        .map((t) => (typeof t === "string" ? t : t?.tag || ""))
        .map(normalize)
        .filter(Boolean)
    );

  // Mirror describe semantics: return a valid object even if empty.
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

  // Keep the same return shape as before
  const payload = (await parseJsonSafe<{ improved: string }>(res)) ?? { improved: "" };
  return payload;
}

// --- Tasks (Supabase) ---
export async function createTask(input: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert([
      {
        title: input.title!,
        description: input.description ?? "",
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        story_points: input.story_points ?? 1,
        tags: input.tags ?? [],
        due_date: input.due_date ?? null,
        completed_at: input.completed_at ?? null,
      },
    ])
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Task;
}
