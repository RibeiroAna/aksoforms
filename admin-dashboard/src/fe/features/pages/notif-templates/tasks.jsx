import { h } from 'preact';
import TaskDialog from '../../../components/tasks/task-dialog';
import Segmented from '../../../components/controls/segmented';
import Select from '../../../components/controls/select';
import { org } from '../../../components/data';
import { Field } from '../../../components/form';
import ChangedFields from '../../../components/tasks/changed-fields';
import { notifTemplates as locale, data as dataLocale } from '../../../locale';
import { connectPerms } from '../../../perms';
import { routerContext } from '../../../router';
import { FIELDS } from './fields';
import './tasks.less';
import { useDataView } from '../../../core';
import { deleteDialog, updateDialog } from '../../../components/tasks/task-templates';

const CREATE_FIELDS = ['name', 'subject', 'from'];

function OrgEditor ({ value, onChange }) {
    const [,, emailDomains] = useDataView('notifTemplates/emailDomains', {});
    const orgs = emailDomains ? Object.keys(emailDomains) : null;

    return <org.editor value={value} onChange={onChange} orgs={orgs} />;
}

export default {
    create: connectPerms(({ open, task, perms }) => {
        const fields = [];

        const createTejo = perms.hasPerm('notif_templates.create.tejo');
        const createUea = perms.hasPerm('notif_templates.create.uea');
        if (createTejo && createUea) {
            fields.push(
                <Field class="org-field" key="org" validate={() => {
                    if (!task.parameters.org) return dataLocale.requiredField;
                }}>
                    <OrgEditor
                        value={task.parameters.org}
                        onChange={org => task.update({ org })} />
                </Field>
            );
        } else if (!task.parameters.org) {
            task.update({ org: createTejo ? 'tejo' : 'uea' });
        }

        if (!task.parameters.base) {
            // default value
            task.update({
                base: 'inherit',
                modules: [{
                    type: 'text',
                    columns: null,
                    button: null,
                }],
            });
        }

        fields.push(
            <Field class="base-field" key="base">
                <Segmented
                    selected={task.parameters.base}
                    onSelect={base => {
                        task.update({ base });
                        if (base === 'raw') {
                            task.update({
                                html: locale.raw.defaultHtml,
                                text: locale.raw.defaultText,
                                modules: undefined,
                            });
                        } else if (base === 'inherit') {
                            task.update({
                                modules: [{
                                    type: 'text',
                                    columns: null,
                                    button: null,
                                }],
                                html: undefined,
                                text: undefined,
                            });
                        }
                    }}>
                    {[
                        { id: 'raw', label: locale.bases.raw },
                        { id: 'inherit', label: locale.bases.inherit },
                    ]}
                </Segmented>
            </Field>
        );

        if (!task.parameters.intent) {
            // <select> will pretend it has a value even if it doesn't, so just add one
            // preemptively
            task.update({ intent: Object.keys(locale.intents)[0] });
        }

        fields.push(
            <Field key="intent">
                <Select
                    class="intent-picker"
                    value={task.parameters.intent}
                    onChange={intent => task.update({ intent })}
                    items={Object.keys(locale.intents).map(intent => ({
                        value: intent,
                        label: locale.intents[intent],
                    }))} />
            </Field>
        );

        for (const id of CREATE_FIELDS) {
            const Component = FIELDS[id].component;
            let label = null;
            if (FIELDS[id].wantsCreationLabel) {
                label = <label class="field-label">{locale.fields[id]}</label>;
            }
            fields.push(
                <Field key={id} validate={() => {
                    if (FIELDS[id].validate) FIELDS[id].validate({
                        item: task.parameters,
                        value: task.parameters[id],
                    });
                }}>
                    {label}
                    <Component
                        editing slot="create"
                        item={task.parameters}
                        onItemChange={v => task.update({ v })}
                        value={task.parameters[id]}
                        onChange={value => task.update({ [id]: value })} />
                </Field>
            );
        }

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        sheet
                        class="notif-templates-task-create"
                        open={open}
                        onClose={() => task.drop()}
                        title={locale.create.title}
                        actionLabel={locale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/amasmesaghoj/${id}/redakti`);
                        })}>
                        {fields}
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    }),
    duplicate ({ open, task }) {
        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        open={open}
                        onClose={() => task.drop()}
                        title={locale.duplicate.title}
                        actionLabel={locale.duplicate.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/amasmesaghoj/${id}/redakti`);
                        })}>
                        {locale.duplicate.description}
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    update: updateDialog({
        locale: locale.update,
        fields: locale.fields,
    }),
    delete: deleteDialog({
        locale: locale.delete,
    }),

    _sendCodeholderInfo ({ open, task }) {
        return (
            <TaskDialog
                class="notif-templates-task-send-codeholder-info"
                open={open}
                onClose={() => task.drop()}
                title={locale.sendCodeholder.title}
                actionLabel={locale.sendCodeholder.ok}
                run={() => task.drop()}>
                {locale.sendCodeholder.description}
            </TaskDialog>
        );
    },
};
