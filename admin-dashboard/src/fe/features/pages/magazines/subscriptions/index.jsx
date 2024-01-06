import { h } from 'preact';
import { Fragment } from 'preact/compat';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import { FIELDS } from './fields';
import { FILTERS } from './filters';
import { magazineSubs as locale } from '../../../../locale';
import AddIcon from '@material-ui/icons/Add';
import { GetMagazineData } from '../utils';

export default class SubscriptionsPage extends OverviewPage {
    state = {
        parameters: {
            search: {
                field: 'internalNotes',
                query: '',
            },
            fields: [
                { id: 'createdTime', sorting: 'desc', fixed: true },
                !this.magazine && { id: 'magazineId', sorting: 'none', fixed: true },
                !this.codeholder && { id: 'codeholderId', sorting: 'none', fixed: true },
                { id: 'year', sorting: 'desc', fixed: true },
            ].filter(x => x),
            filters: {},
            jsonFilter: { _disabled: true, filter: {} },
            offset: 0,
            limit: 10,
        },
        org: null,
    };

    locale = locale;
    filters = this.codeholder ? {} : FILTERS;
    searchFields = ['internalNotes'];

    get codeholder () {
        if (this.props.matches.codeholder) return +this.props.matches.codeholder[1];
        return null;
    }

    get magazine () {
        if (this.props.matches.magazine) return +this.props.matches.magazine[1];
        return null;
    }

    renderActions ({ perms }) {
        const actions = [];

        if (this.magazine && perms.hasPerm(`magazines.subscriptions.create.${this.state.org}`) && perms.hasPerm('codeholders.read')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('magazines/createSubscription', {}, {
                    magazineId: this.magazine,
                }),
            });
        }

        // TODO: better cross-org perms
        if (this.codeholder && (perms.hasPerm(`magazines.subscriptions.create.tejo`) || perms.hasPerm(`magazines.subscriptions.create.uea`))) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('magazines/createSubscription', {}, {
                    codeholderId: this.codeholder,
                }),
            });
        }

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <Fragment>
                <OverviewList
                    expanded={this.state.expanded}
                    task={this.codeholder
                        ? 'magazines/listCodeholderSubscriptions'
                        : 'magazines/listSubscriptions'}
                    view="magazines/subscription"
                    updateView={['magazines/sigSubscriptions']}
                    useDeepCmp
                    options={this.codeholder ? { codeholder: this.codeholder } : { magazine: this.magazine }}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={(id, data) => `/revuoj/${data.magazineId}/simplaj-abonoj/${data.rawId}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />

                {this.magazine ? (
                    <GetMagazineData
                        id={this.magazine}
                        onData={data => data && this.setState({ org: data.org })} />
                ) : null}
            </Fragment>
        );
    }
}
