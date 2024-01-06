import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/compat';
import { CircularProgress, TextField } from 'yamdl';
import TaskDialog from './task-dialog';
import ChangedFields from './changed-fields';
import DisplayError from '../utils/error';
import { Field } from '../form';
import { coreContext } from '../../core/connection';
import { routerContext } from '../../router';
import { data as dataLocale } from '../../locale';
import './task-templates.less';

export function createDialog ({
    locale, fieldNames, fields: fieldDefs, className, onCompletion, canSubmit,
}) {
    return ({ open, task }) => {
        if (task.options._noGUI) return null;

        const fields = fieldNames.map(id => {
            const def = fieldDefs[id];
            const Component = def.component;
            return (
                <Field key={id} data-field={id} validate={() => {
                    if (def.validate) return def.validate({
                        value: task.parameters[id],
                        item: task.parameters,
                    });
                }}>
                    {def.wantsCreationLabel && (
                        <label class="creation-label">
                            {locale.fields[id]}
                        </label>
                    )}
                    <Component
                        slot="create"
                        editing value={task.parameters[id]}
                        onChange={value => task.update({ [id]: value })}
                        item={task.parameters}
                        onItemChange={item => task.update(item)} />
                </Field>
            );
        });

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        class={(className || '') + ' creation-task'}
                        open={open}
                        onClose={() => task.drop()}
                        title={locale.create.title}
                        actionLabel={locale.create.button}
                        actionDisabled={canSubmit && !canSubmit(task)}
                        run={() => task.runOnce().then(id => {
                            onCompletion(task, routerContext, id);
                        })}>
                        {locale.create.description ? (
                            <div class="creation-description">
                                {locale.create.description}
                            </div>
                        ) : null}
                        {fields}
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    };
}
export function updateDialog ({ locale, fields }) {
    return ({ open, task }) => {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={locale.title}
                actionLabel={locale.button}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={fields} />
            </TaskDialog>
        );
    };
}
export function deleteDialog ({ locale, objectView, objectName }) {
    return ({ open, task }) => {
        const [name, setName] = useState('');

        const [loading, setLoading] = useState(false);
        const [loadError, setLoadError] = useState(null);
        const [objName, setObjName] = useState(null);
        const core = useContext(coreContext);

        useEffect(() => {
            if (!objectView) return;
            setLoading(true);
            setObjName(null);
            setLoadError(null);

            core.viewData(...objectView(task.options, task.parameters)).then(data => {
                setObjName(objectName(data));
            }).catch(err => {
                setLoadError(err);
            }).finally(() => {
                setLoading(false);
            });
        }, []);

        return (
            <TaskDialog
                class="delete-task"
                open={open}
                onClose={() => task.drop()}
                title={locale.title}
                actionLabel={locale.button}
                actionDanger
                actionDisabled={objectView
                    && (!objName || name.toLowerCase().normalize() !== objName.toLowerCase().normalize())}
                run={() => task.runOnce()}>
                {locale.description}
                {objectView ? (
                    loading ? (
                        <div class="delete-type-confirmation is-loading">
                            <CircularProgress />
                        </div>
                    ) : loadError ? (
                        <div class="delete-type-confirmation is-error">
                            <DisplayError error={loadError} />
                        </div>
                    ) : (
                        <div class="delete-type-confirmation">
                            <div class="inner-desc">
                                {dataLocale.deleteTask.confirmName.msgPre}
                                <b>{objName}</b>
                                {dataLocale.deleteTask.confirmName.msgPost}
                            </div>
                            <TextField
                                class="inner-field"
                                outline
                                value={name}
                                onChange={setName} />
                        </div>
                    )
                ) : null}
            </TaskDialog>
        );
    };
}

