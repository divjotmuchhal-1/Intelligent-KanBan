
export type Status = "todo" | "inprogress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority?: Priority;
  due_date?: string | null;  
  sprint_id?: string | null;     // NEW
  completed_at?: string | null;  // ensure present
  story_points?: number | null;
  tags?: string[] | null;
}

export const COLUMNS = ["todo", "inprogress", "done"] as const;
export const COLUMN_NAMES: Record<(typeof COLUMNS)[number], string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};
