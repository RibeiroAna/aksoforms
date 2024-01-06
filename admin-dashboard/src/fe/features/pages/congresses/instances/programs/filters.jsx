import { h } from 'preact';
import { congressPrograms as locale } from '../../../../../locale';
import { timestamp } from '../../../../../components/data';
import LocationPicker from '../location-picker';
import { makeTagFilter } from '../tag-filtering';

export const FILTERS = {
    timeSlice: {
        default: () => ({ enabled: false, value: [null, null] }),
        serialize: ({ value }) => value.map(x => x === null ? '' : x).join('$'),
        deserialize: value => ({ enabled: true, value: value.split('$').map(x => x ? +x : null) }),
        editor ({ value, onChange, onEnabledChange, hidden, userData }) {
            return (
                <div class="congress-programs-time-slice-filter">
                    <timestamp.editor
                        label={locale.search.filters.timeSliceFrom}
                        zone={userData.tz}
                        disabled={hidden}
                        outline
                        value={value[0]}
                        onChange={v => {
                            onEnabledChange(v || value[1]);
                            onChange([v, value[1]]);
                        }} />
                    <timestamp.editor
                        label={locale.search.filters.timeSliceTo}
                        zone={userData.tz}
                        disabled={hidden}
                        outline
                        value={value[1]}
                        onChange={v => {
                            onEnabledChange(v || value[0]);
                            onChange([value[0], v]);
                        }} />
                </div>
            );
        },
    },
    location: {
        default: () => ({ enabled: false, value: [] }),
        serialize: ({ value }) => value.join(','),
        deserialize: value => ({ enabled: true, value: value.split(',') }),
        editor ({ value, onChange, onEnabledChange, hidden, userData }) {
            // TODO: improve this thing/DRY with locations
            const { congress, instance } = userData;
            const items = [];

            const removeIndex = index => {
                const v = value.slice();
                v.splice(index, 1);
                onChange(v);
                if (!v.length) onEnabledChange(false);
            };

            for (let i = 0; i < value.length; i++) {
                const index = i;
                const item = value[index];
                const onItemChange = item => {
                    if (item === null) removeIndex(index);
                };
                items.push(<LocationPicker
                    key={item}
                    disabled={hidden}
                    congress={congress}
                    instance={instance}
                    editing
                    adding
                    value={item}
                    onChange={onItemChange} />);
            }

            const onAddChange = item => {
                item = item.toString(); // only string ids
                const v = value.slice();
                if (v.includes(item)) return;
                v.push(item);
                onChange(v);
                onEnabledChange(true);
            };
            items.push(<LocationPicker
                disabled={hidden}
                congress={congress}
                instance={instance}
                editing
                adding
                value={null}
                onChange={onAddChange} />);

            return (
                <div class="external-loc-editor">
                    {items}
                </div>
            );
        },
    },
    tags: makeTagFilter({
        task: 'congresses/listProgramTags',
        view: 'congresses/programTag',
    }),
};
