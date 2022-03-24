import { getTaskSocket } from '../routes/routes';
import { findAndUpdateTask, getTaskDefinition, insertTask, updateTask } from './mongoService';
import uuid from 'uuid-random';
import { taskAdded } from './taskAwaiterService';

export const sendTask = async ({ task, comms }) => {
  try {
    await comms.send(task);
  } catch (error) {
    task = await updateTask(task, { $set: { status: 'ready' } });
    return { error };
  }

  if (task) {
    const taskSocket = await getTaskSocket();
    taskSocket.emit('taskChanged', task);
  }

  return {};
};

export const createTask = async (params, rootParams) => {
  const { infinite } = await getTaskDefinition({ command: params.command });

  const task = Object.assign(
    { _id: uuid(), command: params.command, params, status: 'ready' },
    rootParams,
    infinite ? { infinite } : {},
  );
  const createdTask = await insertTask(task);

  const taskSocket = await getTaskSocket();
  taskSocket.emit(task.parentId ? `childTaskListChangedFor${task.parentId}` : 'taskListChanged');

  taskAdded(createdTask);
  return createdTask;
};

export const requeueTask = async (task) => {
  const { value: stoppedTask } = await findAndUpdateTask(
    Object.assign(task, { status: { $in: ['in progress', 'assigned'] } }),
    {
      $set: { status: 'cancelled', cancelReason: 'requeue' },
    },
  );

  if (!stoppedTask) {
    return;
  }

  const newTask = await createTask(stoppedTask.params, stoppedTask.parentId ? { parentId: stoppedTask.parentId } : {});

  return newTask;
};
