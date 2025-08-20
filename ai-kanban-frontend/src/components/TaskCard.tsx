// src/components/TaskCard.tsx
import { Draggable } from "@hello-pangea/dnd";
import type { Task } from "../types/task";

function colorFor(tag: string) {
  // Deterministic pastel based on tag text
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % 360;
  const bg = `hsl(${h} 70% 92%)`;
  const fg = `hsl(${h} 60% 25%)`;
  const br = `hsl(${h} 60% 80%)`;
  return { backgroundColor: bg, color: fg, borderColor: br };
}

export default function TaskCard({
  task,
  index,
  onEdit,
  onDelete,
}: {
  task: Task;
  index: number;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const tags = task.tags ?? [];
  const visible = tags.slice(0, 5);
  const overflow = tags.length - visible.length;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snap) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-task ${snap.isDragging ? "is-dragging" : ""}`}
        >
          <div className="task-title">{task.title}</div>
          {task.description && <div className="task-desc">{task.description}</div>}

          {/* Tags row */}
          {tags.length > 0 && (
            <div className="task-tags" style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
              {visible.map((t) => (
                <span
                  key={t}
                  className="tag-chip"
                  style={{
                    ...colorFor(t),
                    borderWidth: 1,
                    borderStyle: "solid",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: "18px",
                    fontWeight: 600,
                  }}
                  title={t}
                >
                  {t}
                </span>
              ))}
              {overflow > 0 && (
                <span
                  className="tag-chip more"
                  style={{
                    background: "var(--chip-more-bg, #f2f2f2)",
                    color: "var(--chip-more-fg, #555)",
                    border: "1px solid var(--chip-more-br, #e1e1e1)",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: "18px",
                    fontWeight: 600,
                  }}
                  title={tags.slice(5).join(", ")}
                >
                  +{overflow}
                </span>
              )}
            </div>
          )}

          <div className="task-meta" style={{ marginTop: tags.length ? 8 : 0 }}>
            {task.priority && <span className={`badge ${task.priority}`}>{task.priority}</span>}
            {task.story_points ? <span className="badge">pts {task.story_points}</span> : null}
          </div>

          <div className="task-actions">
            <button className="link" onClick={() => onEdit(task)}>Edit</button>
            <button className="link danger" onClick={() => onDelete(task.id)}>Delete</button>
          </div>
        </div>
      )}
    </Draggable>
  );
}
