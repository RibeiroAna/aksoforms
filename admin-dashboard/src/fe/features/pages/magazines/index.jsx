import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewList from '../../../components/lists/overview-list';
import OverviewPage from '../../../components/overview/overview-page';
import { magazines as locale } from '../../../locale';
import { FIELDS } from './fields';

export default class Magazines extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'name',
                query: '',
            },
            fields: [
                { id: 'org', sorting: 'none', fixed: true },
                { id: 'name', sorting: 'asc', fixed: true },
                { id: 'description', sorting: 'none', fixed: true },
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
        if (perms.hasPerm('magazines.create.uea') || perms.hasPerm('magazines.create.tejo')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('magazines/createMagazine', {}),
            });
        }

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <OverviewList
                task="magazines/listMagazines"
                view="magazines/magazine"
                updateView={['magazines/sigMagazines']}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/revuoj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}
