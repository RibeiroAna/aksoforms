import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import { delegationApplications as locale } from '../../../../locale';
import { FIELDS } from './fields';
import { FILTERS } from './filters';

export default class DelegateApplicationsPage extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'internalNotes',
                query: '',
            },
            fields: [
                { id: 'org', sorting: 'none', fixed: true },
                { id: 'status', sorting: 'desc', fixed: true },
                { id: 'codeholderId', sorting: 'asc', fixed: true },
                { id: 'cities', sorting: 'none', fixed: true },
                { id: 'countries', sorting: 'none', fixed: true },
            ],
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            offset: 0,
            limit: 10,
        },
    };

    locale = locale;
    filters = FILTERS;
    searchFields = ['internalNotes'];
    category = 'delegations/applications';
    filtersToAPI = 'delegations/applicationFiltersToAPI';

    renderActions ({ perms }) {
        const actions = [];

        // TODO: better perm check across orgs?
        if (perms.hasPerm('delegations.applications.read.uea')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('delegations/createApplication', {}, {}),
            });
        }

        return actions;
    }

    renderContents (_, { parameters, expanded }) {
        return (
            <div class="delegation-applications-page">
                <OverviewList
                    task={'delegations/listApplications'}
                    updateView={['delegations/sigApplications']}
                    view="delegations/application"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/delegitoj/kandidatighoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    expanded={expanded}
                    locale={locale.fields} />
            </div>
        );
    }
}
