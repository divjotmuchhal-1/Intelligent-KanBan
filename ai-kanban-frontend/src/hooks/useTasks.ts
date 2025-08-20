// src/hooks/useTasks.ts
import { useCallback, useEffect, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";
import type { Task, Status } from "../types/task";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

function isTask(value: unknown): value is Task {
  return !!value && typeof value === "object" && "id" in value;
}

export function useTasks(userId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSeq = useRef(0);

  const load = useCallback(async () => {
    const mySeq = ++fetchSeq.current;
    setLoading(true);

    const { data, error } = await supabase.rpc("get_tasks_for_user", {
      p_user_id: userId,
    });

    if (mySeq !== fetchSeq.current) return;

    if (error) {
      console.error("[useTasks] load error:", error);
      setTasks([]);
    } else {
      setTasks(((data ?? []) as unknown[]).filter(isTask));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    load();

    const channel = supabase
      .channel(`tasks-user-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: RealtimePostgresChangesPayload<Task>) => {
          if (!mounted) return;

          const rowNew = payload.new ?? undefined; // Task | null
          const rowOld = payload.old ?? undefined; // Task | null

          // Guard: only react to this user's rows
          const createdByNew = (rowNew as Task | undefined)?.created_by;
          const createdByOld = (rowOld as Task | undefined)?.created_by;
          if (createdByNew && createdByNew !== userId) return;
          if (createdByOld && createdByOld !== userId) return;

          if (payload.eventType === "INSERT" && isTask(rowNew)) {
            setTasks((prev) => (prev.some((t) => t.id === rowNew.id) ? prev : [...prev, rowNew]));
          } else if (payload.eventType === "UPDATE" && isTask(rowNew)) {
            setTasks((prev) => prev.map((t) => (t.id === rowNew.id ? rowNew : t)));
          } else if (payload.eventType === "DELETE" && isTask(rowOld)) {
            setTasks((prev) => prev.filter((t) => t.id !== rowOld.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // ---- Mutations via SECURITY DEFINER RPCs ----
  const addTask = useCallback(
    async (title: string, description: string, status: Status, tags: string[] = []) => {
      const { data: id, error } = await supabase.rpc("add_task_for_user", {
        p_user_id: userId,
        p_title: title,
        p_description: description ?? null,
        p_status: status,
        p_tags: tags ?? [],
      });
      if (error || !id) {
        console.error("[useTasks.addTask] error:", error);
        throw error || new Error("add_task_for_user failed");
      }
      await load(); // also rely on realtime
      return { id } as { id: string };
    },
    [userId, load]
  );

  const updateStatus = useCallback(
    async (id: string, status: Status) => {
      const { data, error } = await supabase.rpc("move_task_for_user", {
        p_user_id: userId,
        p_task_id: id,
        p_status: status,
      });
      if (error || !data) {
        console.error("[useTasks.updateStatus] error:", error);
        throw error || new Error("move_task_for_user failed");
      }
      await load();
    },
    [userId, load]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      const { data, error } = await supabase.rpc("update_task_for_user", {
        p_user_id: userId,
        p_task_id: id,
        p_title: patch.title ?? null,
        p_description: patch.description ?? null,
        p_status: (patch.status as Status | undefined) ?? null,
        p_priority: patch.priority ?? null,
        p_story_points: patch.story_points ?? null,
        p_tags: patch.tags ?? null,
      });
      if (error || !data) {
        console.error("[useTasks.updateTask] error:", error);
        throw error || new Error("update_task_for_user failed");
      }
      await load();
    },
    [userId, load]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.rpc("delete_task_for_user", {
        p_user_id: userId,
        p_task_id: id,
      });
      if (error || !data) {
        console.error("[useTasks.deleteTask] error:", error);
        throw error || new Error("delete_task_for_user failed");
      }
      await load();
    },
    [userId, load]
  );

  return { tasks, loading, addTask, updateStatus, updateTask, deleteTask };
}
