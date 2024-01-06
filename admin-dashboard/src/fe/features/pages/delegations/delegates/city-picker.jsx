import { h } from 'preact';
import { country } from '../../../../components/data';
import { delegations as locale } from '../../../../locale';
import ItemPickerDialog from '../../../../components/pickers/item-picker-dialog';

const FIELDS = {
    eoLabel: {
        slot: 'title',
        component ({ value }) {
            return value;
        },
    },
    nativeLabel: {
        skipLabel: true,
        component ({ value }) {
            return value;
        },
    },
    subdivision_eoLabel: {
        skipLabel: true,
        component ({ value }) {
            return value;
        },
    },
    country: {
        skipLabel: true,
        component ({ value }) {
            return <country.renderer value={value} />;
        },
    },
};

export default function PickerDialog ({ value, onChange, limit, open, onClose, filter, ...extra }) {
    return (
        <ItemPickerDialog
            class="city-picker-dialog"
            fullScreenWidth={600}
            task="geoDb/listCities"
            view="geoDb/city"
            search={{ field: 'searchLabel', placeholder: locale.cityPicker.search }}
            fields={FIELDS}
            sorting={{ code: 'asc' }}
            locale={locale.cityPicker.fields}
            title={limit === 1 ? locale.cityPicker.pickOne : locale.cityPicker.pick}
            filter={filter}
            value={value}
            onChange={onChange}
            open={open}
            onClose={onClose}
            {...extra} />
    );
}

