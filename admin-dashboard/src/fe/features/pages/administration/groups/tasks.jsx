import { h } from 'preact';
import { TextField } from 'yamdl';
import SavePerms from '../perms-editor/save';
import { adminGroups as locale } from '../../../../locale';
import { deleteDialog } from '../../../../components/tasks/task-templates';
import { Field } from '../../../../components/form';
import TaskDialog from '../../../../components/tasks/task-dialog';
import ChangedFields from '../../../../components/tasks/changed-fields';
import { routerContext } from '../../../../router';
import './tasks.less';

export default {
    create ({ open, task }) {
        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        class="admin-groups-task-create"
                        open={open}
                        onClose={() => task.drop()}
                        title={locale.add}
                        actionLabel={locale.addButton}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/administrado/grupoj/${id}`);
                        })}>
                        <Field>
                            <TextField
                                required
                                outline
                                label={locale.fields.name}
                                value={task.parameters.name || ''}
                                onChange={name => task.update({ name })} />
                        </Field>
                        <Field>
                            <TextField
                                outline
                                label={locale.fields.description}
                                value={task.parameters.description || ''}
                                onChange={description => task.update({ description })} />
                        </Field>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    update ({ open, task }) {
        return (
            <TaskDialog
                class="admin-groups-task-update"
                open={open}
                onClose={() => task.drop()}
                title={locale.editGroup}
                actionLabel={locale.editUpdate}
                running={task.running}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={locale.fields} />
            </TaskDialog>
        );
    },
    delete: deleteDialog({
        locale: locale.delete,
        objectView: ({ id }) => ['adminGroups/group', { id }],
        objectName: ({ name }) => name,
    }),


    setPermissions ({ open, core, task }) {
        return (
            <SavePerms
                open={open}
                core={core}
                task={task}
                pxTask="adminGroups/setPermissionsPX"
                mrTask="adminGroups/setPermissionsMR" />
        );
    },
};
