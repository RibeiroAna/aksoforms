import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewList from '../../../../components/lists/overview-list';
import OverviewPage from '../../../../components/overview/overview-page';
import Select from '../../../../components/controls/select';
import { paymentIntents as intentsLocale, intermediaryReports as locale } from '../../../../locale';
import { FIELDS } from '../../payments/intents/fields';

// copy-pasted from payment/intents (but this one needs to use intermediaries locale)
const statusFilter = {
    default: () => ({ enabled: false, value: [] }),
    serialize: ({ value }) => value.join(','),
    deserialize: value => ({ enabled: true, value: value.split(',') }),
    editor ({ value, onChange, onEnabledChange, hidden }) {
        return <Select
            disabled={hidden}
            multi
            value={value || []}
            onChange={value => {
                onEnabledChange(!!value.length);
                onChange(value);
            }}
            emptyLabel={locale.intentStatuses['']}
            items={Object.keys(locale.intentStatuses).filter(id => id).map(id => ({
                value: id,
                label: locale.intentStatuses[id],
                shortLabel: locale.intentStatusesShort[id],
            }))} />;
    },
};

const FIELDS2 = {
    ...FIELDS,
    status: {
        sortable: true,
        component ({ value }) {
            return (
                <span class="payment-intent-status" data-status={value}>
                    {locale.intentStatuses[value]}
                </span>
            );
        },
        stringify (value) {
            return locale.intentStatuses[value];
        },
    },
};

export default class IntermediaryReports extends OverviewPage {
    state = {
        parameters: {
            fields: [
                { id: 'org', sorting: 'none', fixed: true },
                { id: 'intermediary', sorting: 'none', fixed: true },
                { id: 'status', sorting: 'none', fixed: true },
                { id: 'statusTime', sorting: 'desc', fixed: true },
            ],
            filters: {
                status: {
                    enabled: true,
                    value: ['pending', 'submitted', 'succeeded'],
                },
            },
            offset: 0,
            limit: 10,
        },
        expanded: true,
    };

    filters = {
        status: statusFilter,
    };
    locale = {
        ...locale,
        filters: intentsLocale.filters,
    };

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm('pay.read.uea') || perms.hasPerm('pay.read.tejo')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.props.push('krei'),
            });
        }

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <OverviewList
                task="payments/listIntermediaryIntents"
                view="payments/intent"
                updateView={['payments/sigIntents']}
                parameters={parameters}
                fields={FIELDS2}
                onGetItemLink={id => `/perantoj/spezfolioj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={intentsLocale.fields} />
        );
    }
}
