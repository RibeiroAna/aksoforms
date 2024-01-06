import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * A data view provides asynchronous access to API objects.
 * It is initialized with a set of immutable options and will receive updates and errors
 * as the data loads.
 *
 * This object **must be dropped manually** because it subscribes to an object in another thread.
 */
export default class DataView extends EventEmitter {
    data = null;

    constructor (worker, type, options) {
        super();
        this.id = uuidv4();
        this.type = type;
        this.worker = worker;
        this.options = options;

        this.worker.registerDataView(this);
    }

    onUpdate (data, extra) {
        this.data = data;
        this.emit('update', data, extra);
    }

    onError ({ code, message, extra }) {
        this.emit('error', { code, message, ...extra, valueOf: () => `Error (${code}): ${message}` });
    }

    drop () {
        this.emit('drop');
        this.worker.deregisterDataView(this);
    }
}
