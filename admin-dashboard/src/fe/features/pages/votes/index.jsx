import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import SortIcon from '@material-ui/icons/Sort';
import TuneIcon from '@material-ui/icons/Tune';
import Page from '../../../components/page';
import SearchFilters from '../../../components/overview/search-filters';
import OverviewList from '../../../components/lists/overview-list';
import FieldPicker from '../../../components/pickers/field-picker';
import CSVExport from '../../../components/tasks/csv-export';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../components/overview/list-url-coding';
import Meta from '../../meta';
import { connect, coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { votes as locale, search as searchLocale } from '../../../locale';
import FIELDS from './fields';
import FILTERS from './filters';

const SEARCHABLE_FIELDS = ['name', 'description'];

export default connect('votes/filters')(data => ({
    availableFilters: data,
}))(connectPerms(class Votes extends Page {
    state = {
        parameters: {
            search: {
                field: SEARCHABLE_FIELDS[0],
                query: '',
            },
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            fields: [
                { id: 'org', sorting: 'none' },
                { id: 'name', sorting: 'none' },
                { id: 'timespan', sorting: 'desc' },
                { id: 'state', sorting: 'none' },
            ],
            offset: 0,
            limit: 10,
        },
        expanded: false,
        fieldPickerOpen: false,
        csvExportOpen: false,
    };

    static contextType = coreContext;

    #searchInput;
    #currentQuery = '';

    decodeURLQuery () {
        this.setState({
            parameters: applyDecoded(decodeURLQuery(this.props.query, FILTERS), this.state.parameters),
        });
        this.#currentQuery = this.props.query;
    }

    encodeURLQuery () {
        const encoded = encodeURLQuery(this.state.parameters, FILTERS);
        if (encoded === this.#currentQuery) return;
        this.#currentQuery = encoded;
        this.props.onQueryChange(encoded);
    }

    componentDidMount () {
        this.decodeURLQuery();

        this.#searchInput.focus(500);
    }

    componentDidUpdate (prevProps, prevState) {
        if (prevProps.query !== this.props.query && this.props.query !== this.#currentQuery) {
            this.decodeURLQuery();
        }
        if (prevState.parameters !== this.state.parameters) {
            this.encodeURLQuery();
        }
    }

    render ({ perms, availableFilters }, { parameters, fieldPickerOpen, expanded }) {
        const actions = [];

        if (perms.hasPerm('codeholders.read')
            && (perms.hasPerm('votes.create.tejo') || perms.hasPerm('votes.create.uea'))) {
            // votes contain codeholders! technically you can create votes without codeholders.read,
            // but we'll require it
            actions.push({
                label: locale.create.menuItem,
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                action: () => this.context.createTask('votes/create'),
            });
        }

        actions.push({
            label: searchLocale.pickFields,
            icon: <SortIcon style={{ verticalAlign: 'middle' }} />,
            action: () => this.setState({ fieldPickerOpen: true }),
        });

        actions.push({
            label: locale.templates.menuItem,
            icon: <TuneIcon style={{ verticalAlign: 'middle' }} />,
            action: () => this.props.push('shablonoj'),
        });

        actions.push({
            label: searchLocale.csvExport,
            action: () => this.setState({ csvExportOpen: true }),
            overflow: true,
        });

        let filteredFilters = FILTERS;
        if (availableFilters) {
            filteredFilters = Object.fromEntries(availableFilters.map(filter => [filter, FILTERS[filter]]));
        }

        return (
            <div class="votes-page">
                <Meta
                    title={locale.title}
                    actions={actions} />
                <SearchFilters
                    value={parameters}
                    searchFields={SEARCHABLE_FIELDS}
                    filters={filteredFilters}
                    onChange={parameters => this.setState({ parameters })}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.fields,
                        filters: locale.filters,
                    }}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    inputRef={view => this.#searchInput = view}
                    filtersToAPI="votes/filtersToAPI"
                    category="votes" />
                <OverviewList
                    expanded={expanded}
                    task="votes/list"
                    view="votes/vote"
                    updateView={['votes/sigVotes']}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/vochdonoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />

                <FieldPicker
                    available={Object.keys(FIELDS)}
                    sortables={Object.keys(FIELDS).filter(x => FIELDS[x].sortable)}
                    selected={parameters.fields}
                    onChange={fields => this.setState({ parameters: { ...parameters, fields }})}
                    open={fieldPickerOpen}
                    onClose={() => this.setState({ fieldPickerOpen: false })}
                    locale={locale.fields} />
                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="votes/list"
                    parameters={parameters}
                    fields={FIELDS}
                    detailView="votes/vote"
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{ fields: locale.fields }}
                    filenamePrefix={locale.csvFilename} />
            </div>
        );
    }
}));
