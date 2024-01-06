import { h } from 'preact';
import { useContext } from 'preact/compat';
import TaskDialog from '../../../components/tasks/task-dialog';
import { TextField } from 'yamdl';
import {
    magazines as magazinesLocale,
    magazineEditions as editionsLocale,
    magazineToc as tocLocale,
    magazineSubs as subLocale,
    magazineSnaps as snapLocale,
} from '../../../locale';
import { DocumentIcon } from '../../../components/icons';
import { FileSize } from '../../../components/files';
import { createDialog, updateDialog, deleteDialog } from '../../../components/tasks/task-templates';
import { FIELDS as MAGAZINE_FIELDS } from './fields';
import { FIELDS as EDITION_FIELDS } from './editions/fields';
import { FIELDS as TOC_FIELDS } from './editions/toc/fields';
import { FIELDS as SNAP_FIELDS, MemberInclusionInfo } from './editions/snapshots/fields';
import { FIELDS as SUB_FIELDS } from './subscriptions/fields';
import './tasks.less';
import { routerContext } from '../../../router';
import { Field } from '../../../components/form';

export default {
    createMagazine: createDialog({
        locale: magazinesLocale,
        fieldNames: ['org', 'name', 'description'],
        fields: MAGAZINE_FIELDS,
        className: 'magazines-task-create',
        onCompletion: (task, routerContext, id) => routerContext.navigate(`/revuoj/${id}`),
    }),
    updateMagazine: updateDialog({ locale: magazinesLocale.update, fields: magazinesLocale.fields }),
    deleteMagazine: deleteDialog({
        locale: magazinesLocale.delete,
        objectView: ({ id }) => ['magazines/magazine', { id }],
        objectName: ({ name }) => name,
    }),
    createEdition: createDialog({
        locale: editionsLocale,
        fieldNames: ['idHuman', 'date'],
        fields: EDITION_FIELDS,
        className: 'magazines-task-create-edition',
        onCompletion: (task, routerContext, id) => routerContext.navigate(`/revuoj/${task.options.magazine}/numero/${id}`),
    }),
    updateEdition: updateDialog({ locale: editionsLocale.update, fields: editionsLocale.fields }),
    deleteEdition: deleteDialog({
        locale: editionsLocale.delete,
        objectView: ({ magazine, id }) => ['magazines/edition', { magazine, id }],
        objectName: ({ idHuman }) => idHuman,
    }),
    deleteEditionThumbnail: deleteDialog({ locale: editionsLocale.deleteThumbnail }),

    createTocEntry: createDialog({
        locale: tocLocale,
        fieldNames: ['page', 'title'],
        fields: TOC_FIELDS,
        className: 'magazines-task-create-toc-entry',
        onCompletion: (task, routerContext, id) => routerContext
            .navigate(`/revuoj/${task.options.magazine}/numero/${task.options.edition}/enhavo/${id}/redakti`),
    }),
    updateTocEntry: updateDialog({ locale: tocLocale.update, fields: tocLocale.fields }),
    deleteTocEntry: deleteDialog({ locale: tocLocale.delete }),

    updateEditionFile: ({ open, task }) => {
        const fileName = (task.parameters.file?.name || '')
            .replace(/\.epub(\.zip)?$/, '')
            .replace(/\.pdf$/, '');

        return (
            <TaskDialog
                class="magazines-task-update-edition-file"
                open={open}
                onClose={() => !task.running && task.drop()}
                title={editionsLocale.files.update.title}
                actionLabel={editionsLocale.files.update.button}
                run={() => task.runOnce()}>
                <div class="file-preview">
                    <div class="file-icon-container">
                        <DocumentIcon />
                    </div>
                    <div class="file-info">
                        <div class="file-name">
                            {fileName}
                            <span class="file-type">
                                {task.parameters.format}
                            </span>
                        </div>
                        <FileSize bytes={task.parameters.file?.size} />
                    </div>
                </div>
            </TaskDialog>
        );
    },
    deleteEditionFile: deleteDialog({ locale: editionsLocale.files.delete }),

    updateTocRecitation: ({ open, task }) => {
        const fileName = (task.parameters.file?.name || '').replace(/\.(mp3|wav|flac)?$/, '');

        return (
            <TaskDialog
                class="magazines-task-update-edition-file"
                open={open}
                onClose={() => !task.running && task.drop()}
                title={tocLocale.recitations.update.title}
                actionLabel={tocLocale.recitations.update.button}
                run={() => task.runOnce()}>
                <div class="file-preview">
                    <div class="file-icon-container">
                        <DocumentIcon />
                    </div>
                    <div class="file-info">
                        <div class="file-name">
                            {fileName}
                            <span class="file-type">
                                {task.parameters.format}
                            </span>
                        </div>
                        <FileSize bytes={task.parameters.file?.size} />
                    </div>
                </div>
            </TaskDialog>
        );
    },
    deleteTocRecitation: deleteDialog({ locale: tocLocale.recitations.delete }),

    createSnapshot2: createDialog({
        locale: snapLocale,
        fieldNames: ['name'],
        fields: SNAP_FIELDS,
    }),
    createSnapshot ({ open, core, task }) {
        const router = useContext(routerContext);

        return (
            <TaskDialog
                class="magazines-task-create-snaphot creation-task"
                open={open}
                onClose={() => task.drop()}
                title={snapLocale.create.title}
                actionLabel={snapLocale.create.button}
                run={() => task.runOnce().then(id => {
                    router.navigate(`/revuoj/${task.options.magazine}/numero/${task.options.edition}/momentaj-abonantoj/${id}`);
                })}>
                <Field>
                    <TextField
                        outline
                        label={snapLocale.fields.name}
                        value={task.parameters.name}
                        onChange={name => task.update({ name })} />
                </Field>
                <MemberInclusionInfo
                    magazine={task.options.magazine}
                    edition={task.options.edition}
                    onLinkClick={() => task.drop()} />
            </TaskDialog>
        );
    },
    updateSnapshot: updateDialog({ locale: snapLocale.update, fields: snapLocale.fields }),
    deleteSnapshot: deleteDialog({ locale: snapLocale.delete }),

    createSubscription: createDialog({
        locale: subLocale,
        fieldNames: ['magazineId', 'codeholderId', 'year', 'internalNotes'],
        fields: SUB_FIELDS,
        className: 'magazines-task-create-subscription',
        onCompletion: (task, routerContext, id) => routerContext
            .navigate(`/revuoj/${task.parameters.magazineId}/simplaj-abonoj/${id}`),
    }),
    updateSubscription: updateDialog({ locale: subLocale.update, fields: subLocale.fields }),
    deleteSubscription: deleteDialog({ locale: subLocale.delete }),
};
