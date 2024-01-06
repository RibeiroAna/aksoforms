import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import Segmented from '../../../../../components/controls/segmented';
import { congressLocations as locale } from '../../../../../locale';
import { timestamp } from '../../../../../components/data';
import LocationPicker from '../location-picker';
import { useDataView } from '../../../../../core';
import ItemPicker from '../../../../../components/pickers/item-picker-dialog';
import TinyProgress from '../../../../../components/controls/tiny-progress';
import './filters.less';
import { makeTagFilter } from '../tag-filtering';

export const FILTERS = {
    type: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value,
        deserialize: value => ({ enabled: true, value }),
        editor ({ value, onChange, enabled, onEnabledChange, hidden }) {
            const selected = enabled ? value : 'none';

            return (
                <Segmented class="smaller" selected={selected} onSelect={value => {
                    onEnabledChange(value !== 'none');
                    if (value !== 'none') onChange(value);
                }} disabled={hidden}>
                    {[
                        {
                            id: 'external',
                            label: locale.fields.types.external,
                        },
                        {
                            id: 'internal',
                            label: locale.fields.types.internal,
                        },
                        {
                            id: 'none',
                            label: locale.fields.types.none,
                            class: 'bordered',
                        },
                    ]}
                </Segmented>
            );
        },
    },
    externalLoc: {
        default: () => ({ enabled: false, value: [] }),
        serialize: ({ value }) => value.join(','),
        deserialize: value => ({ enabled: true, value: value.split(',') }),
        editor ({ value, onChange, onEnabledChange, hidden, userData }) {
            // TODO: improve this thing/DRY with programs
            // would ideally be like the tag editor (checkboxes in a list) instead of like this
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
                    externalOnly
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
                externalOnly
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
        impliesValues: {
            type: ['internal', null],
        },
    },
    open: {
        default: () => ({ enabled: false, value: null }),
        serialize: ({ value }) => value ? value : '-',
        deserialize: value => ({ enabled: true, value: value === '-' ? null : value }),
        needsSwitch: true,
        editor ({ value, onChange, enabled, onEnabledChange, hidden, userData }) {
            const [,, instance] = useDataView('congresses/instance', {
                congress: userData.congress,
                id: userData.instance,
            });

            return (
                <div class="congress-locations-open-filter" data-enabled={enabled.toString()}>
                    <Segmented
                        class="smaller"
                        disabled={hidden}
                        selected={value === null ? 'none' : 'date'}
                        onSelect={type => {
                            if (type === 'none') {
                                onChange(null);
                            } else if (type === 'date') {
                                if (value) return;

                                if (instance) {
                                    // get date bounded to start/end date
                                    const minDate = new Date(instance.dateFrom + 'T00:00:00Z');
                                    const maxDate = new Date(instance.dateTo + 'T23:59:59Z');

                                    const dateValue = Math.max(+minDate, Math.min(+new Date(), +maxDate));
                                    onChange(dateToLocalString(new Date(dateValue)));
                                } else {
                                    onChange(dateToLocalString(new Date()));
                                }
                            }
                            onEnabledChange(true);
                        }}>
                        {[
                            {
                                id: 'date',
                                label: locale.search.filters.openType.date,
                            },
                            {
                                id: 'none',
                                label: locale.search.filters.openType.none,
                                class: 'bordered',
                            },
                        ]}
                    </Segmented>
                    {value !== null ? (
                        <div class="inner-date-input">
                            <timestamp.editor
                                outline
                                value={+localStringToDate(value) / 1000}
                                onChange={v => {
                                    if (!v) return;
                                    onChange(dateToLocalString(new Date(v * 1000)));
                                    onEnabledChange(true);
                                }} />
                        </div>
                    ) : null}
                </div>
            );
        },
    },
    tags: makeTagFilter({
        task: 'congresses/listLocationTags',
        view: 'congresses/locationTag',
    }),
};

function pad (padding, s) {
    const s2 = padding + s;
    return s2.substring(s2.length - padding.length);
}

function dateToLocalString (date) {
    // we will pretend to be in the UTC time zone

    const y = pad('0000', date.getUTCFullYear());
    const mo = pad('00', date.getUTCMonth() + 1);
    const d = pad('00', date.getUTCDate());
    const h = pad('00', date.getUTCHours());
    const m = pad('00', date.getUTCMinutes());
    const s = pad('00', date.getUTCSeconds());

    return `${y}-${mo}-${d}T${h}:${m}:${s}`;
}

function localStringToDate (str) {
    const parts = str.match(/^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)$/);
    const y = parts[1];
    const mo = parts[2] - 1;
    const d = parts[3];
    const h = parts[4];
    const m = parts[5];
    const s = parts[6];

    const date = new Date();
    date.setUTCFullYear(y, mo, d);
    date.setUTCHours(h, m, s, 0);
    return date;
}
