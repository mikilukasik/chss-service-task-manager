import { createChildTasksHandler } from './createChildTasksHandler';
import { defineTaskHandler } from './defineTaskHandler';
import { getNextTaskHandler } from './getNextTaskHandler';
import { createTaskHandler } from './createTaskHandler';
import { getAvailableCommandsHandler } from './taskSocket/getAvailableCommandsHandler';
import { getTaskDefinitionHandler } from './taskSocket/getTaskDefinitionHandler';
import { getTaskListHandler } from './taskSocket/getTaskListHandler';
import { setInProgressHandler } from './setInProgressHandler';
import { setResultHandler } from './setResultHandler';
import { requeueTaskHandler } from './requeueTaskHandler';

let taskSocket;
const taskSocketAwaiters = [];

export const getTaskSocket = () =>
  new Promise((resolve) => {
    if (taskSocket) return resolve(taskSocket);
    taskSocketAwaiters.push(resolve);
  });

export const initRoutes = ({ msg }) => {
  taskSocket = msg.ws('/taskSocket');

  taskSocket.on(...createTaskHandler({ taskSocket }));
  taskSocket.on(...getAvailableCommandsHandler);
  taskSocket.on(...getTaskListHandler);
  taskSocket.on(...getTaskDefinitionHandler({ msg }));

  while (taskSocketAwaiters.length) {
    taskSocketAwaiters.pop()(taskSocket);
  }

  msg.on(...defineTaskHandler);
  msg.on(...createChildTasksHandler({ taskSocket }));
  msg.on(...getNextTaskHandler({ taskSocket }));
  msg.on(...setInProgressHandler({ taskSocket }));
  msg.on(...setResultHandler({ taskSocket, msg }));
  msg.on(...requeueTaskHandler({ taskSocket, msg }));
};
