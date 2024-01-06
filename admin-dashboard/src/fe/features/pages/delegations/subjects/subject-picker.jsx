import { h } from 'preact';
import { delegationSubjects as locale } from '../../../../locale';
import ItemPickerDialog from '../../../../components/pickers/item-picker-dialog';
import { FIELDS } from './fields';

export default function PickerDialog ({ value, onChange, limit, open, onClose, filter, ...extra }) {
    return (
        <ItemPickerDialog
            class="subject-picker-dialog"
            fullScreenWidth={600}
            title={locale.picker.pick}
            open={open}
            onClose={onClose}
            value={value}
            onChange={onChange}
            filter={filter}
            task="delegations/listSubjects"
            view="delegations/subject"
            search={{ field: 'name', placeholder: locale.picker.search }}
            jsonFilter={filter}
            fields={FIELDS}
            sorting={{ id: 'asc' }}
            locale={locale.fields}
            limit={limit}
            {...extra} />
    );
}

