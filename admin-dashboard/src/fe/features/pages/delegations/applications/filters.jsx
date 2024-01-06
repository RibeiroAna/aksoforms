import { h } from 'preact';
import Select from '../../../../components/controls/select';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import { timestamp } from '../../../../components/data';
import { delegationApplications as locale } from '../../../../locale';

export function makeCodeholderFilterQuery (codeholder) {
    return `filter(codeholderId:${codeholder})`;
}

export const FILTERS = {
    codeholderId: {
        default () {
            return { enabled: false, value: [] };
        },
        serialize ({ value }) {
            return value.join(',');
        },
        deserialize (value) {
            return { enabled: true, value: value.split(',') };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <div class="delegation-application-codeholder-filter">
                    <CodeholderPicker
                        disabled={hidden}
                        value={value}
                        onChange={v => {
                            onChange(v);
                            onEnabledChange(!!v.length);
                        }} />
                </div>
            );
        },
    },
    status: {
        default () {
            return { enabled: false, value: null };
        },
        serialize ({ value }) {
            return value;
        },
        deserialize (value) {
            return { enabled: true, value };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <Select
                    disabled={hidden}
                    value={value}
                    onChange={v => {
                        onEnabledChange(!!v);
                        onChange(v);
                    }}
                    items={[
                        { value: null, label: locale.search.filters.statusAny },
                        { value: 'pending', label: locale.status.pending },
                        { value: 'approved', label: locale.status.approved },
                        { value: 'denied', label: locale.status.denied },
                    ]} />
            );
        },
    },
    statusTime: {
        needsSwitch: true,
        default () {
            return { enabled: false, value: [new Date(new Date().getFullYear(), 0, 1), new Date()] };
        },
        serialize ({ value }) {
            return value.map(x => x.toISOString()).join('$');
        },
        deserialize (value) {
            return { enabled: true, value: value.split('$').map(x => new Date(x)) };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <div class="delegation-application-status-time-filter">
                    <div>
                        <timestamp.editor
                            outline
                            label={locale.search.filters.timeRangeStart} disabled={hidden} value={+value[0] / 1000}
                            onChange={v => {
                                onChange([new Date(v * 1000), value[1]]);
                                onEnabledChange(true);
                            }} />
                    </div>
                    <div>
                        <timestamp.editor
                            outline
                            label={locale.search.filters.timeRangeEnd} disabled={hidden} value={+value[1] / 1000}
                            onChange={v => {
                                onChange([value[0], new Date(v * 1000)]);
                                onEnabledChange(true);
                            }} />
                    </div>
                </div>
            );
        },
    },
};
