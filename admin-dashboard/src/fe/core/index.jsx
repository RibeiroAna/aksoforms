import { useContext, useEffect, useRef, useState } from 'preact/compat';
import { coreContext } from './connection';
import DataView from './view';
import Task from './task';
import Worker from './worker';
import { deepEq } from '../../util';

export { DataView, Task, Worker };

/**
 * React Hook for using data from a data view.
 *
 * - path: data view path
 * - options: data view options (will be deep-compared for changes) (if null, will not load)
 * - extra options:
 *   - onUpdate: update callback
 *
 * Returns [loading, error, data]
 */
export function useDataView (path, options, { onUpdate } = {}) {
    const core = useContext(coreContext);
    const prevOptions = useRef(null);
    const dataView = useRef(null);

    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const optionsChangeId = useRef(0);
    const optionsDidChange = options !== prevOptions.current
        && !deepEq(options, prevOptions.current);
    prevOptions.current = options;

    const dataOptionsChangeId = useRef(0);

    if (optionsDidChange) {
        optionsChangeId.current++;
    }

    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    useEffect(() => {
        if (!dataView.current || optionsDidChange) {
            if (dataView.current) dataView.current.drop();
            if (!options) return;
            const view = dataView.current = core.createDataView(path, options);
            setLoading(true);
            setError(null);
            setData(null);
            dataOptionsChangeId.current = optionsChangeId.current;

            view.on('update', data => {
                setLoading(false);
                setData(data);
                if (onUpdateRef.current) onUpdateRef.current(data);
            });
            view.on('error', err => {
                setLoading(false);
                setError(err);
            });
        }

        return () => {
            dataView.current?.drop();
            dataView.current = null;
        };
    }, [path, optionsChangeId.current]);

    return [loading, error, dataOptionsChangeId.current === optionsChangeId.current ? data : null];
}
