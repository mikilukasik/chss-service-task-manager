import JSONStream from 'JSONStream';
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
import { getAggregationCursor } from '../services/mongoService';

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

  // TODO: this shouldn't live here in task-manager
  msg.on.get('/lessons/byparentid/:parentId', async (req, res) => {
    res.set('Content-Type', 'application/json');

    const cursor = await getAggregationCursor([
      {
        $match: { parentId: req.params.parentId },
      },
      {
        $project: { 'result.lessons': 1, _id: 0 },
      },
      {
        $unwind: '$result.lessons',
      },
      {
        $project: { lessons: '$result.lessons' },
      },
    ]);

    cursor
      .stream({
        transform: ({ lessons }) => lessons,
      })
      .pipe(JSONStream.stringify())
      .pipe(res);
  });
};
