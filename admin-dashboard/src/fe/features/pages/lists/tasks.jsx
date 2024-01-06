import { h } from 'preact';
import { TextField } from 'yamdl';
import TaskDialog from '../../../components/tasks/task-dialog';
import { Field } from '../../../components/form';
import { lists as locale } from '../../../locale';
import { routerContext } from '../../../router';
import './tasks.less';
import { deleteDialog } from '../../../components/tasks/task-templates';

export default {
    create ({ open, task }) {
        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        class="lists-task-create"
                        open={open}
                        onClose={() => task.drop()}
                        title={locale.create.title}
                        actionLabel={locale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/listoj/${id}`);
                        })}>
                        <p>
                            {locale.create.warning}
                        </p>
                        <Field>
                            <TextField
                                outline
                                required
                                label={locale.fields.name}
                                value={task.parameters.name || ''}
                                onChange={name => task.update({ name })} />
                        </Field>
                        <Field>
                            <TextField
                                outline
                                label={locale.fields.description}
                                value={task.parameters.description || ''}
                                onChange={v => task.update({ description: v || null })} />
                        </Field>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    update ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={locale.update.title}
                actionLabel={locale.update.button}
                run={() => task.runOnce()}>
            </TaskDialog>
        );
    },
    delete: deleteDialog({
        locale: locale.delete,
    }),
};
