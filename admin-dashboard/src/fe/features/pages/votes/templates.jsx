import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import Page from '../../../components/page';
import SearchFilters from '../../../components/overview/search-filters';
import OverviewList from '../../../components/lists/overview-list';
import FieldPicker from '../../../components/pickers/field-picker';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../components/overview/list-url-coding';
import Meta from '../../meta';
import { coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { votes as locale } from '../../../locale';
import FIELDS from './fields';

const fields = {
    org: {
        ...FIELDS.org,
        shouldHide: null,
    },
    name: FIELDS.name,
    description: FIELDS.description,
};

const SEARCHABLE_FIELDS = ['name', 'description'];

export default connectPerms(class VoteTemplates extends Page {
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
                { id: 'name', sorting: 'asc' },
                { id: 'description', sorting: 'none' },
            ],
            offset: 0,
            limit: 10,
        },

        fieldPickerOpen: false,
    };

    static contextType = coreContext;

    #searchInput;
    #currentQuery = '';

    decodeURLQuery () {
        this.setState({
            parameters: applyDecoded(decodeURLQuery(this.props.query, {}), this.state.parameters),
        });
        this.#currentQuery = this.props.query;
    }

    encodeURLQuery () {
        const encoded = encodeURLQuery(this.state.parameters, {});
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

    render ({ perms }, { parameters, fieldPickerOpen }) {
        const actions = [];

        if (perms.hasPerm('votes.create.tejo') || perms.hasPerm('votes.create.uea')) {
            actions.push({
                label: locale.create.menuItem,
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                action: () => this.context.createTask('votes/createTemplate'),
            });
        }

        return (
            <div class="votes-page templates-page">
                <Meta
                    title={locale.templatesTitle}
                    actions={actions} />
                <SearchFilters
                    value={parameters}
                    searchFields={SEARCHABLE_FIELDS}
                    onChange={parameters => this.setState({ parameters })}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.fields,
                    }}
                    inputRef={view => this.#searchInput = view} />
                <OverviewList
                    task="votes/listTemplates"
                    view="votes/voteTemplate"
                    updateView={['votes/sigVoteTemplates']}
                    parameters={parameters}
                    fields={fields}
                    onGetItemLink={id => `/vochdonoj/shablonoj/${id}`}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />

                <FieldPicker
                    available={Object.keys(fields)}
                    sortables={Object.keys(fields).filter(x => fields[x].sortable)}
                    selected={parameters.fields}
                    onChange={fields => this.setState({ parameters: { ...parameters, fields }})}
                    open={fieldPickerOpen}
                    onClose={() => this.setState({ fieldPickerOpen: false })}
                    locale={locale.fields} />
            </div>
        );
    }
});
