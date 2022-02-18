import { findAndUpdateTask } from '../services/mongoService';

export const setInProgressHandler = ({ taskSocket }) => [
  'task:setInProgress',
  async (data, comms) => {
    const { _id } = data;

    const { value: updatedTask } = await findAndUpdateTask(
      { _id, status: 'assigned' },
      { $set: { status: 'in progress' } },
    );

    comms.send(updatedTask);

    if (updatedTask) taskSocket.emit('taskChanged', updatedTask);
  },
];
