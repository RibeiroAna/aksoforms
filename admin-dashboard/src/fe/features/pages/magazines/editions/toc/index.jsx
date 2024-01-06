import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../../../components/overview/list-url-coding';
import SearchFilters from '../../../../../components/overview/search-filters';
import OverviewList from '../../../../../components/lists/overview-list';
import { magazineToc as locale } from '../../../../../locale';
import { FIELDS } from './fields';

export default class TocView extends PureComponent {
    state = {
        parameters: {
            search: {
                field: 'title',
                query: '',
            },
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            fields: [
                { id: 'page', sorting: 'asc', fixed: true },
                { id: 'title', sorting: 'none', fixed: true },
                { id: 'author', sorting: 'none', fixed: true },
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
        // if (this.#searchInput) this.#searchInput.focus(500);
    }

    componentDidUpdate (prevProps, prevState) {
        if (prevProps.query !== this.props.query && this.props.query !== this.#currentQuery) {
            this.decodeURLQuery();
        }
        if (prevState.parameters !== this.state.parameters) {
            this.encodeURLQuery();
        }
    }

    render ({ magazine, edition }, { parameters, expanded }) {
        return (
            <div class="toc-view">
                <SearchFilters
                    value={parameters}
                    searchFields={['title', 'author', 'recitationAuthor', 'text']}
                    onChange={parameters => this.setState({ parameters })}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.fields,
                        filters: locale.search.filters,
                    }}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    inputRef={view => this.#searchInput = view}
                    category="magazines/x/editions/x/toc" />
                <OverviewList
                    expanded={expanded}
                    useDeepCmp options={{ magazine, edition }}
                    viewOptions={{ magazine, edition }}
                    task="magazines/listTocEntries"
                    view="magazines/tocEntry"
                    updateView={['magazines/sigTocEntries', { magazine, edition }]}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/revuoj/${magazine}/numero/${edition}/enhavo/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    userData={{
                        getCursed: item => item.highlighted,
                    }} />
            </div>
        );
    }
}
