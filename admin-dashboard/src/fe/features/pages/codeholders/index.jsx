import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import SortIcon from '@material-ui/icons/Sort';
import SaveIcon from '@material-ui/icons/Save';
import ContactMailIcon from '@material-ui/icons/ContactMail';
import EmailIcon from '@material-ui/icons/Email';
import SearchFilters from '../../../components/overview/search-filters';
import OverviewList from '../../../components/lists/overview-list';
import FieldPicker from '../../../components/pickers/field-picker';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../components/overview/list-url-coding';
import Page from '../../../components/page';
import { codeholders as locale, search as searchLocale } from '../../../locale';
import { connect, coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import CSVExport from '../../../components/tasks/csv-export';
import Meta from '../../meta';
import FILTERS from './filters';
import FIELDS from './table-fields';
import AddrLabelGen from './addr-label-gen';
import SendNotifTemplate from '../notif-templates/send';
import GlobalFilterNotice from './global-filter-notice';
import './style.less';

// search fields and their corresponding client fields
const SEARCHABLE_FIELDS = {
    nameOrCode: ['name', 'code'],
    email: ['email'],
    landlinePhone: ['landlinePhone'],
    cellphone: ['cellphone'],
    officePhone: ['officePhone'],
    searchAddress: ['address'],
    notes: ['notes'],
};

const connectToEverything = a => connect('codeholders/fields')(res => ({
    fields: res?.fields,
}))(connect('codeholders/filters')(filters => ({
    filters,
}))(connectPerms(a)));

/**
 * The codeholders list page.
 *
 * # Props
 * - query/onQueryChange: url query handling
 * - addrLabelGen: label gen state (see navigation)
 * - sendNotifTemplate: notif templates state (see navigation)
 */
export default connectToEverything(class CodeholdersPage extends Page {
    state = {
        options: {
            search: {
                field: Object.keys(SEARCHABLE_FIELDS)[0],
                query: '',
            },
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            fields: [
                {
                    id: 'type',
                    sorting: 'none',
                    fixed: true,
                },
                {
                    id: 'code',
                    sorting: 'asc',
                },
                {
                    id: 'name',
                    sorting: 'none',
                },
                {
                    id: 'age',
                    sorting: 'none',
                },
                {
                    id: 'membership',
                    sorting: 'none',
                },
                {
                    id: 'country',
                    sorting: 'none',
                },
            ],
            offset: 0,
            limit: 10,
        },

        // whether the filters list is expanded
        expanded: false,
        fieldPickerOpen: false,
        csvExportOpen: false,

        // for the addr label gen
        currentResultIsCursed: false,
    };

    static contextType = coreContext;

    #searchInput;

    // current url query state
    #currentQuery = '';

    decodeURLQuery () {
        this.setState({
            options: applyDecoded(decodeURLQuery(this.props.query, FILTERS), this.state.options),
        });
        this.#currentQuery = this.props.query;
    }

    encodeURLQuery () {
        const encoded = encodeURLQuery(this.state.options, FILTERS);
        if (encoded === this.#currentQuery) return;
        this.#currentQuery = encoded;
        this.props.onQueryChange(encoded);
    }

    componentDidMount () {
        const originalQuery = this.props.query;
        this.decodeURLQuery();

        if (!originalQuery) {
            // FIXME: extremely hacky: wait for state update
            setTimeout(() => {
                // fresh load; we can add default filters
                if (this.state.options.filters.enabled) {
                    this.setState({
                        options: {
                            ...this.state.options,
                            filters: {
                                ...this.state.options.filters,
                                enabled: {
                                    ...this.state.options.filters.enabled,
                                    enabled: true,
                                },
                            },
                        },
                    });
                }
            }, 10);
        }

        this.#searchInput.focus(500);
    }

    componentDidUpdate (prevProps, prevState) {
        if (prevProps.query !== this.props.query && this.props.query !== this.#currentQuery) {
            this.decodeURLQuery();
        }
        if (prevState.options !== this.state.options) {
            this.encodeURLQuery();

            // prevent infinite loop by not filtering again if we just filtered
            if (this.state.options !== this.ignoreOptionsChangeForOptions) {
                this.shouldFilterFields = true;
                this.ignoreOptionsChangeForOptions = null;
            }
        }

        if (this.shouldFilterFields
            || prevProps.perms !== this.props.perms
            || prevProps.fields !== this.props.fields
            || prevProps.filters !== this.props.filters) {
            this.#filterFieldsWithPerms();
        }
    }

    shouldFilterFields = true;
    ignoreOptionsChangeForOptions = null;

    #filterFieldsWithPerms = () => {
        if (!this.props.perms._isDummy) {
            this.shouldFilterFields = false;
            const fields = this.state.options.fields.filter(({ id }) => {
                return !this.props.fields || this.props.fields.includes(id);
            });

            let newOptions = null;

            if (fields.length < this.state.options.fields.length) {
                newOptions = { ...this.state.options, fields };
            }

            let newFilters = null;
            for (const k in this.state.options.filters) {
                if (k === '_disabled') continue;
                if (!this.state.options.filters[k].enabled) continue;
                if (this.props.filters && !this.props.filters.includes(k)) {
                    const filter = this.state.options.filters[k];
                    if (!newFilters) newFilters = this.state.options.filters;
                    newFilters = { ...this.state.options.filters, [k]: { ...filter, enabled: false } };
                }
            }
            if (newFilters) {
                if (!newOptions) newOptions = this.state.options;
                newOptions = { ...newOptions, filters: newFilters };
            }

            if (newOptions) {
                this.setState({ options: newOptions });
                this.ignoreOptionsChangeForOptions = newOptions;
            }
        }
    };

    render ({
        addrLabelGen,
        sendNotifTemplates,
        perms,
        fields: availableFields,
        filters: availableFilters,
    }) {
        const canCreate = perms.hasPerm('codeholders.create');

        availableFields = availableFields || Object.keys(FIELDS);
        availableFilters = availableFilters || Object.keys(FILTERS);

        const globalFilterNotice = <GlobalFilterNotice perms={perms} />;

        // overflow menu
        const menu = [];

        if (canCreate) {
            menu.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create,
                action: () => this.context.createTask('codeholders/create'), // task view
            });
        }

        menu.push({
            icon: <SortIcon style={{ verticalAlign: 'middle' }} />,
            label: searchLocale.pickFields,
            action: () => this.setState({ fieldPickerOpen: true }),
        });

        if (!this.state.expanded) {
            menu.push({
                icon: <SaveIcon style={{ verticalAlign: 'middle' }} />,
                label: searchLocale.csvExport,
                action: () => this.setState({ csvExportOpen: true }),
                overflow: true,
            });
            if (!addrLabelGen) {
                const canGenAddrs = perms.hasCodeholderFields('r', 'address', 'honorific',
                    'firstNameLegal', 'lastNameLegal', 'fullName', 'fullNameLocal', 'careOf');

                if (canGenAddrs) {
                    menu.push({
                        icon: <ContactMailIcon style={{ verticalAlign: 'middle' }} />,
                        label: locale.addrLabelGen.menuItem,
                        action: () => this.props.onNavigate(`/membroj/etikedoj?${this.props.query}`),
                        overflow: true,
                    });
                }
            }
            if (!sendNotifTemplates) {
                menu.push({
                    icon: <EmailIcon style={{ verticalAlign: 'middle' }} />,
                    label: locale.notifTemplates.menuItem,
                    action: () => this.props.onNavigate(`/membroj/amasmesaghoj?${this.props.query}`),
                    overflow: true,
                });
            }
        }
        menu.push({
            label: searchLocale.resetFilters,
            action: () => this.setState({
                options: {
                    ...this.state.options,
                    filters: {},
                    jsonFilter: { _disabled: true },
                },
            }),
            overflow: true,
        });

        const filteredFilters = { ...FILTERS };
        for (const k in filteredFilters) {
            if (!availableFilters.includes(k)) delete filteredFilters[k];
        }

        const searchableFields = Object.keys(SEARCHABLE_FIELDS)
            .filter(fields => perms.hasCodeholderFields('r', ...fields));

        const { options, expanded } = this.state;

        return (
            <div class="codeholders-page" ref={node => this.node = node}>
                <Meta title={locale.title} actions={menu} />
                <SearchFilters
                    value={options}
                    onChange={options => {
                        this.setState({
                            options: {
                                ...options,
                                fields: options.fields.filter(({ id }) => !FIELDS[id].hide),
                            },
                        });
                    }}
                    searchFields={searchableFields}
                    fields={availableFields}
                    filters={filteredFilters}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    locale={{
                        searchFields: locale.search.fields,
                        searchPlaceholders: locale.search.placeholders,
                        filters: locale.search.filters,
                    }}
                    category="codeholders"
                    filtersToAPI="codeholders/filtersToAPI"
                    inputRef={view => this.#searchInput = view} />
                <FieldPicker
                    open={this.state.fieldPickerOpen}
                    onClose={() => this.setState({ fieldPickerOpen: false })}
                    // TODO: use core views
                    available={availableFields.filter(x => FIELDS[x] && !FIELDS[x].hide)}
                    sortables={Object.keys(FIELDS).filter(x => FIELDS[x].sortable)}
                    selected={options.fields}
                    onChange={fields => this.setState({ options: { ...options, fields } })}
                    locale={locale.fields} />
                <OverviewList
                    notice={globalFilterNotice}
                    task="codeholders/list"
                    view="codeholders/codeholder"
                    updateView={['codeholders/sigCodeholders']}
                    parameters={options}
                    expanded={expanded}
                    fields={FIELDS}
                    waitUntilFiltersLoaded
                    onGetItemLink={id => `/membroj/${id}`}
                    onSetFields={fields => this.setState({ options: { ...options, fields }})}
                    onSetOffset={offset => this.setState({ options: { ...options, offset }})}
                    onSetLimit={limit => this.setState({ options: { ...options, limit }})}
                    onResult={result => this.setState({ currentResultIsCursed: result.cursed })}
                    locale={locale.fields} />

                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="codeholders/list"
                    parameters={options}
                    fields={FIELDS}
                    detailView="codeholders/codeholder"
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{
                        fields: Object.assign({}, locale.fields, locale.csvFields),
                    }}
                    filenamePrefix={locale.csvFilename}
                    userOptions={{
                        countryLocale: {
                            name: locale.csvOptions.countryLocale,
                            type: 'select',
                            options: Object.entries(locale.csvOptions.countryLocales),
                            default: 'eo',
                        },
                    }} />

                <AddrLabelGen
                    open={addrLabelGen}
                    lvIsCursed={this.state.currentResultIsCursed}
                    options={this.state.options}
                    onClose={() => addrLabelGen.pop()} />
                <SendNotifTemplate
                    task="codeholders/sendNotifTemplate"
                    context="codeholder"
                    jsonFilter={{ intent: 'codeholder' }}
                    open={sendNotifTemplates}
                    lvIsCursed={this.state.currentResultIsCursed}
                    options={this.state.options}
                    onClose={() => sendNotifTemplates.pop()} />
            </div>
        );
    }
});
