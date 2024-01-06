import { h } from 'preact';
import { useState } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import { Button, MenuIcon } from 'yamdl';
import ItemPicker from '../../../components/pickers/item-picker-dialog';
import OverviewListItem from '../../../components/lists/overview-list-item';
import { FIELDS as ORG_FIELDS } from './orgs/fields';
import { paymentMethods as methodLocale, paymentOrgs as locale } from '../../../locale';
import './org-picker.less';

const ORG_FIELD_IDS = [{ id: 'org' }, { id: 'name' }];

export default function PaymentOrgPicker ({ disabled, value, onChange }) {
    const [pickerOpen, setPickerOpen] = useState(false);

    let contents;
    if (value) {
        contents = (
            <div class="inner-selected">
                <Button
                    disabled={disabled}
                    class="remove-button"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => {
                        e.stopPropagation();
                        onChange(null);
                    }}>
                    <MenuIcon type="close" />
                </Button>
                <OverviewListItem
                    disabled={disabled}
                    doFetch compact view="payments/org"
                    onClick={() => setPickerOpen(true)}
                    skipAnimation
                    id={value}
                    key={value}
                    options={{ id: value }}
                    selectedFields={ORG_FIELD_IDS}
                    fields={ORG_FIELDS}
                    index={0}
                    locale={methodLocale.fields} />
            </div>
        );
    } else {
        contents = (
            <Button class="inner-select-button" onClick={() => setPickerOpen(true)}>
                <AddIcon />
            </Button>
        );
    }

    return (
        <div class="payment-org-picker">
            {contents}
            <ItemPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                value={value ? [value] : []}
                onChange={v => {
                    onChange(v[0] || null);
                }}
                limit={1}
                task="payments/listOrgs"
                view="payments/org"
                fields={ORG_FIELDS}
                locale={locale.fields}
                sorting={{ name: 'asc' }} />
        </div>
    );
}
