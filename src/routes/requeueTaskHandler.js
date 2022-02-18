import { requeueTask } from '../services/taskService';

export const requeueTaskHandler = () => [
  'task:requeue',
  async (filters, comms) => {
    const newTask = await requeueTask(filters);
    comms.send(newTask);
  },
];
