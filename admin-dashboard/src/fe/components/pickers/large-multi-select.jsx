import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Dialog, Button } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import SearchIcon from '@material-ui/icons/Search';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import fuzzaldrin from 'fuzzaldrin';
import MulticolList from '../lists/multicol-list';
import { data as locale } from '../../locale';
import './large-multi-select.less';

const LI_HEIGHT = 48;

/**
 * Renders a large multi-select, featuring: a single-line preview of the items, and a big picker
 * dialog box.
 *
 * # Props
 * - value/onChange: array of strings
 * - renderItemContents: ({ id, selected }) => Node, renders item contents
 * - renderItem: ({id, selected, onClick}) => Node,
 *               component to render an item. Prefer renderItemContents
 * - renderPreviewItem: ({ id }) => Node, optional fn to render a special preview version of an
 *                      item. required when using renderItem
 * - itemName: (id) => string, maps items to names (for searching)
 * - items: array of available item ids
 * - title: will be shown as dialog title and placeholder
 * - placeholder: optional placeholder override
 * - disabled: bool
 */
export default class LargeMultiSelect extends PureComponent {
    state = {
        dialogOpen: false,
        search: '',
    };

    selectAll = () => {
        this.props.onChange(this.props.items);
    };

    deselectAll = () => {
        this.props.onChange([]);
    };

    #multicolList = null;

    render ({
        value,
        onChange,
        items,
        title,
        placeholder,
        renderPreviewItem,
        renderItemContents,
        renderItem,
        itemName,
        disabled,
        ...extra
    }) {
        void onChange;

        const previewItems = [];

        const RenderItemContents = renderItemContents;
        const RenderItem = renderItem || (({ id, selected, onClick }) => (
            <div class="lms-item" onClick={onClick}>
                <div class="lms-contents">
                    <RenderItemContents id={id} selected={selected} />
                </div>
                <div class={'lms-check' + (selected ? ' is-checked' : '')}>
                    {selected ? <CheckIcon /> : null}
                </div>
            </div>
        ));
        const RenderPreviewItem = renderPreviewItem || RenderItemContents;

        for (let i = 0; i < value.length; i++) {
            previewItems.push(
                <div key={i} class="lms-preview-item">
                    <RenderPreviewItem id={value[i]} />
                </div>
            );
        }

        // Event handler for when an item is clicked; moves it to the other column
        const onItemClick = id => () => {
            const value = this.props.value.slice();
            if (this.props.value.includes(id)) {
                value.splice(value.indexOf(id), 1);
            } else {
                let altInsertionPoint = Infinity;
                if (this.#multicolList && this.#multicolList.columnRefs[0]) {
                    // slightly hacky: get scroll position from the column ref and insert there
                    // so the user can see what they’re doing
                    altInsertionPoint = Math.floor((this.#multicolList.columnRefs[0].scrollTop
                        + this.#multicolList.columnRefs[0].offsetHeight / 2) / LI_HEIGHT);
                }
                const insertionPoint = Math.min(value.length, altInsertionPoint);
                value.splice(insertionPoint, 0, id);
            }
            this.props.onChange(value);
        };

        const selectedItems = value.map(id => ({
            key: id,
            column: 0,
            node: <RenderItem key={id} id={id} selected={true} onClick={onItemClick(id)} />,
        }));

        // list of all items that are to be visible
        let searchResults = items
            .filter(x => !value.includes(x))
            .map(id => ({ id, name: '' + itemName(id) }));

        if (this.state.search) {
            searchResults = fuzzaldrin.filter(searchResults, this.state.search, { key: 'name' });
        }
        searchResults = searchResults.map(x => x.id);

        const availableItems = searchResults.map(id => ({
            key: id,
            column: 1,
            node: <RenderItem key={id} id={id} onClick={onItemClick(id)} />,
        }));

        extra.class = (extra.class || '') + ' large-multi-select';

        return (
            <div
                tabIndex={disabled ? -1 : 0}
                {...extra}
                onKeyDown={e => {
                    if (extra.onKeyDown) extra.onKeyDown(e);
                    if (!e.defaultPrevented && (e.key === ' ' || e.key === 'Enter')) {
                        this.setState({ dialogOpen: true });
                    }
                }}
                onClick={e => {
                    if (extra.onClick) extra.onClick(e);
                    if (!e.defaultPrevented) this.setState({ dialogOpen: true, search: '' });
                }}>
                <span class="lms-preview">
                    {previewItems.length
                        ? previewItems
                        : (
                            <span class="lms-placeholder">
                                {placeholder || title}
                            </span>
                        )
                    }
                </span>
                <ExpandMoreIcon className="lms-expand-icon" />

                <Dialog
                    onClick={e => e.stopPropagation()}
                    backdrop
                    fullScreen={width => width < 650}
                    onClose={() => this.setState({ dialogOpen: false })}
                    class="large-multi-select-dialog"
                    open={this.state.dialogOpen}
                    title={title}
                    appBarProps={{
                        actions: [
                            {
                                node: <div class="large-multi-select-search-box-container">
                                    <div class="lms-search-icon-container">
                                        <SearchIcon />
                                    </div>
                                    <input
                                        class="lms-search-box"
                                        value={this.state.search}
                                        onChange={e => this.setState({ search: e.target.value })}
                                        ref={node => this.searchBox = node}
                                        placeholder={locale.largeMultiSelect.search} />
                                </div>,
                            },
                        ],
                    }}>
                    <MulticolList
                        columns={2}
                        ref={node => this.#multicolList = node}
                        itemHeight={LI_HEIGHT}>
                        {selectedItems.concat(availableItems)}
                    </MulticolList>
                    <div class="lms-footer">
                        <div class="lms-selection-controls">
                            <Button onClick={this.selectAll} class="lms-selection-button">
                                {locale.largeMultiSelect.selectAll}
                            </Button>
                            <Button onClick={this.deselectAll} class="lms-selection-button">
                                {locale.largeMultiSelect.deselectAll}
                            </Button>
                        </div>
                        <div class="lms-confirmation">
                            <Button raised onClick={() => this.setState({ dialogOpen: false })}>
                                {locale.largeMultiSelect.ok}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            </div>
        );
    }
}
