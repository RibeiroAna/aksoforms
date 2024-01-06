import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import Page from '../../../components/page';
import Meta from '../../meta';
import SearchFilters from '../../../components/overview/search-filters';
import OverviewList from '../../../components/lists/overview-list';
import { coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { notifTemplates as locale } from '../../../locale';
import { FIELDS } from './fields';
import { FILTERS } from './filters';

const SEARCHABLE_FIELDS = ['name', 'description', 'subject'];

export default connectPerms(class NotifTemplatesPage extends Page {
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
                { id: 'org', sorting: 'none' },
                { id: 'name', sorting: 'asc' },
                { id: 'intent', sorting: 'none' },
            ],
            offset: 0,
            limit: 10,
        },
        expanded: false,
    };

    static contextType = coreContext;

    #searchInput = null;

    render ({ perms }, { expanded, parameters }) {
        const actions = [];

        if (perms.hasPerm('notif_templates.create.uea') || perms.hasPerm('notif_templates.create.tejo')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                action: () => this.context.createTask('notifTemplates/create'),
            });
        }

        return (
            <div class="notif-templates-page">
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
                        searchFields: locale.fields,
                        filters: locale.filters,
                    }}
                    inputRef={view => this.#searchInput = view}
                    category="notif_templates" />
                <OverviewList
                    expanded={expanded}
                    task="notifTemplates/list"
                    view="notifTemplates/template"
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/amasmesaghoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    updateView={['notifTemplates/sigTemplates']} />
            </div>
        );
    }
});
