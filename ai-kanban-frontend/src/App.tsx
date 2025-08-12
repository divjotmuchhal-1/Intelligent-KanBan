import { useEffect, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import supabase from "./supabaseClient";
import "./App.css";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "inprogress" | "done";
}

const columns = ["todo", "inprogress", "done"] as const;
const columnNames: Record<(typeof columns)[number], string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogColumn, setDialogColumn] = useState<Task["status"]>("todo");
  const [taskForm, setTaskForm] = useState({ title: "", description: "" });

  // Load tasks + subscribe to realtime changes
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id,title,description,status")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[fetch tasks]", error);
        setLoading(false);
        return;
      }

      // Dedupe by id (defensive)
      const unique = Array.from(
        new Map((data ?? []).map((t) => [t.id, t as Task])).values()
      );
      setTasks(unique);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const inserted = payload.new as Task;
            setTasks((prev) =>
              prev.some((t) => t.id === inserted.id) ? prev : [...prev, inserted]
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Task;
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          } else if (payload.eventType === "DELETE") {
            const removed = payload.old as Task;
            setTasks((prev) => prev.filter((t) => t.id !== removed.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Drag between columns -> persist status
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId as Task["status"];

    // Optimistic UI
    setTasks((prev) =>
      prev.map((t) => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", draggableId);

    if (error) console.error("[update status]", error);
  };

  // Add task -> rely on realtime to render it
  const handleAddTask = async () => {
    if (!taskForm.title.trim()) return;

    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title,
      description: taskForm.description,
      status: dialogColumn,
    });

    if (error) {
      console.error("[insert task]", error);
      alert(`Insert failed: ${error.message}`);
      return;
    }

    setTaskForm({ title: "", description: "" });
    setShowDialog(false);
  };

  return (
    <div className="kanban-container">
      <h1 className="kanban-title">Kanban Board</h1>

      <div className="kanban-board">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);

            return (
              <Droppable droppableId={col} key={col}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-column ${snapshot.isDraggingOver ? "is-over" : ""}`}
                  >
                    <div className="kanban-column-header">
                      <h2 className="kanban-column-title">{columnNames[col]}</h2>
                      <span className="count-badge">{colTasks.length}</span>
                    </div>

                    <button
                      onClick={() => {
                        setDialogColumn(col);
                        setShowDialog(true);
                      }}
                      className="add-task-btn"
                    >
                      + Add Task
                    </button>

                    {loading ? (
                      <div className="task-skeleton" />
                    ) : colTasks.length === 0 ? (
                      <div className="empty-state">No tasks here yet.</div>
                    ) : (
                      colTasks.map((task, index) => (
                        <Draggable draggableId={task.id} index={index} key={task.id}>
                          {(provided, snap) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`kanban-task ${snap.isDragging ? "is-dragging" : ""}`}
                            >
                              <div className="task-title">{task.title}</div>
                              {task.description && (
                                <div className="task-desc">{task.description}</div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </DragDropContext>
      </div>

      {showDialog && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Add Task</h2>
            <input
              type="text"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            />
            <textarea
              placeholder="Description"
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({ ...taskForm, description: e.target.value })
              }
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDialog(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddTask}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
