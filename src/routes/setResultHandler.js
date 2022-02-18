import { findAndUpdateTask, getTask, updateTask } from '../services/mongoService';

export const setResultHandler = ({ taskSocket, msg }) => [
  'task:setResult',
  async (data, comms) => {
    const { _id, result } = data;

    const taskToUpdate = await getTask({ _id });
    if (!taskToUpdate) {
      comms.send(null);
      return;
    }

    const proposedChildTask = Object.assign({}, taskToUpdate, { result, status: 'solved' });
    delete proposedChildTask.context;
    delete proposedChildTask.childTaskResultAggregator;
    delete proposedChildTask.onChildTasksComplete;
    delete proposedChildTask.unsolvedChildren;

    if (taskToUpdate.parentId) {
      const parentTask = await getTask({ _id: taskToUpdate.parentId });

      if (parentTask.childTaskResultAggregator) {
        const parentTaskUpdate = await msg.do(parentTask.childTaskResultAggregator.command, {
          parentTask,
          childTask: proposedChildTask,
        });

        const { value: solvedChildTask } = await findAndUpdateTask(
          { _id, status: { $ne: 'cancelled' } },
          {
            $set: { result, status: 'solved' },
            $unset: { context: '', childTaskResultAggregator: '', onChildTasksComplete: '', unsolvedChildren: '' },
          },
        );

        if (!solvedChildTask) {
          comms.send(null);
          return;
        }

        await findAndUpdateTask({ _id: parentTask._id, status: { $ne: 'cancelled' } }, parentTaskUpdate);
      } else {
        const { value: solvedChildTask } = await findAndUpdateTask(
          { _id, status: { $ne: 'cancelled' } },
          {
            $set: { result, status: 'solved' },
            $unset: { context: '', childTaskResultAggregator: '', onChildTasksComplete: '', unsolvedChildren: '' },
          },
        );

        if (!solvedChildTask) {
          comms.send(null);
          return;
        }

        await findAndUpdateTask(
          { _id: parentTask._id, status: { $ne: 'cancelled' } },
          { $set: { [`childResults.${_id}`]: result } },
        );
      }

      const { value: parentTaskWithUpdatedUsolvedCount } = await updateTask(
        { _id: parentTask._id },
        { $inc: { unsolvedChildren: -1 } },
      );

      if (parentTaskWithUpdatedUsolvedCount) taskSocket.emit('taskChanged', parentTaskWithUpdatedUsolvedCount);

      if (parentTaskWithUpdatedUsolvedCount.unsolvedChildren === 0 && parentTask.onChildTasksComplete) {
        await msg.do(parentTask.onChildTasksComplete.command, parentTaskWithUpdatedUsolvedCount);
      }
    } else {
      await updateTask(
        { _id },
        {
          $set: { result, status: 'solved' },
          $unset: { context: '', childTaskResultAggregator: '', onChildTasksComplete: '', unsolvedChildren: '' },
        },
      );
    }

    const updatedTask = await getTask({ _id });
    comms.send(updatedTask);
    if (updatedTask) taskSocket.emit('taskChanged', updatedTask);
  },
];
