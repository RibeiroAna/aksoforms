import { h } from 'preact';
import { TextField } from 'yamdl';
import { org } from '../../../components/data';

export const FIELDS = {
    org: {
        slot: 'titleAlt',
        weight: 0.25,
        sortable: true,
        component ({ value }) {
            return <org.renderer value={value} />;
        },
    },
    abbrev: {
        slot: 'title',
        weight: 0.25,
        sortable: true,
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextField
                    value={value}
                    onChange={onChange} />;
            }
            return  value;
        },
    },
    name: {
        slot: 'title',
        sortable: true,
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextField
                    value={value}
                    onChange={onChange} />;
            }
            return value;
        },
    },
};
