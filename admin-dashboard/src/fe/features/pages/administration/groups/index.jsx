import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import CSVExport from '../../../../components/tasks/csv-export';
import { adminGroups as locale, search as searchLocale } from '../../../../locale';

const FIELDS = {
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, slot }) {
            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
        stringify: v => v,
    },
    description: {
        skipLabel: true,
        component ({ value }) {
            return value;
        },
        stringify: v => v,
    },
};

export default class AdminGroups extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'name',
                query: '',
            },
            fields: [
                { id: 'name', sorting: 'asc', fixed: true },
                { id: 'description', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
        csvExportOpen: false,
    };

    searchFields = ['name'];
    locale = locale;

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm('admin_groups.create')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.add,
                action: () => this.context.createTask('adminGroups/create'),
            });
        }

        actions.push({
            label: searchLocale.csvExport,
            action: () => this.setState({ csvExportOpen: true }),
            overflow: true,
        });

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <div class="admin-groups-page">
                <OverviewList
                    task="adminGroups/list"
                    view="adminGroups/group"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/administrado/grupoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    updateView={['adminGroups/sigList']} />

                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="adminGroups/list"
                    parameters={parameters}
                    fields={FIELDS}
                    detailView="adminGroups/group"
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{ fields: locale.fields }}
                    filenamePrefix={locale.csvFilename} />
            </div>
        );
    }
}
