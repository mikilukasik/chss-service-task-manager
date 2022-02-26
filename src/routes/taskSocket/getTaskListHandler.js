import { getTasks } from '../../services/mongoService';

export const getTaskListHandler = [
  'getTaskList',
  async ({ filters } = {}, comms) => {
    const tasks = await getTasks(filters || { parentId: { $exists: false } });
    comms.send(tasks);
  },
];
