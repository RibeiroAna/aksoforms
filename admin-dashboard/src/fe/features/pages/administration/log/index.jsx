import { h } from 'preact';
import SortIcon from '@material-ui/icons/Sort';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import FieldPicker from '../../../../components/pickers/field-picker';
import { httpLog as locale, search as searchLocale } from '../../../../locale';
import CSVExport from '../../../../components/tasks/csv-export';
import FILTERS from './filters';
import FIELDS from './table-fields';
import './style.less';

const searchableFields = [
    'userAgent',
    'userAgentParsed',
];

// TODO: permissions

export default class APILogListView extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: searchableFields[0],
                query: '',
            },
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            fields: [
                { id: 'time', sorting: 'desc' },
                { id: 'identity', sorting: 'none' },
                { id: 'ip', sorting: 'none' },
                { id: 'method', sorting: 'none' },
                { id: 'path', sorting: 'none' },
            ],
            offset: 0,
            limit: 10,
        },
        csvExportOpen: false,
    };

    locale = locale;
    searchFields = searchableFields;
    filters = FILTERS;
    category = 'http_log';
    filtersToAPI = 'httpLog/filtersToAPI';

    renderActions () {
        const actions = [];

        actions.push({
            label: searchLocale.csvExport,
            action: () => this.setState({ csvExportOpen: true }),
            overflow: true,
        });

        actions.push({
            icon: <SortIcon style={{ verticalAlign: 'middle' }} />,
            label: searchLocale.pickFields,
            action: () => this.setState({ fieldPickerOpen: true }),
        });

        return actions;
    }

    renderContents (_, { parameters, expanded }) {
        return (
            <div class="administration-log-page">
                <FieldPicker
                    open={this.state.fieldPickerOpen}
                    onClose={() => this.setState({ fieldPickerOpen: false })}
                    available={Object.keys(FIELDS)}
                    sortables={Object.keys(FIELDS).filter(x => FIELDS[x].sortable)}
                    selected={parameters.fields}
                    onChange={fields => this.setState({ parameters: { ...parameters, fields } })}
                    locale={locale.fields} />
                <OverviewList
                    // TODO: also note global filter if present (use core view?)
                    task="httpLog/list"
                    view="httpLog/request"
                    parameters={parameters}
                    expanded={expanded}
                    fields={FIELDS}
                    waitUntilFiltersLoaded
                    onGetItemLink={id => `/administrado/protokolo/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />
                <CSVExport
                    open={this.state.csvExportOpen}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    task="httpLog/list"
                    parameters={parameters}
                    fields={FIELDS}
                    detailView="httpLog/request"
                    detailViewOptions={id => ({ id, noFetch: true })}
                    locale={{
                        fields: locale.fields,
                    }}
                    filenamePrefix={locale.csvFilename} />
            </div>
        );
    }
}
