import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import OverviewList from '../../../../components/lists/overview-list';
import OverviewPage from '../../../../components/overview/overview-page';
import { intermediaries as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class Intermediaries extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'paymentDescription',
                query: '',
            },
            fields: [
                { id: 'countryCode', sorting: 'asc', fixed: true },
                { id: 'codeholders', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
    };

    locale = locale;
    filters = {};

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm('intermediaries.update')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('intermediaries/create', {}),
            });
        }

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <OverviewList
                task="intermediaries/list"
                view="intermediaries/intermediary"
                updateView={['intermediaries/sigIntermediaries']}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/perantoj/perantoj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}
