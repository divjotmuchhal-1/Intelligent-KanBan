// src/hooks/useTasks.ts
import { useEffect, useState, useCallback, useRef } from "react";
import supabase from "../lib/supabaseClient";
import type { Task, Status } from "../types/task";

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // If a projectId is provided, we *try* to use project_id column; otherwise we never include it.
  const supportsProjectIdRef = useRef<boolean>(Boolean(projectId));
  const fetchSeq = useRef(0); // avoid StrictMode race

  const baseCols =
    "id,title,description,status,priority,due_date,story_points,tags,created_at,updated_at,completed_at";
  const colsWithProject = `${baseCols},project_id`;

  const shouldIncludeProject = () =>
    Boolean(projectId) && supportsProjectIdRef.current;

  const currentSelectCols = () =>
    shouldIncludeProject() ? colsWithProject : baseCols;

  useEffect(() => {
    let mounted = true;
    const mySeq = ++fetchSeq.current;

    const fetchTasks = async () => {
      const includeProject = shouldIncludeProject();
      console.log("[useTasks] fetch start", {
        projectId,
        includeProject,
        cols: currentSelectCols(),
      });

      const run = async (includeProj: boolean) => {
        let q = supabase
          .from("tasks")
          .select(includeProj ? colsWithProject : baseCols)
          .order("created_at", { ascending: true });

        if (includeProj && projectId) q = q.eq("project_id", projectId);

        return await q;
      };

      // First attempt (based on current supportsProjectIdRef)
      let { data, error } = await run(includeProject);

      if (error?.code === "42703") {
        console.warn(
          "[useTasks] tasks.project_id does not exist. Falling back without it."
        );
        supportsProjectIdRef.current = false;
        ({ data, error } = await run(false));
      }

      if (!mounted || mySeq !== fetchSeq.current) {
        console.log("[useTasks] fetch ignored (stale effect result)");
        return;
      }

      if (error) {
        console.error("[useTasks] fetch error:", error);
        setTasks([]);
      } else {
        console.log(
          "[useTasks] fetch success; count:",
          data?.length ?? 0,
          "sample:",
          data?.[0]
        );
        setTasks((data ?? []) as Task[]);
      }
      setLoading(false);
    };

    fetchTasks();

    console.log("[useTasks] subscribe realtime: tasks-rt");
    const ch = supabase
      .channel("tasks-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (p) => {
          // If filtering by project and project_id exists, ignore events for other projects.
          if (shouldIncludeProject()) {
            const evtProject = (p as unkown)?.new?.project_id ?? (p as unkown)?.old?.project_id;
            if (projectId && evtProject !== projectId) return;
          }

          if (p.eventType === "INSERT") {
            const inserted = p.new as Task;
            setTasks((prev) => {
              if (prev.some((t) => t.id === inserted.id)) {
                console.log("[useTasks] INSERT ignored (dupe):", inserted.id);
                return prev;
              }
              const next = [...prev, inserted];
              console.log("[useTasks] after INSERT count:", next.length);
              return next;
            });
          } else if (p.eventType === "UPDATE") {
            const updated = p.new as Task;
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? (updated as Task) : t))
            );
          } else if (p.eventType === "DELETE") {
            const removed = p.old as Task;
            setTasks((prev) => prev.filter((t) => t.id !== removed.id));
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      console.log("[useTasks] cleanup realtime");
      supabase.removeChannel(ch);
    };
  }, [projectId]);

  // Add a task (accept tags as string[]). Let realtime handle UI insertion.
  const addTask = useCallback(
    async (title: string, description: string, status: Status, tags: string[] = []) => {
      const includeProject = shouldIncludeProject();
      const payload: Partial<Task> = {
        title,
        description: description ?? "",
        status,
        tags: Array.isArray(tags) ? tags : [],
        ...(includeProject && projectId ? { project_id: projectId as unkown } : {}),
      };

      console.log("[useTasks.addTask] insert payload:", payload);

      const { data, error } = await supabase
        .from("tasks")
        .insert(payload)
        .select("*");

      if (error) {
        console.error("[useTasks.addTask] insert error:", error);
        throw error;
      }
      console.log("[useTasks.addTask] insert success:", data);

      // Do not mutate local state here; realtime INSERT will add it (we de-dupe there).
      return (data?.[0] as Task) ?? null;
    },
    [projectId]
  );

  const updateStatus = useCallback(async (id: string, status: Status) => {
    console.log("[useTasks.updateStatus]", { id, status });
    const { data, error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .select("*");
    if (error) throw error;
    console.log("[useTasks.updateStatus] success:", data);
  }, []);

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    console.log("[useTasks.updateTask] patch:", { id, patch });
    const safePatch: Partial<Task> = { ...patch };
    if (!shouldIncludeProject() && "project_id" in safePatch) {
      delete (safePatch as unkown).project_id;
    }
    const { data, error } = await supabase
      .from("tasks")
      .update(safePatch)
      .eq("id", id)
      .select("*");
    if (error) throw error;
    console.log("[useTasks.updateTask] success:", data);
  }, [projectId]);

  const deleteTask = useCallback(async (id: string) => {
    console.log("[useTasks.deleteTask]", { id });
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .select("*");
    if (error) throw error;
    console.log("[useTasks.deleteTask] success:", data);
  }, []);

  return { tasks, loading, addTask, updateStatus, updateTask, deleteTask };
}
