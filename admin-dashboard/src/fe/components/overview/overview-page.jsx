import { h } from 'preact';
import Page from '../page';
import SearchFilters from './search-filters';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from './list-url-coding';
import Meta from '../../features/meta';
import { coreContext } from '../../core/connection';
import permsContext from '../../perms';

export default class OverviewPage extends Page {
    static contextType = coreContext;

    #searchInput;
    #currentQuery = '';

    decodeURLQuery (softInitial) {
        this.setState({
            parameters: applyDecoded(decodeURLQuery(this.props.query, this.filters), this.state.parameters, softInitial),
        });
        this.#currentQuery = this.props.query;
    }

    encodeURLQuery () {
        const encoded = encodeURLQuery(this.state.parameters, this.filters);
        if (encoded === this.#currentQuery) return;
        this.#currentQuery = encoded;
        this.props.onQueryChange(encoded);
    }

    componentDidMount () {
        this.decodeURLQuery(true);

        this.#searchInput?.focus(500);
    }

    componentDidUpdate (prevProps, prevState) {
        if (prevProps.query !== this.props.query && this.props.query !== this.#currentQuery) {
            this.decodeURLQuery();
        }
        if (prevState.parameters !== this.state.parameters) {
            this.encodeURLQuery();
        }
    }

    renderActions () {
        return [];
    }

    render () {
        const locale = this.locale;

        return (
            <permsContext.Consumer>
                {perms => {
                    const actions = this.renderActions({ perms }, this.state);

                    return (
                        <div className="overview-page">
                            <Meta
                                title={locale.title}
                                actions={actions} />

                            {(this.searchFields || this.filters) ? (
                                <SearchFilters
                                    value={this.state.parameters}
                                    searchFields={this.searchFields}
                                    filters={this.filters}
                                    onChange={parameters => this.setState({ parameters })}
                                    locale={{
                                        searchPlaceholders: locale.search?.placeholders,
                                        searchFields: locale.search?.fields || locale.fields,
                                        filters: locale.search?.filters || locale.filters,
                                    }}
                                    inputRef={view => this.#searchInput = view}
                                    expanded={this.state.expanded}
                                    onExpandedChange={expanded => this.setState({ expanded })}
                                    filtersToAPI={this.filtersToAPI}
                                    category={this.category} />
                            ) : null}

                            {this.renderContents({ perms }, this.state)}
                        </div>
                    );
                }}
            </permsContext.Consumer>
        );
    }
}
