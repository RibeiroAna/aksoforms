import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { membershipEntries as locale } from '../../../../locale';
import { Header, FIELDS } from './fields';

export default class RegistrationEntry extends DetailPage {
    locale = locale;

    get id () {
        return this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('memberships/updateEntry', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm('registration.entries.update')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm('registration.entries.delete')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('memberships/deleteEntry', { id: this.id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <DetailView
                view="memberships/entry"
                id={this.id}
                header={Header}
                fields={FIELDS}
                options={{
                    fields: ['year', 'status', 'issue', 'newCodeholderId', 'timeSubmitted',
                        'internalNotes', 'offers', 'codeholderData'],
                }}
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
