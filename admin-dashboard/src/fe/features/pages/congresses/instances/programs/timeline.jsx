import { h } from 'preact';
import { Fragment, PureComponent } from 'preact/compat';
import moment from 'moment';
import { Button, CircularProgress } from 'yamdl';
import DynamicHeightDiv from '../../../../../components/layout/dynamic-height-div';
import TinyProgress from '../../../../../components/controls/tiny-progress';
import DisplayError from '../../../../../components/utils/error';
import OverviewListItem from '../../../../../components/lists/overview-list-item';
import { connect, coreContext } from '../../../../../core/connection';
import {
    congressPrograms as locale,
    congressLocations as locationsLocale,
} from '../../../../../locale';
import { OVERVIEW_FIELDS } from './fields';
import PrintProgram from './print';
import './timeline.less';

function layoutRegions (items, hourHeight, startBound) {
    // lay out items in columns, such that overlapping items are simply put beside existing
    // ones.
    // these columns are split into regions, such that items that don't have any overlap
    // can make use of the full width of the container.

    // timestamps at which some event starts or ends
    const splits = [];
    const eventsStartingAtSplit = new Map();
    const eventsEndingAtSplit = new Map();
    const itemsById = new Map();

    const addSplit = time => {
        if (!splits.includes(time)) {
            splits.push(time);
            if (!eventsStartingAtSplit.has(time)) eventsStartingAtSplit.set(time, []);
            if (!eventsEndingAtSplit.has(time)) eventsEndingAtSplit.set(time, []);
        }
    };

    addSplit(startBound);

    for (const info of items) {
        addSplit(info.start);
        addSplit(info.end);
        eventsStartingAtSplit.get(info.start).push(info.id);
        eventsEndingAtSplit.get(info.end).push(info.id);
        itemsById.set(info.id, info);
    }
    splits.sort((a, b) => a - b); // sort ascending

    let y = 0;
    const splitsY = new Map(); // mapping from split to Y offset
    let lastT = null;
    for (const t of splits) {
        const deltaHours = (lastT !== null) ? (t - lastT) / 3600 : 0;
        lastT = t;
        const splitHasItem = (lastT !== null) ? !!eventsEndingAtSplit.get(t).length : false;
        if (splitHasItem) {
            y += hourHeight * deltaHours;
        } else {
            y += hourHeight * deltaHours;
        }
        splitsY.set(t, y);
    }

    const regions = [[]];
    const occupiedColumns = [];
    for (const t of splits) {
        const ending = eventsEndingAtSplit.get(t);

        for (const id of ending) {
            // free the column occupied by this event
            const col = occupiedColumns.indexOf(id);
            if (col < 0) continue;
            occupiedColumns[col] = null;
        }

        // if all columns are free, then this is the end of a region
        const isEndOfRegion = occupiedColumns.reduce((a, b) => a === null && b === null, true);
        if (isEndOfRegion && regions[regions.length - 1].length) {
            regions.push([]);
            occupiedColumns.splice(0); // clear
        }

        const region = regions[regions.length - 1];
        const starting = eventsStartingAtSplit.get(t);

        for (const id of starting) {
            // find a free column and occupy it
            const freeCol = occupiedColumns.indexOf(null);
            const info = itemsById.get(id);

            const start = splitsY.get(info.start);
            let end = splitsY.get(info.end);

            // enforce min item height
            end = Math.max(end, start + 60);

            const item = {
                id,
                start,
                end,
            };

            const occupy = info.start < info.end;

            if (freeCol >= 0) {
                if (occupy) occupiedColumns[freeCol] = id;
                region[freeCol].push(item);
            } else {
                // no free column; add one
                if (occupy) occupiedColumns.push(id);
                else occupiedColumns.push(null);
                region.push([item]);
            }
        }
    }

    const outRegions = [];
    for (let i = 0; i < regions.length; i++) {
        const region = regions[i];
        if (!region.length) continue;
        let start = Infinity;
        let end = -Infinity;
        for (const col of region) {
            for (const item of col) {
                start = Math.min(start, item.start);
                end = Math.max(end, item.end);
            }
        }

        outRegions.push({
            items: region,
            start,
            end,
        });
    }

    return outRegions;
}

export function layoutByColumns (items, getItemInfo) {
    const missingItems = [];
    const hourHeight = 40;

    const columns = new Map();
    let minBound = Infinity;
    let maxBound = -Infinity;

    // collect columns and bounds
    {
        for (const id of items) {
            const info = getItemInfo(id);
            if (!info) {
                missingItems.push(id);
                continue;
            }

            if (!columns.has(info.column)) columns.set(info.column, []);
            columns.get(info.column).push({ id, start: info.start, end: info.end });

            if (info.start < minBound) minBound = info.start;
            if (info.end > maxBound) maxBound = info.end;
        }

        for (const k in columns.keys()) {
            columns.get(k).sort((a, b) => a.start - b.start);
        }
    }

    // layout subcolumns
    const output = [];
    for (const [columnKey, columnItems] of columns) {
        const regions = layoutRegions(columnItems, hourHeight, minBound);

        let maxRegionWidth = 1;
        for (const region of regions) {
            maxRegionWidth = Math.max(maxRegionWidth, region.items.length);
        }

        output.push({
            key: columnKey,
            regions,
            maxRegionWidth,
        });
    }

    return {
        columns: output,
        height: hourHeight * (maxBound - minBound) / 3600,
        timeStart: minBound,
        timeEnd: maxBound,
        hourHeight,
        missingItems,
    };
}

/**
 * Renders a timeline of program items.
 *
 * # Props
 * - congress/instance: ids
 * - dateFrom/dateTo: congress date bounds
 * - tz: time zone
 * - byRoom: bool
 */
export default class ProgramTimeline extends PureComponent {
    state = {
        date: null,
    };

    componentDidMount () {
        this.setState({
            date: this.props.dateFrom,
        });
    }

    render ({ congress, instance, tz, byRoom }, { date }) {
        return (
            <div class="congress-program-timeline">
                <Button
                    onClick={() => this.setState({ printingProgram: true })}>
                    {locale.print.menuItem}

                    <PrintProgram
                        congress={congress}
                        instance={instance}
                        byLocation={byRoom}
                        date={date}
                        tz={tz}
                        open={this.state.printingProgram}
                        onClose={() => this.setState({ printingProgram: false })} />
                </Button>
                <TimelineDatePicker
                    value={date}
                    onChange={date => this.setState({ date })}
                    dateFrom={this.props.dateFrom}
                    dateTo={this.props.dateTo}
                    tz={tz} />
                <TimelineDayView
                    byRoom={this.props.byRoom}
                    congress={congress}
                    instance={instance}
                    date={date}
                    tz={tz} />
            </div>
        );
    }
}

class TimelineDatePicker extends PureComponent {
    loadIfNull () {
        if (!this.props.value && this.props.dateFrom) {
            this.props.onChange(this.props.dateFrom);
        }
    }

    componentDidMount () {
        this.loadIfNull();
    }

    componentDidUpdate () {
        this.loadIfNull();
    }

    render ({ value, onChange, dateFrom, dateTo }) {
        const dates = [];
        const index = moment(dateFrom);
        const end = moment(dateTo);
        let lastMonth = null;
        while (index <= end) {
            const isToday = !moment().isSame(index, 'd');
            const isSelected = index.isSame(value, 'd');
            let month = index.format('MMM');
            if (month === lastMonth) month = null;
            else lastMonth = month;
            const date = index.format('D');
            const val = index.format('YYYY-MM-DD');

            dates.push(
                <button
                    disabled={isSelected}
                    onClick={() => onChange(val)}
                    class={'picker-date' + (isToday ? ' is-today' : '')}>
                    <div class="date-month">
                        {month}
                    </div>
                    <div class="date-date">
                        {date}
                    </div>
                </button>
            );

            index.add(1, 'd');
        }

        return (
            <div class="timeline-date-picker">
                {dates}
            </div>
        );
    }
}

export function TimelineDayViewLayout ({
    byLocation,
    congress,
    instance,
    tz,
    DayViewItem,
    LocationHeader,
    layout,
    onLoadItemInfo,
    useMinWidth,
}) {
    const contents = [];

    const { columns, timeStart, timeEnd, hourHeight, missingItems } = layout;
    const MIN_COL_WIDTH = 120;

    contents.push(
        <HoursOfTheDay
            key="_hoursOfTheDay"
            hasHeader={byLocation}
            tz={tz}
            start={timeStart}
            end={timeEnd}
            hourHeight={hourHeight} />
    );

    for (const column of columns) {
        const columnNodes = [];

        if (byLocation) {
            columnNodes.push(
                <LocationHeader
                    key="_header"
                    congress={congress}
                    instance={instance}
                    id={column.key} />
            );
        }

        for (const region of column.regions) {
            const regionNodes = [];

            let colIndex = 0;

            for (const col of region.items) {
                let prevStart = null;
                let prevEnd = null;
                let overlap = 0;

                for (const item of col) {
                    const isOverlapping = prevEnd && item.start < prevEnd;
                    if (isOverlapping) overlap++;
                    else overlap = 0;
                    const start = prevStart ? Math.max(item.start, prevStart + 10) : item.start;
                    prevStart = start;
                    prevEnd = item.end;

                    const itemHeight = (item.end - item.start) * hourHeight;

                    regionNodes.push(
                        <DayViewItem
                            short={itemHeight < 96}
                            col={colIndex}
                            cols={region.items.length}
                            start={start}
                            end={item.end}
                            overlap={overlap}
                            congress={congress}
                            instance={instance}
                            key={item.id}
                            id={item.id}
                            tz={tz}
                            isByLocation={byLocation}
                            onLoadInfo={info => onLoadItemInfo(item.id, info)}
                            onGetItemLink={(id) => {
                                return `/kongresoj/${congress}/okazigoj/${instance}/programeroj/${id}`;
                            }} />
                    );
                }
                colIndex += 1;
            }

            const minWidth = useMinWidth ? MIN_COL_WIDTH * region.items.length : null;
            const height = region.end;
            columnNodes.push(
                <div class="day-view-region" style={{ minWidth, height }}>
                    {regionNodes}
                </div>
            );
        }

        contents.push(
            <div class="day-view-column" key={column.key} style={{
                '--max-region-width': column.maxRegionWidth,
            }}>
                {columnNodes}
            </div>
        );
    }

    for (const id of missingItems) {
        contents.push(
            <DayViewItem
                congress={congress}
                instance={instance}
                key={id}
                id={id}
                onLoadInfo={info => onLoadItemInfo(id, info)} />
        );
    }

    return contents;
}

class TimelineDayView extends PureComponent {
    state = {
        loading: false,
        error: null,
        items: null,
    };

    static contextType = coreContext;

    #updateView;

    createUpdateView () {
        if (this.#updateView) this.#updateView.drop();
        this.#updateView = this.context.createDataView('congresses/sigPrograms', {
            congress: this.props.congress,
            instance: this.props.instance,
        });
        this.#updateView.on('update', () => this.load());
    }

    load () {
        this.setState({ loading: true });
        const loadingDate = this.props.date;
        this.#doLoad().then(items => {
            if (loadingDate !== this.props.date) return;
            this.setState({ items, error: null });
        }).catch(error => {
            console.error(error); // eslint-disable-line no-console
            this.setState({ error });
        }).then(() => this.setState({ loading: false }));
    }

    #doLoad = async () => {
        const options = {
            congress: this.props.congress,
            instance: this.props.instance,
        };
        const { date, tz } = this.props;
        if (!date) return null;

        const lowerBound = moment.tz(date, tz);
        const upperBound = moment(lowerBound).add(1, 'd');

        const dayRange = [lowerBound.unix(), upperBound.unix()];

        let total = null;
        let count = 0;
        const items = [];

        while (count < total || total === null) {
            const res = await this.context.createTask('congresses/listPrograms', options, {
                jsonFilter: {
                    filter: {
                        $or: [
                            { timeFrom: { $range: dayRange } },
                            { timeTo: { $range: dayRange } },
                        ],
                    },
                },
                offset: count,
                limit: 100,
            }).runOnceAndDrop();

            total = res.total;
            count += res.items.length;
            if (count < total && res.items.length === 0) break;

            items.push(...res.items);
        }
        return items;
    };

    componentDidMount () {
        this.load();
        this.createUpdateView();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.date !== this.props.date) {
            this.load();
            this.createUpdateView();
        }
    }

    componentWillUnmount () {
        if (this.#updateView) this.#updateView.drop();
    }

    // item id -> item time bounds / location
    #itemInfo = new Map();

    getItemInfo (id) {
        return this.#itemInfo.get(id);
    }

    onLoadItemInfo (id, bounds) {
        this.#itemInfo.set(id, bounds);
        this.scheduleLayout();
    }

    scheduleLayout () {
        if (this.scheduledLayout) return;
        this.scheduledLayout = setTimeout(() => {
            this.scheduledLayout = null;
            this.forceUpdate();
        }, 50);
    }

    layoutTimeline () {
        const { items } = this.state;
        return layoutByColumns(items, id => {
            const info = this.getItemInfo(id);
            if (!info) return null;
            return {
                column: null,
                start: info.start,
                end: info.end,
            };
        });
    }

    layoutByLocation () {
        const { items } = this.state;
        return layoutByColumns(items, id => {
            const info = this.getItemInfo(id);
            if (!info) return null;
            return {
                column: info.location,
                start: info.start,
                end: info.end,
            };
        });
    }

    layout () {
        if (this.props.byRoom) return this.layoutByLocation();
        return this.layoutTimeline();
    }

    renderContents () {
        if (!this.state.items.length) {
            return <div class="day-view-status">{locale.timeline.empty}</div>;
        }

        const { congress, instance, tz } = this.props;
        const layout = this.layout();

        return (
            <TimelineDayViewLayout
                useMinWidth
                congress={congress}
                instance={instance}
                tz={tz}
                LocationHeader={LocationHeader}
                DayViewItem={DayViewItem}
                byLocation={this.props.byRoom}
                layout={layout}
                onLoadItemInfo={this.onLoadItemInfo.bind(this)} />
        );
    }

    render (_, { loading, error, items }) {
        return (
            <DynamicHeightDiv class="timeline-day-view">
                {loading ? (
                    <div class="day-view-status">
                        <CircularProgress indeterminate />
                    </div>
                ) : error ? (
                    <div class="day-view-status">
                        <DisplayError error={error} />
                    </div>
                ) : items ? (
                    <div class="day-view-contents">
                        {this.renderContents()}
                    </div>
                ) : null}
                <div class="day-view-bottom-padding" />
            </DynamicHeightDiv>
        );
    }
}

const DayViewItem = connect(({ congress, instance, id }) =>
    ['congresses/program', { congress, instance, id }])(data => ({
    data,
}))(class DayViewItem extends PureComponent {
    componentDidUpdate (prevProps) {
        const prevData = prevProps.data || {};
        const thisData = this.props.data || {};
        if (prevData.timeFrom !== thisData.timeFrom || prevData.timeTo !== thisData.timeTo) {
            this.props.onLoadInfo({
                start: thisData.timeFrom,
                end: thisData.timeTo,
                location: thisData.location,
            });
        }
    }

    render ({
        col, cols, overlap,
        congress,
        instance,
        id, tz,
        start, end, data,
        onGetItemLink,
        isByLocation,
    }) {
        if (!data || !cols) return null;

        const height = end - start;

        let fields = isByLocation ? BYLOC_SELECTED_FIELDS : SELECTED_FIELDS;
        if (this.props.short) {
            fields = SELECTED_FIELDS_SHORT;
            if (height > 40) {
                fields = SELECTED_FIELDS_LESS_SHORT;
            }
        }

        return (
            <div class="timeline-item" style={{
                width: `calc(${100 / cols}% - ${overlap * 20}px)`,
                left: `calc(${(col / cols) * 100}% + ${overlap * 20}px)`,
                top: start,
                height,
            }} data-color={data.location % 8}>
                <OverviewListItem
                    compact view="congresses/program"
                    skipAnimation
                    id={id}
                    options={{ congress, instance }}
                    selectedFields={fields}
                    fields={OVERVIEW_FIELDS}
                    index={0}
                    locale={locale.fields}
                    userData={{ congress, instance, tz }}
                    onGetItemLink={onGetItemLink} />
            </div>
        );
    }
});

const SELECTED_FIELDS = ['title', 'timeLoc', 'description'].map(x => ({ id: x, sorting: 'none' }));
const SELECTED_FIELDS_SHORT = ['title'].map(x => ({ id: x, sorting: 'none' }));
const SELECTED_FIELDS_LESS_SHORT = ['title', 'time'].map(x => ({ id: x, sorting: 'none' }));

const BYLOC_SELECTED_FIELDS = ['title', 'time', 'description'].map(x => ({ id: x, sorting: 'none' }));

function HoursOfTheDay ({ start, end, hourHeight, tz, hasHeader }) {
    const hours = [];
    let current = Math.floor(start / 3600) * 3600;
    let y = (current - start) / 3600 * hourHeight;

    while (current <= end) {
        hours.push(
            <div class={'hour-item' + (hasHeader ? ' has-header' : '')} style={{
                top: y,
                height: hourHeight,
            }}>
                <div class="inner-label">
                    {moment(current * 1000).tz(tz || 'UTC').format('HH:mm')}
                </div>
            </div>
        );
        current += 3600;
        y += hourHeight;
    }

    return (
        <Fragment>
            {hours}
        </Fragment>
    );
}

function LocationHeader ({ congress, instance, id }) {
    if (!id) {
        return (
            <div class="location-header is-nowhere">
                {locationsLocale.locatedWithinNowhere}
            </div>
        );
    } else {
        return (
            <RealLocationHeader
                congress={congress}
                instance={instance}
                id={id} />
        );
    }
}

const RealLocationHeader = connect(({ congress, instance, id }) => [
    'congresses/location', { congress, instance, id },
])(data => ({ data }))(function LocationHeader ({ data }) {
    let contents = <TinyProgress />;
    if (data) {
        contents = data.name;
    }

    return (
        <div class="location-header">
            {contents}
        </div>
    );
});
