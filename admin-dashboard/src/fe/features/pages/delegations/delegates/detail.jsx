import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { delegations as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class Delegations extends DetailPage {
    createCommitTask (changedFields, edit) {
        return this.context.createTask('codeholders/setDelegations', {
            id: this.codeholder,
            org: this.org,
            _changedFields: changedFields,
        }, edit);
    }

    locale = locale;

    get codeholder () {
        return +this.props.matches.codeholder[1];
    }

    get org () {
        return this.props.matches.org[1];
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm(`codeholders.delegations.update.${this.org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }}/>,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (perms.hasPerm(`codeholders.delegations.delete.${this.org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('codeholders/deleteDelegations', {
                    id: this.codeholder,
                    org: this.org,
                }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <div class="delegations-page">
                <DetailView
                    view="codeholders/delegation"
                    id={this.codeholder}
                    options={{ org: this.org }}
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
