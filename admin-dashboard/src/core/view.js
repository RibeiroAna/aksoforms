import EventEmitter from 'events';
import { transformError } from './list';
import * as store from './store';
import * as log from './log';

/** Abstract view container. */
export default class DataView {
    isDropped = false;

    constructor (self, id, view, options, debugName) {
        this.self = self;
        this.id = id;
        this.inner = view.then(View => new View(options));
        this.debugName = debugName;

        this.inner.then(inner => {
            log.debug(`data view ${id} loaded`);
            inner.on('update', this.#onUpdate);
            inner.on('error', this.#onError);
            for (const event of inner.unbindBuffered()) {
                const name = event.shift();
                if (name === 'update') this.#onUpdate(...event);
                else if (name === 'error') this.#onError(...event);
            }
        }).catch(err => {
            log.debug(`data view ${id} failed to load`, err);
            this.#onError(err);
        });
    }

    #onUpdate = (data, extra) => {
        if (this.isDropped) return;
        this.self.postMessage({
            type: 'data-view-update',
            id: this.id,
            data,
            extra,
        });
        log.debug('updating data view', this.id, this.debugName);
    };

    #onError = error => {
        if (this.isDropped) return;
        this.self.postMessage({
            type: 'data-view-error',
            id: this.id,
            error: transformError(error),
        });
    };

    drop () {
        this.isDropped = true;
        this.inner.then(inner => inner.drop());
    }
}

export class AbstractDataView extends EventEmitter {
    constructor () {
        super();

        this.on('update', this.#bufOnUpdate);
        this.on('error', this.#bufOnError);
    }

    #bufferedEvents = [];
    #bufOnUpdate = (...data) => this.#bufferedEvents.push(['update', ...data]);
    #bufOnError = (...data) => this.#bufferedEvents.push(['error', ...data]);

    unbindBuffered () {
        this.removeListener('update', this.#bufOnUpdate);
        this.removeListener('error', this.#bufOnError);
        return this.#bufferedEvents;
    }

    drop () {}
}

/** Creates a data view that just shows the given data store path verbatim. */
export const createStoreObserver = (path, map = (id => id)) => class StoreObserverDataView extends AbstractDataView {
    constructor (options) {
        super();
        this.path = typeof path === 'function' ? path(options) : path;
        store.subscribe(this.path, this.#onUpdate);
        setImmediate(() => this.emit('update', map(store.get(this.path))));
    }

    #onUpdate = () => {
        this.emit('update', map(store.get(this.path)));
    };

    drop () {
        store.unsubscribe(this.path, this.#onUpdate);
    }
};
