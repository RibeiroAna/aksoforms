import { h } from 'preact';
import { Suspense, useState, Fragment, PureComponent } from 'preact/compat';
import { Checkbox, Button } from 'yamdl';
import RemoveIcon from '@material-ui/icons/Remove';
import PaperList from '../lists/paper-list';
import SearchInput from './search-input';
import Segmented from '../controls/segmented';
import EventProxy from '../utils/event-proxy';
import DisclosureArrow from '../disclosure-arrow';
import { search as locale } from '../../locale';
import { connectPerms } from '../../perms';
import { coreContext } from '../../core/connection';
import { SavedFilterPicker } from './saved-filter-picker';
import JSONFilterEditor from './json-filter-editor';
import { deepEq } from '../../../util';
import './search-filters.less';

/**
 * This component encapsulates search and filters and serves to abstract dealing with field search,
 * json filters, regular filters, saved filters, etc. for the core APIs.
 *
 * # Props
 * - value/onChange: core parameters (see e.g. docs for codeholders/list for details)
 *   additional fields:
 *   _savedFilter: null or object { id, name, description } if loaded
 * - searchFields: (string | { id: string, label: string })[] or null
 * - filters: object mapping all available filter ids to their editor spec. An editor spec
 *   contains:
 *   - `default() -> Filter` where `typedef Filter { enabled: bool, value: any, ...other }`
 *   - `serialize(Filter) -> string` to serialize the filter for the URL;
 *     with invariant `enabled == true`
 *   - `deserialize(string) -> Filter` to deserialize the filter from the URL
 *   - `editor: Component { filter: Filter, onFilterChange }` editor component
 *     May return a fragment. First fragment item may be displayed inline.
 *     Additional convenience props: `value`, `onChange`, `enabled`, `onEnabledChange`
 *   - `needsSwitch: bool` if true, the filter will have an on/off switch that controls its
 *     `enabled` property
 *   - `impliesValues: { [filter name: string]: value }` forces certain values on other filters when
 *     enabled, or disables this filter if implications cannot be fulfilled.
 *
 *   Serialize and deserialize may be omitted for simple filter value types (i.e. primitives).
 * - expanded/onExpandedChange: bool
 * - locale: object with `{ searchFields, searchPlaceholders, filters }`
 * - category: category id for saved filters
 * - filtersToAPI: name of a task that will convert client filters to an api filter
 * - compact: if true, forces compact view
 * - userData: will be passed to filters
 */
export default class SearchFilters extends PureComponent {
    ensureFiltersExist () {
        if (!this.props.filters || !Object.keys(this.props.filters).length) return;
        const newValue = { ...this.props.value };
        if (!newValue.filters) newValue.filters = {};
        else newValue.filters = { ...newValue.filters };
        let didChange = false;
        for (const filterId in this.props.filters) {
            if (!(filterId in newValue.filters)) {
                didChange = true;
                newValue.filters[filterId] = this.props.filters[filterId].default();
            }
        }
        for (const filterId of [...Object.keys(newValue.filters)]) {
            if (filterId === '_disabled') continue;
            if (!(filterId in this.props.filters)) {
                didChange = true;
                delete newValue.filters[filterId];
            }
        }
        if (didChange) this.props.onChange(newValue);
    }

    componentDidMount () {
        // delay to prevent race with url coding
        setTimeout(() => this.ensureFiltersExist(), 100);
    }

    render ({
        value,
        onChange,
        searchFields,
        filters,
        expanded,
        onExpandedChange,
        locale: searchLocale,
        category,
        inputRef,
        filtersToAPI,
        userData,
        compact: _compact,
    }) {
        const items = [];

        const compact = _compact || (window.innerWidth <= 600);

        items.push({
            node: <div class="top-padding" />,
            hidden: !expanded,
        });

        if ('search' in value) {
            items.push({
                node: <SearchInput
                    compact={compact}
                    ref={inputRef}
                    value={value.search}
                    onChange={search => onChange({ ...value, search, offset: 0 })}
                    searchFields={searchFields}
                    expanded={expanded}
                    onSubmit={() => {
                        if (onExpandedChange) onExpandedChange(false);
                        onChange({ ...value, offset: 0 });
                    }}
                    localizedFields={searchLocale.searchFields}
                    localizedPlaceholders={searchLocale.searchPlaceholders} />,
                paper: true,
                zIndex: 3,
                staticHeight: true,
            });
        }
        const hasFilters = filters && Object.keys(filters).length;

        if (hasFilters && ('search' in value)) {
            items.push({
                node: <FiltersDisclosure
                    expanded={expanded}
                    onExpandedChange={onExpandedChange} />,
                paper: true,
                staticHeight: true,
            });

            items.push({
                node: <FiltersBar
                    category={category}
                    value={value}
                    onChange={onChange}
                    hidden={!expanded}
                    filtersToAPITask={filtersToAPI} />,
                hidden: !expanded,
                paper: true,
            });
        }

        const jsonFilterEnabled = value.jsonFilter && !value.jsonFilter._disabled;

        const filtersEnabled = value.filters && !value.filters._disabled;
        const filterImplications = filtersEnabled
            ? compileFilterImplications(filters, value.filters)
            : { values: {}, disables: [] };
        for (const filterId in filters) {
            if (!value.filters || !value.filters[filterId]) continue; // handled above
            const isEnabled = value.filters[filterId].enabled;
            const filterIsHidden = !filtersEnabled || (!isEnabled && !expanded);
            items.push({
                node: <div style={{ height: 8 }} />,
                paper: false,
                hidden: filterIsHidden,
                staticHeight: true,
            });
            items.push({
                node: <Filter
                    id={filterId}
                    spec={filters[filterId]}
                    overrideValue={filterImplications.values[filterId]}
                    overrideDisable={filterImplications.disables.includes(filterId)}
                    filter={value.filters[filterId]}
                    onFilterChange={filter => onChange({
                        ...value,
                        filters: {
                            ...value.filters,
                            [filterId]: filter,
                        },
                        offset: 0,
                    })}
                    expanded={expanded}
                    hidden={filterIsHidden}
                    locale={searchLocale}
                    userData={userData} />,
                paper: true,
                hidden: filterIsHidden,
                staticHeight: true,
            });
        }

        items.push({
            node: jsonFilterEnabled ? (
                <Suspense fallback={<div class="json-filter-loading">
                    {locale.loadingJSONEditor}
                </div>}>
                    <JSONFilterEditor
                        enableTemplates
                        value={value.jsonFilter}
                        onChange={jsonFilter => onChange({ ...value, jsonFilter, offset: 0 })}
                        expanded={expanded}
                        onCollapse={() => onExpandedChange(false)} />
                </Suspense>
            ) : null,
            paper: true,
            hidden: !jsonFilterEnabled,
        });

        items.push({
            node: <div class="bottom-padding">
                {/* This event proxy needs to go *somewhere* and this seemed as good a place as any */}
                <EventProxy dom target={window} onresize={() => this.forceUpdate()} />
            </div>,
            hidden: !expanded,
            flush: true,
        });

        return <PaperList class={'search-filters' + (compact ? ' is-compact' : '')}>{items}</PaperList>;
    }
}

function FiltersDisclosure ({ expanded, onExpandedChange }) {
    return (
        <button class="filters-disclosure" onClick={() => onExpandedChange(!expanded)}>
            {locale.filtersDisclosure}

            <DisclosureArrow dir={expanded ? 'up' : 'down'} />
        </button>
    );
}

/** Renders the json/normal switch and saved filters stuff */
const FiltersBar = connectPerms(function FiltersBar ({
    category,
    filtersToAPITask,
    value,
    onChange,
    hidden,
    perms,
}) {
    const [pickerOpen, setPickerOpen] = useState(false);

    const filterType = value.filters?._disabled ? 'json' : 'normal';
    const onFilterTypeChange = type => {
        const json = type === 'json';
        const _savedFilter = json
            ? value._savedFilter
            : null;
        onChange({
            ...value,
            _savedFilter,
            jsonFilter: {
                ...(value.jsonFilter || {}),
                _disabled: !json,
            },
            filters: {
                ...(value.filters || {}),
                _disabled: json,
            },
        });
    };

    let loadedFilter;
    if (value._savedFilter) {
        loadedFilter = (
            <span class="loaded-filter">
                <Button icon small class="filter-remove-button" onClick={() => {
                    // remove savedFilter link
                    onChange({ ...value, _savedFilter: null });
                }} disabled={hidden}>
                    <RemoveIcon style={{ verticalAlign: 'middle' }} />
                </Button>
                {value._savedFilter.name}
            </span>
        );
    }

    const canReadFilters = category && perms.hasPerm('queries.read');
    const canSaveFilters = category && (loadedFilter
        ? perms.hasPerm('queries.update')
        : perms.hasPerm('queries.create'));

    const viewJSON = core => async () => {
        const filter = await core.createTask(filtersToAPITask, {
            filters: value.filters,
        }).runOnceAndDrop();

        onChange({
            ...value,
            jsonFilter: { filter, _disabled: false },
            filters: { ...value.filters, _disabled: true },
        });
    };

    return (
        <div class="filters-bar">
            <Segmented
                class="json-switch minimal"
                selected={filterType}
                disabled={hidden}
                onSelect={onFilterTypeChange}>
                {[
                    {
                        id: 'normal',
                        label: locale.normalFilter,
                    },
                    {
                        id: 'json',
                        label: locale.jsonFilter,
                    },
                ]}
            </Segmented>

            <span class="filters-bar-spacer filters-bar-break" />

            {loadedFilter}

            <span class="filters-bar-spacer" />

            <coreContext.Consumer>
                {core => (
                    <Fragment>
                        {(filterType === 'normal' && filtersToAPITask) ? (
                            <Button
                                class="tiny-button"
                                onClick={viewJSON(core)}
                                disabled={hidden}>
                                {locale.viewJSON}
                            </Button>
                        ) : null}
                        {canReadFilters ? (
                            <Button
                                class="tiny-button"
                                onClick={() => setPickerOpen(true)}
                                disabled={hidden}>
                                {locale.loadFilter}
                            </Button>
                        ) : null}
                        <SavedFilterPicker
                            open={pickerOpen}
                            onClose={() => setPickerOpen(false)}
                            category={category}
                            core={core}
                            onLoad={item => {
                                onChange({
                                    ...value,
                                    filters: {
                                        ...(value.filters || {}),
                                        _disabled: true,
                                    },
                                    jsonFilter: {
                                        source: item.query?.source,
                                        filter: item.query?.filter,
                                        _disabled: false,
                                    },
                                    _savedFilter: item,
                                });
                                setPickerOpen(false);
                            }} />

                        {(filterType === 'json' || filtersToAPITask) && canSaveFilters ? (
                            <Button class="tiny-button" disabled={hidden} onClick={async () => {
                                let source, filter;
                                if (filterType === 'normal' && filtersToAPITask) {
                                    source = null;
                                    // we need to save the api representation
                                    filter = await core.createTask(filtersToAPITask, {
                                        filters: value.filters,
                                    }).runOnceAndDrop();
                                } else {
                                    source = value.jsonFilter.source;
                                    filter = value.jsonFilter.filter;
                                }

                                // create a task view
                                let task;
                                if (value._savedFilter) {
                                    task = core.createTask('queries/update', {
                                        id: value._savedFilter.id,
                                    }, {
                                        name: value._savedFilter.name,
                                        description: value._savedFilter.description,
                                        query: { source, filter },
                                    });
                                } else {
                                    task = core.createTask('queries/add', {
                                        category,
                                    }, {
                                        name: '',
                                        description: null,
                                        query: { source, filter },
                                    });
                                }
                                task.on('success', id => {
                                    onChange({
                                        ...value,
                                        filters: { ...value.filters, _disabled: true },
                                        jsonFilter: {
                                            source,
                                            filter,
                                            _disabled: false,
                                        },
                                        _savedFilter: {
                                            id,
                                            name: task.parameters.name,
                                            description: task.parameters.description,
                                        },
                                    });
                                });
                            }}>
                                {locale.saveFilter}
                            </Button>
                        ) : null}
                    </Fragment>
                )}
            </coreContext.Consumer>
        </div>
    );
});

function Filter ({
    id, spec, filter, onFilterChange, hidden, locale, userData, expanded,
    overrideValue, overrideDisable,
}) {
    const [nextCommit] = useState({ filter: null });

    const FilterEditor = spec.editor;

    let filter2 = filter;
    if (overrideValue !== undefined) {
        filter2 = { enabled: true, value: overrideValue };
    }
    if (overrideDisable) {
        return null;
    }

    let filterSwitch;
    if (spec.needsSwitch) {
        filterSwitch = (
            <div class="filter-switch-container">
                <Checkbox
                    checked={filter.enabled}
                    disabled={hidden}
                    onChange={enabled => onFilterChange({ ...filter, enabled })} />
            </div>
        );
    }

    const onNameClick = e => {
        if (spec.needsSwitch) {
            e.preventDefault();
            onFilterChange({ ...filter, enabled: !filter.enabled });
        }
    };

    return (
        <div class="filter">
            <div class="filter-header">
                {filterSwitch}
                <div class="filter-name" onClick={onNameClick}>{locale.filters[id]}</div>
            </div>
            <FilterEditor
                filter={filter2}
                onFilterChange={onFilterChange}
                value={filter2.value}
                // SUPER HACKY: allow batched calls to onChange/onEnabledChange by delaying the
                // commit
                onChange={value => {
                    const shouldCommit = !nextCommit.filter;
                    nextCommit.filter = { ...(nextCommit.filter || filter), value };
                    if (shouldCommit) {
                        requestAnimationFrame(() => {
                            const filter = nextCommit.filter;
                            if (!filter) {
                                throw new Error('filter commit is null! this should not happen');
                            }
                            nextCommit.filter = null;
                            onFilterChange(filter);
                        });
                    }
                }}
                enabled={filter2.enabled && !overrideDisable}
                hidden={hidden || overrideDisable}
                onEnabledChange={enabled => {
                    const shouldCommit = !nextCommit.filter;
                    nextCommit.filter = { ...(nextCommit.filter || filter), enabled };
                    if (shouldCommit) {
                        requestAnimationFrame(() => {
                            const filter = nextCommit.filter;
                            if (!filter) {
                                throw new Error('filter commit is null! this should not happen');
                            }
                            nextCommit.filter = null;
                            onFilterChange(filter);
                        });
                    }
                }}
                expanded={expanded}
                userData={userData} />
        </div>
    );
}

function compileFilterImplications (filters, values) {
    const out = { values: {}, disables: [] };

    for (const filterId in filters) {
        const spec = filters[filterId];
        if (!values || !values[filterId]) continue; // handled above
        const isEnabled = values[filterId].enabled;

        if (spec.impliesValues) {
            let isDisabled = false;
            for (const otherFilterId in spec.impliesValues) {
                const impliedValues = spec.impliesValues[otherFilterId];
                if (values[otherFilterId]?.enabled) {
                    let matchesAny = false;
                    for (const impliedValue of impliedValues) {
                        if (deepEq(values[otherFilterId].value, impliedValue)) {
                            matchesAny = true;
                            break;
                        }
                    }

                    if (!matchesAny) {
                        isDisabled = true;
                        break;
                    }
                }
            }

            if (isDisabled) {
                out.disables.push(filterId);
            } else if (isEnabled) {
                for (const otherFilterId in spec.impliesValues) {
                    const impliedValues = spec.impliesValues[otherFilterId];
                    if (!values[otherFilterId]?.enabled) {
                        let matchesAny = false;
                        for (const impliedValue of impliedValues) {
                            if (deepEq(values[otherFilterId].value, impliedValue)) {
                                matchesAny = true;
                                break;
                            }
                        }

                        if (!matchesAny) {
                            out.values[otherFilterId] = impliedValues[0];
                        }
                    }
                }
            }
        }
    }

    return out;
}