import { h } from 'preact';
import { Checkbox, TextField } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import TextArea from '../../../components/controls/text-area';
import { roles as locale } from '../../../locale';

export const FIELDS = {
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <TextField
                    required
                    outline={slot === 'create'}
                    label={slot === 'create' ? locale.fields.name : null}
                    value={value}
                    onChange={onChange} />;
            }
            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
    },
    description: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <TextArea
                        onKeyDown={e => e.stopPropagation()}
                        value={value || ''}
                        onChange={value => onChange(value || null)} />
                );
            }
            return <div>{(value || '').split('\n').map((x, i) => <div key={i}>{x}</div>)}</div>;
        },
        weight: 2,
    },
    public: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            if (editing) return <Checkbox checked={value} onChange={onChange} />;
            if (value) return <CheckIcon />;
            return null;
        },
        weight: 0.5,
    },
};
