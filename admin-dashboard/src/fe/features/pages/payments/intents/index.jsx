import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import SortIcon from '@material-ui/icons/Sort';
import Page from '../../../../components/page';
import SearchFilters from '../../../../components/overview/search-filters';
import OverviewList from '../../../../components/lists/overview-list';
import FieldPicker from '../../../../components/pickers/field-picker';
import { decodeURLQuery, applyDecoded, encodeURLQuery } from '../../../../components/overview/list-url-coding';
import Meta from '../../../meta';
import { coreContext } from '../../../../core/connection';
import { connectPerms } from '../../../../perms';
import { paymentIntents as locale, search as searchLocale } from '../../../../locale';
import { FIELDS } from './fields';
import { FILTERS } from './filters';

const SEARCHABLE_FIELDS = ['customerEmail', 'customerName', 'internalNotes', 'customerNotes'];

export default connectPerms(class Intents extends Page {
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
                { id: 'statusTime', sorting: 'desc' },
                { id: 'customer', sorting: 'none' },
                { id: 'status', sorting: 'none' },
                { id: 'totalAmount', sorting: 'none' },
            ],
            offset: 0,
            limit: 10,
        },
        expanded: false,
        fieldPickerOpen: false,
    };

    static contextType = coreContext;

    #searchInput = null;
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

    render ({ perms }, { parameters, expanded, fieldPickerOpen }) {
        const actions = [];

        if (perms.hasPerm('pay.payment_intents.create.tejo')
            || perms.hasPerm('pay.payment_intents.create.uea')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('payments/createIntent', {}),
            });
        }

        actions.push({
            label: searchLocale.pickFields,
            icon: <SortIcon style={{ verticalAlign: 'middle' }} />,
            action: () => this.setState({ fieldPickerOpen: true }),
        });

        actions.push({
            label: locale.report.title,
            action: () => this.props.push('raporto'),
            overflow: true,
        });

        return (
            <div class="payment-orgs-page">
                <Meta
                    title={locale.title}
                    actions={actions} />
                <SearchFilters
                    value={parameters}
                    onChange={parameters => this.setState({ parameters })}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    searchFields={SEARCHABLE_FIELDS}
                    filters={FILTERS}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.search.fields,
                        filters: locale.filters,
                    }}
                    inputRef={view => this.#searchInput = view}
                    filtersToAPI="payments/iFiltersToAPI"
                    category="aksopay/payment_intents" />
                <OverviewList
                    expanded={expanded}
                    task="payments/listPaymentIntents"
                    view="payments/intent"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/aksopago/pagoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    updateView={['payments/sigIntents']} />

                <FieldPicker
                    available={Object.keys(FIELDS)}
                    sortables={Object.keys(FIELDS).filter(x => FIELDS[x].sortable)}
                    selected={parameters.fields}
                    onChange={fields => this.setState({ parameters: { ...parameters, fields }})}
                    open={fieldPickerOpen}
                    onClose={() => this.setState({ fieldPickerOpen: false })}
                    locale={locale.fields} />
            </div>
        );
    }
});
