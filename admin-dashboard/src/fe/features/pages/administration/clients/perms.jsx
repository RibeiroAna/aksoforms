import { h } from 'preact';
import { useContext } from 'preact/compat';
import PermsEditorPage from '../perms-editor/page';
import { clients as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';
import { usePerms } from '../../../../perms';
import { useDataView } from '../../../../core';

export default function ClientPermseditor ({ matches }) {
    const clientId = matches.client[1];

    const userPerms = usePerms();
    const core = useContext(coreContext);
    const [loading, error, clientPerms] = useDataView('clients/permissions', {
        id: clientId,
    });

    const isEditable = userPerms.hasPerm('clients.perms.update');

    const save = (permissions) => {
        core.createTask('clients/setPermissions', {
            id: clientId,
        }, {
            permissions,
            original: clientPerms,
        });
    };

    return (
        <PermsEditorPage
            loading={loading}
            error={error}
            perms={clientPerms}
            save={save}
            title={locale.perms.title}
            editable={isEditable} />
    );
}
