import { getTaskDefinition } from '../../services/mongoService';

export const getTaskDefinitionHandler = ({ msg }) => {
  const getDynamicValues = ({ source, command }) => {
    if (source === 'msgService') {
      return msg.do(command);
    }

    throw new Error(`Unknown source to resolve task arg values: ${source}`);
  };

  return [
    'getTaskDefinition',
    async (filters, comms) => {
      const rawTaskDefinition = await getTaskDefinition(filters);
      const taskDefinition = JSON.parse(JSON.stringify(rawTaskDefinition));

      const argKeys = Object.keys(rawTaskDefinition.argShape || {});
      for (const argKey of argKeys) {
        const rawArgDefinition = rawTaskDefinition.argShape[argKey];
        if (rawArgDefinition.dynamicValues)
          taskDefinition.argShape[argKey].values = await getDynamicValues(rawArgDefinition.dynamicValues);
      }

      comms.send(taskDefinition);
    },
  ];
};
