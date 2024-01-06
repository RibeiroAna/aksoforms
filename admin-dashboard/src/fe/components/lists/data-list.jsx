import { h } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/compat';
import { Button, Menu, CircularProgress } from 'yamdl';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import { data as locale } from '../../locale';
import { coreContext } from '../../core/connection';
import { deepEq } from '../../../util';
import TaskDialog from '../tasks/task-dialog';
import DisplayError from '../utils/error';
import './data-list.less';

const VLIST_CHUNK_SIZE = 50;

/**
 * A list that loads automatically as you scroll with basic item management.
 *
 * # Props
 * - onLoad: async (offset, limit) -> { items: [item], total: number } callback (required)
 * - renderItem: (item) -> VNode callback (required)
 * - renderMenu: (item) -> menu items
 * - onRemove: async (item) -> void callback
 * - onItemClick: (item) -> void callback
 * - emptyLabel: label to show when there are no items
 * - updateView: argument list to create a data view that emits updates (if available)
 */
export default function DataList ({
    onLoad,
    renderItem,
    renderMenu,
    onRemove,
    onItemClick,
    emptyLabel,
    updateView,
}) {
    const core = useContext(coreContext);
    const node = useRef();
    const [total, setTotal] = useState(-1);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [deleteItemOpen, setDeleteItemOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    const hasMore = total < 0 || items.length < total;
    const loadMore = () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        onLoad(items.length, VLIST_CHUNK_SIZE).then(result => {
            const newItems = items.slice();
            for (const item of result.items) newItems.push(item);
            setItems(newItems);

            if (!Number.isFinite(result.total) && result.items.length < VLIST_CHUNK_SIZE) {
                // if there's no total, assume we have all of them when we have received less than
                // the requested number
                result.total = items.length;
            }

            if (Number.isFinite(result.total)) {
                setTotal(result.total);
            }
        }).catch(error => {
            setError(error);
        }).finally(() => {
            setLoading(false);
        });
    };

    const renderedItems = [];
    for (const item of items) {
        const Component = onItemClick ? Button : 'div';
        renderedItems.push(
            <Component
                key={item.id}
                class="data-list-item"
                onClick={() => onItemClick && onItemClick(item)}>
                <div class="list-item-contents">
                    {renderItem(item)}
                </div>
                {onRemove && (
                    <div class="list-item-extra">
                        <ListItemOverflow
                            renderMenu={renderMenu}
                            item={item}
                            core={core}
                            onDelete={() => {
                                setDeleteItemOpen(true);
                                setDeletingItem(item);
                            }}/>
                    </div>
                )}
            </Component>
        );
    }

    if (!total && !hasMore && emptyLabel) {
        renderedItems.push(<div class="data-list-empty" key={0}>{emptyLabel}</div>);
    }

    const showMoreButton = useRef();
    const loadMoreRef = useRef(loadMore);
    loadMoreRef.current = loadMore;
    useEffect(() => {
        const button = showMoreButton.current;
        if (!button?.button) return;
        const iob = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (entry.isIntersecting && hasMore) {
                loadMoreRef.current();
            }
        });
        iob.observe(button.button);
        return () => iob.disconnect();
    }, [showMoreButton.current, hasMore]);

    const prevUpdateView = useRef(updateView);
    const updateViewChangeDetection = useMemo(() => {
        if (!deepEq(updateView, prevUpdateView.current)) {
            prevUpdateView.current = updateView;
        }
        return prevUpdateView.current;
    }, [updateView]);

    useEffect(() => {
        if (!updateView) return;
        const view = core.createDataView(...updateView);
        let isInitialUpdate = true;
        view.on('update', () => {
            if (isInitialUpdate) {
                isInitialUpdate = false;
                return;
            }
            // data updated. reload everything
            setItems([]);
            setTimeout(() => {
                loadMoreRef.current();
            }, 100);
        });
        return () => view.drop();
    }, [core, updateViewChangeDetection]);

    return (
        <div
            class={'data-list ' + (this.props.class || '')}
            ref={node}>
            {renderedItems}

            {loading ? (
                <div class="data-list-loading-indicator">
                    <CircularProgress indeterminate />
                </div>
            ) : null}
            {error ? (
                <div class="data-list-error">
                    <DisplayError error={error} />
                </div>
            ) : null}
            {(!loading && hasMore) ? (
                <Button class="show-more-button" onClick={loadMore} ref={showMoreButton}>
                    {error ? locale.retry : locale.showMore}
                </Button>
            ) : null}

            <TaskDialog
                open={deleteItemOpen}
                onClose={() => setDeleteItemOpen(false)}
                title={locale.deleteTitle}
                actionLabel={locale.delete}
                actionDanger
                run={() => {
                    const item = deletingItem;
                    if (loading) throw new Error(locale.deletePleaseWait);
                    setLoading(true); // prevent loading more
                    return this.props.onRemove(item).then(() => {
                        const newItems = items.slice();
                        if (newItems.includes(item)) newItems.splice(newItems.indexOf(item), 1);
                        setItems(newItems);
                        setTotal(total - 1);
                        setLoading(false);
                        setDeleteItemOpen(false);
                    });
                }}>
                {locale.deleteDescription}
            </TaskDialog>
        </div>
    );
}

function ListItemOverflow ({ renderMenu, item, core, onDelete }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState([0, 0]);

    const additionalMenu = renderMenu ? renderMenu(item, core) : [];

    return (
        <Button small icon class="list-item-overflow" onClick={e => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuPos([rect.right - rect.width / 3, rect.top + rect.height / 3]);
            setMenuOpen(true);
        }}>
            <MoreVertIcon />
            <Menu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                position={menuPos}
                anchor={[1, 0]}
                items={[...additionalMenu, {
                    label: locale.delete,
                    action: onDelete,
                    danger: true,
                }]} />
        </Button>
    );
}
