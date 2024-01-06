import { h } from 'preact';
import { TextField } from 'yamdl';

export const FIELDS = {
    code: {
        sortable: true,
        slot: 'title',
        weight: 0.5,
        component ({ value }) {
            return <span class="country-group-code">{value}</span>;
        },
        stringify: v => v,
    },
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, onChange, editing }) {
            if (editing) {
                return (
                    <TextField
                        value={value}
                        onChange={onChange} />
                );
            }
            return <span class="country-group-name">{value}</span>;
        },
        stringify: v => v,
    },
};
