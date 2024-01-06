//! This refers to tasks in the AKSO API (not tasks in the core api).
import asyncClient from '../client';
import { AbstractDataView } from '../view';
import * as store from '../store';

export const TASKS = 'tasks';

export const tasks = {
    list: async () => {
        const client = await asyncClient;
        const res = await client.get('/tasks');
        store.insert([TASKS], res.body);
        return res.body;
    },
};

// update every minute
const AUTO_UPDATE_INTERVAL = 60000;

let currentUpdater = null;
let updaterRefCount = 0;

export const views = {
    tasks: class TasksView extends AbstractDataView {
        constructor () {
            super();
            store.subscribe([TASKS], this.#onUpdate);
            if (store.get([TASKS])) setImmediate(this.#onUpdate);

            if (updaterRefCount++ === 0) {
                currentUpdater = setInterval(this.#requestUpdate, AUTO_UPDATE_INTERVAL);
            }
            this.#requestUpdate();
        }
        #requestUpdate = () => {
            tasks.list().catch(err => this.emit('error', err));
        };
        #onUpdate = () => {
            this.emit('update', store.get([TASKS]));
        };
        drop () {
            if (--updaterRefCount === 0) {
                clearInterval(currentUpdater);
            }
            store.unsubscribe([TASKS], this.#onUpdate);
        }
    },
};
