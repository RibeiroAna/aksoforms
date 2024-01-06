import { remove, TASKS } from './store';
import { transformError } from './list';
import * as log from './log';

/** Abstract task container. */
export default class Task {
    running = false;
    error = null;
    isDropped = false;

    constructor (self, id, path, options, parameters) {
        this.self = self;
        this.id = id;
        this.path = path;
        this.options = options;
        this.parameters = parameters;
    }

    /** Yells at the user if this task has been dropped but they’re trying to perform an action. */
    dropCheck (action) {
        if (this.isDropped) {
            this.self.postMessage({
                type: 'task-error',
                id: this.id,
                error: {
                    code: 'drop-check',
                    message: `resurrection is not allowed (attempt to ${action})`,
                },
            });
            return true;
        }
    }

    /** Updates task parameters. */
    update (parameters) {
        if (this.dropCheck('update')) return;
        this.parameters = parameters;
    }

    /** Run implementation. */
    async run () {}

    /** Run wrapper that handles IPC and stuff. */
    async $run () {
        if (this.dropCheck('run')) return;
        if (this.running) return;
        this.running = true;

        let result, error;
        try {
            result = await this.run(this.options, this.parameters);
        } catch (err) {
            error = err;
        }
        this.running = false;
        if (this.isDropped) return;

        if (error) {
            log.debug(`task ${this.id} failed with error`, error.code, error.message, error.stack);
            this.self.postMessage({
                type: 'task-error',
                id: this.id,
                error: transformError(error),
            });
        } else {
            log.debug(`task ${this.id} succeeded, dropping`);
            this.self.postMessage({ type: 'task-success', id: this.id, result });
            this.drop();
        }
    }

    /** Drops the task. */
    drop () {
        if (this.dropCheck('drop (don’t drop twice)')) return;
        this.isDropped = true;
        remove([TASKS, this.id]);
    }
}
