import { h } from 'preact';
import Segmented from '../../../../components/controls/segmented';
import { magazineSubs as locale } from '../../../../locale';

export const FILTERS = {
    paperVersion: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value ? 'j' : 'n',
        deserialize: value => ({ enabled: true, value: value === 'j' }),
        editor ({ value, onChange, enabled, onEnabledChange, hidden }) {
            const selected = enabled ? (value ? 'yes' : 'no') : 'none';

            return (
                <Segmented class="smaller" selected={selected} onSelect={value => {
                    onEnabledChange(value !== 'none');
                    if (value !== 'none') onChange(value === 'yes');
                }} disabled={hidden}>
                    {[
                        {
                            id: 'yes',
                            label: locale.search.filters.paperVersionTypes.yes,
                        },
                        {
                            id: 'no',
                            label: locale.search.filters.paperVersionTypes.no,
                        },
                        {
                            id: 'none',
                            label: locale.search.filters.paperVersionTypes.none,
                            class: 'bordered',
                        },
                    ]}
                </Segmented>
            );
        },
    },
};
