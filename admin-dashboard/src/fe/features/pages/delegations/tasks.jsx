import { h } from 'preact';
import {
    delegations as locale,
    delegationSubjects as subjectsLocale,
    delegationApplications as applicationsLocale,
} from '../../../locale';
import { createDialog, updateDialog, deleteDialog } from '../../../components/tasks/task-templates';
import TaskDialog from '../../../components/tasks/task-dialog';
import { FIELDS as DELEGATION_FIELDS } from './delegates/fields';
import { FIELDS as SUBJECT_FIELDS } from './subjects/fields';
import { FIELDS as APPLICATION_FIELDS } from './applications/fields';

export default {
    createSubject: createDialog({
        locale: subjectsLocale,
        fieldNames: ['org', 'name', 'description'],
        fields: SUBJECT_FIELDS,
        className: 'delegation-subjects-task-create',
        onCompletion: (task, routerContext, id) => routerContext.navigate(`/delegitoj/fakoj/${id}`),
    }),
    updateSubject: updateDialog({ locale: subjectsLocale.update, fields: subjectsLocale.fields }),
    deleteSubject: deleteDialog({ locale: subjectsLocale.delete }),

    createApplication: createDialog({
        locale: applicationsLocale,
        fieldNames: [
            'org',
            'codeholderId',
            'cities',
            'subjects',
            'hosting',
            'tos',
            'applicantNotes',
            'internalNotes',
        ],
        fields: APPLICATION_FIELDS,
        className: 'delegation-applications-task-create',
        onCompletion: (task, routerContext, id) => routerContext.navigate(`/delegitoj/kandidatighoj/${id}`),
    }),
    updateApplication: updateDialog({ locale: applicationsLocale.update, fields: applicationsLocale.fields }),
    deleteApplication: deleteDialog({ locale: applicationsLocale.delete }),

    approveApplication: createDialog({
        locale: { ...locale, create: applicationsLocale.approve },
        fieldNames: ['org', 'codeholderId', 'cities', 'countries', 'subjects', 'hosting', 'tos'],
        fields: DELEGATION_FIELDS,
        onCompletion: (task, routerContext) => routerContext.navigate(`/delegitoj/${task.parameters.codeholderId}/${task.parameters.org}`),
    }),
    denyApplication ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={applicationsLocale.deny.title}
                actionLabel={applicationsLocale.deny.button}
                actionDanger
                run={() => task.runOnce()}>
                {applicationsLocale.deny.description}
            </TaskDialog>
        );
    },
};

