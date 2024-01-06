import { h } from 'preact';
import { useEffect, PureComponent } from 'preact/compat';
import { Checkbox, CircularProgress, TextField } from 'yamdl';
import TaskDialog from '../../../components/tasks/task-dialog';
import SavePerms from '../administration/perms-editor/save';
import { UEACode } from '@tejo/akso-client';
import Segmented from '../../../components/controls/segmented';
import SuggestionField from '../../../components/controls/suggestion-field';
import Select from '../../../components/controls/select';
import ChangedFields from '../../../components/tasks/changed-fields';
import CodeholderPicker from '../../../components/pickers/codeholder-picker';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import LimitedTextField from '../../../components/controls/limited-text-field';
import { Field, ValidatedTextField } from '../../../components/form';
import { country, ueaCode, date, org } from '../../../components/data';
import { createDialog, updateDialog, deleteDialog } from '../../../components/tasks/task-templates';
import { connect } from '../../../core/connection';
import { routerContext } from '../../../router';
import {
    codeholders as locale,
    data as dataLocale,
    detail as detailLocale,
    codeholderChgReqs as chgReqLocale,
    delegations as delegationsLocale,
    notifTemplates as notifLocale,
    errors as errLocale,
} from '../../../locale';
import { FIELDS as DELEGATION_FIELDS } from '../delegations/delegates/fields';
import { FileThumbnail, FileSize, Mime } from '../../../components/files';
import './style.less';

const MAX_FILE_SIZE = 6 * 1000 * 1000;

export default {
    create ({ open, task }) {
        let nameFields = [];
        let nameFieldsAfter = [];
        if (task.parameters.type === 'human') {
            nameFields = [
                'firstLegal',
                'lastLegal',
                'first',
                'last',
            ];
            nameFieldsAfter = [{
                id: 'honorific',
                component: SuggestionField,
                extra: {
                    suggestions: locale.honorificSuggestions,
                },
            }];
        } else if (task.parameters.type === 'org') nameFields = ['full', 'local', 'abbrev'];

        useEffect(() => {
            if (!task.parameters.type) {
                task.update({ type: 'human' });
            }
        });

        const renderNameField = (field, isOptional) => {
            const fieldId = field?.id || field;
            const Component = field?.component || TextField;
            const extra = field?.extra || {};
            // HACK: to make suggestionfield work
            const mapChangeEvent = Component === TextField ? (e => e) : (e => e);
            return (
                <Field>
                    <Component
                        key={fieldId}
                        class="form-field text-field"
                        {...extra}
                        outline
                        label={locale.nameSubfields[fieldId] + (isOptional ? '' : '*')}
                        value={(task.parameters.name || {})[fieldId]}
                        onChange={e => task.update({
                            name: {
                                ...(task.parameters.name || {}),
                                [fieldId]: mapChangeEvent(e) || undefined,
                            },
                        })}
                        required={!isOptional}
                        disabled={task.running} />
                </Field>
            );
        };

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        sheet
                        title={locale.create}
                        fullScreen={width => width <= 420}
                        class="codeholders-task-create"
                        open={open}
                        onClose={() => task.drop()}
                        actionLabel={locale.createAction}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/membroj/${id}`);
                        })}>
                        <Field>
                            <Segmented
                                class="form-field"
                                selected={task.parameters.type}
                                onSelect={type => task.update({ type })}
                                disabled={task.running}
                                validate={() => true}>
                                {[
                                    { id: 'human', label: locale.fields.types.human },
                                    { id: 'org', label: locale.fields.types.org },
                                ]}
                            </Segmented>
                        </Field>
                        <DynamicHeightDiv useFirstHeight>
                            {nameFields.map((field, isOptional) => (
                                // we assume only the first field is required, so !!index == isOptional
                                renderNameField(field, isOptional)
                            ))}
                        </DynamicHeightDiv>
                        <Field
                            validate={() => {
                                const value = (task.parameters.code || {}).new;
                                if (!UEACode.validate(value) || (new UEACode(value)).type !== 'new') {
                                    return locale.invalidUEACode;
                                }
                            }}>
                            <ueaCode.editor
                                class="form-field text-field"
                                outline
                                value={(task.parameters.code || {}).new}
                                required
                                suggestionParameters={task.parameters}
                                onChange={newCode => task.update({ code: { new: newCode } })}
                                id={-1} // pass nonsense id to just check if it’s taken
                                disabled={task.running} />
                        </Field>
                        <DynamicHeightDiv useFirstHeight>
                            {nameFieldsAfter.map(field => renderNameField(field, true))}
                        </DynamicHeightDiv>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },
    update ({ open, task }) {
        const changedFields = task.options._changedFields || [];

        return (
            <TaskDialog
                title={detailLocale.saveTitle}
                run={() => task.runOnce()}
                actionLabel={detailLocale.commit}
                class="codeholders-task-update"
                open={open}
                onClose={() => task.drop()}>
                <ChangedFields changedFields={changedFields} locale={locale.fields} />
                <Field>
                    <TextField
                        outline
                        class="update-comment"
                        label={detailLocale.updateComment}
                        value={task.parameters.updateComment || ''}
                        onChange={updateComment => task.update({ updateComment })} />
                </Field>
            </TaskDialog>
        );
    },
    delete: deleteDialog({
        locale: {
            title: locale.deleteTitle,
            description: locale.deleteDescription,
            button: locale.delete,
        },
        objectView: ({ id }) => ['codeholders/codeholder', { id, fields: ['name', 'code'] }],
        objectName: ({
            name,
            code,
        }) => {
            let chName = '';
            if ('first' in name) {
                chName = [
                    name.honorific,
                    (name.first || name.firstLegal),
                    (name.last || name.lastLegal),
                ].filter(x => x).join(' ');
            } else {
                chName = name.full;
            }
            return chName + ' ' + (code.new || code.old);
        },
    }),

    addMembership: connect('memberships/categories')(categories => ({
        categories,
    }))(function ({ open, task, categories }) {
        let yearMin = 0;
        let yearMax = 0;

        if (task.parameters.category) {
            yearMin = categories[task.parameters.category].availableFrom;
            yearMax = categories[task.parameters.category].availableTo;
        }

        useEffect(() => {
            if (!task.parameters.year) {
                task.update({ year: new Date().getFullYear() });
            }
            if (categories && !('category' in task.parameters)) {
                task.update({ category: Object.values(categories)[0].id });
            }
        });

        const canutoId = `canuto-${Math.random().toString(36)}`;

        return (
            <TaskDialog
                sheet
                class="codeholders-task-add-membership"
                open={open}
                title={locale.addMembership}
                onClose={() => task.drop()}
                actionLabel={locale.membership.add}
                run={() => task.runOnce()}>
                <Field validate={() => {
                    if (!task.parameters.category) return dataLocale.requiredField;
                }}>
                    <Select
                        outline
                        class="category-select form-field"
                        value={task.parameters.category}
                        onChange={category => task.update({ category })}
                        items={categories ? Object.values(categories).map(({
                            id,
                            nameAbbrev,
                            name,
                            availableFrom,
                            availableTo,
                        }) => ({
                            value: id,
                            label: `${name} (${nameAbbrev})` + (
                                availableFrom && availableTo ? (
                                    ` (${availableFrom}–${availableTo})`
                                ) : availableFrom ? (
                                    ` (${locale.membership.availableFrom} ${availableFrom})`
                                ) : availableTo ? (
                                    ` (${locale.membership.availableTo} ${availableTo})`
                                ) : ''
                            ),
                        })) : []} />
                </Field>
                <Field>
                    <ValidatedTextField
                        outline
                        class="form-field text-field"
                        type="number"
                        label={locale.membership.year}
                        min={yearMin}
                        max={yearMax}
                        value={task.parameters.year}
                        onChange={year => task.update({ year })}
                        validate={value => {
                            if (Number.isNaN(+value)) return locale.membership.notAYear;
                            if (yearMin !== null && +value < yearMin) return locale.membership.notAYear;
                            if (yearMax !== null && +value < yearMax) return locale.membership.notAYear;
                        }} />
                </Field>
                <div class="canuto-field">
                    <Checkbox
                        id={canutoId}
                        checked={task.parameters.canuto}
                        onChange={canuto => task.update({ canuto })} />
                    <label for={canutoId}>
                        {locale.membership.useCanuto}
                    </label>
                </div>
                <p class="edit-note">
                    {locale.membership.cannotEditNote}
                </p>
            </TaskDialog>
        );
    }),
    addRole: makeRoleEditor('add'),
    updateRole: makeRoleEditor('update'),

    setPermissions ({ open, core, task }) {
        return (
            <SavePerms
                open={open}
                core={core}
                task={task}
                pxTask="codeholders/setPermissionsPX"
                mrTask="codeholders/setPermissionsMR" />
        );
    },

    createPassword ({ open, core, task }) {
        return (
            <TaskDialog
                class="codeholders-task-reset-password"
                open={open}
                onClose={() => task.drop()}
                title={locale.resetPassword.create}
                actionLabel={locale.resetPassword.send}
                running={task.running}
                run={() => task.runOnce().then(() => {
                    core.createTask('info', {
                        message: locale.resetPassword.success,
                    });
                })}>
                <p>
                    {locale.resetPassword.descriptionCreate}
                </p>
                <div class="reset-password-select-org">
                    <label>
                        {locale.resetPassword.orgsSelect}
                    </label>
                    <org.editor
                        value={task.parameters.org}
                        onChange={org => task.update({ org })}
                        orgs={locale.resetPassword.orgs} />
                </div>
            </TaskDialog>
        );
    },
    resetPassword ({ open, core, task }) {
        return (
            <TaskDialog
                class="codeholders-task-reset-password"
                open={open}
                onClose={() => task.drop()}
                title={locale.resetPassword.reset}
                actionLabel={locale.resetPassword.send}
                running={task.running}
                run={() => task.runOnce().then(() => {
                    core.createTask('info', {
                        message: locale.resetPassword.success,
                    });
                })}>
                <p>
                    {locale.resetPassword.descriptionReset}
                </p>
                <div class="reset-password-select-org">
                    <label>
                        {locale.resetPassword.orgsSelect}
                    </label>
                    <org.editor
                        value={task.parameters.org}
                        onChange={org => task.update({ org })}
                        orgs={locale.resetPassword.orgs} />
                </div>
            </TaskDialog>
        );
    },
    resetTotp ({ open, core, task }) {
        return (
            <TaskDialog
                class="codeholders-task-reset-totp"
                open={open}
                onClose={() => task.drop()}
                title={locale.resetTotp.title}
                actionLabel={locale.resetTotp.button}
                running={task.running}
                run={() => task.runOnce().then(success => {
                    core.createTask('info', {
                        message: success ? locale.resetTotp.success : locale.resetTotp.none,
                    });
                })}>
                {locale.resetTotp.description}
            </TaskDialog>
        );
    },

    uploadFile ({ open, task }) {
        const canUploadFile = task.parameters.file.size <= MAX_FILE_SIZE;

        return (
            <TaskDialog
                sheet
                class="codeholders-task-upload-file"
                open={open}
                onClose={() => task.drop()}
                title={locale.uploadFile}
                actionLabel={!!canUploadFile && locale.uploadThisFile}
                run={() => {
                    if (!canUploadFile) {
                        const err = new Error('file too large');
                        err.code = 'payload-too-large';
                        return Promise.reject(err);
                    }
                    return task.runOnce();
                }}>
                <div class="file-preview">
                    <FileThumbnail file={task.parameters.file} />
                    <div class="file-preview-details">
                        <div>
                            <Mime mime={task.parameters.file.type} />
                        </div>
                        <div>
                            <FileSize bytes={task.parameters.file.size} />
                        </div>
                        <div class="file-too-large">
                            {!canUploadFile && (
                                errLocale['payload-too-large']
                            )}
                        </div>
                    </div>
                </div>
                {canUploadFile && (
                    <Field>
                        <TextField
                            required
                            label={locale.fileName}
                            maxLength={50}
                            value={task.parameters.name}
                            disabled={task.running}
                            onChange={name => task.update({ name })} />
                    </Field>
                )}
                {canUploadFile && (
                    <Field>
                        <TextField
                            label={locale.fileDescription}
                            maxLength={300}
                            value={task.parameters.description}
                            disabled={task.running}
                            onChange={description => task.update({ description })} />
                    </Field>
                )}
            </TaskDialog>
        );
    },
    deleteFile ({ open, task }) {
        if (task.options._noGUI) return null;

        return (
            <TaskDialog
                class="codeholders-task-delete-file"
                open={open}
                onClose={() => task.drop()}
                title={locale.deleteFile}
                actionLabel={locale.delete}
                actionDanger
                run={() => task.runOnce()}>
                {dataLocale.deleteDescription}
            </TaskDialog>
        );
    },

    createAddrLabelPreset ({ open, task }) {
        return (
            <TaskDialog
                class="codeholders-task-save-addr-label-preset"
                open={open}
                onClose={() => task.drop()}
                title={locale.addrLabelGen.presets.create.title}
                actionLabel={locale.addrLabelGen.presets.create.button}
                run={() => task.runOnce()}>
                <Field>
                    <TextField
                        required
                        value={task.parameters.name}
                        onChange={name => task.update({ name })}
                        outline
                        label={locale.addrLabelGen.presets.name} />
                </Field>
            </TaskDialog>
        );
    },
    updateAddrLabelPreset ({ open, task }) {
        return (
            <TaskDialog
                class="codeholders-task-save-addr-label-preset"
                open={open}
                onClose={() => task.drop()}
                title={locale.addrLabelGen.presets.update.title}
                actionLabel={locale.addrLabelGen.presets.update.button}
                run={() => task.runOnce()}>
                <Field>
                    <TextField
                        required
                        value={task.parameters.name}
                        onChange={name => task.update({ name })}
                        outline
                        label={locale.addrLabelGen.presets.name} />
                </Field>
            </TaskDialog>
        );
    },

    sendNotifTemplate ({ open, core, task }) {
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

    updateChangeRequest: updateDialog({ locale: chgReqLocale.update, fields: chgReqLocale.fields }),
    setDelegations: updateDialog({ locale: delegationsLocale.update, fields: delegationsLocale.fields }),
    createDelegations: createDialog({
        locale: delegationsLocale,
        fieldNames: ['org', 'codeholderId', 'cities', 'countries', 'subjects', 'hosting', 'tos'],
        fields: DELEGATION_FIELDS,
        onCompletion: (task, routerContext) => routerContext.navigate(`/delegitoj/${task.parameters.codeholderId}/${task.parameters.org}`),
    }),
    deleteDelegations: deleteDialog({ locale: delegationsLocale.delete }),

    removeProfilePicture: deleteDialog({ locale: locale.profilePicture.remove }),
};

class NotifTemplateMessage extends PureComponent {
    state = {
        total: null,
        loading: false,
    };

    load () {
        this.setState({ loading: true });

        const notifFilter = { email: { $neq: null } };

        const options = { ...this.props.options };
        const jsonFilter = { ...(options.jsonFilter && options.jsonFilter.filter || {}) };
        options.jsonFilter = {
            filter: options.jsonFilter && !options.jsonFilter._disabled
                ? { $and: [jsonFilter, notifFilter] }
                : notifFilter,
        };

        this.props.core.createTask('codeholders/list', {}, {
            ...options,
            fields: [],
            offset: 0,
            limit: 1,
            skipCursed: true,
        }).runOnceAndDrop().then(res => {
            this.setState({ loading: false, total: res.total });
        }).catch(err => {
            console.error('Could not fetch count for sendNotifTemplate', err); // eslint-disable-line no-console
            this.setState({ loading: false });
        });
    }

    componentDidMount () {
        this.load();
    }

    render (_, { total, loading }) {
        let contents = null;
        if (loading) {
            contents = [
                <CircularProgress key={0} small indeterminate />,
                <span key={1}> {notifLocale.send.send.messagePostIndeterminate}</span>,
            ];
        } else if (total !== null) {
            contents = notifLocale.send.send.messagePost(total);
        } else {
            contents = notifLocale.send.send.messagePostUnknown;
        }

        return (
            <div>
                {notifLocale.send.send.messagePre}
                {' '}
                {contents}
            </div>
        );
    }
}

function makeRoleEditor (type) {
    return connect('roles/roles')(roles => ({ roles }))(function ({ open, task, roles }) {
        useEffect(() => {
            if (roles && !('role' in task.parameters)) {
                task.update({ role: Object.values(roles)[0].id });
            }
        });

        return (
            <TaskDialog
                sheet
                class="codeholders-task-add-role"
                open={open}
                title={locale[type + 'Role']}
                onClose={() => task.drop()}
                actionLabel={locale.role[type]}
                run={() => task.runOnce()}>
                <Field>
                    <Select
                        outline
                        validate={() => {}}
                        class="category-select form-field"
                        value={task.parameters.role}
                        onChange={role => task.update({ role })}
                        items={roles && Object.values(roles).sort((a, b) => a.name.localeCompare(b.name)).map(({
                            id,
                            name,
                        }) => ({
                            value: id,
                            label: name,
                        }))} />
                </Field>
                <p class="add-role-description">
                    {locale.role.description}
                </p>
                <Field>
                    <date.editor
                        outline
                        class="form-field text-field"
                        label={locale.role.durationFrom}
                        value={task.parameters.durationFrom}
                        onChange={date => task.update({ durationFrom: date })} />
                </Field>
                <Field>
                    <date.editor
                        outline
                        class="form-field text-field"
                        label={locale.role.durationTo}
                        value={task.parameters.durationTo}
                        onChange={date => task.update({ durationTo: date })} />
                </Field>
                <div class="additional-options">
                    <div class="opt-item">
                        <label>{locale.role.dataCountry}</label>
                        <country.editor
                            outline
                            value={task.parameters.dataCountry}
                            onChange={dataCountry => task.update({ dataCountry })}/>
                    </div>
                    <div class="opt-item">
                        <label>{locale.role.dataOrg}</label>
                        <CodeholderPicker
                            limit={1}
                            jsonFilter={{ codeholderType: 'org' }}
                            value={task.parameters.dataOrg ? ['' + task.parameters.dataOrg] : []}
                            onChange={v => task.update({ dataOrg: +v[0] || null })} />
                    </div>
                    <div class="opt-item">
                        <label>{locale.role.dataString}</label>
                        <LimitedTextField
                            outline
                            value={task.parameters.dataString}
                            onChange={v => task.update({ dataString: v || null })}
                            maxLength={128} />
                    </div>
                </div>
            </TaskDialog>
        );
    });
}
