import asyncClient from '../client';
import { AbstractDataView } from '../view';
import * as store from '../store';

const PERMS = ['perms'];

export const tasks = {
    /** perms/perms: fetches perms */
    perms: async () => {
        const client = await asyncClient;
        const res = await client.get('/perms');
        const perms = res.body;
        store.insert(PERMS, perms);
        return perms;
    },
};

// update every 3 minutes
const AUTO_UPDATE_INTERVAL = 180000;

let currentUpdater = null;
let updaterRefCount = 0;

export const views = {
    /** perms/perms: fetches and views perms */
    perms: class Perms extends AbstractDataView {
        constructor () {
            super();
            store.subscribe(PERMS, this.#onUpdate);
            if (store.get(PERMS)) this.#onUpdate();
            else tasks.perms().catch(err => this.emit('error', err));

            if (updaterRefCount++ === 0) {
                currentUpdater = setInterval(this.#requestUpdate, AUTO_UPDATE_INTERVAL);
            }
        }
        #requestUpdate = () => tasks.perms().catch(() => {});
        #onUpdate = () => this.emit('update', store.get(PERMS));
        drop () {
            if (--updaterRefCount === 0) {
                clearInterval(currentUpdater);
            }
            store.unsubscribe(PERMS, this.#onUpdate);
        }
    },
};
