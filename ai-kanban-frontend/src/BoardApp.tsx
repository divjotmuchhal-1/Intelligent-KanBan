import { useState } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useTasks } from "./hooks/useTasks";
import Column from "./components/Column";
import AddTaskModal from "./components/AddTaskModal";
import EditTaskModal from "./components/EditTaskModal";
import { COLUMNS, COLUMN_NAMES, type Status, type Task } from "./types/task";
import "./App.css";

export default function BoardApp({ onLogout }: { onLogout: () => void }) {
  const { tasks, loading, addTask, updateStatus, updateTask, deleteTask } = useTasks();
  const [showAdd, setShowAdd] = useState(false);
  const [addColumn, setAddColumn] = useState<Status>("todo");
  const [editing, setEditing] = useState<Task | null>(null);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    await updateStatus(draggableId, destination.droppableId as Status);
  };

  return (
    <div className="kanban-container">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h1 className="kanban-title">Kanban Board</h1>
        <button className="btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="kanban-board">
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
                if (confirm("Delete this task?")) {
                  await deleteTask(id);
                }
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
    </div>
  );
}
