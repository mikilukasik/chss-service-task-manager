import { MongoClient } from 'mongodb';

const client = new MongoClient('mongodb://0.0.0.0:27017');
let db;

const collections = {};

export const connect = async () => {
  await client.connect();
  db = client.db('chss');
};

export const getCollection = async (collecitonName) => {
  if (collections[collecitonName]) return collections[collecitonName];
  if (!db) await connect();
  collections[collecitonName] = db.collection(collecitonName);
  return collections[collecitonName];
};

export const saveTaskDefinition = async (taskDefinition) => {
  const taskDefinitionsCollection = await getCollection('taskDefinitions');

  const response = await taskDefinitionsCollection.findOneAndUpdate(
    { command: taskDefinition.command },
    { $set: taskDefinition },
    { upsert: true },
  );

  return response.value;
};

export const getTaskDefinition = async (filters) => {
  const taskDefinitionsCollection = await getCollection('taskDefinitions');
  const response = await taskDefinitionsCollection.findOne(filters);
  return response;
};

export const getTaskDefinitions = async (filters = {}, projection = {}) => {
  const taskDefinitionsCollection = await getCollection('taskDefinitions');
  const response = await taskDefinitionsCollection.find(filters).project(projection).toArray();
  return response;
};

export const insertTask = async (task) => {
  const tasksCollection = await getCollection('tasks');
  const { insertedId } = await tasksCollection.insertOne(task);
  return Object.assign({}, task, { _id: insertedId });
};

export const updateTask = async ({ _id }, update) => {
  const tasksCollection = await getCollection('tasks');
  return tasksCollection.findOneAndUpdate({ _id, status: { $ne: 'cancelled' } }, update, {
    upsert: false,
    returnDocument: 'after',
  });
};

export const findAndUpdateTask = async (filters, update) => {
  const tasksCollection = await getCollection('tasks');
  return tasksCollection.findOneAndUpdate({ $and: [filters, { status: { $ne: 'cancelled' } }] }, update, {
    upsert: false,
    returnDocument: 'after',
  });
};

export const saveTasks = async (tasks) => {
  const tasksCollection = await getCollection('tasks');
  return tasksCollection.insertMany(tasks);
};

export const bulkUpdateTasks = async (bulkUpdates) => {
  const tasksCollection = await getCollection('tasks');
  return tasksCollection.bulkWrite(bulkUpdates);
};

export const getAggregationCursor = async (pipeline) => {
  const tasksCollection = await getCollection('tasks');
  return tasksCollection.aggregate(pipeline);
};

export const getTasks = async (filters = {}, projection = {}) => {
  const tasksCollection = await getCollection('tasks');
  const response = await tasksCollection.find(filters).project(projection).toArray();
  return response;
};

export const getTask = async (filters = {}, projection = {}) => {
  const tasksCollection = await getCollection('tasks');
  const response = await tasksCollection.findOne(filters, projection);
  return response;
};

export const getAndAssignTask = async (filters = {}, projection = {}) => {
  const tasksCollection = await getCollection('tasks');

  const response = await tasksCollection.findOneAndUpdate(
    { $and: [filters, { status: 'ready' }] },
    { $set: { status: 'assigned' } },
    { projection, returnNewDocument: true },
  );

  return response.value;
};

(async () => {
  const tasksCollection = await getCollection('tasks');
  tasksCollection.createIndex({ command: 1 }, { unique: false });
  tasksCollection.createIndex({ status: 1 }, { unique: false });
  tasksCollection.createIndex({ _id: 1 });
  tasksCollection.createIndex({ parentId: 1 }, { unique: false });

  const taskDefinitionsCollection = await getCollection('taskDefinitions');
  taskDefinitionsCollection.createIndex({ command: 1 }, { unique: true });
})();
