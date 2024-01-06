import { h } from 'preact';
import { TextField } from 'yamdl';
import TaskDialog from '../../../../components/tasks/task-dialog';
import { ValidatedTextField, Field } from '../../../../components/form';
import { routerContext } from '../../../../router';
import { countries as locale, countryGroups as groupsLocale } from '../../../../locale';
import { deleteDialog, updateDialog } from '../../../../components/tasks/task-templates';
import './tasks.less';

export default {
    update: updateDialog({
        locale: locale.update,
        fields: locale.fields,
    }),
    createGroup ({ open, task }) {
        const fixCodeValue = codeValue => {
            codeValue = codeValue || '';
            if (!codeValue.startsWith('x')) codeValue = 'x' + codeValue;
            codeValue = codeValue.toLowerCase().replace(/[^a-z0-9]/, '').substr(0, 3);
            return codeValue;
        };

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        class="country-group-create-dialog"
                        open={open}
                        onClose={() => task.drop()}
                        title={groupsLocale.create.title}
                        actionLabel={groupsLocale.create.button}
                        run={() => task.runOnce().then(() => {
                            routerContext.navigate(`/administrado/landaroj/${task.parameters.code}`);
                        })}>
                        <Field>
                            <ValidatedTextField
                                outline
                                validate={value => {
                                    if (!value.match(/^x[a-z]{2}$/)) {
                                        return groupsLocale.create.invalidCode;
                                    }
                                }}
                                label={groupsLocale.fields.code}
                                value={fixCodeValue(task.parameters.code)}
                                onChange={v => task.update({ code: fixCodeValue(v) })} />
                        </Field>
                        <Field>
                            <TextField
                                outline
                                required
                                label={groupsLocale.fields.name}
                                value={task.parameters.name || ''}
                                onChange={name => task.update({ name })} />
                        </Field>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    updateGroup: updateDialog({
        locale: groupsLocale.update,
        fields: groupsLocale.fields,
    }),
    deleteGroup: deleteDialog({
        locale: groupsLocale.delete,
        objectView: (_, { id }) => ['countries/group', { id }],
        objectName: group => group.name,
    }),
};
