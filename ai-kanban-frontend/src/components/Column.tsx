// src/components/Column.tsx
import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
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
  // --- Portal root for rendering the dragging clone at the top level ---
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    // fixed, top-left full screen layer so the clone uses viewport coordinates
    el.style.position = "fixed";
    el.style.pointerEvents = "none";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.zIndex = "9999";
    document.body.appendChild(el);
    portalRef.current = el;
    return () => {
      document.body.removeChild(el);
      portalRef.current = null;
    };
  }, []);

  return (
    <div
      className="kanban-column"
      style={{
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 120px)", // room for header
        borderRadius: 12,
        padding: 12,
        // IMPORTANT: avoid transforms/filters on this container
        transform: "none",
        filter: "none",
        perspective: "none",
      }}
    >
      {/* Header (non-scrollable) */}
      <div
        className="kanban-column-header"
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
      >
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
      <Droppable
        droppableId={id}
        direction="vertical"
        ignoreContainerClipping={true}
        renderClone={(provided, snapshot, rubric) => {
          // Render the dragging clone into the portal so it's not affected by transformed ancestors.
          const task = tasks[rubric.source.index];
          const clone = (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              style={{
                ...provided.draggableProps.style,
                // basic visual to match a card while dragging
                width: 280,
                boxSizing: "border-box",
                borderRadius: 10,
                background: "#fff",
                boxShadow:
                  "0 8px 16px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)",
                padding: 12,
                border: "1px solid var(--border, #e5e7eb)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{task.title}</div>
              {task.description ? (
                <div style={{ fontSize: ".875rem", color: "var(--muted, #6b7280)" }}>
                  {task.description}
                </div>
              ) : null}
            </div>
          );

          return portalRef.current
            ? ReactDOM.createPortal(clone, portalRef.current)
            : clone;
        }}
      >
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
              // IMPORTANT: avoid transforms on the scroll container too
              transform: "none",
              filter: "none",
              perspective: "none",
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
