import { h } from 'preact';
import { Button, Checkbox, CircularProgress } from 'yamdl';
import { useEffect, useRef, useState } from 'preact/compat';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import Page from '../../../components/page';
import Meta from '../../meta';
import Select from '../../../components/controls/select';
import { date } from '../../../components/data';
import { statistics as locale } from '../../../locale';
import DisplayError from '../../../components/utils/error';
import { useDataView } from '../../../core';
import './index.less';
import Segmented from '../../../components/controls/segmented';
import { CategoryType, COUNTRY_TOTAL, encodeCategory, StatisticsData, useStatisticsHistory } from './data';

export default class StatisticsPage extends Page {
    render () {
        return (
            <div>
                <Meta
                    title={locale.title} />
                <Statistics />
            </div>
        );
    }
}

function Statistics () {
    return (
        <div>
            <MembershipsAndRoles />
        </div>
    );
}

function MembershipsAndRoles () {
    const [,, countries] = useDataView('countries/countries', {});
    const data = StatisticsData.use();

    const [currentDate, setCurrentDate] = useState(null);

    const [byFieldType, setByFieldType] = useState('category');
    const [country, setCountry] = useState(COUNTRY_TOTAL);
    const [category, setCategory] = useState(encodeCategory(CategoryType.All, null));
    const [showTejo, setShowTejo] = useState(false);

    const navigate = ({ byFieldType, country, category }) => {
        setByFieldType(byFieldType);
        if (byFieldType === 'category') {
            setCountry(country);
        } else if (byFieldType === 'country') {
            setCategory(category);
        }
    };

    const filter = {
        country: byFieldType === 'country' ? null : country,
        category: byFieldType === 'category' ? null : category,
        tejo: showTejo,
    };

    const [loadingData, dataError] = data.useDataForDateDiff(currentDate);

    const [loadingHist, histError, histData] = useStatisticsHistory({ offset: 0, limit: 10 });
    const [newestDate, setNewestDate] = useState(null);

    useEffect(() => {
        if (histData && !currentDate) {
            setCurrentDate(histData.items[0] || null);
        }

        if (histData) {
            const newestHistDate = new Date(histData.items[0]);
            if (!newestDate || newestHistDate > newestDate) {
                setNewestDate(newestHistDate);
            }
        }
    }, [histData, currentDate]);
    useEffect(() => {
        if (!category) {
            const first = [...data.categories[0]];
            if (first) setCategory(first[0]);
        }
    }, [data.categories, category]);

    const showTejoCheckboxId = Math.random().toString(36);

    const { lastYearDate, aYearAgoDate } = data.getDateDiffDates(currentDate);
    const ageBuckets = data.getAgeBuckets(filter, currentDate);

    let contents;
    if (histError) {
        contents = <DisplayError error={histError} />;
    } else if (dataError) {
        contents = <DisplayError error={dataError} />;
    } else if (loadingHist || loadingData) {
        contents = (
            <div class="inner-view is-loading">
                <CircularProgress indeterminate />
            </div>
        );
    } else if (!histData || !data.hasDataForDate(currentDate)) {
        contents = (
            <div class="inner-view is-empty">
                {locale.membershipsAndRoles.noDataAvailable}
            </div>
        );
    } else {
        contents = (
            byFieldType === 'category' ? (
                <div class="inner-view">
                    <div class="view-controls">
                        <Select
                            class="category-selection"
                            outline
                            value={country}
                            onChange={setCountry}
                            items={[...data.countries]
                                .sort((a, b) => {
                                    if (a === COUNTRY_TOTAL) a = '';
                                    if (b === COUNTRY_TOTAL) b = '';
                                    return a.localeCompare(b);
                                })
                                .map(id => ({
                                    value: id,
                                    label: id === COUNTRY_TOTAL ? (
                                        locale.countries.total
                                    ) : (
                                        (countries && countries[id]?.name_eo) || id
                                    ),
                                }))} />
                    </div>

                    <div class="view-demographics">
                        <div class="inner-card">
                            <div class="inner-title">{locale.membershipsAndRoles.demoAge}</div>
                            <AgeDemographics buckets={ageBuckets} isDimmed={filter.tejo} />
                        </div>
                    </div>

                    <MembersTable
                        navigate={navigate}
                        data={data}
                        currentDate={currentDate}
                        lastYearDate={lastYearDate}
                        aYearAgoDate={aYearAgoDate}
                        items={data.getDateDiffByCategory(currentDate, filter)} />
                </div>
            ) : byFieldType === 'country' ? (
                <div class="inner-view">
                    <div class="view-controls">
                        <Select
                            class="category-selection"
                            outline
                            value={category}
                            onChange={setCategory}
                            items={data.getCategoriesForSelect()} />
                    </div>

                    <div class="view-demographics">
                        <div class="inner-card">
                            <div class="inner-title">{locale.membershipsAndRoles.demoAge}</div>
                            <AgeDemographics buckets={ageBuckets} isDimmed={filter.tejo} />
                        </div>
                    </div>

                    <MembersTable
                        navigate={navigate}
                        data={data}
                        currentDate={currentDate}
                        lastYearDate={lastYearDate}
                        aYearAgoDate={aYearAgoDate}
                        items={data.getDateDiffByCountry(currentDate, filter)} />
                </div>
            ) : null
        );
    }

    const goToPrevDay = () => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - 1);
        setCurrentDate(date.toISOString().split('T')[0]);
    };
    const goToNextDay = () => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + 1);
        setCurrentDate(date.toISOString().split('T')[0]);
    };
    const canGoToNextDay = !newestDate
        || newestDate > new Date(currentDate);

    return (
        <div class="statistics-memberships-and-roles">
            <div class="hist-date-selector">
                <Button icon small onClick={goToPrevDay}>
                    <ChevronLeftIcon />
                </Button>
                <date.editor
                    outline
                    max={newestDate}
                    value={currentDate}
                    onChange={setCurrentDate} />
                <Button icon small onClick={goToNextDay} disabled={!canGoToNextDay}>
                    <ChevronRightIcon />
                </Button>
            </div>
            <div class="display-selector">
                <Segmented
                    selected={byFieldType}
                    onSelect={setByFieldType}>
                    {[
                        {
                            id: 'category',
                            label: locale.membershipsAndRoles.byCategory,
                        },
                        {
                            id: 'country',
                            label: locale.membershipsAndRoles.byCountry,
                        },
                    ]}
                </Segmented>
                <div class="tejo-selector">
                    <Checkbox
                        id={showTejoCheckboxId}
                        checked={showTejo}
                        onChange={setShowTejo}/>
                    {' '}
                    <label htmlFor={showTejoCheckboxId}>
                        {locale.membershipsAndRoles.showTejo}
                    </label>
                </div>
            </div>
            {contents}
        </div>
    );
}

function AgeDemographics ({ buckets, isDimmed }) {
    const max = [...buckets.values()].reduce((a, b) => Math.max(a, b), 1);

    const columns = [];
    const entries = [...buckets.entries()];
    for (let i = 0; i < entries.length; i++) {
        const [label, count] = entries[i];
        const nextLabel = entries[i + 1] ? entries[i + 1][0] : null;
        const weight = Number.isFinite(nextLabel - label) ? nextLabel - label : 10;
        columns.push(
            <div class="bucket-bar" key={i} style={{
                '--index': i,
                '--weight': weight,
            }}>
                <div class="bar-container">
                    <div class="bar-value" style={{ '--value': count }}></div>
                </div>
                <div class="bar-label">
                    {locale.membershipsAndRoles.demoAgeLabels[label] || label}
                </div>
            </div>
        );
    }

    return (
        <div class={'statistics-demographics' + (isDimmed ? ' is-dimmed' : '')}>
            <div class="bucket-bars" style={{ '--max': max }}>
                {columns}
            </div>
        </div>
    );
}

function MembersTableHeader ({ onClick, sorting, children }) {
    return (
        <th class={'members-th-item' + (sorting ? ' is-sorted' : '')} onClick={onClick}>
            <div class="inner-contents">
                <span class="inner-label">
                    {children}
                </span>
                {sorting === 'asc' ? (
                    <span class="inner-sorting">
                        <KeyboardArrowUpIcon />
                    </span>
                ) : sorting === 'desc' ? (
                    <span class="inner-sorting">
                        <KeyboardArrowDownIcon />
                    </span>
                ) : <span class="inner-sorting"></span>}
            </div>
        </th>
    );
}

function MembersTable ({ data, currentDate, lastYearDate, aYearAgoDate, items, navigate }) {
    const [,, countries] = useDataView('countries/countries', {});
    const [sortByField, setSortByField] = useState(null);
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedItem, setExpandedItem] = useState(null);

    if (!items) return null;

    const currentYear = currentDate.split('-')[0];
    const lastYear = lastYearDate.split('-')[0];

    const num = n => typeof n === 'number' ? n.toLocaleString('fr-FR') : '—';
    const diffNum = n => typeof n === 'number'
        ? (n > 0 ? '+' : n < 0 ? '-' : '±') + n.toLocaleString('fr-FR')
        : '—';

    const setSorting = field => () => {
        if (sortByField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortByField(field);
            setSortAsc(false);
        }
    };
    const sortingProps = field => ({
        onClick: setSorting(field),
        sorting: sortByField === field ? (sortAsc ? 'asc' : 'desc') : null,
    });

    let sortedItems = items;
    if (sortByField) {
        sortedItems = items.filter(x => x.type === 'items').flatMap(x => x.items);
        sortedItems = sortedItems.sort((a, b) => {
            const aVal = a[sortByField];
            const bVal = b[sortByField];
            return sortAsc ? aVal - bVal : bVal - aVal;
        });
        sortedItems = [{ type: 'items', items: sortedItems }];
    }

    return (
        <div class="statistics-memberships-and-roles-items">
            <table class="count-table">
                <thead>
                    <tr>
                        <MembersTableHeader {...sortingProps('current')}>
                            {currentYear}
                        </MembersTableHeader>
                        <MembersTableHeader {...sortingProps('lastYear')}>
                            {lastYear}
                        </MembersTableHeader>
                        <MembersTableHeader {...sortingProps('yearDiff')}>
                            {locale.membershipsAndRoles.yearDiffColumn}
                        </MembersTableHeader>
                        <MembersTableHeader {...sortingProps('thirtyDayDiff')}>
                            {locale.membershipsAndRoles.thirtyDayGrowthColumn}
                        </MembersTableHeader>
                        <MembersTableHeader {...sortingProps('aYearAgo')}>
                            <date.renderer value={aYearAgoDate} />
                        </MembersTableHeader>
                        <MembersTableHeader
                            sorting={!sortByField ? 'desc' : null}
                            onClick={() => {
                                setSortByField(null);
                            }}>
                            {locale.membershipsAndRoles.itemColumn}
                        </MembersTableHeader>
                    </tr>
                </thead>
                <tbody>
                    {sortedItems.map((item, i) => {
                        if (item.type === 'section') {
                            return (
                                <tr key={i}>
                                    <th colSpan={6} className="list-title">
                                        {item.label}
                                    </th>
                                </tr>
                            );
                        } else if (item.type === 'items') {
                            return item.items.map(({
                                current, lastYear, aYearAgo,
                                yearDiff, yearRatio,
                                thirtyDayDiff,
                                item, isTotal, filter, navigationTarget,
                            }, j) => {
                                const itemKey = `${i} ${j}`;
                                const isExpanded = expandedItem === itemKey;
                                const onExpand = () => {
                                    if (isExpanded) setExpandedItem(null);
                                    else setExpandedItem(itemKey);
                                };

                                let expandedContents = null;
                                if (isExpanded) {
                                    expandedContents = (
                                        <tr key={itemKey + 'e'}>
                                            <td colSpan={6}>
                                                <ItemDetails
                                                    data={data}
                                                    filter={filter}
                                                    currentDate={currentDate} />
                                            </td>
                                        </tr>
                                    );
                                }

                                const categoryLabel = item.country ? (
                                    <span>
                                        {item.country === COUNTRY_TOTAL
                                            ? locale.countries.total
                                            : countries && countries[item.country]?.name_eo || item.country}
                                    </span>
                                ) : (
                                    <span>
                                        {item.nameAbbrev && <b>{item.nameAbbrev}</b>}
                                        {' '}
                                        {item.name}
                                    </span>
                                );

                                return [
                                    <tr
                                        key={itemKey}
                                        class={'count-row' + (isTotal ? ' is-total' : '')}
                                        onClick={onExpand}>
                                        <td class="is-count">{num(current)}</td>
                                        <td class="is-count">{num(lastYear)}</td>
                                        <td class="is-count">
                                            {diffNum(yearDiff)}
                                            {yearDiff
                                                ? ' (' + diffNum(Math.round((yearRatio - 1) * 100)) + '%)'
                                                : ''}
                                        </td>
                                        <td className="is-count">{num(thirtyDayDiff)}</td>
                                        <td class="is-count">{num(aYearAgo)}</td>
                                        <th class="category-label">
                                            {navigationTarget ? (
                                                <a class="category-link" onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(navigationTarget);
                                                }}>
                                                    {categoryLabel}
                                                </a>
                                            ) : categoryLabel}
                                        </th>
                                    </tr>,
                                    expandedContents,
                                ];
                            });
                        }
                    })}
                </tbody>
            </table>
        </div>
    );
}

function ItemDetails ({ data, filter, currentDate }) {
    const [loadingHist, histError, counts] = data.useHistoryCounts({
        ...filter,
        beforeDate: currentDate,
    }, 100);

    if (loadingHist) return <div class="item-details"><CircularProgress indeterminate /></div>;
    if (histError) return <div class="item-details"><DisplayError error={histError} /></div>;

    return (
        <div class="item-details">
            <CountLineChart points={counts} />
        </div>
    );
}

function mapDateToMonotonic (date) {
    return date ? +new Date(date) : date;
}

function CountLineChart ({ points }) {
    const container = useRef(null);
    const [width, setWidth] = useState(100);
    const height = 270;
    const margin = 10;
    const marginLeft = 50;
    const marginBottom = 90;

    useEffect(() => {
        if (!container.current) return;
        setWidth(container.current.offsetWidth);
    }, [container.current]);

    const minX = mapDateToMonotonic(points[0]?.date) || 0;
    const maxX = mapDateToMonotonic(points[points.length - 1]?.date) || 0;
    let maxY = points.reduce((a, b) => Math.max(a, b.count), 1);
    let minY = points.reduce((a, b) => Math.min(a, b.count), maxY);

    const yRange = Math.max(maxY - minY, 1);
    maxY += yRange * 0.1;
    minY -= yRange * 0.1;

    const pixelsPerDay = (width - margin - marginLeft) / ((maxX - minX) / 86400000);
    const dateStride = Math.max(Math.floor(70 / pixelsPerDay), 1) * 86400000;
    const xAxis = [];
    for (let xDate = maxX; xDate > minX; xDate -= dateStride) {
        const normX = (xDate - minX) / (maxX - minX);
        const x = normX * (width - margin - marginLeft) + marginLeft;

        xAxis.push(
            <g
                key={xDate}
                class="date-label"
                transform={`translate(${x}, ${height - marginBottom + 10}) rotate(-45)`}>
                <text>
                    {date.stringify(xDate)}
                </text>
            </g>,
            <line
                key={xDate + 'line'}
                x1={x} x2={x} y1={margin} y2={height - marginBottom} class="grid-line" />
        );
    }
    xAxis.push(
        <line key="axis" class="axis-line" x1={marginLeft} x2={width - margin}
            y1={height - marginBottom} y2={height - marginBottom} />,
    );

    const pixelsPerY = (height - margin - marginBottom) / (maxY - minY);
    const yStride = Math.max(Math.floor(20 / pixelsPerY), 1);
    const yAxis = [];
    for (let y = Math.ceil(minY); y < maxY; y += yStride) {
        const normY = (y - minY) / (maxY - minY);
        const yPos = (1 - normY) * (height - margin - marginBottom) + margin;

        yAxis.push(
            <g
                key={y}
                class="count-label"
                transform={`translate(${marginLeft}, ${yPos})`}>
                <text x={-10}>
                    {y}
                </text>
                <line
                    key={y + 'line'}
                    x1={0} x2={width - margin - marginLeft} y1={0} y2={0} class="grid-line" />
            </g>
        );
    }
    yAxis.push(
        <line key="axis" class="axis-line" x1={marginLeft} x2={marginLeft}
            y1={margin} y2={height - marginBottom} />,
    );

    const pathD = [];
    for (const point of points) {
        const normX = (mapDateToMonotonic(point.date) - minX) / (maxX - minX);
        const normY = (point.count - minY) / (maxY - minY);
        pathD.push(pathD.length ? 'L' : 'M');
        pathD.push(
            normX * (width - margin - marginLeft) + marginLeft,
            (1 - normY) * (height - margin - marginBottom) + margin,
        );
    }

    return (
        <div ref={container}>
            <svg width={width} height={height} class="details-line-chart">
                <path d={pathD.join(' ')} class="chart-line" />
                {xAxis}
                {yAxis}
            </svg>
        </div>
    );
}
