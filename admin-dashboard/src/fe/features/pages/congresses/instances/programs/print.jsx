import { h, render } from 'preact';
import { useContext, useEffect, useState } from 'preact/compat';
import { Button,  CircularProgress } from 'yamdl';
import moment from 'moment';
import DialogSheet from '../../../../../components/tasks/dialog-sheet';
import { congressPrograms as locale } from '../../../../../locale';
import SearchFilters from '../../../../../components/overview/search-filters';
import DisplayError from '../../../../../components/utils/error';
import { date } from '../../../../../components/data';
import { coreContext } from '../../../../../core/connection';
import { FILTERS } from './filters';
import { OVERVIEW_FIELDS } from './fields';
import { layoutByColumns, TimelineDayViewLayout } from './timeline';
import printStyles from './print.noextract.css';
import './print.less';
import { LocationIcon } from '../locations/fields';

export default function PrintProgram ({
    congress,
    instance,
    tz,
    date,
    byLocation,
    open,
    onClose,
}) {
    return (
        <DialogSheet
            class="congress-program-print-dialog"
            open={open}
            onClose={onClose}
            title={locale.print.dialog.title}>
            <PrintDialog
                congress={congress}
                instance={instance}
                tz={tz}
                byLocation={byLocation}
                date={date} />
        </DialogSheet>
    );
}

function PrintDialog ({ date, congress, instance, tz, byLocation }) {
    const [params, setParams] = useState({
        filters: {
            timeSlice: {
                enabled: true,
                value: [
                    +moment.tz(date, tz || 'UTC').startOf('day').toDate() / 1000,
                    +moment.tz(date, tz || 'UTC').endOf('day').toDate() / 1000,
                ],
            },
        },
    });

    return (
        <div>
            <SearchFilters
                expanded
                value={params}
                onChange={setParams}
                filters={FILTERS}
                locale={locale.search}
                userData={{ congress, instance, tz }} />
            <LoadPrograms
                byLocation={byLocation}
                congress={congress}
                instance={instance}
                tz={tz}
                params={params} />
        </div>
    );
}

function LoadPrograms ({ congress, instance, tz, params, byLocation }) {
    const core = useContext(coreContext);
    const [loading, setLoading] = useState(false);
    const [loadedPercent, setLoadedPercent] = useState(0);
    const [loaded, setLoaded] = useState(null);
    const [error, setError] = useState(null);

    const load = () => {
        const loadingParams = params;
        setLoading(true);
        setError(null);

        const gen = loadAllPrograms(core, congress, instance, params);

        (async () => {
            setLoadedPercent(0);

            let result;
            for await (const [res, p] of gen) {
                if (loadingParams !== params) return;
                result = res;
                setLoadedPercent(p);
            }
            return result;
        })().then(res => {
            if (!res || loadingParams !== params) return;
            setLoading(false);
            setLoaded(res);
        }).catch(err => {
            if (loadingParams !== params) return;
            setLoading(false);
            setLoaded(null);
            setError(err);
        });
    };

    useEffect(() => {
        setLoaded(null);
    }, [params]);

    const print = () => {
        const printWindow = window.open('', undefined, 'popup');
        if (!printWindow) {
            this.context.createTask('info', {
                message: locale.print.failedToOpenPrintWindow,
            });
            return;
        }
        render(
            <coreContext.Provider value={core}>
                <PrintAction window={printWindow} />
                <PrintPrograms data={loaded} tz={tz} byLocation={byLocation} />
                <style>{printStyles}</style>
            </coreContext.Provider>,
            printWindow.document.body,
        );
    };

    if (loaded) {
        return (
            <div>
                <Button raised onClick={print}>
                    <span />
                    <span class="button-inner-label">
                        {locale.print.dialog.print}
                    </span>
                </Button>
            </div>
        );
    }

    return (
        <div>
            <Button raised class="print-load-button" onClick={load} disabled={loading}>
                {loading ? (
                    <span class="button-inner-progress">
                        <CircularProgress small value={loadedPercent} indeterminate={!loadedPercent} />
                    </span>
                ) : <span />}
                <span class="button-inner-label">
                    {locale.print.dialog.load}
                </span>
            </Button>
            {error && (
                <DisplayError error={error} />
            )}
        </div>
    );
}

async function* loadAllPrograms (core, congress, instance, params) {
    const instanceInfo = await core.viewData('congresses/instance', { congress, id: instance });

    const items = [];
    const locationIdsToLoad = [];

    while (true) { // eslint-disable-line no-constant-condition
        const res = await core.createTask('congresses/listPrograms', {
            congress, instance,
        }, {
            offset: items.length,
            limit: 100,
            filters: params.filters,
            fields: [{ id: 'timeFrom', sorting: 'asc' }],
        }).runOnceAndDrop();

        for (const id of res.items) {
            const data = await core.viewData('congresses/program', { congress, instance, id });
            items.push(data);

            if (data.location && !locationIdsToLoad.includes(data.location)) {
                locationIdsToLoad.push(data.location);
            }
        }

        yield [null, items.length / res.total / 2];

        if (!res.items.length || items.length >= res.total) {
            break;
        }
    }

    const locations = {};
    for (let i = 0; i < locationIdsToLoad.length; i += 100) {
        const batch = locationIdsToLoad.slice(i, i + 100);

        const res = await core.createTask('congresses/listLocations', {
            congress, instance,
        }, {
            offset: 0,
            limit: batch.length,
            jsonFilter: {
                filter: { id: { $in: batch } },
            },
        }).runOnceAndDrop();

        for (const id of res.items) {
            const data = await core.viewData('congresses/location', { congress, instance, id });
            locations[id] = data;
        }

        yield [null, 0.5 + (i + batch.length) / locationIdsToLoad.length / 2];
    }

    yield [{ items, locations, instanceInfo }, 1];
}

function PrintAction ({ window }) {
    useEffect(() => {
        window.print();
    }, []);

    return (
        <div class="print-action-container">
            <button onClick={() => window.print()}>{locale.print.print}</button>
        </div>
    );
}


function PrintPrograms ({ data, tz, byLocation }) {
    const byId = new Map();
    for (const item of data.items) {
        byId.set(item.id, item);
    }

    const byDate = new Map();
    for (const item of data.items) {
        const itemDate = moment.tz(item.timeFrom * 1000, tz || 'UTC').startOf('day').format('YYYY-MM-DD');
        if (!byDate.has(itemDate)) byDate.set(itemDate, []);
        byDate.get(itemDate).push(item);
    }

    const pages = [];

    for (const pageDate of [...byDate.keys()].sort()) {
        const layout = layoutByColumns(byDate.get(pageDate).map(x => x.id), id => {
            const item = byId.get(id);
            return {
                start: item.timeFrom,
                end: item.timeTo,
                column: byLocation ? item.location : null,
            };
        });

        pages.push(
            <div class="print-day">
                <h2 class="inner-date-title">
                    <date.renderer value={pageDate} />
                </h2>
                <div class="inner-layout">
                    <TimelineDayViewLayout
                        key={pageDate}
                        DayViewItem={PrintDayViewItem(data, byId)}
                        LocationHeader={PrintLocationHeader(data)}
                        layout={layout}
                        onLoadItemInfo={() => {}}
                        byLocation={byLocation}
                        congress={0}
                        instance={0}
                        tz={tz} />
                </div>
            </div>
        );
    }

    return (
        <div class="congress-program-print-layout">
            <h1 class="top-title">
                {locale.print.printTitle(data.instanceInfo?.name)}
            </h1>
            {pages}
        </div>
    );
}

const PrintDayViewItem = (data, itemsById) => function PrintDayViewItem ({
    short,
    col,
    cols,
    start,
    end,
    id,
    tz,
    isByLocation,
}) {
    const item = itemsById.get(id);
    const location = data.locations[item.location];

    return (
        <div class="program-event" data-color={item.location % 8} style={{
            width: `${100 / cols}%`,
            left: `${(col / cols) * 100}%`,
            top: start,
            height: end - start,
        }}>
            <div class="inner-title">
                {item.title}
            </div>
            <OVERVIEW_FIELDS.time.component
                item={item}
                value={null}
                userData={{ tz }} />
            {!isByLocation && (
                <div class="inner-loc">
                    <LocationIcon icon={location?.icon} slot="icon" />
                    {' '}
                    {location?.name}
                </div>
            )}
            {!short && (
                <div class="inner-desc">
                    <OVERVIEW_FIELDS.description.component
                        item={item}
                        value={item.description} />
                </div>
            )}
        </div>
    );
};

const PrintLocationHeader = data => function PrintLocationHeader ({ id }) {
    return (
        <div class="location-header">
            {data.locations[id]?.name}
        </div>
    );
};

