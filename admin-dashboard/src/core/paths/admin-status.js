import asyncClient from '../client';
import * as store from '../store';
import { simpleDataView } from '../templates';

const STATUS = 'status';
const WORKER_QUEUES = 'workerQueues';

export const tasks = {
    getWorkerQueues: async () => {
        const client = await asyncClient;
        const res = await client.get(`/status/worker_queues`, {});
        store.insert([STATUS, WORKER_QUEUES], res.body);
        return res.body;
    },
};

export const views = {
    workerQueues: simpleDataView({
        storePath: () => [STATUS, WORKER_QUEUES],
        get: tasks.getWorkerQueues,
    }),
};