import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../../components/overview/list-url-coding';
import SearchFilters from '../../../../components/overview/search-filters';
import OverviewList from '../../../../components/lists/overview-list';
import { magazineEditions as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class EditionsView extends PureComponent {
    state = {
        parameters: {
            search: {
                field: 'idHuman',
                query: '',
            },
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            fields: [
                { id: 'published', sorting: 'none', fixed: true },
                { id: 'date', sorting: 'desc', fixed: true },
                { id: 'idHuman', sorting: 'none', fixed: true },
                { id: 'description', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
        expanded: false,
    };

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
    }

    componentDidUpdate (prevProps, prevState) {
        if (prevProps.query !== this.props.query && this.props.query !== this.#currentQuery) {
            this.decodeURLQuery();
        }
        if (prevState.parameters !== this.state.parameters) {
            this.encodeURLQuery();
        }
    }

    render ({ magazine }, { parameters, expanded }) {
        return (
            <div class="editions-view">
                <SearchFilters
                    value={parameters}
                    searchFields={['idHuman', 'description']}
                    onChange={parameters => this.setState({ parameters })}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.fields,
                        filters: locale.search.filters,
                    }}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    inputRef={view => this.#searchInput = view}
                    category="magazines/x/editions" />
                <OverviewList
                    expanded={expanded}
                    useDeepCmp options={{ magazine }}
                    viewOptions={{ magazine }}
                    task="magazines/listEditions"
                    view="magazines/edition"
                    updateView={['magazines/sigEditions', { magazine }]}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/revuoj/${magazine}/numero/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />
            </div>
        );
    }
}
