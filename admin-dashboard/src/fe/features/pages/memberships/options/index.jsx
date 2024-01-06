import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import { membershipOptions as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class MembershipOptions extends OverviewPage {
    state = {
        parameters: {
            search: { query: '' },
            fields: [
                { id: 'year', sorting: 'desc', fixed: true },
                { id: 'enabled', sorting: 'none', fixed: true },
                { id: 'currency', sorting: 'none', fixed: true },
                { id: 'paymentOrg', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
    };

    locale = locale;

    renderActions ({ perms }) {
        const actions = [];
        if (perms.hasPerm('registration.options.update')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('memberships/createOptions', {}),
            });
        }
        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <OverviewList
                task="memberships/listOptions"
                view="memberships/options"
                updateView={['memberships/sigOptions']}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/membreco/alighiloj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}
