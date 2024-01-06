import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailView from '../../../../components/detail/detail';
import DetailPage from '../../../../components/detail/detail-page';
import { LinkButton } from '../../../../router';
import { clients as locale } from '../../../../locale';
import { FIELDS } from './fields';
import './detail.less';

export default class ClientDetailPage extends DetailPage {
    locale = locale;

    get id () {
        return this.props.match[1];
    }

    createCommitTask = (changedFields, edit) => {
        return this.context.createTask('clients/update', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    };

    renderActions ({ perms }) {
        const id = this.id;
        const actions = [];

        if (perms.hasPerm('clients.perms.read')) {
            actions.push({
                label: locale.perms.title,
                action: () => this.props.onNavigate(`/administrado/klientoj/${id}/permesoj`),
                overflow: true,
            });
        }

        if (perms.hasPerm('clients.delete')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('clients/delete', {}, { id }),
                overflow: true,
                danger: true,
            });
        }

        if (perms.hasPerm('clients.update')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.onNavigate(`/administrado/klientoj/${id}/redakti`, true),
            });
        }

        return actions;
    }

    renderContents ({ perms, editing }, { edit }) {
        const id = this.id;

        return (
            <div class="client-detail-page">
                <DetailView
                    view="clients/client"
                    id={id}
                    header={Header}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}
                    userData={{ perms }} />
            </div>
        );
    }
}

function Header ({ item, editing, userData: { perms } }) {
    if (editing) return null;

    const canReadPerms = perms.hasPerm('clients.perms.read');
    const canEditPerms = perms.hasPerm('clients.perms.update');

    return (
        <div class="client-header">
            <h1>{item.name}</h1>
            {canReadPerms ? (
                <LinkButton target={`/administrado/klientoj/${item.id}/permesoj`}>
                    {canEditPerms ? locale.perms.editPerms : locale.perms.viewPerms}
                </LinkButton>
            ) : null}
        </div>
    );
}
