import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailView from '../../../../components/detail/detail';
import { membershipOptions as locale } from '../../../../locale';
import { FIELDS } from './fields';
import DetailPage from '../../../../components/detail/detail-page';

export default class RegistrationOptions extends DetailPage {
    locale = locale;

    get id () {
        return +this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('memberships/updateOptions', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm('registration.options.update')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });

            actions.push({
                label: locale.duplicate.menuItem,
                action: () => this.context.createTask('memberships/dupOptions', { id: this.id }),
                overflow: true,
            });
        }

        if (perms.hasPerm('registration.options.delete')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('memberships/deleteOptions', { id: this.id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <DetailView
                compact // wider offers editor
                view="memberships/options"
                id={this.id}
                fields={FIELDS}
                locale={locale}
                edit={edit}
                onEditChange={edit => this.setState({ edit })}
                editing={editing}
                onEndEdit={this.onEndEdit}
                onCommit={this.onCommit}
                onDelete={this.onDelete} />
        );
    }
}
