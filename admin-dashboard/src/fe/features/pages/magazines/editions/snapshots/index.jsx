import { h } from 'preact';
import { Fragment } from 'preact/compat';
import OverviewPage from '../../../../../components/overview/overview-page';
import OverviewList from '../../../../../components/lists/overview-list';
import { FIELDS } from './fields';
import { magazineSnaps as locale } from '../../../../../locale';
import AddIcon from '@material-ui/icons/Add';
import DetailShell from '../../../../../components/detail/detail-shell';

export default class SnapshotsPage extends OverviewPage {
    state = {
        parameters: {
            search: { query: '' },
            fields: [
                { id: 'time', sorting: 'none', fixed: true },
                { id: 'name', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
        org: null,
        csvExportOpen: false,
    };

    locale = locale;

    get magazine () {
        if (this.props.matches.magazine) return +this.props.matches.magazine[1];
        return null;
    }

    get edition () {
        if (this.props.matches.edition) return +this.props.matches.edition[1];
        return null;
    }

    renderActions ({ perms }) {
        const actions = [];

        if (this.magazine && perms.hasPerm(`magazines.snapshots.create.${this.state.org}`) && perms.hasPerm('codeholders.read')) {
            actions.push({
                icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.create.menuItem,
                action: () => this.context.createTask('magazines/createSnapshot', {
                    magazine: this.magazine,
                    edition: this.edition,
                }),
            });
        }

        return actions;
    }

    renderContents (_, { parameters }) {
        return (
            <Fragment>
                <OverviewList
                    task="magazines/listSnapshots"
                    view="magazines/snapshot"
                    updateView={['magazines/sigSnapshots', { magazine: this.magazine, edition: this.edition }]}
                    useDeepCmp
                    options={{ magazine: this.magazine, edition: this.edition }}
                    viewOptions={{ magazine: this.magazine, edition: this.edition }}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={(id) => `/revuoj/${this.magazine}/numero/${this.edition}/momentaj-abonantoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />

                <DetailShell
                    view="magazines/magazine"
                    id={this.magazine}
                    fields={{}} locale={{}}
                    onData={data => data && this.setState({ org: data.org })} />
            </Fragment>
        );
    }
}

