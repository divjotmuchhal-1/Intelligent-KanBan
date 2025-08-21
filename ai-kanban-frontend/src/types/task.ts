// src/types/task.ts

export type Status = "todo" | "inprogress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;

  // labels/planning (kept from your file)
  priority?: Priority;
  due_date?: string | null;
  sprint_id?: string | null;
  story_points?: number | null;
  tags?: string[] | null;

  created_by: string;              // uuid of owner (NOT NULL in SQL)
  assigned_to?: string | null;     // optional
  created_at: string;              // ISO timestamp
  updated_at: string;              // ISO timestamp
  completed_at?: string | null;    // already present; keep as optional
}

export const COLUMNS = ["todo", "inprogress", "done"] as const;
export const COLUMN_NAMES: Record<(typeof COLUMNS)[number], string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};
