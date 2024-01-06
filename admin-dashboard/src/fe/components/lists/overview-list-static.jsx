import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, CircularProgress } from 'yamdl';
import ArrowLeftIcon from '@material-ui/icons/ChevronLeft';
import ArrowRightIcon from '@material-ui/icons/ChevronRight';
import { coreContext } from '../../core/connection';
import DynamicHeightDiv from '../layout/dynamic-height-div';
import ListItem from './overview-list-item';
import DisplayError from '../utils/error';
import { data as dataLocale, search as searchLocale } from '../../locale';
import './overview-list-static.less';

/**
 * Because the OverviewList component is very unwieldy, this is a variant that is specifically
 * meant for being embedded. This does not have any fancy `parameters` integration or anything
 * like that.
 *
 * # Props
 * - task, view, options, viewOptions, locale: same as OL
 * - fields: same as OL, but all of them will be shown (in order)
 * - sorting: optional object { [field]: sorting }
 * - jsonFilter: optional JSON filter
 * - search: same as parameters.search in OL
 * - offset/onSetOffset: list offset
 * - limit: page limit
 * - emptyLabel: empty label
 * - onItemClick: callback (id) => void
 * - compact: bool
 * - selection: same as OL
 */
export default class StaticOverviewList extends PureComponent {
    static contextType = coreContext;

    state = {
        loading: false,
        error: null,
        result: null,
        animateBackwards: false,
    };

    #currentTask = null;
    #nextLoadIsBackwards = false;
    #lastPageChangeTime = null;

    load () {
        if (this.#currentTask) this.#currentTask.drop();
        const { task, options, fields, sorting, offset, limit, jsonFilter } = this.props;
        this.setState({ loading: true });

        const s = sorting || {};
        const params = {
            fields: Object.keys(fields).map(f => ({ id: f, sorting: s[f] || 'none' })),
            jsonFilter: jsonFilter ? { filter: jsonFilter } : null,
            offset,
            limit,
        };

        if (this.props.search) params.search = this.props.search;

        const t = this.#currentTask = this.context.createTask(task, options || {}, params);

        this.#currentTask.runOnceAndDrop().then(result => {
            if (this.#currentTask !== t) return;
            this.setState({
                result,
                error: null,
                loading: false,
                animateBackwards: this.#nextLoadIsBackwards,
            });

            if (offset >= result.total && result.total !== 0) {
                // we’re out of bounds; adjust
                this.props.onSetOffset(Math.floor(result.total / limit) * limit);
            } else {
                this.#nextLoadIsBackwards = false;
            }
        }).catch(error => {
            if (this.#currentTask !== t) return;
            this.#nextLoadIsBackwards = false;
            console.error(error); // eslint-disable-line no-console
            this.setState({ result: null, error, loading: false });
        });
    }

    componentDidMount () {
        this.load();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.offset !== this.props.offset
            || prevProps.limit !== this.props.limit
            || prevProps.search?.field !== this.props.search?.field
            || prevProps.search?.query !== this.props.search?.query) {
            if (prevProps.offset > this.props.offset) this.#nextLoadIsBackwards = true;
            this.load();
        }
        if (prevProps.task !== this.props.task
            || prevProps.view !== this.props.view) {
            this.setState({ error: null, result: null });
            this.load();
        }
    }

    #prevPage = () => {
        const { offset, limit } = this.props;
        if (offset > 0) this.props.onSetOffset(Math.max(0, offset - limit));
    };
    #nextPage = () => {
        const { offset, limit } = this.props;
        const maxOffset = Math.ceil(((this.state.result ? this.state.result.total : 0) - 1) / limit) * limit;
        if (offset < maxOffset) this.props.onSetOffset(Math.min(maxOffset, offset + limit));
    };

    render ({
        view,
        viewOptions,
        fields,
        compact,
        locale,
        onItemClick,
        emptyLabel,
        offset,
        limit,
        selection,
        userData,
    }, { loading, error, result, animateBackwards }) {
        const selectedFields = Object.keys(fields).map(f => ({ id: f }));

        let contents = null;
        let pagination = null;
        if (error) {
            contents = (
                <div class="list-error">
                    <DisplayError error={error} />
                    <Button onClick={() => {
                        // without the delay it doesn't seem like it's doing anything if
                        // your connection is too fast
                        this.setState({ error: null, loading: true });
                        setTimeout(() => {
                            this.load();
                        }, 500);
                    }}>
                        {dataLocale.retry}
                    </Button>
                </div>
            );
        } else if (result) {
            contents = [];

            if (result.total === 0 && emptyLabel) {
                contents.push(<div class="empty-label">{emptyLabel}</div>);
            }

            let i = 0;
            for (const id of result.items) {
                const onClick = onItemClick
                    ? () => onItemClick(id)
                    : null;

                contents.push(
                    <ListItem
                        view={view}
                        options={viewOptions || {}}
                        onClick={onClick}
                        compact={compact}
                        key={id}
                        id={id}
                        selectedFields={selectedFields}
                        selection={selection}
                        fields={fields}
                        index={animateBackwards ? result.items.length - 1 - i : i}
                        animateBackwards={animateBackwards}
                        locale={locale}
                        userData={userData} />
                );
                i++;
            }
            if (result.total > limit) {
                const minItem = offset + 1;
                const maxItem = Math.min(result.total, offset + limit);

                pagination = (
                    <div class="list-pagination-inner">
                        <Button
                            class="pagination-button"
                            disabled={offset === 0}
                            icon small
                            onClick={this.#prevPage}>
                            <ArrowLeftIcon />
                        </Button>
                        <div class="pagination-inner-label">
                            {searchLocale.paginationItems(minItem, maxItem, result.total)}
                        </div>
                        <Button
                            class="pagination-button"
                            disabled={offset === Math.ceil(result.total / limit - 1) * limit}
                            icon small
                            onClick={this.#nextPage}>
                            <ArrowRightIcon />
                        </Button>
                    </div>
                );
            }
        }

        return (
            <div class="static-overview-list">
                <DynamicHeightDiv
                    class={'list-contents' + (loading ? ' is-loading' : '')}
                    useCooldown cooldown={400}
                    lastChangeTime={this.#lastPageChangeTime}>
                    {contents}
                    {loading ? <div class="list-loading">
                        <CircularProgress indeterminate />
                    </div> : null}
                </DynamicHeightDiv>
                <DynamicHeightDiv class="list-pagination">
                    {pagination}
                </DynamicHeightDiv>
            </div>
        );
    }
}
