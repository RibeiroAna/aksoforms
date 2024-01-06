import { h } from 'preact';
import { useDataView } from '../../../../core';
import TinyProgress from '../../../../components/controls/tiny-progress';
import DisplayError from '../../../../components/utils/error';
import '../instances/participants/fields.less';

export const FIELDS = {
    congressId: {
        sortable: true,
        component ({ value }) {
            return <CongressName id={value} />;
        },
    },
    congressInstanceHumanId: {
        component ({ item }) {
            return <CongressInstanceField field="humanId" id={item.congressInstanceId} congress={item.congressId} />;
        },
    },
    congressInstanceLocation: {
        component ({ item }) {
            return <CongressInstanceField field="locationName" id={item.congressInstanceId} congress={item.congressId} />;
        },
    },
    congressInstanceId: {
        weight: 2,
        sortable: true,
        component ({ value, item }) {
            return <CongressInstanceField field="name" id={value} congress={item.congressId} />;
        },
    },
    dataId: {
        sortable: true,
        component ({ value }) {
            return (
                <span class="congress-participant-data-id">
                    <span class="inner-data-id">{value}</span>
                </span>
            );
        },
    },
};

function CongressName ({ id }) {
    const [loading, error, data] = useDataView('congresses/congress', { id });

    if (loading) return <TinyProgress />;
    if (error) return <DisplayError error={error} />;
    if (!data) return null;

    return <span>{data.name}</span>;
}

function CongressInstanceField ({ congress, id, field }) {
    const [loading, error, data] = useDataView('congresses/instance', { congress, id });

    if (loading) return <TinyProgress />;
    if (error) return <DisplayError error={error} />;
    if (!data) return null;

    return <span>{data[field]}</span>;
}