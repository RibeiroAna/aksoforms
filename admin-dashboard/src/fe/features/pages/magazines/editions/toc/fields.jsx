import { h } from 'preact';
import { Checkbox } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import LimitedTextField from '../../../../../components/controls/limited-text-field';
import MdField from '../../../../../components/controls/md-field';
import { magazineToc as locale, data as dataLocale } from '../../../../../locale';
import './fields.less';
import NumberField from '../../../../../components/controls/number-field';

export const FIELDS = {
    page: {
        sortable: true,
        weight: 0.25,
        slot: 'titleAlt',
        component ({ value, editing, onChange, slot }) {
            if (editing && slot === 'create') {
                return (
                    <NumberField
                        outline
                        required
                        type="number"
                        label={locale.fields.page}
                        value={value}
                        onChange={onChange} />
                );
            }
            return '' + value;
        },
    },
    title: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (slot === 'title') return <b>{value}</b>;
            return <MdField
                ignoreLiveUpdates
                placeholder={slot === 'create' ? locale.fields.title : null}
                class={'magazine-toc-entry-title' + (!editing ? ' is-preview' : '')}
                inline={slot !== 'detail'}
                singleLine
                editing={editing}
                rules={['emphasis', 'strikethrough']}
                value={value || ''}
                maxLength={500}
                onChange={value => onChange(value || null)} />;
        },
        validate: ({ value }) => {
            if (!value) return dataLocale.requiredField;
        },
    },
    author: {
        sortable: true,
        slot: 'body',
        component ({ value, editing, onChange }) {
            if (editing) {
                return <LimitedTextField
                    outline
                    value={value}
                    maxLength={200}
                    onChange={v => onChange(v || null)} />;
            }
            return value;
        },
    },
    recitationAuthor: {
        sortable: true,
        slot: 'body',
        component ({ value, editing, onChange }) {
            if (editing) {
                return <LimitedTextField
                    outline
                    value={value}
                    maxLength={100}
                    onChange={v => onChange(v || null)} />;
            }
            return value;
        },
    },
    highlighted: {
        sortable: true,
        component ({ value, editing, onChange }) {
            if (editing) return <Checkbox checked={value} onChange={onChange} />;
            return value ? <CheckIcon style={{ verticalAlign: 'middle' }} /> : null;
        },
    },
    text: {
        weight: 2,
        component ({ value, editing, onChange, slot }) {
            return <MdField
                class={'magazine-toc-entry-text' + (!editing ? ' is-preview' : '')}
                inline={slot !== 'detail'}
                editing={editing}
                rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                value={value || ''}
                maxLength={100000}
                onChange={value => onChange(value || null)} />;
        },
    },
};
