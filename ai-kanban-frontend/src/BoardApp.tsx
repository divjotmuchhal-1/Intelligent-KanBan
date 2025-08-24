// src/BoardApp.tsx
import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useTasks } from "./hooks/useTasks";
import Column from "./components/Column";
import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";
import ProfileTab from "./components/ProfileTab";
import SprintsTab from "./components/SprintsTab";
import { COLUMNS, COLUMN_NAMES, type Status, type Task } from "./types/task";
import "./App.css";

type Tab = "board" | "profile" | "sprints";

export default function BoardApp({
  userId,
  onLogout,
}: {
  userId: string;
  onLogout: () => void;
}) {
  // Tabs: "board" (kanban) vs "profile" vs "sprints"
  const [tab, setTab] = useState<Tab>("board");

  // 🔒 All task operations are scoped to this userId
  const { tasks, loading, addTask, updateStatus, updateTask, deleteTask } = useTasks(userId);

  // Board-only UI state
  const [showAdd, setShowAdd] = useState(false);
  const [addColumn, setAddColumn] = useState<Status>("todo");
  const [editing, setEditing] = useState<Task | null>(null);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    await updateStatus(draggableId, destination.droppableId as Status);
  };

  // Small helper for a consistent tab button style (works without extra CSS)
  const tabBtn = (active: boolean) => ({
    border: "1px solid var(--border)",
    padding: "8px 12px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: ".875rem",
    cursor: "pointer",
    background: active ? "var(--blue-600)" : "#fff",
    color: active ? "#fff" : "var(--text)",
    transition: "background .15s ease, color .15s ease",
  });

  return (
    <div className="kanban-container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header with title and buttons underneath */}
      <header style={{ marginBottom: "1rem" }}>
        <h1 className="kanban-title" style={{ margin: 0 }}>Kanban</h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={tabBtn(tab === "board")}
            onClick={() => setTab("board")}
            aria-pressed={tab === "board"}
          >
            Board
          </button>
          <button
            type="button"
            style={tabBtn(tab === "sprints")}
            onClick={() => setTab("sprints")}
            aria-pressed={tab === "sprints"}
          >
            Sprints
          </button>
          <button
            type="button"
            style={tabBtn(tab === "profile")}
            onClick={() => setTab("profile")}
            aria-pressed={tab === "profile"}
          >
            Profile
          </button>
          <button className="btn-secondary" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {tab === "board" ? (
        <>
          <div className="kanban-board" style={{ flex: 1 }}>
            <DragDropContext onDragEnd={onDragEnd}>
              {COLUMNS.map((col) => (
                <Column
                  key={col}
                  id={col}
                  title={COLUMN_NAMES[col]}
                  tasks={tasks.filter((t) => t.status === col)}
                  loading={loading}
                  onAddClick={(c) => {
                    setAddColumn(c);
                    setShowAdd(true);
                  }}
                  onEdit={(t) => setEditing(t)}
                  onDelete={async (id) => {
                    if (confirm("Delete this task?")) await deleteTask(id);
                  }}
                />
              ))}
            </DragDropContext>
          </div>

          {showAdd && (
            <AddTaskModal
              defaultStatus={addColumn}
              onCancel={() => setShowAdd(false)}
              onAdd={async (title, description, status, extra) => {
                await addTask(title, description, status, extra?.tags ?? []);
                setShowAdd(false);
              }}
            />
          )}

          {editing && (
            <EditTaskModal
              task={editing}
              onCancel={() => setEditing(null)}
              onSave={async (id, patch) => {
                await updateTask(id, patch);
                setEditing(null);
              }}
            />
          )}
        </>
      ) : tab === "profile" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ProfileTab userId={userId} />
        </div>
      ) : (
        // Sprints tab
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <SprintsTab />
        </div>
      )}
    </div>
  );
}
