import { h } from 'preact';
import { newsletters as locale } from '../../../locale';
import TaskDialog from '../../../components/tasks/task-dialog';
import { createDialog, updateDialog, deleteDialog } from '../../../components/tasks/task-templates';
import { FIELDS } from './fields';

export default {
    create: createDialog({
        locale,
        fieldNames: ['org', 'name', 'description'],
        fields: FIELDS,
        className: 'newsletters-task-create',
        onCompletion: (task, routerContext, id) => routerContext.navigate(`/bultenoj/${id}`),
    }),
    update: updateDialog({ locale: locale.update, fields: locale.fields }),
    delete: deleteDialog({ locale: locale.delete }),

    send ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={locale.send.task.title}
                actionLabel={locale.send.task.confirm}
                run={() => task.runOnce()}>
                {task.parameters.deleteOnComplete
                    ? locale.send.task.descriptionDelete
                    : locale.send.task.description}
            </TaskDialog>
        );
    },
};
