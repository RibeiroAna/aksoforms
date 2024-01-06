import { h } from 'preact';
import MdField from '../../../../../components/controls/md-field';
import { TextField } from 'yamdl';

export const FIELDS = {
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <TextField
                    required
                    value={value}
                    onChange={onChange} />;
            }
            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
    },
    description: {
        skipLabel: true,
        component ({ value, editing, onChange, slot }) {
            return <MdField
                value={value || ''}
                rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                editing={editing}
                onChange={value => onChange(value || null)}
                inline={slot !== 'detail'} />;
        },
        weight: 2,
    },
};
