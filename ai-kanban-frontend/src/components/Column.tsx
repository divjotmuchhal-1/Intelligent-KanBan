// src/components/Column.tsx
import { Droppable } from "@hello-pangea/dnd";
import TaskCard from "./TaskCard";
import type { Task, Status } from "../types/task";

export default function Column({
  id,
  title,
  tasks,
  onAddClick,
  onEdit,
  onDelete,
  loading,
}: {
  id: Status;
  title: string;
  tasks: Task[];
  onAddClick: (col: Status) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div
      className="kanban-column"
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)", // leave space for app header; tweak as needed
        borderRadius: 12,
        padding: 12,
      }}
    >
      {/* Header (non-scrollable) */}
      <div className="kanban-column-header" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h2 className="kanban-column-title" style={{ margin: 0, flex: "0 1 auto" }}>
          {title}
        </h2>
        <span className="count-badge" style={{ marginLeft: "auto" }}>
          {tasks.length}
        </span>
      </div>

      <button className="add-task-btn" onClick={() => onAddClick(id)} style={{ marginBottom: 8 }}>
        + Add Task
      </button>

      {/* Cards list (scrollable + droppable area) */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column-cards ${snapshot.isDraggingOver ? "is-over" : ""}`}
            style={{
              flex: "1 1 auto",
              minHeight: 0, // critical for scrolling inside flex
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingRight: 4,
            }}
          >
            {loading ? (
              <div className="task-skeleton" />
            ) : tasks.length === 0 ? (
              <div className="empty-state" style={{ opacity: 0.7, padding: "8px 0" }}>
                No tasks here yet.
              </div>
            ) : (
              tasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={i}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
