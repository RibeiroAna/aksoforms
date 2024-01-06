import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewList from '../../../components/lists/overview-list';
import OverviewPage from '../../../components/overview/overview-page';
import { newsletters as locale } from '../../../locale';
import { FIELDS } from './fields';

export default class Newsletters extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'name',
                query: '',
            },
            fields: [
                { id: 'org', sorting: 'none', fixed: true },
                { id: 'name', sorting: 'asc', fixed: true },
                { id: 'numSubscribers', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
    };

    locale = locale;
    filters = {};
    searchFields = ['name', 'description'];

    renderActions ({ perms }) {
        const actions = [];

        // TODO: better cross-org perms
        if (perms.hasPerm('newsletters.uea.create') || perms.hasPerm('newsletters.tejo.create')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('newsletters/create', {}),
            });
        }

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <OverviewList
                task="newsletters/list"
                view="newsletters/newsletter"
                updateView={['newsletters/sigNewsletters']}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/bultenoj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}
