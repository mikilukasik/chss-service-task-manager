import { createTask } from '../services/taskService';

export const createTaskHandler = () => [
  'createTask',
  async (params, comms) => {
    const newTask = await createTask(params);
    comms.send(newTask);
  },
];
