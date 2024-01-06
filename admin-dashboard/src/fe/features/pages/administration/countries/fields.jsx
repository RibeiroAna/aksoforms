import { h } from 'preact';
import CheckIcon from '@material-ui/icons/Check';
import { Checkbox, TextField } from 'yamdl';
import { countries as locale } from '../../../../locale';

const nameField = {
    slot: 'title',
    component ({ value, onChange, editing }) {
        if (editing) {
            return (
                <TextField
                    class="country-name-editor"
                    value={value}
                    onChange={onChange} />
            );
        }
        return <span class="country-name">{value}</span>;
    },
    stringify: v => v,
};

export const FIELDS = {
    code: {
        sortable: true,
        slot: 'title',
        weight: 0.5,
        component ({ value }) {
            return <span class="country-code">{value}</span>;
        },
        stringify: v => v,
    },
    enabled: {
        sortable: true,
        slot: 'titleAlt',
        weight: 0.5,
        component ({ value, onChange, editing }) {
            if (editing) {
                return (
                    <Checkbox
                        checked={value}
                        onChange={onChange} />
                );
            }
            return value ? <CheckIcon /> : null;
        },
        stringify: v => locale.enabled[v.toString()],
    },
    name_eo: { ...nameField, sortable: true },
    name_en: nameField,
    name_fr: nameField,
    name_es: nameField,
    name_nl: nameField,
    name_pt: nameField,
    name_sk: nameField,
    name_zh: nameField,
    name_de: nameField,
};
