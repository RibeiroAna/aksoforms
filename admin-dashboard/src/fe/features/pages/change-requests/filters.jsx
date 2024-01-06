import { h } from 'preact';
import Select from '../../../components/controls/select';
import { codeholderChgReqs as locale } from '../../../locale';
import './filters.less';

export const FILTERS = {
    status: {
        default: () => ({ enabled: true, value: ['pending'] }),
        serialize: ({ value }) => value.join(','),
        deserialize: value => value
            ? ({ enabled: true, value: value.split(',') })
            : ({ enabled: false, value: [] }),
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <div class="codeholder-change-request-status-filter">
                    <Select
                        class="inner-select"
                        disabled={hidden}
                        multi
                        value={value}
                        emptyLabel={locale.search.filters.statusesEmpty}
                        onChange={value => {
                            onChange(value);
                            onEnabledChange(!!value.length);
                        }}
                        items={Object.entries(locale.fields.statuses).map(([k, v]) => ({
                            value: k,
                            label: v,
                        }))} />
                </div>
            );
        },
    },
};
