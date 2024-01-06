import { h } from 'preact';
import Select from '../../../components/controls/select';
import Segmented from '../../../components/controls/segmented';
import { date } from '../../../components/data';
import { votes as locale } from '../../../locale';

export default {
    org: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value || 'none',
        deserialize: value => value === 'none'
            ? ({ enabled: false, value: null })
            : ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="org-filter">
                    <Segmented
                        class="smaller"
                        selected={value || 'none'}
                        onSelect={value => {
                            onChange(value === 'none' ? null : value);
                            onEnabledChange(value !== 'none');
                        }}>
                        {Object.keys(locale.filters.orgTypes).map(type => ({
                            id: type,
                            label: locale.filters.orgTypes[type],
                            class: type === 'none' ? 'bordered' : '',
                        }))}
                    </Segmented>
                </div>
            );
        },
    },
    state: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value || 'none',
        deserialize: value => value === 'none'
            ? ({ enabled: false, value: null })
            : ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="state-filter">
                    <Select
                        value={value || 'none'}
                        onChange={value => {
                            onChange(value === 'none' ? null : value);
                            onEnabledChange(value !== 'none');
                        }}
                        items={Object.keys(locale.filters.stateTypes).map(type => ({
                            value: type,
                            label: locale.filters.stateTypes[type],
                        }))} />
                </div>
            );
        },
    },
    type: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value || 'none',
        deserialize: value => value === 'none'
            ? ({ enabled: false, value: null })
            : ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="state-filter">
                    <Select
                        value={value || 'none'}
                        onChange={value => {
                            onChange(value === 'none' ? null : value);
                            onEnabledChange(value !== 'none');
                        }}
                        items={Object.keys(locale.types).concat(['none']).map(type => ({
                            value: type,
                            label: type === 'none' ? locale.filters.noneType : locale.types[type],
                        }))} />
                </div>
            );
        },
    },
    timeStart: {
        needsSwitch: true,
        default: () => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            return ({ enabled: false, value: [today, today] });
        },
        serialize: ({ value }) => value.join('$'),
        deserialize: value => ({ enabled: true, value: value.split('$') }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="time-range-editor">
                    <div>
                        <date.editor
                            label={locale.filters.timeRangeStart}
                            value={value[0]}
                            onChange={v => {
                                if (!v) return;
                                if (value[0] === value[1]) {
                                    onChange([v, v]);
                                } else {
                                    onChange([v, value[1]]);
                                }
                                onEnabledChange(true);
                            }} />
                    </div>
                    <div>
                        <date.editor
                            label={locale.filters.timeRangeEnd}
                            value={value[1]}
                            onChange={v => {
                                if (!v) return;
                                onChange([value[0], v]);
                                onEnabledChange(true);
                            }} />
                    </div>
                </div>
            );
        },
    },
    get timeEnd () {
        return this.timeStart;
    },
};
