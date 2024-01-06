import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import { membershipEntries as locale } from '../../../../locale';
import { FIELDS } from './fields';
import { FILTERS } from './filters';

const SEARCHABLE_FIELDS = ['internalNotes'];

export default class RegistrationEntries extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: SEARCHABLE_FIELDS[0],
                query: '',
            },
            fields: [
                { id: 'timeSubmitted', sorting: 'desc', fixed: true },
                { id: 'year', sorting: 'none', fixed: true },
                { id: 'codeholderData', sorting: 'none', fixed: true },
                { id: 'status', sorting: 'none', fixed: true },
            ],
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            offset: 0,
            limit: 10,
        },
        expanded: false,
    };

    locale = locale;
    filters = FILTERS;
    searchFields = SEARCHABLE_FIELDS;
    filtersToAPI = 'memberships/entryFiltersToAPI';
    category = 'registration/entries';

    renderActions ({ perms }) {
        const actions = [];
        if (perms.hasPerm('registration.entries.create')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('memberships/createEntry', {}),
            });
        }
        return actions;
    }

    renderContents (_, { parameters, expanded }) {
        return (
            <OverviewList
                expanded={expanded}
                task="memberships/listEntries"
                view="memberships/entry"
                updateView={['memberships/sigEntries']}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/membreco/alighoj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}
