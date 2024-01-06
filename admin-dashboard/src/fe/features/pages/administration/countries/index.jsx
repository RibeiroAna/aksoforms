import { h } from 'preact';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import CSVExport from '../../../../components/tasks/csv-export';
import { countries as locale, search as searchLocale } from '../../../../locale';
import { FIELDS } from './fields';
import './style.less';

export default class CountriesPage extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'name_eo',
                query: '',
            },
            fields: [
                { id: 'code', sorting: 'asc', fixed: true },
                { id: 'enabled', sorting: 'none', fixed: true },
                { id: 'name_eo', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 300,
        },
        csvExportOpen: false,
    };

    searchFields = ['name_eo'];
    locale = locale;

    renderActions () {
        return [
            {
                label: searchLocale.csvExport,
                action: () => this.setState({ csvExportOpen: true }),
                overflow: true,
            },
        ];
    }

    renderContents (_, { parameters }) {
        return (
            <div class="countries-page">
                <OverviewList
                    task="countries/list"
                    view="countries/country"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/administrado/landoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    limits={[10, 20, 100, 200, 300]} />

                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="countries/list"
                    parameters={parameters}
                    fields={FIELDS}
                    detailView="countries/country"
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{ fields: locale.fields }}
                    filenamePrefix={locale.csvFilename} />
            </div>
        );
    }
}
