import asyncClient from '../client';
import * as store from '../store';
import { AbstractDataView } from '../view';

export const tasks = {
    /** debug/request: performs an arbitrary http request */
    request: async ({ method, endpoint, options, body }) => {
        const res = await (await asyncClient)[method](endpoint, options, body);

        return {
            body: res.body,
            headers: Object.fromEntries(res.res.headers.entries()),
            resTime: res.resTime,
            ok: res.ok,
            bodyOk: res.bodyOk,
            status: res.res.status,
        };
    },
    error: async ({ code, message }) => {
        throw { code, message };
    },
};

export const views = {
    /** debug/store: displays an arbitrary data store path */
    store: class StoreView extends AbstractDataView {
        constructor ({ path }) {
            super();
            this.path = path;
            store.subscribe(path, this.#onUpdate);
            if (store.get(path)) this.#onUpdate();
        }
        #onUpdate = () => this.emit('update', store.get(this.path));
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },
};
