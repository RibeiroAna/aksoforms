import { roles as locale } from '../../../locale';
import { createDialog, updateDialog, deleteDialog } from '../../../components/tasks/task-templates';
import { FIELDS } from './fields';

export default {
    create: createDialog({
        locale,
        fieldNames: Object.keys(FIELDS),
        fields: FIELDS,
        onCompletion: (task, routerContext, id) => routerContext.navigate(`/roloj/${id}`),
    }),
    update: updateDialog({ locale: locale.update, fields: locale.fields }),
    delete: deleteDialog({ locale: locale.delete }),
};
