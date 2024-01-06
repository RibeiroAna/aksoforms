import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/compat';
import { Dialog } from 'yamdl';
import SearchIcon from '@material-ui/icons/Search';
import StaticOverviewList from '../lists/overview-list-static';
import { data as dataLocale } from '../../locale';
import './item-picker-dialog.less';

/**
 * Picks items from a list
 *
 * # Props
 * - open/onClose
 * - defaultWidth: default picker width, or 400
 * - fullScreenWidth: screen width at which picker will go full screen, or 400
 * - limit: max. selected items
 * - value/onChange: id[] selected items
 * - task: list task
 * - view: item view
 * - filter: JSON filter
 * - fields: field spec object
 * - locale: field names
 * - search: { field: string, placeholder: string } optional, to enable search
 * - sorting: optional object { [field]: string }
 * - emptyLabel: shown when no items exist
 * - noCloseButton: will not show a close button
 * - extraListOptions: additional props that will be passed to OverviewList
 * - ...extra: additional props for the dialog
 */
export default function ItemPicker ({
    open,
    onClose,
    defaultWidth,
    fullScreenWidth,
    limit,
    value,
    onChange,
    task,
    view,
    options,
    viewOptions,
    emptyLabel,
    filter,
    fields,
    locale,
    search,
    sorting,
    noCloseButton,
    extraListOptions,
    disableAutoClose,
    ...extra
}) {
    extra.class = (extra.class || '') + ' item-picker-dialog';
    extra.style = (extra.style || {});
    extra.style['--picker-width'] = (defaultWidth || 400) + 'px';

    return (
        <Dialog
            backdrop
            fullScreen={width => width < (fullScreenWidth || 400)}
            open={open}
            actions={onClose && !noCloseButton && [{ label: dataLocale.picker.done, action: onClose }]}
            onClose={onClose}
            {...extra}>
            <DialogInner
                value={value}
                onChange={onChange}
                limit={limit}
                onClose={onClose}
                disableAutoClose={disableAutoClose}
                task={task}
                view={view}
                options={options}
                viewOptions={viewOptions}
                searchDef={search}
                emptyLabel={emptyLabel}
                extraListOptions={extraListOptions}
                fields={fields}
                sorting={sorting}
                fieldsLocale={locale}
                filter={filter} />
        </Dialog>
    );
}

function DialogInner ({
    value,
    onChange,
    limit,
    onClose,
    filter,
    task,
    view,
    options,
    viewOptions,
    emptyLabel,
    extraListOptions,
    searchDef,
    sorting,
    fields,
    fieldsLocale,
    disableAutoClose,
}) {
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');

    const selection = {
        add: id => {
            const idValue = !Number.isNaN(+id) ? +id : id;
            if (value.includes(idValue)) return;
            onChange(value.concat([idValue]));
            if (value.length + 1 >= limit && !disableAutoClose) onClose();
        },
        has: id => {
            const idValue = !Number.isNaN(+id) ? +id : id;
            return value.includes(idValue);
        },
        delete: id => {
            const idValue = !Number.isNaN(+id) ? +id : id;
            if (!value.includes(idValue)) return;
            const newValue = value.slice();
            newValue.splice(value.indexOf(idValue), 1);
            onChange(newValue);
        },
    };

    const searchDebounce = useRef(null);
    const [listSearch, setListSearch] = useState('');
    const searchData = useRef([search, setListSearch]);
    searchData.current = [search, setListSearch];
    useEffect(() => {
        if (searchDebounce.current) return;
        searchDebounce.current = setTimeout(() => {
            searchDebounce.current = null;
            const [search, setListSearch] = searchData.current;
            setListSearch(search);
        }, 300);
    }, [search]);

    useEffect(() => {
        // clear when unmounting
        return () => clearTimeout(searchDebounce.current);
    }, []);

    return (
        <div>
            {searchDef ? (
                <div class="item-picker-search">
                    <div class="search-icon-container">
                        <SearchIcon />
                    </div>
                    <input
                        class="search-inner"
                        placeholder={searchDef.placeholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)} />
                </div>
            ) : null}
            <StaticOverviewList
                compact
                task={task}
                view={view}
                options={options}
                viewOptions={viewOptions}
                useDeepCmp
                emptyLabel={emptyLabel}
                {...extraListOptions}
                search={searchDef ? { field: searchDef.field, query: listSearch } : null}
                jsonFilter={filter}
                fields={fields}
                sorting={sorting}
                offset={offset}
                onSetOffset={setOffset}
                selection={limit === 1 ? null : selection}
                onItemClick={id => {
                    const idValue = !Number.isNaN(+id) ? +id : id;
                    if (limit === 1) {
                        onChange([idValue]);
                        if (!disableAutoClose) onClose();
                        return;
                    }
                    if (value.includes(idValue)) {
                        selection.delete(id);
                    } else {
                        selection.add(id);
                    }
                }}
                limit={10}
                locale={fieldsLocale} />
        </div>
    );
}
