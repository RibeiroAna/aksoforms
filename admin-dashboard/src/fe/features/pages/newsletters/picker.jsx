import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import ItemPicker from '../../../components/pickers/item-picker-dialog';
import { newsletters as locale } from '../../../locale';
import { FIELDS } from './fields';
import { useDataView } from '../../../core';
import TinyProgress from '../../../components/controls/tiny-progress';
import DisplayError from '../../../components/utils/error';
import './picker.less';

const PICKER_FIELDS = Object.fromEntries(['org', 'name'].map(k => [k, FIELDS[k]]));

export default function NewsletterPicker ({ disabled, limit, value, onChange }) {
    const [open, setOpen] = useState(false);

    return (
        <div class="newsletter-picker">
            {value.map(id => (
                <NewsletterItem key={id} id={id} onRemove={() => {
                    const newValue = value.slice();
                    newValue.splice(newValue.indexOf(id, 1));
                    onChange(newValue);
                }} />
            ))}
            {(!limit || limit > value.length) ? (
                <Button small icon onClick={() => setOpen(true)}>
                    <AddIcon />
                </Button>
            ) : null}
            <ItemPicker
                value={value}
                onChange={onChange}
                disabled={disabled}
                open={open}
                onClose={() => setOpen(false)}
                limit={limit}
                task="newsletters/list"
                view="newsletters/newsletter"
                fields={PICKER_FIELDS}
                search={{ field: 'name', placeholder: locale.search.placeholders.name }}
                emptyLabel={locale.emptyLabel}
                locale={locale.fields} />
        </div>
    );
}

function NewsletterItem ({ id, onRemove }) {
    const [loading, error, data] = useDataView('newsletters/newsletter', { id });
    if (loading) return <TinyProgress />;
    if (error) return <DisplayError error={error} />;
    if (!data) return null;
    return (
        <div class="newsletter-item">
            <Button onClick={onRemove} class="remove-button">
                <RemoveIcon />
            </Button>
            {' '}
            {data.name}
        </div>
    );
}