import { h } from 'preact';
import moment from 'moment';
import Select from './select';

const ALL_ZONES = moment.tz.names();

// TODO: improve this (search; remove redundant tz?)

export default function TimeZoneEditor ({ value, editing, onChange }) {
    if (editing) {
        return <Select
            value={value}
            onChange={onChange}
            items={[{ value: null, label: '—' }].concat(ALL_ZONES.map(zone => ({
                value: zone,
                label: zone,
            })))} />;
    }
    return value;
}
