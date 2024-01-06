import { h } from 'preact';
import { useContext, useState } from 'preact/compat';
import { Button, Dialog } from 'yamdl';
import { search as locale } from '../../locale';
import { connectPerms } from '../../perms';
import { coreContext } from '../../core/connection';
import DataList from '../lists/data-list';

/**
 * Filter picker dialog.
 *
 * # Props
 * - category: string
 * - open/onClose: bool
 * - onLoad(filter): callback
 */
export const SavedFilterPicker = connectPerms(function FilterPicker ({
    category, open, onClose, onLoad, perms,
}) {
    const core = useContext(coreContext);
    const canRemoveItem = perms.hasPerm('queries.delete');

    return (
        <Dialog
            backdrop
            open={open}
            onClose={onClose}
            title={locale.pickFilter}
            class="search-filter-picker">
            <DataList
                onLoad={(offset, limit) => core.createTask('queries/list', { category }, {
                    offset,
                    limit,
                }).runOnceAndDrop()}
                renderItem={item => (
                    <div class="search-filter-item">
                        <div>{item.name}</div>
                        <div class="filter-item-description">{item.description}</div>
                    </div>
                )}
                onItemClick={item => onLoad(item)}
                onRemove={canRemoveItem
                    ? (item => core.createTask('queries/delete', { id: item.id }).runOnceAndDrop())
                    : null}
                emptyLabel={locale.noFilters} />
        </Dialog>
    );
});

/**
 * Button to load a saved filter.
 *
 * # Props
 * - category: filter category to load from
 * - onLoad(filter json): callback
 * - (additional props passed to Button)
 */
export function SavedFilterPickerButton ({ category, onLoad, ...extra }) {
    const [open, setOpen] = useState(false);

    return (
        <Button {...extra} onClick={() => setOpen(true)}>
            {locale.pickSavedFilter}

            <SavedFilterPicker
                open={open}
                onClose={() => setOpen(false)}
                category={category}
                onLoad={value => {
                    onLoad(value);
                    setOpen(false);
                }} />
        </Button>
    );
}
