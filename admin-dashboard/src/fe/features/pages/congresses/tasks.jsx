import { h } from 'preact';
import { lazy, Suspense, useContext, useEffect, useRef, useState } from 'preact/compat';
import { CircularProgress, TextField } from 'yamdl';
import TaskDialog from '../../../components/tasks/task-dialog';
import { Field } from '../../../components/form';
import ChangedFields from '../../../components/tasks/changed-fields';
import Segmented from '../../../components/controls/segmented';
import MdField from '../../../components/controls/md-field';
import { Required, email, org, timestamp } from '../../../components/data';
import {
    congresses as locale,
    congressInstances as instanceLocale,
    congressLocations as locationLocale,
    congressPrograms as programLocale,
    congressRegistrationForm as regFormLocale,
    congressParticipants as participantLocale,
    data as dataLocale,
    notifTemplates as notifLocale,
} from '../../../locale';
import { coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { routerContext } from '../../../router';
import { FIELDS as INSTANCE_FIELDS } from './instances/fields';
import { DetailInner as LocationEditor } from './instances/locations/detail';
import LocationPicker from './instances/location-picker';
import DisplayError from '../../../components/utils/error';
import WithRegistrationForm from './instances/registration-form/with-form';
import { deleteDialog, updateDialog } from '../../../components/tasks/task-templates';
import './tasks.less';

const ParticipantEditor = lazy(async () => ({
    default: (await import('./instances/participants/detail')).Detail,
}));

const CREATE_INSTANCE_FIELDS = ['name', 'humanId', 'dateFrom', 'dateTo'];

export default {
    create: connectPerms(({ perms, open, task }) => {
        const hasTejo = perms.hasPerm('congresses.create.tejo');
        const hasUea = perms.hasPerm('congresses.create.uea');

        useEffect(() => {
            if (hasTejo !== hasUea) {
                if (hasTejo) task.update({ org: 'tejo' });
                else if (hasUea) task.update({ org: 'uea' });
            }
        });

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        class="congresses-task-create-congress"
                        open={open}
                        onClose={() => task.drop()}
                        title={locale.create.title}
                        actionLabel={locale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/kongresoj/${id}`);
                        })}>
                        <Field>
                            <TextField
                                required
                                outline
                                label={locale.fields.abbrev}
                                value={task.parameters.abbrev || ''}
                                onChange={v => task.update({ abbrev: v || null })} />
                        </Field>
                        <Field>
                            <TextField
                                required
                                outline
                                label={locale.fields.name}
                                value={task.parameters.name || ''}
                                onChange={name => task.update({ name })} />
                        </Field>
                        {hasTejo && hasUea && (
                            <Field validate={() => {
                                if (!task.parameters.org) return dataLocale.requiredField;
                            }}>
                                <org.editor
                                    orgs={['uea', 'tejo']}
                                    value={task.parameters.org}
                                    onChange={org => task.update({ org })} />
                            </Field>
                        )}
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    }),
    update: updateDialog({
        locale: locale.update,
        fields: locale.fields,
    }),
    delete: deleteDialog({
        locale: locale.delete,
        objectView: ({ id }) => ['congresses/congress', { id }],
        objectName: ({ name }) => name,
    }),

    createInstance ({ open, task }) {
        const { congress } = task.options;

        const fields = CREATE_INSTANCE_FIELDS.map(id => {
            const Component = INSTANCE_FIELDS[id].component;
            return (
                <Field key={id} validate={INSTANCE_FIELDS[id].validate}>
                    <Component
                        slot="create"
                        editing value={task.parameters[id]}
                        onChange={value => task.update({ [id]: value })}
                        item={task.parameters}
                        onItemChange={v => task.update(v)} />
                </Field>
            );
        });


        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        class="congresses-task-create-instance"
                        open={open}
                        onClose={() => task.drop()}
                        title={instanceLocale.create.title}
                        actionLabel={instanceLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/kongresoj/${congress}/okazigoj/${id}`);
                        })}>
                        {fields}
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    updateInstance: updateDialog({
        locale: instanceLocale.update,
        fields: instanceLocale.fields,
    }),
    deleteInstance: deleteDialog({
        locale: instanceLocale.delete,
        objectView: ({ congress, id }) => ['congresses/instance', { congress, id }],
        objectName: ({ name }) => name,
    }),

    createLocation ({ open, task }) {
        const { congress, instance } = task.options;
        const mapPickerRef = useRef(null);

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        sheet
                        class="congresses-task-create-location"
                        data-type={task.parameters.type}
                        fullScreen={width => width < 600}
                        open={open}
                        onClose={() => task.drop()}
                        title={locationLocale.create.title}
                        actionLabel={locationLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/kongresoj/${congress}/okazigoj/${instance}/lokoj/${id}`);
                        })}>
                        <Field class="location-type" validate={() => {
                            if (!task.parameters.type) return dataLocale.requiredField;
                        }}>
                            <Segmented
                                selected={task.parameters.type}
                                onSelect={type => {
                                    task.update({ type });
                                    // we need to update the map size after the animation
                                    setTimeout(() => {
                                        if (mapPickerRef.current) {
                                            mapPickerRef.current.map.invalidateSize();
                                        }
                                    }, 300);
                                }}>
                                {['external', 'internal'].map(k => ({
                                    id: k,
                                    label: locationLocale.fields.types[k],
                                }))}
                            </Segmented>
                        </Field>
                        <LocationEditor
                            isCreation
                            congress={task.options.congress}
                            instance={task.options.instance}
                            id={null}
                            item={task.parameters}
                            editing={true}
                            onItemChange={data => task.update(data)} />
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    updateLocation: updateDialog({
        locale: locationLocale.update,
        fields: locationLocale.fields,
    }),
    deleteLocation: deleteDialog({
        locale: locationLocale.delete,
    }),
    deleteLocationThumbnail: deleteDialog({ locale: locationLocale.deleteThumbnail }),

    createProgram ({ open, task }) {
        const { congress, instance } = task.options;

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        sheet
                        class="congresses-task-create-program"
                        open={open}
                        onClose={() => task.drop()}
                        title={programLocale.create.title}
                        actionLabel={programLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/kongresoj/${congress}/okazigoj/${instance}/programeroj/${id}`);
                        })}>
                        <Field validate={() => {
                            if (!task.parameters.title) return dataLocale.requiredField;
                        }}>
                            <label class="field-label"><Required>{programLocale.fields.title}</Required></label>
                            <MdField
                                ignoreLiveUpdates
                                class="name-field"
                                value={task.parameters.title || ''}
                                onChange={title => task.update({ title })}
                                maxLength={100}
                                editing
                                singleLine
                                rules={['emphasis', 'strikethrough']} />
                        </Field>
                        <Field>
                            <label class="field-label">{programLocale.fields.description}</label>
                            <MdField
                                ignoreLiveUpdates
                                editing value={task.parameters.description || null}
                                onChange={value => task.update({ description: value || null })}
                                rules={['emphasis', 'strikethrough', 'link', 'list', 'table', 'image']} />
                        </Field>
                        <Field>
                            <TextField
                                class="name-field"
                                outline label={programLocale.fields.owner}
                                value={task.parameters.owner || ''}
                                onChange={v => task.update({ owner: v || null })} />
                        </Field>
                        <Field>
                            <timestamp.editor
                                required
                                class="date-field"
                                zone={task.options.tz}
                                outline
                                label={<Required>{programLocale.fields.timeFrom}</Required>}
                                value={task.parameters.timeFrom || null}
                                onChange={timeFrom => task.update({ timeFrom })} />
                        </Field>
                        <Field>
                            <timestamp.editor
                                required
                                class="date-field"
                                zone={task.options.tz}
                                outline
                                onFocus={() => {
                                    if (!task.parameters.timeTo) task.update({
                                        timeTo: task.parameters.timeFrom,
                                    });
                                }}
                                label={<Required>{programLocale.fields.timeTo}</Required>}
                                value={task.parameters.timeTo || null}
                                onChange={timeTo => task.update({ timeTo })} />
                        </Field>
                        <Field>
                            <LocationPicker
                                congress={congress}
                                instance={instance}
                                editing value={task.parameters.location || null}
                                onChange={location => task.update({ location })} />
                        </Field>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    updateProgram: updateDialog({
        locale: programLocale.update,
        fields: programLocale.fields,
    }),
    deleteProgram: deleteDialog({
        locale: programLocale.delete,
    }),

    setRegistrationForm ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={regFormLocale.update.title}
                actionLabel={regFormLocale.update.button}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={programLocale.fields} />
            </TaskDialog>
        );
    },
    deleteRegistrationForm: deleteDialog({
        locale: regFormLocale.delete,
        objectView: ({ congress, instance }) => ['congresses/instance', { congress, id: instance }],
        objectName: ({ name }) => name,
    }),

    createParticipant ({ core, open, task }) {
        const { congress, instance } = task.options;

        return (
            <TaskDialog
                sheet
                class="congresses-task-create-participant"
                open={open}
                onClose={() => task.drop()}
                title={participantLocale.create.title}
                actionLabel={participantLocale.create.button}
                run={() => task.runOnce()}>
                <WithRegistrationForm
                    congress={congress}
                    instance={instance}>
                    {({ form, loaded, error }) => {
                        if (!loaded) {
                            return <CircularProgress indeterminate />;
                        }
                        if (error) {
                            return <DisplayError error={error} />;
                        }
                        if (!form) {
                            if (!task.dropped) {
                                core.createTask('info', {
                                    message: participantLocale.noParticipation,
                                });
                                task.drop();
                            }
                            return (
                                <div class="no-form">
                                    {participantLocale.noParticipation}
                                </div>
                            );
                        }
                        return (
                            <Suspense
                                fallback={<CircularProgress indeterminate />}>
                                <ParticipantEditor
                                    editing
                                    creating
                                    item={task.parameters}
                                    onItemChange={item => task.update(item)}
                                    userData={{
                                        congress,
                                        instance,
                                        currency: form?.price?.currency,
                                        formLoaded: !!form,
                                        registrationForm: form,
                                    }} />
                            </Suspense>
                        );
                    }}
                </WithRegistrationForm>
            </TaskDialog>
        );
    },
    updateParticipant: updateDialog({
        locale: participantLocale.update,
        fields: participantLocale.fields,
    }),
    deleteParticipant: deleteDialog({
        locale: participantLocale.delete,
    }),

    resendParticipantConfirmation ({ open, core, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={participantLocale.resendConfirmation.title}
                actionLabel={participantLocale.resendConfirmation.button}
                run={() => task.runOnce().then(() => {
                    core.createTask('info', {
                        message: participantLocale.resendConfirmation.sent,
                    });
                })}>
                {participantLocale.resendConfirmation.description}
                {' '}
                <ParticipantEmailAddress
                    congress={task.options.congress}
                    instance={task.options.instance}
                    id={task.options.id} />
            </TaskDialog>
        );
    },
    sendParticipantsNotifTemplate ({ open, core, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={notifLocale.send.send.title}
                actionLabel={notifLocale.send.send.confirm}
                run={() => task.runOnce()}>
                <NotifTemplateMessage
                    core={core}
                    options={task.options} />
            </TaskDialog>
        );
    },

    _findParticipantById ({ open, task }) {
        const [dataId, setDataId] = useState('');
        const router = useContext(routerContext);
        const textField = useRef();

        const isDataIdValid = /^[0-9a-f]+$/i.test(dataId);

        const doOpen = () => {
            if (!isDataIdValid) return;
            const { congress, instance } = task.options;
            router.navigate(`/kongresoj/${congress}/okazigoj/${instance}/alighintoj/${dataId}`);
            task.drop();
        };

        useEffect(() => {
            if (open) textField.current?.focus();
        }, [open]);

        return (
            <TaskDialog
                class="congresses-task-find-participant-by-id"
                open={open}
                onClose={() => task.drop()}
                title={participantLocale.findParticipantById.title}
                actionLabel={participantLocale.findParticipantById.find}
                actionDisabled={!isDataIdValid}
                run={doOpen}>
                <Field>
                    <TextField
                        ref={textField}
                        outline
                        error={(!dataId || isDataIdValid) ? null : participantLocale.fields.invalidDataId}
                        label={participantLocale.fields.dataId}
                        value={dataId}
                        onChange={setDataId}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                doOpen();
                            }
                        }} />
                </Field>
            </TaskDialog>
        );
    },
};

function ParticipantEmailAddress ({ congress, instance, id }) {
    const core = useContext(coreContext);
    const [data, setData] = useState(null);

    useEffect(() => {
        let revoked = false;
        core.viewData('congresses/participant', {
            congress, instance, id,
            fields: ['identity'],
        }).then(res => {
            setData(res);
        });

        return () => revoked = true;
    }, [congress, instance, id]);

    if (data) {
        return <email.inlineRenderer value={data.identity?.email} />;
    }

    return null;
}

function NotifTemplateMessage ({ core, options }) {
    const [participants, setParticipants] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        core.createTask('congresses/listParticipants', options, {
            search: options.search,
            filters: options.filters,
            jsonFilter: options.jsonFilter,
            fields: [],
            offset: 0,
            limit: 1,
        }).runOnceAndDrop().then(res => {
            setParticipants(res.total);
        }).catch(err => {
            setError(err);
        });
    }, [options.congress, options.instance, options.search, options.filters, options.jsonFilter]);

    if (participants === null && error === null) {
        return <CircularProgress small indeterminate />;
    } else if (error) {
        return <DisplayError error={error} />;
    } else {
        return participantLocale.sendNotifTemplateMessage(participants);
    }
}
