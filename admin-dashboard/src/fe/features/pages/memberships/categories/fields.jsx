import { h } from 'preact';
import { Checkbox, TextField } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import LimitedTextField from '../../../../components/controls/limited-text-field';
import MdField from '../../../../components/controls/md-field';
import { membershipCategories as locale } from '../../../../locale';
import './fields.less';
import NumberField from '../../../../components/controls/number-field';

export const FIELDS = {
    nameAbbrev: {
        sortable: true,
        weight: 0.25,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <LimitedTextField
                    required
                    maxLength={15}
                    outline={slot === 'create'}
                    label={slot === 'create' ? locale.fields.nameAbbrev : null}
                    value={value}
                    onChange={onChange} />;
            }
            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
    },
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <LimitedTextField
                    required
                    maxLength={50}
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
        skipLabel: true,
        component ({ value, editing, onChange, slot }) {
            return <MdField
                inline={slot !== 'detail'}
                editing={editing}
                maxLength={2000}
                rules={['emphasis', 'strikethrough', 'link']}
                value={value || ''}
                onChange={value => onChange(value || null)} />;
        },
        weight: 2,
    },
    givesMembership: {
        skipLabel: true,
        component ({ value, editing, onChange, slot }) {
            if (slot === 'body') {
                if (value) return locale.fields.givesMembership;
                return null;
            }
            if (!editing) return value ? <CheckIcon /> : null;
            return <Checkbox
                checked={value}
                onChange={onChange} />;
        },
    },
    lifetime: {
        component ({ value, editing, onChange }) {
            if (!editing) return value ? <CheckIcon /> : null;
            return <Checkbox
                checked={value}
                onChange={onChange} />;
        },
    },
    availableFrom: {
        shouldHide: (_, editing) => !editing,
        component ({ value, editing, onChange }) {
            if (!editing) return '' + value;
            return <NumberField
                type="number"
                placeholder={locale.availability.placeholder}
                value={value}
                onChange={onChange} />;
        },
    },
    availableTo: {
        shouldHide: (_, editing) => !editing,
        component ({ value, editing, onChange }) {
            if (!editing) return '' + value;
            return <NumberField
                type="number"
                placeholder={locale.availability.placeholder}
                value={value}
                onChange={onChange} />;
        },
    },
    availability: {
        slot: 'body',
        skipLabel: true,
        virtual: ['availableFrom', 'availableTo'],
        isEmpty: () => false,
        component ({ item, editing, slot }) {
            const avFrom = item.availableFrom;
            const avTo = item.availableTo;
            let content;
            let hideLabel = false;
            let isError = false;
            if (!avFrom && !avTo) {
                hideLabel = true;
                content = locale.availability.always;
            } else if (!avFrom) {
                content = locale.availability.until + ' ' + avTo;
            } else if (!avTo) {
                content = locale.availability.from + ' ' + avFrom;
            } else if (editing && avFrom > avTo) {
                isError = true;
                content = locale.availability.rangeError;
            } else {
                content = avFrom + '–' + avTo;
            }
            return (
                <div class={'membership-category-availability' + (isError ? ' is-error' : '')} data-slot={slot}>
                    {slot !== 'detail' && !hideLabel && locale.availability.label}
                    {' '}
                    {content}
                </div>
            );
        },
    },
};

