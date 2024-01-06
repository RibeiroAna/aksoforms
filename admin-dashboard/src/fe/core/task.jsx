import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';

export const TaskState = {
    IDLE: 'idle',
    RUNNING: 'running',
    ENDED: 'ended',
};

/**
 * Represents a failable task, such as logging in or uploading a file.
 *
 * Tasks are initialized with a set of immutable options. They also contain a set of mutable
 * parameters for the user to modify, and can then be run (or canceled). When a task is run, it may
 * either succeed or fail. If it fails, it goes back to being idle.
 *
 * This object **must be dropped manually** because it subscribes to an object in another thread.
 *
 * # Events
 * - `success`: emitted on success with the result
 * - `failure`: emitted on failure with the error
 * - `result`: emitted when there is a result with the type ('success'/'failure') and the
 *   result/error
 */
export default class Task extends EventEmitter {
    constructor (worker, type, options, parameters = {}) {
        super();
        this.id = uuidv4();
        this.type = type;
        this.worker = worker;
        this.options = options;
        this.parameters = {};

        this.state = TaskState.IDLE;
        this.dropped = false;

        this.worker.registerTask(this);
        this.update(parameters);
    }

    update (parameters) {
        Object.assign(this.parameters, parameters);
        this.worker.updateTask(this, this.parameters);
    }

    get running () {
        return this.state === TaskState.RUNNING;
    }

    run () {
        if (this.state !== TaskState.IDLE) throw new Error('task is already running or has ended');
        this.state = TaskState.RUNNING;
        this.worker.runTask(this);

        return this;
    }

    /** Returns a promise with the result after running this task once. */
    runOnce () {
        return new Promise((resolve, reject) => {
            this.once('result', (type, res) => {
                if (type === 'failure') reject(res);
                else resolve(res);
            });
            this.run();
        });
    }

    runOnceAndDrop () {
        this.once('result', () => !this.isDropped && this.drop());
        return this.runOnce();
    }

    onError ({ code, message, extra }) {
        this.state = TaskState.IDLE;
        const error = { code, message, ...extra, valueOf: () => `Error (${code}): ${message}` };
        this.emit('failure', error);
        this.emit('result', 'failure', error);

        this.worker.emit('task-error', code);
    }

    onSuccess (result) {
        this.state = TaskState.ENDED;
        this.emit('success', result);
        this.emit('result', 'success', result);
        this.emit('drop');
        this.dropped = true;
    }

    drop () {
        this.emit('drop');
        this.worker.deregisterTask(this);
        this.dropped = true;
    }
}
