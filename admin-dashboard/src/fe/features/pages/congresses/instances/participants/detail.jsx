import { h } from 'preact';
import { useState } from 'preact/compat';
import EditIcon from '@material-ui/icons/Edit';
import SearchIcon from '@material-ui/icons/Search';
import { CircularProgress, Dialog } from 'yamdl';
import DetailPage from '../../../../../components/detail/detail-page';
import DetailShell from '../../../../../components/detail/detail-shell';
import TaskButton from '../../../../../components/controls/task-button';
import { Field } from '../../../../../components/form';
import { connectPerms } from '../../../../../perms';
import { congressParticipants as locale, data as dataLocale } from '../../../../../locale';
import { LinkButton } from '../../../../../router';
import DisplayError from '../../../../../components/utils/error';
import { FIELDS } from './fields';
import WithRegistrationForm from '../registration-form/with-form';
import './detail.less';
import { GetCongressOrgField } from '../../utils';

export default connectPerms(class ParticipantsPage extends DetailPage {
    state = {
        org: null,
    };

    createCommitTask (changedFields, edit) {
        return this.context.createTask('congresses/updateParticipant', {
            congress: this.congress,
            instance: this.instance,
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    get congress () {
        return +this.props.matches.congress[1];
    }
    get instance () {
        return +this.props.matches.instance[1];
    }
    get id () {
        return this.props.match[1];
    }

    locale = locale;

    renderActions ({ perms }, { org }) {
        const { congress, instance, id } = this;
        const actions = [];

        if (perms.hasPerm(`congress_instances.participants.update.${org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });

            actions.push({
                label: locale.resendConfirmation.menuItem,
                action: () => this.context.createTask('congresses/resendParticipantConfirmation', {
                    congress, instance, id,
                }),
                overflow: true,
            });
        }

        if (perms.hasPerm(`congress_instances.participants.delete.${org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('congresses/deleteParticipant', {
                    congress,
                    instance,
                    id,
                }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { org, edit }) {
        const { congress, instance, id } = this;

        return (
            <div class="congress-participant-detail-page">
                <DetailShell
                    view="congresses/participant"
                    options={{
                        congress,
                        instance,
                        fields: Object.keys(FIELDS),
                    }}
                    id={id}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}>
                    {data => (
                        <WithRegistrationForm
                            congress={congress}
                            instance={instance}>
                            {({ form, loaded, error }) => (
                                <Detail
                                    core={this.context}
                                    editing={editing}
                                    onItemChange={edit => this.setState({ edit })}
                                    item={this.state.edit || data}
                                    userData={{
                                        org,
                                        congress,
                                        instance,
                                        formLoaded: loaded,
                                        formError: error,
                                        currency: form?.price?.currency,
                                        registrationForm: form,
                                    }} />
                            )}
                        </WithRegistrationForm>
                    )}
                </DetailShell>
                <GetCongressOrgField id={congress} onOrg={org => this.setState({ org })} />
            </div>
        );
    }
});

function DetailField ({ field, item, editing, onItemChange, userData }) {
    const Cmp = FIELDS[field].component;
    return <Cmp
        slot="detail"
        value={item[field]}
        onChange={v => onItemChange({ ...item, [field]: v })}
        editing={editing}
        item={item}
        onItemChange={onItemChange}
        userData={userData} />;
}

export function Detail ({ core, item, creating, editing, onItemChange, userData }) {
    const statusType = item.cancelledTime ? 'canceled' : item.isValid ? 'valid' : 'pending';

    return (
        <div class="congress-participant-detail">
            {!userData.formLoaded && (
                <div class="participant-form-loading">
                    <CircularProgress indeterminate />
                </div>
            )}
            {userData.formError && (
                <div class="participant-form-error">
                    <DisplayError error={userData.formError} />
                </div>
            )}
            <div class="participant-header">
                {!creating && (
                    <div class="header-status">
                        <span class="participation-status" data-status={statusType}>
                            {locale.fields.statuses[statusType]}
                        </span>
                    </div>
                )}
                {!creating && (
                    <div class="header-title">
                        <div class="header-name">{item.identity?.name}</div>
                        <div class="header-email">{item.identity?.email}</div>
                    </div>
                )}
                <div class="header-id">
                    {!creating && (
                        <div class="header-data-id">
                            <span class="field-label">
                                {locale.fields.dataId}
                                {':'}
                            </span>
                            {' '}
                            <DetailField
                                field="dataId"
                                item={item}
                                editing={editing}
                                onItemChange={onItemChange}
                                userData={userData} />
                        </div>
                    )}
                    <Field class="field-codeholder" validate={() => {
                        if (userData.registrationForm?.allowGuests === false && !item.identity) {
                            return dataLocale.requiredField;
                        }
                    }}>
                        <span class="field-label">
                            {locale.fields.identity}
                            {':'}
                        </span>
                        {' '}
                        <DetailField
                            field="identity"
                            item={item}
                            editing={editing}
                            onItemChange={onItemChange}
                            userData={userData} />
                    </Field>
                </div>
            </div>
            {!creating && (
                <div class="participant-payment">
                    <div class="participant-payment-inner">
                        <div class="payment-price">
                            <DetailField
                                field="price"
                                item={item}
                                editing={editing}
                                onItemChange={onItemChange}
                                userData={userData} />
                        </div>
                        <div class="payment-details">
                            <span class="field-label">
                                {locale.fields.paid}
                                {': '}
                            </span>
                            {' '}
                            <DetailField
                                field="paid"
                                item={item}
                                editing={editing}
                                onItemChange={onItemChange}
                                userData={userData} />
                        </div>
                    </div>
                    <ViewPaymentsButton item={item} />
                </div>
            )}
            {!creating && !editing && <ParticipantActions core={core} item={item} userData={userData} />}
            <div class="participant-details">
                <div class="detail-field">
                    <span class="field-label">{locale.fields.approved}</span>
                    <DetailField
                        field="approved"
                        item={item}
                        editing={editing}
                        onItemChange={onItemChange}
                        userData={userData} />
                </div>
                {!creating && (
                    <div class="detail-field">
                        <span class="field-label">{locale.fields.createdTime}</span>
                        <DetailField
                            field="createdTime"
                            item={item}
                            editing={editing}
                            onItemChange={onItemChange}
                            userData={userData} />
                    </div>
                )}
                {!creating && (
                    <div class="detail-field">
                        <span class="field-label">{locale.fields.editedTime}</span>
                        <DetailField
                            field="editedTime"
                            item={item}
                            editing={editing}
                            onItemChange={onItemChange}
                            userData={userData} />
                    </div>
                )}
                <div class="detail-field">
                    <span class="field-label">{locale.fields.checkInTime}</span>
                    <DetailField
                        field="checkInTime"
                        item={item}
                        editing={editing}
                        onItemChange={onItemChange}
                        userData={userData} />
                </div>
                <div class="detail-field">
                    <span class="field-label">{locale.fields.cancelledTime}</span>
                    <DetailField
                        field="cancelledTime"
                        item={item}
                        editing={editing}
                        onItemChange={onItemChange}
                        userData={userData} />
                </div>
                <div class="detail-field">
                    <span class="field-label">{locale.fields.sequenceId}</span>
                    <DetailField
                        field="sequenceId"
                        item={item}
                        editing={editing}
                        onItemChange={onItemChange}
                        userData={userData} />
                </div>
                <div class="detail-field">
                    <span class="field-label">{locale.fields.notes}</span>
                    <DetailField
                        field="notes"
                        item={item}
                        editing={editing}
                        onItemChange={onItemChange}
                        userData={userData} />
                </div>
            </div>
            {Object.keys(userData.registrationForm?.customFormVars || {}).length ? (
                <div class="participant-data">
                    <div class="data-title">
                        {locale.fields.customFormVars}
                    </div>
                    <DetailField
                        field="customFormVars"
                        item={item}
                        editing={editing}
                        onItemChange={onItemChange}
                        userData={userData} />
                </div>
            ) : null}
            <div class="participant-data">
                <div class="data-title">
                    {locale.fields.data}
                </div>
                <DetailField
                    field="data"
                    item={item}
                    editing={editing}
                    onItemChange={onItemChange}
                    userData={userData} />
            </div>
        </div>
    );
}

const ViewPaymentsButton = connectPerms(function ViewPaymentsButton ({ perms, item }) {
    // don't know which org the payments may be in because there's nothing stopping you from using
    // a payment method from one org to pay for a participant in a congress from a different org
    if (!perms.hasPerm('pay.payment_intents.read.tejo') && !perms.hasPerm('pay.payment_intents.read.uea')) return null;

    const target = `/aksopago/pagoj?filter(purposeDataId:${item.dataId})`;

    return (
        <LinkButton target={target}>
            <SearchIcon style={{ verticalAlign: 'middle' }} />
            {' '}
            {locale.fields.viewPayments}
        </LinkButton>
    );
});

const ParticipantActions = connectPerms(function ParticipantActions ({ perms, core, item, userData }) {
    // this one needs state...so it's up here unfortunately
    const [checkInConfirmOpen, setCheckInConfirmOpen] = useState(false);
    const setCheckedInAction = () => {
        const showWarning = item.paid?.amount < item.price;
        if (!checkInConfirmOpen && showWarning) {
            setCheckInConfirmOpen(true);
            return;
        } else {
            setCheckInConfirmOpen(false);
        }

        core.createTask('congresses/updateParticipant', {
            congress: userData.congress,
            instance: userData.instance,
            id: item.dataId,
            _changedFields: ['checkInTime'],
        }, {
            checkInTime: Math.round(Date.now() / 1000),
        });
    };
    const checkInConfirmDialog = (
        <Dialog
            backdrop
            open={checkInConfirmOpen}
            onClose={() => setCheckInConfirmOpen(false)}
            actions={[
                {
                    label: locale.fields.actions.checkInConfirmCancel,
                    action: () => setCheckInConfirmOpen(false),
                },
                {
                    label: locale.fields.actions.checkInConfirmConfirm,
                    action: setCheckedInAction,
                },
            ]}>
            {locale.fields.actions.checkInConfirmWithoutFullPayment}
        </Dialog>
    );

    const actions = [
        {
            id: 'createPaymentIntent',
            hasPerm: () => {
                return !item.cancelledTime && (perms.hasPerm('pay.payment_intents.create.tejo')
                    || perms.hasPerm('pay.payment_intents.create.uea'));
            },
            action: async () => {
                const congress = await core.viewData('congresses/instance', {
                    congress: userData.congress,
                    id: userData.instance,
                });
                core.createTask('payments/createIntent', {}, {
                    customer: {
                        name: item.identity?.name || null,
                        email: item.identity?.email || null,
                    },
                    purposes: [
                        {
                            type: 'trigger',
                            title: locale.fields.actions.createPaymentIntentData.title,
                            description: congress.name,
                            triggers: 'congress_registration',
                            dataId: item.dataId,
                        },
                    ],
                });
            },
        },
        {
            id: 'approveManually',
            hasPerm: () => {
                return !item.approved && !item.cancelledTime
                    && perms.hasPerm(`congress_instances.participants.update.${userData.org}`);
            },
            action: async () => {
                core.createTask('congresses/updateParticipant', {
                    congress: userData.congress,
                    instance: userData.instance,
                    id: item.dataId,
                    _changedFields: ['approved'],
                }, {
                    approved: true,
                });
            },
        },
        {
            id: 'setCheckedIn',
            hasPerm: () => {
                return !item.checkInTime && !item.cancelledTime
                    && perms.hasPerm(`congress_instances.participants.update.${userData.org}`);
            },
            action: async () => {
                setCheckedInAction();
            },
        },
        {
            id: 'unsetCheckedIn',
            hasPerm: () => {
                return item.checkInTime && !item.cancelledTime
                    && perms.hasPerm(`congress_instances.participants.update.${userData.org}`);
            },
            action: async () => {
                core.createTask('congresses/updateParticipant', {
                    congress: userData.congress,
                    instance: userData.instance,
                    id: item.dataId,
                    _changedFields: ['checkInTime'],
                }, {
                    checkInTime: null,
                });
            },
        },
        {
            id: 'cancel',
            hasPerm: () => {
                return !item.cancelledTime
                    && perms.hasPerm(`congress_instances.participants.update.${userData.org}`);
            },
            action: async () => {
                core.createTask('congresses/updateParticipant', {
                    congress: userData.congress,
                    instance: userData.instance,
                    id: item.dataId,
                    _changedFields: ['cancelledTime'],
                }, {
                    cancelledTime: Math.floor(Date.now() / 1000),
                });
            },
        },
    ].filter(x => x.hasPerm()).map(x => (
        <TaskButton key={x.id} run={x.action}>
            {locale.fields.actions[x.id]}
        </TaskButton>
    ));

    if (!actions.length) return null;

    return (
        <div class="participant-actions">
            {checkInConfirmDialog}
            {actions}
        </div>
    );
});
