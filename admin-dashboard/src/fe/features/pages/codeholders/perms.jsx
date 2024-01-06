import { h } from 'preact';
import PermsEditorPage from '../administration/perms-editor/page';
import { codeholders as locale } from '../../../locale';
import { coreContext } from '../../../core/connection';
import { usePerms } from '../../../perms';
import { useDataView } from '../../../core';
import { useContext } from 'preact/compat';

export default function CodeholderPermsEditor ({ matches }) {
    const codeholder = +matches.codeholder[1];

    const userPerms = usePerms();
    const core = useContext(coreContext);
    const [loading, error, codeholderPerms] = useDataView('codeholders/permissions', { id: codeholder });

    const isEditable = userPerms.hasPerm('codeholders.perms.update');

    const save = (permissions) => {
        core.createTask('codeholders/setPermissions', {
            id: codeholder,
        }, {
            permissions,
            original: codeholderPerms,
        });
    };

    return (
        <PermsEditorPage
            loading={loading}
            error={error}
            perms={codeholderPerms}
            save={save}
            editable={isEditable}
            title={locale.perms.title}
        />
    );
}
