import { h } from 'preact';
import { Fragment } from 'preact/compat';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { GetMagazineData } from '../utils';
import { FIELDS } from './fields';
import { magazineSubs as locale } from '../../../../locale';

export default class Subscription extends DetailPage {
    state = {
        org: null,
    };

    locale = locale;

    get magazine () {
        return +this.props.matches.magazine[1];
    }

    get id () {
        return this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('magazines/updateSubscription', {
            magazine: this.magazine,
            rawId: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm(`magazines.subscriptions.update.${this.state.org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm(`magazines.subscriptions.delete.${this.state.org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('magazines/deleteSubscription', {
                    magazine: this.magazine,
                    rawId: this.id,
                }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailView
                    view="magazines/subscription"
                    options={{ magazine: this.magazine, rawId: this.id }}
                    id={this.id}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete} />

                <GetMagazineData
                    id={this.magazine}
                    onData={data => data && this.setState({ org: data.org })} />
            </Fragment>
        );
    }
}
