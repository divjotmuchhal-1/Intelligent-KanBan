import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import "./App.css";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "inprogress" | "done";
}

const initialTasks: Task[] = [
  {
    _id: "1",
    title: "Create Kanban UI",
    description: "Set up columns and drag-and-drop",
    status: "todo",
  },
  {
    _id: "2",
    title: "Style Board",
    description: "Add CSS styling",
    status: "inprogress",
  },
  {
    _id: "3",
    title: "Integrate Backend",
    description: "Connect to API",
    status: "done",
  },
];

const columns = ["todo", "inprogress", "done"] as const;

const columnNames: Record<(typeof columns)[number], string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogColumn, setDialogColumn] = useState<Task["status"]>("todo");
  const [taskForm, setTaskForm] = useState({ title: "", description: "" });

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;

    const updatedTasks = tasks.map((task) =>
      task._id === draggableId
        ? { ...task, status: destination.droppableId as Task["status"] }
        : task
    );

    setTasks(updatedTasks);
  };

  const handleAddTask = () => {
    if (!taskForm.title.trim()) return;

    const task: Task = {
      _id: Date.now().toString(),
      title: taskForm.title,
      description: taskForm.description,
      status: dialogColumn,
    };
    setTasks([...tasks, task]);
    setTaskForm({ title: "", description: "" });
    setShowDialog(false);
  };

  return (
    <div className="kanban-container">
      <h1 className="kanban-title">Kanban Board</h1>
      <div className="kanban-board">
        <DragDropContext onDragEnd={onDragEnd}>
          {columns.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="kanban-column"
                >
                  <h2 className="kanban-column-title">{columnNames[col]}</h2>

                  <button onClick={() => { setDialogColumn(col); setShowDialog(true); }}>
                    + Add Task
                  </button>

                  {tasks
                    .filter((task) => task.status === col)
                    .map((task, index) => (
                      <Draggable
                        draggableId={task._id}
                        index={index}
                        key={task._id}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="kanban-task"
                          >
                            <h3>{task.title}</h3>
                            <p>{task.description}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
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
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
            />
            <div className="modal-actions">
              <button onClick={() => setShowDialog(false)}>Cancel</button>
              <button onClick={handleAddTask}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}