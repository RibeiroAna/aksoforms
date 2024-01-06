import { h } from 'preact';
import TaskDialog from '../../../../components/tasks/task-dialog';
import SavePerms from '../perms-editor/save';
import { createDialog, updateDialog, deleteDialog } from '../../../../components/tasks/task-templates';
import { clients as locale } from '../../../../locale';
import { FIELDS } from './fields';
import './tasks.less';

export default {
    create: createDialog({
        locale,
        fieldNames: ['name', 'ownerName', 'ownerEmail'],
        fields: FIELDS,
        onCompletion: (task, routerContext, { id, secret }) => {
            routerContext.navigate(`/administrado/klientoj/${id}`);
            task.worker.createTask('clients/_createdSecret', { secret });
        },
    }),
    _createdSecret ({ open, task }) {
        return (
            <TaskDialog
                sheet
                class="admin-client-secret-dialog"
                open={open}
                onClose={() => task.drop()}
                title={locale.secret.title}>
                <p class="secret-api-key-description">
                    {locale.secret.description}
                </p>
                <textarea
                    readOnly
                    class="secret-api-key-container"
                    value={task.options ? task.options.secret : '???'} />
            </TaskDialog>
        );
    },
    update: updateDialog({ locale: locale.update, fields: locale.fields }),
    delete: deleteDialog({
        locale: locale.delete,
        objectView: (_, { id }) => ['clients/client', { id }],
        objectName: ({ name }) => name,
    }),

    setPermissions ({ open, core, task }) {
        return (
            <SavePerms
                open={open}
                core={core}
                task={task}
                pxTask="clients/setPermissionsPX"
                mrTask="clients/setPermissionsMR" />
        );
    },
};
