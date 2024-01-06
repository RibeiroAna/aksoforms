import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button } from 'yamdl';
import RemoveIcon from '@material-ui/icons/Remove';
import AddIcon from '@material-ui/icons/Add';
import { useDataView } from '../../../../core';
import TinyProgress from '../../../../components/controls/tiny-progress';
import ItemPicker from '../../../../components/pickers/item-picker-dialog';
import { congressInstances as locale } from '../../../../locale';
import './tag-filtering.less';

// a template for creating a tag filter. used in locations and programs
export function makeTagFilter ({
    task,
    view,
}) {
    function TagItem ({ congress, instance, id }) {
        const [loading, error, tag] = useDataView(view, {
            congress, instance, id,
        });
        if (loading) return <TinyProgress />;
        if (error) return '?';
        return tag?.name;
    }

    const TAG_FIELDS = {
        name: {
            slot: 'title',
            component ({ value }) {
                return value;
            },
        },
    };
    function TagPicker ({ open, onClose, value, onChange, congress, instance }) {
        return (
            <ItemPicker
                open={open}
                onClose={onClose}
                task={task}
                view={view}
                options={{ congress, instance }}
                viewOptions={{ congress, instance }}
                search={{ field: 'name', placeholder: locale.general.tagPicker.search }}
                emptyLabel={locale.general.tagPicker.empty}
                fields={TAG_FIELDS}
                locale={{}}
                value={value}
                onChange={onChange} />
        );
    }

    return {
        default: () => ({
            enabled: false,
            value: [],
        }),
        serialize: ({ value }) => value.join(','),
        deserialize: value => ({
            enabled: true,
            value: value.split(','),
        }),
        editor ({
            value,
            onChange,
            onEnabledChange,
            hidden,
            userData,
        }) {
            const [tagPickerOpen, setTagPickerOpen] = useState(false);

            return (
                <ul class={'congress-items-tags-filter' + (value.length ? ' has-items' : '')}>
                    {value.map((item, i) => (
                        <li class="tag-item" key={i}>
                            <Button
                                class="remove-button"
                                icon
                                small
                                disabled={hidden}
                                onClick={() => {
                                    const newValue = value.slice();
                                    newValue.splice(i, 1);
                                    onChange(newValue);
                                    if (!newValue.length) onEnabledChange(false);
                                }}>
                                <RemoveIcon style={{verticalAlign: 'middle'}} />
                            </Button>
                            <TagItem congress={userData.congress} instance={userData.instance} id={item} />
                        </li>
                    ))}
                    <Button class="add-button" icon small disabled={hidden} onClick={() => {
                        setTagPickerOpen(true);
                    }}>
                        <AddIcon style={{verticalAlign: 'middle'}} />
                    </Button>
                    <TagPicker
                        open={tagPickerOpen}
                        onClose={() => setTagPickerOpen(false)}
                        value={value}
                        onChange={newValue => {
                            onChange(newValue);
                            onEnabledChange(newValue.length);
                        }}
                        congress={userData.congress}
                        instance={userData.instance} />
                </ul>
            );
        },
    };
}