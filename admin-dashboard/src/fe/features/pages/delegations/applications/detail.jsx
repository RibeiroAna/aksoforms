import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { delegationApplications as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class DelegationApplication extends DetailPage {
    locale = locale;

    createCommitTask (changedFields, edit) {
        return this.context.createTask('delegations/updateApplication', {
            id: this.application,
            _changedFields: changedFields,
        }, edit);
    }

    get application () {
        return +this.props.matches.application[1];
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm(`delegations.applications.update.${this.org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (perms.hasPerm(`delegations.applications.delete.${this.org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('delegations/deleteApplication', {
                    id: this.application,
                }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <div class="delegation-application-page">
                <DetailView
                    view="delegations/application"
                    id={this.application}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()} />
            </div>
        );
    }
}
