import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import {
    delegations as locale,
    delegationSubjects as subjectsLocale,
    delegationApplications as applicationsLocale,
} from '../../../../locale';
import { FIELDS } from './fields';
import { FILTERS } from './filters';
import ExportDialog from './export';

export default class DelegatesPage extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'hosting.description',
                query: '',
            },
            fields: [
                { id: 'org', sorting: 'none', fixed: true },
                { id: 'codeholderId', sorting: this.codeholderId ? 'none' : 'asc', fixed: true },
                { id: 'cities', sorting: 'none', fixed: true },
                { id: 'countries', sorting: 'none', fixed: true },
                { id: 'approvedTime', sorting: 'none', fixed: true },
            ],
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            offset: 0,
            limit: 10,
        },
        exportOpen: false,
    };

    get codeholderId () {
        return this.props.matches.codeholder ? +this.props.matches.codeholder[1] : null;
    }

    renderActions ({ perms }) {
        const actions = [];

        if (!this.codeholderId) {
            actions.push({
                label: subjectsLocale.title,
                action: () => this.props.push('fakoj'),
            });

            actions.push({
                label: applicationsLocale.title,
                action: () => this.props.push('kandidatighoj'),
            });

            actions.push({
                label: locale.export.menuItem,
                action: () => this.setState({ exportOpen: true }),
                overflow: true,
            });
        }

        // TODO: better perm check across orgs?
        if (perms.hasPerm('codeholders.delegations.create.uea')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('codeholders/createDelegations', {}, {
                    codeholderId: this.codeholderId,
                }),
            });
        }

        return actions;
    }

    searchFields = ['hosting.description'];
    filters = FILTERS;
    locale = locale;
    category = 'delegations';
    filtersToAPI = 'delegations/delegateFiltersToAPI';

    renderContents (_, { parameters, expanded }) {
        return (
            <div class="delegations-delegates-page">
                <OverviewList
                    task={this.codeholderId ? 'codeholders/listDelegations' : 'delegations/listDelegates'}
                    options={this.codeholderId ? { id: this.codeholderId } : null}
                    updateView={['codeholders/sigDelegations']}
                    useDeepCmp
                    view="codeholders/delegation"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={(id, data) => `/delegitoj/${data.codeholderId}/${data.org}`}
                    outOfTree
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    expanded={expanded}
                    locale={locale.fields} />

                <ExportDialog
                    open={this.state.exportOpen}
                    filters={parameters}
                    onClose={() => this.setState({ exportOpen: false })} />
            </div>
        );
    }
}
