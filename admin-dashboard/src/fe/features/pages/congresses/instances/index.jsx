import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import SearchFilters from '../../../../components/overview/search-filters';
import OverviewList from '../../../../components/lists/overview-list';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../../components/overview/list-url-coding';
import { congressInstances as locale } from '../../../../locale';
import { FIELDS } from './fields';

/**
 * Shows an overview over instances
 *
 * # Props
 * - congress: congress id
 * - query/onQueryChange: query
 */
export default class InstancesView extends PureComponent {
    state = {
        parameters: {
            search: {
                field: 'name',
                query: '',
            },
            fields: [
                { id: 'humanId', sorting: 'desc', fixed: true },
                { id: 'name', sorting: 'none', fixed: true },
                { id: 'dateFrom', sorting: 'none', fixed: true },
                { id: 'dateTo', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
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

    render ({ congress }, { parameters }) {
        return (
            <div class="congresses-instances">
                <SearchFilters
                    value={parameters}
                    searchFields={[
                        'name',
                        'locationName',
                        'locationNameLocal',
                    ]}
                    onChange={parameters => this.setState({ parameters })}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.fields,
                    }}
                    inputRef={view => this.#searchInput = view} />
                <OverviewList
                    useDeepCmp options={{ congress }}
                    viewOptions={{ congress }}
                    task="congresses/listInstances"
                    view="congresses/instance"
                    updateView={['congresses/sigInstances', { congress }]}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/kongresoj/${congress}/okazigoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />
            </div>
        );
    }
}
