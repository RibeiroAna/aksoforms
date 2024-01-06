import { h } from 'preact';
import { Fragment, PureComponent } from 'preact/compat';
import { Button, CircularProgress } from 'yamdl';
import ArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import ArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import ArrowLeftIcon from '@material-ui/icons/ChevronLeft';
import ArrowRightIcon from '@material-ui/icons/ChevronRight';
import UnfoldMoreIcon from '@material-ui/icons/UnfoldMore';
import RefreshIcon from '@material-ui/icons/Refresh';
import { coreContext } from '../../core/connection';
import Select from '../controls/select';
import { search as locale, data as dataLocale } from '../../locale';
import { deepEq } from '../../../util';
import DisplayError from '../utils/error';
import DynamicHeightDiv from '../layout/dynamic-height-div';
import ListItem, { lineLayout } from './overview-list-item';
import './overview-list.less';

const DEBOUNCE_TIME = 400; // ms
const DEFAULT_LIMITS = [10, 20, 50, 100];

const COMPACT_MAX_WIDTH = 600;

function scrollToNode (node) {
    if (!node) return;
    node.scrollIntoView && node.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Renders an overview list over the items given by the specified task.
 *
 * # Props
 * - task: task name. Output should adhere to a specific format (see e.g. codeholders/list)
 * - view: view name for detail views.
 * - options: task options
 * - parameters: task parameters. should adhere to a specific format (See e.g. codeholders/list)
 *     - fields: objects may also have a `fixed` property to indicate fixed fields.
 * - viewOptions: view options
 * - expanded: bool, whether search/filters are expanded
 * - fields: field renderers
 * - onGetItemLink: should return a link to an item’s detail view
 * - outOfTree: will use out-of-tree navigation to open detail views
 * - onSetFields: callback for changing fields. If set, will show inline sorting controls.
 *     - Make sure to also set sortable: true on field renderers wher esorting is supported
 * - onSetOffset: callback for changing the current page
 * - onSetLimit: callback for changing the current items per page
 * - onResult: result callback
 * - locale: localized field names
 * - notice: optional string to show below stats
 * - selection: if given will show checkboxes for selection. should have the Set interface, i.e.
 *   add, delete, has
 * - updateView: argument list to create a data view that emits updates (if available)
 * - limits: available limit options. if not given, will use default
 * - compact: if true, will force compact view
 * - compactItems: if true, will force compact view, but only for items
 * - userData: user data to pass to fields
 * - waitUntilFiltersLoaded: delay first load until after filters have loaded
 */
export default class OverviewList extends PureComponent {
    static contextType = coreContext;

    state = {
        /** same as #stale; why is this not one variable? because setState is asynchronous */
        stale: true,
        /** true if a task is being run */
        loading: false,
        /** current error */
        error: null,
        /** current result */
        result: null,
        /** if true, will animate in backwards */
        animateBackwards: false,
    };

    /** whether the current data is stale (in relation to the options/parameters) */
    #stale = true;

    /** currently loading task */
    #currentTask = null;

    /** last time expanded was set to false */
    #lastCollapseTime = 0;

    /** last time a page change button was pressed */
    #lastPageChangeTime = 0;

    /** If true, will animate backwards and subsequently set this to false. */
    #nextLoadIsBackwards = false;

    // node to scroll to on next load
    #scrollToNodeOnLoad = null;

    #listMetaNode = null;
    #compactPrevPageButton = null;
    #compactNextPageButton = null;

    load () {
        if (this.#currentTask) this.#currentTask.drop();
        const { task, options, parameters } = this.props;
        this.setState({ loading: true });
        const t = this.#currentTask = this.context.createTask(task, options || {}, parameters);
        this.#currentTask.runOnceAndDrop().then(result => {
            if (this.#currentTask !== t) return;
            this.setState({
                result,
                error: null,
                stale: false,
                loading: false,
                animateBackwards: this.#nextLoadIsBackwards,
            });
            if (this.props.onResult) this.props.onResult(result);

            if (this.#scrollToNodeOnLoad) {
                scrollToNode(this.#scrollToNodeOnLoad);
                this.#scrollToNodeOnLoad = null;
            }

            if (this.props.parameters.offset >= result.total && result.total !== 0) {
                // we’re out of bounds; adjust
                const limit = this.props.parameters.limit;
                this.props.onSetOffset(Math.floor(result.total / limit) * limit);
            } else {
                this.#nextLoadIsBackwards = false;
            }
        }).catch(error => {
            if (this.#currentTask !== t) return;
            this.#nextLoadIsBackwards = false;
            console.error(error); // eslint-disable-line no-console
            this.setState({ result: null, error, stale: false, loading: false });
        });
    }

    #reloadTimeout;
    #skipNextDebounce = !this.props.waitUntilFiltersLoaded;

    /** Might trigger a reload. */
    maybeReload () {
        if (this.#stale && !this.props.expanded) {
            if (this.#skipNextDebounce) {
                this.#skipNextDebounce = false;
                clearTimeout(this.#reloadTimeout);
                this.load();
            } else if (!this.#reloadTimeout) {
                this.#reloadTimeout = setTimeout(() => {
                    clearTimeout(this.#reloadTimeout);
                    this.#reloadTimeout = null;
                    this.load();
                }, DEBOUNCE_TIME);
            }
            this.#stale = false;
        }
    }

    #updateView;

    bindUpdates () {
        if (this.#updateView) this.unbindUpdates();
        if (!this.props.updateView) return;
        this.#updateView = this.context.createDataView(...this.props.updateView);
        this.#updateView.on('update', () => {
            this.#stale = true;
            this.setState({ stale: true });
        });
    }

    unbindUpdates () {
        if (!this.#updateView) return;
        this.#updateView.drop();
        this.#updateView = null;
    }

    #onWindowResize = () => this.forceUpdate();

    componentDidMount () {
        this.maybeReload();
        this.bindUpdates();
        window.addEventListener('resize', this.#onWindowResize);
    }

    componentDidUpdate (prevProps) {
        const paramsDidChange = this.props.useDeepCmp
            ? !deepEq(prevProps.options, this.props.options) || !deepEq(prevProps.parameters, this.props.parameters)
            : prevProps.options !== this.props.options || prevProps.parameters !== this.props.parameters;

        if (paramsDidChange || (prevProps.task !== this.props.task)) {
            this.#stale = true;
            this.setState({ stale: true });
        }

        if (prevProps.expanded && !this.props.expanded) {
            this.#lastCollapseTime = Date.now();
            this.#nextLoadIsBackwards = false;
            this.setState({ animateBackwards: false });
        }

        if (!deepEq(prevProps.updateView, this.props.updateView)) {
            this.bindUpdates();
        }

        this.maybeReload();
    }

    componentWillUnmount () {
        clearTimeout(this.#reloadTimeout);
        this.unbindUpdates();
        window.removeEventListener('resize', this.#onWindowResize);
    }

    onPrevPageClick = e => {
        const isCompact = e.currentTarget.classList.contains('compact-page-button');
        const { parameters } = this.props;
        this.#skipNextDebounce = true;
        this.#nextLoadIsBackwards = true;
        this.props.onSetOffset(
            Math.max(0, Math.floor(parameters.offset / parameters.limit) - 1) * parameters.limit,
        );
        this.#lastPageChangeTime = Date.now();

        if (isCompact) {
            this.#scrollToNodeOnLoad = this.#compactNextPageButton.button;
        } else {
            this.#scrollToNodeOnLoad = this.#listMetaNode;
        }
    };

    onNextPageClick = e => {
        const isCompact = e.currentTarget.classList.contains('compact-page-button');
        const { parameters } = this.props;
        const { result } = this.state;
        if (!result) return;
        const maxPage = Math.floor((result.total - 1) / parameters.limit);
        this.#skipNextDebounce = true;
        this.props.onSetOffset(Math.min(
            maxPage,
            Math.floor(parameters.offset / parameters.limit) + 1
        ) * parameters.limit);
        this.#lastPageChangeTime = Date.now();

        if (isCompact) {
            this.#scrollToNodeOnLoad = this.#compactPrevPageButton.button;
        } else {
            this.#scrollToNodeOnLoad = this.#listMetaNode;
        }
    };

    render ({
        expanded,
        fields,
        parameters,
        onGetItemLink,
        outOfTree,
        onSetFields,
        locale: localizedFields,
        view,
        notice,
        selection,
        compact,
        userData,
    }, { error, result, stale, loading, animateBackwards }) {
        let className = 'overview-list';
        if (expanded) className += ' search-expanded';
        if (selection) className += ' is-selectable';
        if (stale) className += ' stale';

        const useCompactLayout = compact || window.innerWidth <= COMPACT_MAX_WIDTH;
        if (useCompactLayout) className += ' compact-layout';

        let stats, contents, paginationText;
        let prevDisabled = true;
        let nextDisabled = true;
        if (error) {
            contents = (
                <Fragment>
                    <DisplayError error={error} />
                    <div class="retry-button-container">
                        <Button class="retry-button" onClick={() => {
                            this.#stale = true;
                            this.#skipNextDebounce = true;
                            this.maybeReload();
                        }}>
                            {dataLocale.retry}
                        </Button>
                    </div>
                </Fragment>
            );
        } else if (result) {
            const selectedFields = parameters.fields;
            const selectedFieldIds = selectedFields.map(x => x.id);
            let compiledFields = [];
            // first, push fixed fields
            for (const field of selectedFields) if (field.fixed) compiledFields.push(field);
            // then transient fields
            if (result.transientFields) {
                for (const id of result.transientFields) {
                    if (!selectedFieldIds.includes(id)) compiledFields.push({ id, transient: true });
                }
            }
            // finally, push user fields
            for (const field of selectedFields) if (!field.fixed) compiledFields.push(field);

            compiledFields = compiledFields.filter(({ id }) => fields[id] && !fields[id].hide);

            const setFieldSorting = !!onSetFields && ((id, sorting) => {
                const newFields = selectedFields.slice();
                let found = false;
                for (let i = 0; i < newFields.length; i++) {
                    const f = newFields[i];
                    if (f.id === id) {
                        newFields[i] = { ...f, sorting };
                        found = true;
                    } else if (f.sorting !== 'none') {
                        // set sorting on all other fields to none
                        newFields[i] = { ...f, sorting: 'none' };
                    }
                }
                if (!found && result.transientFields && result.transientFields.includes(id)) {
                    newFields.push({ id, sorting });
                }
                onSetFields(newFields);
            });

            if (result.stats) {
                stats = locale.stats(
                    result.items.length,
                    result.stats.filtered,
                    result.total,
                    result.stats.time,
                );
            }

            paginationText = locale.paginationItems(
                Math.min(result.total, parameters.offset + 1),
                Math.min(result.total, parameters.offset + parameters.limit),
                result.total,
            );

            prevDisabled = parameters.offset === 0;
            nextDisabled = parameters.offset + parameters.limit >= result.total;

            contents = [
                <ListHeader
                    key="header"
                    selectedFields={compiledFields}
                    setFieldSorting={setFieldSorting}
                    selection={selection}
                    fields={fields}
                    locale={localizedFields}
                    hasActiveSearch={!!parameters.search?.query} />,
            ];

            contents.push(...result.items.map((id, i) => <ListItem
                view={view}
                compact={useCompactLayout || this.props.compactItems}
                cursed={result.cursed && result.cursed.includes(id)}
                key={id}
                id={id}
                options={this.props.viewOptions || {}}
                selectedFields={compiledFields}
                fields={fields}
                onGetItemLink={onGetItemLink}
                outOfTree={outOfTree}
                index={animateBackwards ? result.items.length - i - 1 : i}
                animateBackwards={animateBackwards}
                skipAnimation={result.items.length > 100 && i > 30}
                selection={selection}
                expanded={expanded}
                lastCollapseTime={this.#lastCollapseTime}
                userData={userData}
                locale={localizedFields} />));
        }

        return (
            <div class={className}>
                <header class="list-meta" ref={node => this.#listMetaNode = node}>
                    <span>{stats}</span>
                    <ListRefreshButton loading={loading} onClick={() => {
                        this.setState({ stale: true, loading: true });
                        // fake load delay because actual load times are actually way too fast
                        // to see any loading happening
                        this.#reloadTimeout = setTimeout(() => {
                            this.#reloadTimeout = null;
                            this.load();
                        }, 300);
                    }} />
                </header>
                {notice ? <div class="list-notice">{notice}</div> : null}
                <Button
                    class="compact-page-button prev-page-button"
                    onClick={this.onPrevPageClick}
                    disabled={prevDisabled}
                    ref={node => this.#compactPrevPageButton = node}>
                    <ArrowUpIcon />
                    <div class="page-button-label">{locale.prevPage}</div>
                </Button>
                <DynamicHeightDiv
                    class="list-contents"
                    useCooldown
                    cooldown={PAGE_CHANGE_COOLDOWN}
                    lastChangeTime={this.#lastPageChangeTime}>
                    {contents}
                </DynamicHeightDiv>
                <Button
                    class="compact-page-button next-page-button"
                    onClick={this.onNextPageClick}
                    disabled={nextDisabled}
                    ref={node => this.#compactNextPageButton = node}>
                    <div class="page-button-label">{locale.nextPage}</div>
                    <ArrowDownIcon />
                </Button>
                <div class="compact-pagination">
                    {paginationText}
                </div>
                <div class="regular-pagination">
                    <div />
                    <div class="pagination-buttons">
                        <Select
                            value={parameters.limit}
                            onChange={value => {
                                this.props.onSetLimit(value | 0);
                            }}
                            items={(this.props.limits || DEFAULT_LIMITS).map(limit => ({
                                value: limit,
                                label: '' + limit,
                            }))} />
                        <Button class="page-button" icon onClick={this.onPrevPageClick} disabled={prevDisabled}>
                            <ArrowLeftIcon />
                        </Button>
                        <div class="pagination-text">{paginationText}</div>
                        <Button class="page-button" icon onClick={this.onNextPageClick} disabled={nextDisabled}>
                            <ArrowRightIcon />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }
}

// time interval after changing page during which the results list will not change height
const PAGE_CHANGE_COOLDOWN = 400; // ms

function ListHeader ({ fields, selectedFields, setFieldSorting, locale, selection, hasActiveSearch }) {
    const style = lineLayout(fields, selectedFields, selection);

    const cells = selectedFields.map(({ id, sorting, transient }) => {
        const sortable = fields[id].sortable && setFieldSorting;

        return (
            <div
                key={id}
                class={'list-header-cell' + (sortable ? ' is-sortable' : '') + (transient ? ' is-transient' : '')}
                onClick={() => {
                    if (!sortable) return;
                    const newSorting = sorting === 'asc' ? 'desc' : sorting === 'desc' ? 'none' : 'asc';
                    setFieldSorting(id, newSorting);
                }}>
                <div class="cell-label" title={locale[id]}>{locale[id]}</div>
                {sortable ? (
                    <div class={`cell-sorting sorting-${sorting}` + (hasActiveSearch ? ' is-ineffective' : '')}>
                        {sorting === 'asc'
                            ? <ArrowUpIcon />
                            : sorting === 'desc'
                                ? <ArrowDownIcon />
                                : <UnfoldMoreIcon />}
                    </div>
                ) : null}
            </div>
        );
    });

    if (selection) {
        cells.unshift(<div key="selection" class="list-header-cell selection-cell"></div>);
    }

    return <div class="overview-list-item list-header" style={style}>{cells}</div>;
}

class ListRefreshButton extends PureComponent {
    state = {
        loading: this.props.loading,
        hideButton: this.props.loading,
    };

    stopLoadingTimeout = null;
    unhideButtonTimeout = null;
    componentDidUpdate (prevProps) {
        if (prevProps.loading !== this.props.loading) {
            if (!this.props.loading) {
                this.stopLoadingTimeout = setTimeout(() => {
                    this.setState({ loading: false });
                }, 150);
                this.unhideButtonTimeout = setTimeout(() => {
                    this.setState({ hideButton: false });
                }, 1000);
            } else {
                clearTimeout(this.stopLoadingTimeout);
                clearTimeout(this.unhideButtonTimeout);
                this.setState({ loading: true, hideButton: true });
            }
        }
    }
    componentWillUnmount () {
        clearTimeout(this.unhideTimeout);
    }

    render ({ onClick }, { loading, hideButton }) {
        return (
            <span class={'list-refresh' + (loading ? ' is-loading' : '')}>
                <CircularProgress class="loading-indicator" indeterminate={loading} small />
                <Button
                    icon
                    small
                    class={'refresh-button' + (hideButton ? ' is-loading' : '')}
                    onClick={onClick}>
                    <RefreshIcon style={{ verticalAlign: 'middle' }} />
                </Button>
            </span>
        );
    }
}
