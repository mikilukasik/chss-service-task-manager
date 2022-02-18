import { getTasks } from '../../services/mongoService';

export const getTaskListHandler = [
  'getTaskList',
  async (data, comms) => {
    const tasks = await getTasks();
    comms.send(tasks);
  },
];
