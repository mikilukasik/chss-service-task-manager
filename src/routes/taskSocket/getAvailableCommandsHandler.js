import { getTaskDefinitions } from '../../services/mongoService';

export const getAvailableCommandsHandler = [
  'getAvailableCommands',
  async (data, comms) => {
    const defs = await getTaskDefinitions({}, { command: 1 });
    const commands = defs.map(({ command }) => command);
    comms.send(commands);
  },
];
