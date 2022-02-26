import { saveTasks, updateTask } from '../services/mongoService';
import uuid from 'uuid-random';
import { tasksAdded } from '../services/taskAwaiterService';

export const createChildTasksHandler = ({ taskSocket }) => [
  'task:createChildTasks',
  async (data, comms) => {
    const { parentId, childTasks: rawChildTasks, onChildTasksComplete, childTaskResultAggregator, parentUpdate } = data;
    const childTasks = rawChildTasks.map((params) => ({
      parentId,
      _id: uuid(),
      status: 'ready',
      command: params.command,
      params,
    }));

    const { insertedIds } = await saveTasks(childTasks);
    const childTaskIds = Object.values(insertedIds);

    if (parentUpdate) await updateTask({ _id: parentId }, parentUpdate);

    let { value: updatedParentTask } = await updateTask(
      { _id: parentId },
      {
        $set: { onChildTasksComplete, childTaskResultAggregator },
        $inc: { unsolvedChildren: childTaskIds.length, totalChildren: childTaskIds.length },
      },
    );

    if (updatedParentTask) taskSocket.emit('taskChanged', updatedParentTask);

    taskSocket.emit(`childTaskListChangedFor${parentId}`);
    comms.send(childTaskIds);

    tasksAdded(childTasks);
  },
];
