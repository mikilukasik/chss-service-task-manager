import { getAndAssignTask } from '../services/mongoService';
import { addTaskAwaiter, removeTaskAwaiter } from '../services/taskAwaiterService';
import { requeueTask, sendTask } from '../services/taskService';

export const getNextTaskHandler = () => [
  'task:getNext',
  async (data, comms) => {
    let onAbort = async () => {};
    const setAbortHandler = (handler) => (onAbort = handler);

    comms.onData(async (data) => {
      switch (data.command) {
        case 'abort':
          // console.log('abort received');

          removeTaskAwaiter(comms.connection.conversationId);
          comms.send('this should fail').catch(() => {});
          // console.log('awaiter removed');

          await onAbort();
          // console.log('task requeued');

          break;

        default:
          throw new Error(`Unknown command: ${data.command}`);
      }
    });

    const filters = Object.assign({ status: 'ready' }, data.filters || {});

    const foundTask = await getAndAssignTask(filters);
    if (foundTask) {
      setAbortHandler(() => requeueTask(foundTask));

      await sendTask({ task: foundTask, comms });
      return;
    }

    addTaskAwaiter({ filters, data, comms, id: comms.connection.conversationId, setAbortHandler });
  },
];
