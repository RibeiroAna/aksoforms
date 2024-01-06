import { h } from 'preact';
import { TextField } from 'yamdl';
import { useState } from 'preact/compat';
import Select from '../../../../components/controls/select';
import Segmented from '../../../../components/controls/segmented';
import { timestamp } from '../../../../components/data';
import { currencies, paymentIntents as locale } from '../../../../locale';
import PaymentOrgPicker from '../org-picker';
import PaymentMethodPicker from '../method-picker';

const timeFilter = {
    needsSwitch: true,
    default: () => ({ enabled: false, value: [new Date(), new Date()] }),
    serialize: ({ value }) => `${value[0].toISOString()}$${value[1].toISOString()}`,
    deserialize: value => ({ enabled: true, value: value.split('$').map(date => new Date(date)) }),
    editor ({ value, onChange, onEnabledChange, hidden }) {
        return (
            <div class="time-range-filter">
                <div>
                    <timestamp.editor outline label={locale.filters.timeRange.start} disabled={hidden} value={+value[0] / 1000} onChange={v => {
                        onChange([new Date(v * 1000), value[1]]);
                        onEnabledChange(true);
                    }} />
                </div>
                <div>
                    <timestamp.editor outline label={locale.filters.timeRange.end} disabled={hidden} value={+value[1] / 1000} onChange={v => {
                        onChange([value[0], new Date(v * 1000)]);
                        onEnabledChange(true);
                    }} />
                </div>
            </div>
        );
    },
};

export const FILTERS = {
    customerName: {
        default: () => ({ enabled: false, value: '' }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <TextField
                outline
                disabled={hidden}
                value={value}
                onChange={v => {
                    onEnabledChange(!!v);
                    onChange(v);
                }} />;
        },
    },
    customerEmail: {
        default: () => ({ enabled: false, value: '' }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <TextField
                outline
                type="email"
                disabled={hidden}
                value={value}
                onChange={v => {
                    onEnabledChange(!!v);
                    onChange(v);
                }} />;
        },
    },
    org: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <Segmented
                    class="smaller"
                    disabled={hidden}
                    selected={value || ''}
                    onSelect={value => {
                        onEnabledChange(!!value);
                        onChange(value || null);
                    }}>
                    {Object.keys(locale.filters.orgs).map(type => ({
                        id: type,
                        label: locale.filters.orgs[type],
                        class: !type ? 'bordered' : '',
                    }))}
                </Segmented>
            );
        },
    },
    paymentOrg: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <PaymentOrgPicker
                    disabled={hidden}
                    value={value}
                    onChange={v => {
                        onChange((v || '').toString());
                        onEnabledChange(!!v);
                    }} />
            );
        },
    },
    paymentMethod: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            const [org, setOrg] = useState(null);

            return (
                <PaymentMethodPicker
                    disabled={hidden}
                    value={value}
                    onChange={v => {
                        onChange((v || '').toString());
                        onEnabledChange(!!v);
                    }}
                    type="any"
                    org={org}
                    onOrgChange={setOrg} />
            );
        },
    },
    currencies: {
        default: () => ({ enabled: false, value: [] }),
        serialize: ({ value }) => value.join(','),
        deserialize: value => ({ enabled: true, value: value.split(',') }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <Select
                    multi
                    disabled={hidden}
                    value={value || ''}
                    emptyLabel={locale.filters.currenciesNone}
                    onChange={value => {
                        onChange(value);
                        onEnabledChange(value.length);
                    }}
                    items={Object.keys(currencies)
                        .map(c => ({ value: c, label: currencies[c] }))} />
            );
        },
    },
    status: {
        default: () => ({ enabled: false, value: [] }),
        serialize: ({ value }) => value.join(','),
        deserialize: value => ({ enabled: true, value: value.split(',') }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <Select
                disabled={hidden}
                multi
                value={value || []}
                onChange={value => {
                    onEnabledChange(!!value.length);
                    onChange(value);
                }}
                emptyLabel={locale.filters.statuses['']}
                items={Object.keys(locale.filters.statuses).filter(id => id).map(id => ({
                    value: id,
                    label: locale.filters.statuses[id],
                    shortLabel: locale.filters.shortStatuses[id],
                }))} />;
        },
    },
    purposeType: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <Select
                disabled={hidden}
                value={value || ''}
                onChange={value => {
                    onEnabledChange(!!value);
                    onChange(value);
                }}
                items={[{
                    value: '',
                    label: locale.filters.optionNone,
                }].concat(Object.keys(locale.fields.purposeTypes).map(id => ({
                    value: id,
                    label: locale.fields.purposeTypes[id],
                })))} />;
        },
    },
    purposeInvalid: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value ? 'j' : 'n',
        deserialize: value => ({ enabled: true, value: value === 'j' }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <Select
                disabled={hidden}
                value={value === null ? '' : value ? 'yes' : 'no'}
                onChange={value => {
                    onEnabledChange(!!value);
                    onChange(value ? value === 'yes' : null);
                }}
                items={[{
                    value: '',
                    label: locale.filters.optionNone,
                }, {
                    value: 'no',
                    label: locale.filters.purposeInvalidNo,
                }, {
                    value: 'yes',
                    label: locale.filters.purposeInvalidYes,
                }]} />;
        },
    },
    purposeTrigger: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <Select
                disabled={hidden}
                value={value || ''}
                onChange={value => {
                    onEnabledChange(!!value);
                    onChange(value);
                }}
                items={[{
                    value: '',
                    label: locale.filters.optionNone,
                }].concat(Object.keys(locale.triggers).map(id => ({
                    value: id,
                    label: locale.triggers[id],
                })))} />;
        },
    },
    purposeTriggerStatus: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <Select
                disabled={hidden}
                value={value || ''}
                onChange={value => {
                    onEnabledChange(!!value);
                    onChange(value);
                }}
                items={[{
                    value: '',
                    label: locale.filters.optionNone,
                }].concat(Object.keys(locale.fields.purpose.triggerStatuses).map(id => ({
                    value: id,
                    label: locale.fields.purpose.triggerStatuses[id],
                })))} />;
        },
    },
    purposeDataId: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return <TextField
                outline
                disabled={hidden}
                value={value || ''}
                onChange={value => {
                    onEnabledChange(!!value);
                    onChange(value);
                }} />;
        },
    },
    timeCreated: timeFilter,
    statusTime: timeFilter,
    succeededTime: timeFilter,
    refundedTime: timeFilter,
};
