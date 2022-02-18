import { getTaskDefinition, saveTaskDefinition } from '../services/mongoService';

export const defineTaskHandler = [
  'task:define',
  async (data, comms) => {
    const { command } = data;
    const { from: owner } = comms;

    const existingTaskDefinition = await getTaskDefinition({ command });
    if (existingTaskDefinition && existingTaskDefinition.owner !== owner) {
      throw new Error(
        `Task ${command} is owned by ${existingTaskDefinition.owner}. It cannot be redefined by ${owner}`,
      );
    }

    await saveTaskDefinition(Object.assign({}, data, { owner }));
    comms.send('OK');
  },
];
