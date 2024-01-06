import { h } from 'preact';
import { TextField } from 'yamdl';
import TimeZoneEditor from '../../../../components/controls/time-zone';
import TextArea from '../../../../components/controls/text-area';
import { date } from '../../../../components/data';
import { congressInstances as locale } from '../../../../locale';

const string100Editor = (label, props = {}) => ({
    component ({ value, editing, onChange }) {
        if (editing) {
            return <TextField
                outline
                label={label}
                value={value}
                maxLength={100}
                onChange={v => onChange(v || null)}
                {...props} />;
        }
        return value;
    },
});

export const FIELDS = {
    humanId: {
        sortable: true,
        weight: 0.5,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <TextField
                    required
                    outline
                    label={locale.fields.humanId}
                    value={value}
                    maxLength={20}
                    onChange={onChange} />;
            }
            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
    },
    name: { ...string100Editor(locale.fields.name, { required: true }), sortable: true, weight: 2, slot: 'title' },
    dateFrom: {
        component ({ value, editing, onChange }) {
            if (editing) {
                return <date.editor
                    outline
                    label={locale.fields.dateFrom}
                    value={value}
                    onChange={onChange}
                    required={true} />;
            }
            return <date.renderer value={value} />;
        },
        sortable: true,
    },
    dateTo: {
        component ({ value, editing, onChange, item }) {
            if (editing) {
                return <date.editor
                    outline
                    label={locale.fields.dateTo}
                    value={value}
                    onChange={onChange}
                    onFocus={() => {
                        if (!value) {
                            // default to begin date
                            onChange(item.dateFrom);
                        }
                    }}
                    required={true} />;
            }
            return <date.renderer value={value} />;
        },
        sortable: true,
    },
    locationName: string100Editor(locale.fields.locationName),
    locationNameLocal: string100Editor(locale.fields.locationNameLocal),
    locationAddress: {
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <TextArea
                        value={value}
                        onChange={value => onChange(value || null)} />
                );
            }
            return <span>{(value || '').split('\n').map((x, i) => <span key={i}>{x}</span>)}</span>;
        },
    },
    tz: {
        component ({ value, editing, onChange }) {
            return <TimeZoneEditor value={value} onChange={onChange} editing={editing} />;
        },
    },
};
