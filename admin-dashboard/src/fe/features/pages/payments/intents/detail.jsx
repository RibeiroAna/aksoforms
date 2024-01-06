import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button, Menu, TextField } from 'yamdl';
import EditIcon from '@material-ui/icons/Edit';
import CloseIcon from '@material-ui/icons/Close';
import AnnouncementIcon from '@material-ui/icons/Announcement';
import SendIcon from '@material-ui/icons/Send';
import DoneIcon from '@material-ui/icons/Done';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import HourglassFullIcon from '@material-ui/icons/HourglassFull';
import AssignmentTurnedInIcon from '@material-ui/icons/AssignmentTurnedIn';
import AssignmentReturnIcon from '@material-ui/icons/AssignmentReturn';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import Page from '../../../../components/page';
import DetailView from '../../../../components/detail/detail';
import { StripeIcon } from '../../../../components/icons';
import ProfilePicture from '../../../../components/profile-picture';
import DynamicHeightDiv from '../../../../components/layout/dynamic-height-div';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import MdField from '../../../../components/controls/md-field';
import { Field } from '../../../../components/form';
import { currencyAmount, email, org as dataOrg, timestamp } from '../../../../components/data';
import { IdUEACode } from '../../../../components/data/uea-code';
import { FIELDS as METHOD_FIELDS } from '../orgs/methods/fields';
import Meta from '../../../meta';
import { connectPerms, usePerms } from '../../../../perms';
import { connect, coreContext } from '../../../../core/connection';
import { IntermediaryEditor } from './fields';
import {
    paymentIntents as locale,
    paymentMethods as methodsLocale,
} from '../../../../locale';
import { Link, LinkButton } from '../../../../router';
import './detail.less';
import { useDataView } from '../../../../core';

export default connectPerms(class IntentPage extends Page {
    state = {
        edit: null,
        org: 'meow', // nonsense default value
    };

    static contextType = coreContext;

    onEndEdit = () => {
        this.props.editing && this.props.editing.pop(true);
        this.setState({ edit: null });
    };

    #commitTask = null;
    onCommit = changedFields => {
        if (!this.props.editing || this.#commitTask) return Promise.resolve();
        if (!changedFields.length) {
            // nothing changed, so we can just pop the editing state
            this.props.editing.pop(true);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.#commitTask = this.context.createTask('payments/updateIntent', {
                id: this.getId(),
                _changedFields: changedFields,
            }, this.state.edit);
            this.#commitTask.on('success', this.onEndEdit);
            this.#commitTask.on('drop', () => {
                this.#commitTask = null;
                resolve();
            });
        });
    };

    componentWillUnmount () {
        if (this.#commitTask) this.#commitTask.drop();
    }

    getId () {
        return this.props.match[1];
    }

    render ({ perms, editing }, { edit, org, status, customer }) {
        const actions = [];

        const id = this.getId();

        if (perms.hasPerm(`pay.payment_intents.update.${org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (status === 'succeeded') {
            actions.push({
                label: locale.resendReceipt.menuItem,
                overflow: true,
                action: () => this.context.createTask('payments/resendIntentReceipt', { id }, {
                    email: customer?.email || null,
                }),
            });
        }

        return (
            <div class="payment-intent-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />

                <DetailView
                    view="payments/intent"
                    id={id}
                    options={{
                        lazyFetch: true,
                        fields: [
                            'customer',
                            'method',
                            'org',
                            'paymentOrg',
                            'currency',
                            'status',
                            'events',
                            'timeCreated',
                            'internalNotes',
                            'customerNotes',
                            'foreignId',
                            'purposes',
                            'totalAmount',
                            'amountRefunded',
                            'stripePaymentIntentId',
                            'intermediary',
                        ],
                    }}
                    header={DetailViewInner}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    onData={data => this.setState({
                        org: data.org,
                        status: data.status,
                        customer: data.customer,
                    })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()} />
            </div>
        );
    }
});

function DetailViewInner ({ item, editing, onItemChange }) {
    const {
        status,
        totalAmount,
        amountRefunded,
        currency,
        purposes,
        org,
        paymentOrg,
    } = item;

    const fullEditing = editing && status === 'pending';

    const currentAmount = totalAmount - amountRefunded;

    let methodType = null;
    if (item.method) {
        if (item.method.type === 'stripe') {
            const link = locale.stripeIntentLink(item.stripePaymentIntentId);
            methodType = (
                <a class="method-stripe" target="_blank" rel="noopener noreferrer nofollow" href={link}>
                    {locale.openInStripePrefix}
                    {' '}
                    <StripeIcon />™
                </a>
            );
        } else {
            methodType = <span class="method-manual">{methodsLocale.fields.types.manual}</span>;
        }
    }

    return (
        <div class="payment-intent-inner">
            <div class="intent-status">
                <div class={`intent-state is-${status}`}>
                    {locale.fields.statuses[status]}
                </div>
                <div class="intent-method-type">
                    {methodType}
                </div>
            </div>
            <div class="intent-amount">
                <span class="intent-amount-inner">
                    {amountRefunded ? (
                        <span class="original-amount">
                            <currencyAmount.renderer value={totalAmount} currency={currency} />
                        </span>
                    ) : null}
                    <currencyAmount.renderer value={currentAmount} currency={currency} />
                </span>
                <span class="intent-amount-to">
                    <span>{locale.detailTo}</span>
                    {' '}
                    <span class="intent-payment-org">
                        <dataOrg.renderer value={org} class="payment-org-icon" />
                        {' '}
                        {!!paymentOrg && <PaymentOrgName id={paymentOrg} />}
                    </span>
                </span>
            </div>
            {amountRefunded ? (
                <div class="refund-status">
                    <currencyAmount.renderer value={amountRefunded} currency={currency} />
                    {' '}
                    {locale.detailRefundSuffix}
                </div>
            ) : null}
            <DynamicHeightDiv useFirstHeight>
                {!editing && (
                    <div class="intent-purposes">
                        {(purposes || [])
                            .map((purpose, i) => <Purpose key={i} purpose={purpose} index={i} item={item} />)}
                    </div>
                )}
                {!editing && <IntentActions item={item} />}
            </DynamicHeightDiv>
            <div class="intent-customer-container">
                <div class="intent-section-title">{locale.fields.customer}</div>
                <Customer item={item} editing={fullEditing} onItemChange={onItemChange} />
            </div>
            {item.intermediary ? (
                <div class="intent-intermediary-container">
                    <div class="intent-section-title">{locale.fields.intermediary}</div>
                    <Intermediary item={item} editing={fullEditing} onItemChange={onItemChange} />
                </div>
            ) : null}
            <div class="intent-method-container">
                <div class="intent-section-title">{locale.fields.method}</div>
                <Method method={item.method} item={item} editing={editing} onItemChange={onItemChange} />
            </div>
            <DynamicHeightDiv useFirstHeight>
                {!editing && (
                    <div class="intent-events-container">
                        <div class="intent-section-title">{locale.fields.events}</div>
                        <Events item={item} />
                    </div>
                )}
            </DynamicHeightDiv>
            <NotesField item={item} editing={editing} onItemChange={onItemChange} field="internalNotes" />
            <NotesField item={item} editing={fullEditing} onItemChange={onItemChange} field="customerNotes" />
        </div>
    );
}

const PaymentOrgName = connect(({ id }) => ['payments/org', {
    id,
}], ['id'])()(function PaymentOrgName ({ id, org, name }) {
    if (!org) return; // check existence with org field
    return <Link target={`/aksopago/organizoj/${id}`} outOfTree>{name}</Link>;
});

function Purpose ({ purpose, item, index }) {
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [optionsPos, setOptionsPos] = useState([0, 0]);

    let title = '';
    let description = '';
    let trigger = null;

    if (purpose.type === 'trigger' || purpose.type === 'manual') {
        title = purpose.title;
        description = purpose.description;
    } else if (purpose.type === 'addon') {
        if (!purpose.paymentAddon) return null;
        title = purpose.paymentAddon.name;
        description = purpose.paymentAddon.description;
    }

    if (purpose.type === 'trigger') {
        trigger = <PurposeTriggerInfo purpose={purpose} currency={item.currency} />;
    }

    return (
        <div class={'intent-split-card' + (purpose.invalid ? ' is-invalid' : '')}>
            <div class="card-id">
                <span class="purpose-type">
                    {locale.fields.purposeTypes[purpose.type]}
                </span>
            </div>
            <div class="card-details">
                {purpose.invalid && (
                    <div class="card-invalid">
                        {locale.fields.purpose.invalid}
                    </div>
                )}
                <div class="card-title">
                    {title}
                </div>
                <div class="card-description">
                    {trigger}
                    <MdField
                        rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                        value={description} />
                </div>
            </div>
            <div class="card-after">
                <div class="purpose-amount">
                    <currencyAmount.renderer value={purpose.amount} currency={item.currency} />
                </div>
                <div class="purpose-options">
                    <Button icon small class="options-button" onClick={e => {
                        setOptionsOpen(true);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setOptionsPos([
                            rect.right - rect.width / 4,
                            rect.top + rect.height / 4,
                        ]);
                    }}>
                        <MoreVertIcon />
                    </Button>
                    <coreContext.Consumer>
                        {core => (
                            <Menu
                                open={optionsOpen}
                                position={optionsPos}
                                anchor={[1, 0]}
                                onClose={() => setOptionsOpen(false)}
                                items={[
                                    {
                                        label: purpose.invalid
                                            ? locale.fields.purpose.menu.validate
                                            : locale.fields.purpose.menu.invalidate,
                                        action: () => {
                                            core.createTask('payments/setIntentPurposeValidity', {
                                                intent: item.id,
                                                purpose: index,
                                            }, {
                                                invalid: !purpose.invalid,
                                            });
                                            setOptionsOpen(false);
                                        },
                                    },
                                ]} />
                        )}
                    </coreContext.Consumer>
                </div>
            </div>
        </div>
    );
}

function PurposeTriggerInfo ({ purpose, currency }) {
    let triggerAmount = null;
    if (purpose.triggerAmount) {
        triggerAmount = (
            <div class="purpose-trigger-amount">
                <label>
                    {locale.fields.purpose.triggerAmount}:
                </label>
                {' '}
                <currencyAmount.renderer
                    value={purpose.triggerAmount.amount}
                    currency={purpose.triggerAmount.currency} />
            </div>
        );
    }

    let statusIcon = null;
    if (purpose.triggerStatus === 'awaiting') statusIcon = <HourglassEmptyIcon style={{ verticalAlign: 'middle' }} />;
    else if (purpose.triggerStatus === 'processing') statusIcon = <HourglassFullIcon style={{ verticalAlign: 'middle' }} />;
    else if (purpose.triggerStatus === 'triggered') statusIcon = <DoneIcon style={{ verticalAlign: 'middle' }} />;

    let originalAmount = null;
    if (purpose.originalAmount) {
        originalAmount = (
            <div class="purpose-trigger-original-amount">
                <label>
                    {locale.fields.purpose.originalAmount}:
                </label>
                {' '}
                <currencyAmount.renderer
                    value={purpose.originalAmount}
                    currency={currency} />
            </div>
        );
    }

    let linkTarget;
    if (purpose.triggers === 'registration_entry') {
        linkTarget = `/membreco/alighoj/${purpose.dataId}`;
    } else if (purpose.triggers === 'congress_registration') {
        linkTarget = `/kongresoj/${purpose.congressId}/okazigoj/${purpose.congressInstanceId}/alighintoj/${purpose.dataId}`;
    }

    return (
        <div class="purpose-trigger-info">
            <div class="purpose-trigger-type">
                <span class="purpose-triggers">
                    {locale.triggers[purpose.triggers]}
                </span>
                {linkTarget ? (
                    <Link class="purpose-data-id" target={linkTarget} outOfTree>
                        {purpose.dataId}
                    </Link>
                ) : (
                    <span class="purpose-data-id">
                        {purpose.dataId}
                    </span>
                )}
            </div>
            <div class="purpose-trigger-status">
                <div class="inner-trigger-status" data-status={purpose.triggerStatus}>
                    <span class="icon-container">{statusIcon}</span>
                    {locale.fields.purpose.triggerStatuses[purpose.triggerStatus]}
                </div>
            </div>
            {triggerAmount}
            {originalAmount}
        </div>
    );
}

const typeIsManualLike = t => t === 'manual' || t === 'intermediary';

const ACTIONS = {
    cancel: {
        state: 'canceled',
        enabled: (t, s) => s === 'pending' || s === 'submitted' || (t === 'manual' && s === 'disputed'),
        types: ['stripe', 'manual', 'intermediary'],
        icon: CloseIcon,
        task: id => ['payments/cancelIntent', { id }],
        hasPerm: (perms, org) => perms.hasPerm(`pay.payment_intents.cancel.${org}`),
    },
    markDisputed: {
        state: 'disputed',
        enabled: (t, s) => t === 'manual' && (s === 'submitted' || s === 'succeeded'),
        types: ['manual'],
        icon: AnnouncementIcon,
        task: id => ['payments/markIntentDisputed', { id }],
        hasPerm: (perms, org) => perms.hasPerm(`pay.payment_intents.mark_disputed.${org}`),
    },
    submit: {
        state: 'submitted',
        enabled: (t, s) => typeIsManualLike(t) && s === 'pending',
        types: ['manual', 'intermediary'],
        icon: SendIcon,
        task: id => ['payments/submitIntent', { id }],
        hasPerm: (perms, org) => perms.hasPerm(`pay.payment_intents.submit.${org}`),
    },
    markSucceeded: {
        state: 'succeeded',
        enabled: (t, s) => typeIsManualLike(t) && (s === 'pending' || s === 'submitted' || s === 'disputed'),
        types: ['manual', 'intermediary'],
        icon: AssignmentTurnedInIcon,
        task: id => ['payments/markIntentSucceeded', { id }, { sendReceipt: true }],
        hasPerm: (perms, org) => perms.hasPerm(`pay.payment_intents.mark_succeeded.${org}`),
    },
    markRefunded: {
        state: 'refunded',
        types: ['manual'],
        enabled: (t, s) => t === 'manual'
            && ['pending', 'submitted', 'canceled', 'succeeded', 'refunded', 'disputed'].includes(s),
        icon: AssignmentReturnIcon,
        task: (id, item) => ['payments/markIntentRefunded', {
            id,
            _currency: item.currency,
            _max: item.totalAmount,
        }, {
            amount: item.amountRefunded ? item.amountRefunded : item.totalAmount,
        }],
        hasPerm: (perms, org) => perms.hasPerm(`pay.payment_intents.mark_refunded.${org}`),
    },
};

/**
 * Renders intent action buttons.
 * - item: intent item
 * - typeOnly: will hide buttons depending on the intent type instead of just greying them out
 * - intermediary: will show labels for intermediary reports
 */
export const IntentActions = connectPerms(function IntentActions ({ item, perms, typeOnly, intermediary }) {
    return (
        <coreContext.Consumer>{core => {
            const actions = [];

            const id = item.id;
            const t = item.method && item.method.type;
            const s = item.status;

            for (const k in ACTIONS) {
                if (ACTIONS[k].hasPerm && !ACTIONS[k].hasPerm(perms, item.org)) continue;
                if (typeOnly && !ACTIONS[k].types.includes(t)) continue;

                const isRefund = k === 'markRefunded';
                const isDispute = k === 'markDisputed';
                let enabled = ACTIONS[k].enabled(t, s);
                const Icon = ACTIONS[k].icon || (() => null);
                let whyNot = null;
                let whyNotBecauseStripe = false;
                if (!enabled && ACTIONS[k].state) {
                    const tur = locale.transitionUnavailabilityReasons;
                    {
                        const turState = tur[s];
                        if (typeof turState === 'string') whyNot = turState;
                        else if (turState) {
                            const subState = turState[ACTIONS[k].state];
                            if (typeof subState === 'string') whyNot = subState;
                            else if (subState) whyNot = subState[t];
                        }
                    }

                    if (!whyNot && t === 'stripe' && !ACTIONS[k].types.includes('stripe')) {
                        whyNot = tur.stripe;
                        whyNotBecauseStripe = true;
                    }
                }
                let task = ACTIONS[k].task(id, item);
                if ((isRefund || isDispute) && !enabled && whyNotBecauseStripe) {
                    // stripe
                    enabled = true;
                    whyNot = null;
                    task = [
                        isRefund ? 'payments/_stripeRefund' : 'payments/_stripeDispute',
                        { id: item.stripePaymentIntentId },
                    ];
                }

                if (intermediary) {
                    // add param to options
                    task[1] = Object.assign((task[1] || {}), {
                        _isIntermediary: true,
                    });
                }

                actions.push(
                    <Button
                        disabled={!enabled}
                        title={whyNot}
                        key={k}
                        onClick={() => core.createTask(...task)}>
                        <Icon style={{ verticalAlign: 'middle' }} />
                        {' '}
                        {intermediary ? locale.actions.intermediary[k] : locale.actions[k].title}
                    </Button>
                );
            }

            return (
                <div class="intent-actions-container">
                    {actions}
                </div>
            );
        }}</coreContext.Consumer>
    );
});

function Customer ({ item, editing, onItemChange }) {
    const perms = usePerms();

    let profilePictureHash;
    let profilePictureId;
    let isCodeholder = false;
    let codeholderLink;
    let customerName;
    let customerEmail;
    let ueaCode;

    if (editing && item.customer) {
        const onCustomerChange = customer => onItemChange({ ...item, customer });

        customerName = (
            <Field>
                <TextField
                    label={locale.fields.customerName}
                    required
                    value={item.customer.name}
                    onChange={name => onCustomerChange({ ...item.customer, name })} />
            </Field>
        );
        customerEmail = (
            <TextField
                label={locale.fields.customerEmail}
                type="email"
                required
                value={item.customer.email}
                onChange={email => onCustomerChange({ ...item.customer, email })} />
        );
        codeholderLink = (
            <CodeholderPicker
                value={item.customer.id ? [item.customer.id] : []}
                onChange={([id]) => onCustomerChange({
                    ...item.customer,
                    id: id || null,
                })}
                limit={1} />
        );
    } else if (item.customer) {
        if (item.customer.id !== null) {
            isCodeholder = true;
            profilePictureId = item.customer.id;
            ueaCode = <IdUEACode id={item.customer.id} />;

            if (perms.hasPerm('codeholders.read')) {
                codeholderLink = `/membroj/${item.customer.id}`;
            }
        } else {
            profilePictureId = item.customer.email;
        }

        customerName = item.customer.name;
        customerEmail = item.customer.email;
    }

    if (isCodeholder && perms.hasPerm('codeholders.read') && perms.hasCodeholderField('profilePictureHash', 'r')) {
        // don't really care for loading state/errors here
        const [,, data] = useDataView('codeholders/codeholder', {
            id: item.customer.id,
            fields: ['profilePictureHash'],
            lazyFetch: true,
        });
        profilePictureHash = data?.profilePictureHash;
    }

    return (
        <div class="intent-split-card">
            {!editing && (
                <div class="card-id">
                    <div class="customer-picture">
                        <ProfilePicture
                            id={profilePictureId}
                            profilePictureHash={profilePictureHash} />
                    </div>
                </div>
            )}
            <div class="card-details">
                <div class="card-title">
                    {customerName}
                </div>
                {editing ? (
                    <div class="card-description">
                        {customerEmail}
                    </div>
                ) : (
                    <div class="card-description">
                        {ueaCode}
                        {ueaCode ? ' ' : ''}
                        <email.renderer value={customerEmail} />
                    </div>
                )}
            </div>
            <div class="card-after">
                {editing ? null : isCodeholder ? (
                    codeholderLink ? (
                        <LinkButton
                            class="customer-codeholder-link"
                            target={codeholderLink}
                            outOfTree>
                            {locale.detailViewCodeholder}
                        </LinkButton>
                    ) : null
                ) : (
                    <div class="customer-no-codeholder">
                        {locale.detailNoCodeholder}
                    </div>
                )}
            </div>
        </div>
    );
}

function Intermediary ({ item, editing, onItemChange }) {
    return (
        <div class="intent-card intermediary-card">
            <IntermediaryEditor
                value={item.intermediary}
                editing={editing}
                onChange={intermediary => onItemChange({ ...item, intermediary })} />
        </div>
    );
}

function Method ({ method, item, editing, onItemChange }) {
    if (!method) return null;

    const fields = (
        <div class="method-fields">
            <div class="method-field">
                <div class="field-name">{methodsLocale.fields.currencies}</div>
                <METHOD_FIELDS.currencies.component item={method} value={method.currencies} />
            </div>
            {method.type === 'stripe' ? (
                <div class="method-field">
                    <div class="field-name">{methodsLocale.fields.stripeMethods}</div>
                    <METHOD_FIELDS.stripeMethods.component item={method} value={method.stripeMethods} />
                </div>
            ) : null}
            <div class="method-field">
                <div class="field-name">{methodsLocale.fields.paymentValidity}</div>
                <METHOD_FIELDS.paymentValidity.component item={method} value={method.paymentValidity} />
            </div>
            {method.internalDescription && (
                <div class="method-field">
                    <div class="field-name">{methodsLocale.fields.internalDescription}</div>
                    <METHOD_FIELDS.internalDescription.component item={method} value={method.internalDescription} />
                </div>
            )}
            {method.description && (
                <div class="method-field">
                    <div class="field-name">{methodsLocale.fields.description}</div>
                    <METHOD_FIELDS.description.component item={method} value={method.description} />
                </div>
            )}
        </div>
    );

    const foreignId = (editing || item.foreignId) && (
        <div class="foreign-id">
            <div class="intent-section-title">{locale.fields.foreignId}</div>
            {editing ? (
                <TextField
                    class="fid-inner"
                    value={item.foreignId}
                    onChange={foreignId => onItemChange({ ...item, foreignId })} />
            ) : (
                <div class="fid-inner">
                    {item.foreignId}
                </div>
            )}
        </div>
    );

    return (
        <div class="intent-card intent-method">
            <div class="method-title">
                <span class="method-type">
                    {method.type === 'stripe' ? (
                        <span><StripeIcon class="stripe-icon" />™</span>
                    ) : <span class="type-badge">{methodsLocale.fields.types.manual}</span>}
                </span>

                <span class="method-name">{method.name}</span>

                <MethodLink org={item.paymentOrg} id={method.id} />
            </div>
            <DynamicHeightDiv useFirstHeight>
                {!editing && fields}
            </DynamicHeightDiv>

            {foreignId}
        </div>
    );
}

const MethodLink = connect(({ org, id }) => ['payments/method', { org, id }], ['org', 'id'])(data => ({
    exists: !!data,
}))(function MethodLink ({ exists, org, id }) {
    if (!exists) return;

    return (
        <LinkButton class="method-link" target={`/aksopago/organizoj/${org}/metodoj/${id}`} outOfTree>
            {locale.detailViewMethod}
        </LinkButton>
    );
});

function Events ({ item }) {
    const rawEvents = [];
    if (item.timeCreated) {
        rawEvents.push({ status: 'created', time: item.timeCreated });
    }
    if (item.events) {
        rawEvents.push(...item.events);
    }
    rawEvents.reverse();

    let abandonment = null;
    if (item.status === 'pending' && item.method && item.method.paymentValidity !== null) {
        // calculate abandonment time
        const statusTime = rawEvents[0].time;
        const abandonmentTime = statusTime + item.method.paymentValidity;

        abandonment = (
            <div key="abandonment" class="intent-event is-abandonment">
                <div class="event-line-container">
                    <span class="event-line-a"></span>
                    <span class="event-line-b"></span>
                    <span class="event-line-c">
                        <span class="elc-a"></span>
                        <span class="elc-b"></span>
                        <span class="elc-c"></span>
                        <span class="elc-d"></span>
                        <span class="elc-e"></span>
                    </span>
                </div>
                <div class="event-details">
                    <div class="event-timestamp">
                        <timestamp.renderer value={abandonmentTime} />
                    </div>
                    <div class="event-title">
                        {locale.fields.statuses.willBeAbandoned}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div class="intent-card">
            {abandonment}
            {rawEvents.map((e, i) => {
                const isFirst = !abandonment && i === 0;
                const isLast = i === rawEvents.length - 1;
                const className = 'intent-event' + (isFirst ? ' is-first' : '') + (isLast ? ' is-last' : '');
                return (
                    <div key={i} class={className}>
                        <div class="event-line-container">
                            <span class="event-line-a"></span>
                            <span class="event-line-b"></span>
                            <span class="event-line-c"></span>
                        </div>
                        <div class="event-details">
                            <div class="event-timestamp">
                                <timestamp.renderer value={e.time} />
                            </div>
                            <div class="event-title">
                                {locale.fields.statuses[e.status]}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function NotesField ({ item, editing, onItemChange, field }) {
    const value = item[field];

    if (editing) {
        return (
            <div>
                <div class="intent-section-title">{locale.fields[field]}</div>
                <div class="intent-card notes-field">
                    <textarea
                        value={value}
                        onKeyDown={e => e.stopPropagation()}
                        onChange={e => onItemChange({ ...item, [field]: e.target.value })} />
                </div>
            </div>
        );
    }

    if (!value) return null;

    return (
        <div>
            <div class="intent-section-title">{locale.fields[field]}</div>
            <div class="intent-card">
                {value.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
            </div>
        </div>
    );
}
