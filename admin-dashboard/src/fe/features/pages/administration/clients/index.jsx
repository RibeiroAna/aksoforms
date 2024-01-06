import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import CSVExport from '../../../../components/tasks/csv-export';
import { clients as locale, search as searchLocale } from '../../../../locale';
import { FIELDS } from './fields';
import './style.less';

export default class Clients extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'name',
                query: '',
            },
            fields: [
                { id: 'name', sorting: 'asc', fixed: true },
                { id: 'ownerName', sorting: 'none', fixed: true },
                { id: 'ownerEmail', sorting: 'none', fixed: true },
                { id: 'apiKey', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
        csvExportOpen: false,
    };

    searchFields = ['name', 'apiKey', 'ownerName', 'ownerEmail'];
    locale = locale;

    renderActions ({ perms }) {
        const actions = [];
        if (perms.hasPerm('clients.create')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.add,
                action: () => this.context.createTask('clients/create', {}),
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
            <div class="clients-page">
                <OverviewList
                    task="clients/list"
                    view="clients/client"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/administrado/klientoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    updateView={['clients/sigClients']} />

                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="clients/list"
                    parameters={parameters}
                    fields={FIELDS}
                    detailView="clients/client"
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{ fields: locale.fields }}
                    filenamePrefix={locale.csvFilename} />
            </div>
        );
    }
}
