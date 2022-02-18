import { getAndAssignTask } from './mongoService';
import { requeueTask, sendTask } from './taskService';

export const taskAwaiters = [];

export const addTaskAwaiter = (taskAwaiter) => taskAwaiters.push(taskAwaiter);
export const removeTaskAwaiter = (id) => {
  const indexToRemove = taskAwaiters.findIndex(({ id: _id }) => id === _id);
  if (indexToRemove >= 0) taskAwaiters.splice(indexToRemove, 1);
};

export const taskAdded = async (task) => {
  if (!task) return;
  const taskAwaiterIndex = taskAwaiters.findIndex(
    ({ filters }) => Object.keys(filters).filter((key) => task[key] !== filters[key]).length === 0,
  );

  if (taskAwaiterIndex < 0) return;
  const awaiter = taskAwaiters.splice(taskAwaiterIndex, 1)[0];
  const { filters, comms, setAbortHandler } = awaiter;

  const taskToSend = await getAndAssignTask(filters);
  if (!taskToSend) {
    addTaskAwaiter(awaiter);
    return;
  }
  setAbortHandler(() => requeueTask(taskToSend));

  const { error } = await sendTask({ task: taskToSend, comms });
  if (error) {
    return taskAdded(task);
  }
};

export const tasksAdded = async (tasks) => {
  for (const task of tasks) {
    await taskAdded(task);
  }
};
