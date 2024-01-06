import { useDataView } from '../../../core';
import { useEffect } from 'preact/compat';

export function GetMagazineData ({ id, onData }) {
    const [,, magazine] = useDataView('magazines/magazine', { id });
    useEffect(() => {
        if (magazine) onData(magazine.org);
    }, [magazine]);
    return null;
}
