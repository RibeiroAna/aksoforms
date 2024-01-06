import { useDataView } from '../../../core';
import { useEffect } from 'preact/compat';

export function GetCongressOrgField ({ id, onOrg }) {
    const [,, congress] = useDataView('congresses/congress', { id });
    useEffect(() => {
        if (congress) onOrg(congress.org);
    }, [congress]);
    return null;
}
