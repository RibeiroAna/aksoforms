import { h } from 'preact';
import { CircularProgress } from 'yamdl';
import TaskDialog from '../../../components/tasks/task-dialog';
import { useDataView } from '../../../core';
import { votes as locale, notifTemplates as notifLocale } from '../../../locale';
import makeCreateTask from './tasks-create';
import './tasks.less';
import { deleteDialog, updateDialog } from '../../../components/tasks/task-templates';

export default {
    create: makeCreateTask(false),
    update: updateDialog({
        locale: locale.update,
        fields: locale.fields,
    }),
    delete: deleteDialog({
        locale: locale.delete,
    }),
    createTemplate: makeCreateTask(true),
    updateTemplate: updateDialog({
        locale: {
            ...locale.update,
            title: locale.update.templateTitle,
        },
        fields: locale.fields,
    }),
    deleteTemplate: deleteDialog({
        locale: {
            title: locale.delete.templateTitle,
            button: locale.delete.button,
            description: locale.delete.templateDescription,
        },
    }),

    sendCastBallotNotif ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={notifLocale.send.send.title}
                actionLabel={notifLocale.send.send.confirm}
                run={() => task.runOnce()}>
                <NotifTemplateMessage vote={task.options.id} />
            </TaskDialog>
        );
    },
};

function NotifTemplateMessage ({ vote }) {
    const [loading,, stats] = useDataView('votes/stats', { id: vote });

    if (loading) {
        return <CircularProgress small indeterminate />;
    } else if (stats) {
        return locale.sendCastBallotNotifMessage(stats.numVoters - stats.numBallots);
    }

    return null;
}
