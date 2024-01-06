import { h } from 'preact';
import Select from '../../../../components/controls/select';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import { membershipEntries as locale } from '../../../../locale';
import NumberField from '../../../../components/controls/number-field';

export const FILTERS = {
    year: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => '' + value,
        deserialize: value => Number.isFinite(+value)
            ? ({ enabled: true, value: +value })
            : ({ enabled: false, value: null }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="year-filter">
                    <NumberField
                        type="number"
                        outline
                        value={value}
                        onChange={value => {
                            if (Number.isFinite(value)) {
                                onChange(value);
                                onEnabledChange(true);
                            } else {
                                onChange(null);
                                onEnabledChange(false);
                            }
                        }} />
                </div>
            );
        },
    },
    status: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="status-editor">
                    <Select
                        value={value || ''}
                        onChange={value => {
                            onChange(value);
                            onEnabledChange(!!value);
                        }}
                        items={[{
                            value: '',
                            label: locale.filters.statusTypeAny,
                        }].concat(Object.entries(locale.fields.statusTypes).map(([k, v]) => ({
                            value: k,
                            label: v,
                        })))} />
                </div>
            );
        },
    },
    codeholder: {
        default: () => ({ enabled: false, value: [] }),
        serialize: ({ value }) => value.join('-'),
        deserialize: value => ({
            enabled: true,
            value: value.split('-').filter(x => Number.isFinite(+x)),
        }),
        editor ({ value, onChange, onEnabledChange }) {
            return (
                <div class="new-codeholder-filter">
                    <CodeholderPicker
                        value={value}
                        onChange={value => {
                            onChange(value);
                            onEnabledChange(!!value.length);
                        }} />
                </div>
            );
        },
    },
};
