import { crudList, crudGet } from '../templates';
import { AbstractDataView } from '../view';
import * as store from '../store';

export const GEO_CITIES = 'geoCities';

const CITY_FIELDS = ['id', 'country', 'population', 'nativeLabel', 'eoLabel', 'll', 'subdivision_nativeLabel', 'subdivision_eoLabel', 'subdivision_iso'];

export const tasks = {
    listCities: crudList({
        apiPath: () => `/geodb/cities`,
        fields: CITY_FIELDS,
        storePath: (_, { id }) => [GEO_CITIES, id],
    }),
    getCity: crudGet({
        apiPath: ({ id }) => `/geodb/cities/${id}`,
        fields: CITY_FIELDS,
        storePath: ({ id }) => [GEO_CITIES, id],
    }),
};

const BATCH_TIME = 50; // ms
const batchIds = new Set();
const batchCallbacks = new Set();
let flushTimeout;

function flush () {
    flushTimeout = null;
    const ids = [...batchIds];
    const callbacks = [...batchCallbacks];
    batchIds.clear();
    batchCallbacks.clear();

    if (!ids.length) return;

    tasks.listCities({}, {
        jsonFilter: {
            filter: {
                id: {
                    // ids must be integers without the Q prefix
                    $in: ids.map(id => +id.substr(1)),
                },
            },
        },
        offset: 0,
        limit: ids.length,
    }).then(res => {
        for (const callback of callbacks) callback(true, res.items);
    }).catch(err => {
        for (const callback of callbacks) callback(false, err);
    });
}

function fetchBatched (id) {
    if (batchIds.size >= 100) {
        // we can only request 100 at once; flush now
        flush();
    }
    batchIds.add(id);
    if (!flushTimeout) {
        flushTimeout = setTimeout(flush, BATCH_TIME);
    }
    return new Promise((resolve, reject) => {
        batchCallbacks.add((loaded, arg) => {
            if (loaded) {
                const items = arg;
                if (!items.includes(+id)) {
                    const err = new Error(`city ${id} not found`);
                    err.statusCode = 404;
                    reject(err);
                }
                resolve();
            } else {
                const error = arg;
                reject(error);
            }
        });
    });
}

export const views = {
    city: class CityView extends AbstractDataView {
        constructor ({ id }) {
            super();
            this.path = [GEO_CITIES, id];

            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);

            if (!current) {
                fetchBatched(id).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get(this.path), 'delete');
            } else {
                this.emit('update', store.get(this.path));
            }
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },
};
