import { h } from 'preact';
import { useEffect, useState } from 'preact/compat';
import ItemPickerDialog from '../../../../components/pickers/item-picker-dialog';
import { FIELDS as CONGRESS_FIELDS } from '../fields';
import { FIELDS as INSTANCE_FIELDS } from './fields';
import { congresses as congressLocale, congressInstances as instanceLocale } from '../../../../locale';

const REDUCED_INSTANCE_FIELDS = Object.fromEntries(
    ['humanId', 'name', 'dateFrom', 'dateTo'].map(k => [k, INSTANCE_FIELDS[k]])
);

/**
 * Picks a congress and instance.
 *
 * # Props
 * - open/onClose: open state
 * - onPick: (congress, instance) => void
 */
export default function CongressInstancePicker ({ open, onClose, onPick }) {
    const [pickedCongress, setPickedCongress] = useState(null);

    useEffect(() => {
        // reset when reopened
        if (open) setPickedCongress(null);
    }, [open]);

    if (pickedCongress) {
        const congress = pickedCongress;

        return (
            <ItemPickerDialog
                open={open}
                onClose={onClose}
                limit={1}
                value={[]}
                options={{ congress }}
                viewOptions={{ congress }}
                task="congresses/listInstances"
                view="congresses/instance"
                search={{ field: 'name', placeholder: instanceLocale.search.placeholders.name }}
                fields={REDUCED_INSTANCE_FIELDS}
                locale={instanceLocale.fields}
                onChange={items => {
                    if (!items.length) return;
                    onPick(pickedCongress, items[0]);
                }} />
        );
    }

    return (
        <ItemPickerDialog
            open={open}
            onClose={onClose}
            disableAutoClose
            limit={1}
            value={[]}
            task="congresses/list"
            view="congresses/congress"
            search={{ field: 'name', placeholder: congressLocale.search.placeholders.name }}
            fields={CONGRESS_FIELDS}
            locale={congressLocale.fields}
            onChange={items => {
                if (!items.length) return;
                setPickedCongress(items[0]);
            }} />
    );
}
