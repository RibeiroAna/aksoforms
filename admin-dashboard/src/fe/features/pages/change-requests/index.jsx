import { h } from 'preact';
import OverviewPage from '../../../components/overview/overview-page';
import OverviewList from '../../../components/lists/overview-list';
import { codeholderChgReqs as locale } from '../../../locale';
import { FIELDS } from './fields';
import { FILTERS } from './filters';

export default class ChangeRequestsPage extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'codeholderDescription',
                query: '',
            },
            fields: [
                { id: 'status', sorting: 'none', fixed: true },
                this.codeholderId ? null : ({ id: 'codeholderId', sorting: 'none', fixed: true }),
                { id: 'time', sorting: this.codeholderId ? 'desc' : 'asc', fixed: true },
                { id: 'codeholderDescription', sorting: 'none', fixed: true },
            ].filter(x => x),
            offset: 0,
            limit: 10,
        },
        expanded: false,
    };

    locale = locale;
    filters = FILTERS;
    searchFields = [
        'codeholderDescription',
        'internalNotes',
    ];

    get codeholderId () {
        return this.props.matches.codeholder ? +this.props.matches.codeholder[1] : null;
    }

    renderActions () {
        return [];
    }

    renderContents (_, { parameters, expanded }) {
        return (
            <OverviewList
                compact={!!this.codeholderId}
                task="codeholders/changeRequests"
                view="codeholders/changeRequest"
                useDeepCmp
                options={{ id: this.codeholderId }}
                waitUntilFiltersLoaded
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/shanghopetoj/${id}`}
                outOfTree={!!this.codeholderId}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                expanded={expanded}
                locale={locale.fields} />
        );
    }
}
