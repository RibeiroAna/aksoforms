import { h } from 'preact';
import { useContext } from 'preact/compat';
import PermsEditorPage from '../perms-editor/page';
import { adminGroups as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';
import { usePerms } from '../../../../perms';
import { useDataView } from '../../../../core';

export default function AdminGroupPermsEditor ({ matches }) {
    const groupId = +matches.group[1];

    const userPerms = usePerms();
    const core = useContext(coreContext);
    const [loading, error, group] = useDataView('adminGroups/group', {
        id: groupId,
        fetchPerms: true,
    });

    const isEditable = userPerms.hasPerm('admin_groups.update');

    const save = (permissions) => {
        core.createTask('adminGroups/setPermissions', {
            id: groupId,
        }, {
            permissions,
            original: group.permissions,
        });
    };

    return (
        <PermsEditorPage
            loading={loading}
            error={error}
            perms={group?.permissions}
            editable={isEditable}
            save={save}
            title={locale.permsTitle}
            isGroup />
    );
}
