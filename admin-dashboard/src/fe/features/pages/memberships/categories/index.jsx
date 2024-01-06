import { h } from 'preact';
import { Fragment } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import CSVExport from '../../../../components/tasks/csv-export';
import { membershipCategories as locale, search as searchLocale } from '../../../../locale';
import { FIELDS } from './fields';

export default class MembershipCategories extends OverviewPage {
    state = {
        parameters: {
            search: { query: '' },
            fields: [
                { id: 'nameAbbrev', sorting: 'none', fixed: true },
                { id: 'name', sorting: 'asc', fixed: true },
                { id: 'description', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
        csvExportOpen: false,
    };

    locale = locale;

    renderActions ({ perms }) {
        const actions = [];
        if (perms.hasPerm('membership_categories.create')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('memberships/createCategory', {}),
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
            <Fragment>
                <OverviewList
                    task="memberships/listCategories"
                    view="memberships/category"
                    updateView={['memberships/sigCategories']}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/membreco/kategorioj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />

                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="memberships/listCategories"
                    detailView="memberships/category"
                    parameters={parameters}
                    fields={FIELDS}
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{ fields: locale.fields }}
                    filenamePrefix={locale.csvFilename} />
            </Fragment>
        );
    }
}
