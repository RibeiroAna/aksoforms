import { h } from 'preact';
import { useState } from 'preact/compat';
import { Checkbox, TextField } from 'yamdl';
import TaskDialog from '../../../components/tasks/task-dialog';
import Segmented from '../../../components/controls/segmented';
import Select from '../../../components/controls/select';
import ChangedFields from '../../../components/tasks/changed-fields';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import CodeholderPicker from '../../../components/pickers/codeholder-picker';
import { deleteDialog } from '../../../components/tasks/task-templates';
import { currencyAmount } from '../../../components/data';
import { Field } from '../../../components/form';
import { connectPerms } from '../../../perms';
import { routerContext } from '../../../router';
import {
    paymentOrgs as orgLocale,
    paymentAddons as addonLocale,
    paymentMethods as methodLocale,
    paymentIntents as intentLocale,
    data as dataLocale,
    currencies,
} from '../../../locale';
import { CREATION_FIELDS as methodFields } from './orgs/methods/fields';
import { IntermediaryEditor } from './intents/fields';
import MethodPicker from './method-picker';
import PurposesPicker from './purposes-picker';
import './tasks.less';

export default {
    createOrg: connectPerms(({ perms, open, task }) => {
        let orgSelector;

        const hasTejo = perms.hasPerm('pay.payment_orgs.create.tejo');
        const hasUea = perms.hasPerm('pay.payment_orgs.create.uea');

        if (hasTejo && hasUea) {
            orgSelector = (
                <Field validate={() => {
                    if (!task.parameters.org) return dataLocale.requiredField;
                }}>
                    <Segmented
                        value={task.parameters.org}
                        selected={task.parameters.org}
                        onSelect={org => task.update({ org })}>
                        {Object.entries(orgLocale.create.orgs).map(([k, v]) => ({ id: k, label: v }))}
                    </Segmented>
                </Field>
            );
        } else if (!task.parameters.org) {
            task.update({ org: hasTejo ? 'tejo' : 'uea' });
        }

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        open={open}
                        onClose={() => task.drop()}
                        title={orgLocale.create.title}
                        actionLabel={orgLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/aksopago/organizoj/${id}`);
                        })}>
                        {orgSelector}
                        <Field>
                            <TextField
                                required
                                label={orgLocale.fields.name}
                                value={task.parameters.name || ''}
                                onChange={name => task.update({ name })} />
                        </Field>
                        <Field>
                            <TextField
                                label={orgLocale.fields.description}
                                value={task.parameters.description || ''}
                                onChange={v => task.update({ description: v || null })} />
                        </Field>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    }),

    createAddon ({ open, task }) {
        const org = task.options.org;

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        open={open}
                        onClose={() => task.drop()}
                        title={addonLocale.create.title}
                        actionLabel={addonLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/aksopago/organizoj/${org}/aldonebloj/${id}`);
                        })}>
                        <Field>
                            <TextField
                                required
                                label={addonLocale.fields.name}
                                value={task.parameters.name || ''}
                                onChange={name => task.update({ name })} />
                        </Field>
                        <Field>
                            <TextField
                                label={addonLocale.fields.description}
                                value={task.parameters.description || ''}
                                onChange={v => task.update({ description: v || null })} />
                        </Field>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },

    createMethod ({ open, task }) {
        const org = task.options.org;

        const item = task.parameters;
        const fields = [];
        for (const f in methodFields) {
            const field = methodFields[f];
            if (field.shouldHide && field.shouldHide(item, true)) continue;
            const Component = field.component;

            fields.push(
                <Field key={f} validate={() => field.validate && field.validate({
                    value: item[f],
                    item,
                })}>
                    {field.wantsCreationLabel ? (
                        <label class="creation-label">
                            {methodLocale.fields[f]}
                        </label>
                    ) : null}
                    <Component
                        slot="create"
                        value={item[f]}
                        editing={true}
                        onChange={value => task.update({ [f]: value })}
                        item={item}
                        onItemChange={value => task.update(value)} />
                </Field>
            );
        }

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        sheet
                        class={'payment-method-task-create' + (item.type === 'intermediary' ? ' is-intermediary' : '')}
                        open={open}
                        fullScreen={width => width < 700}
                        onClose={() => task.drop()}
                        title={methodLocale.create.title}
                        actionLabel={methodLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/aksopago/organizoj/${org}/metodoj/${id}`);
                        })}>
                        <DynamicHeightDiv useFirstHeight>
                            {fields}
                        </DynamicHeightDiv>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },

    createIntent ({ open, core, task }) {
        if (task.options._noGUI) return null;

        const fields = [];

        const customer = task.parameters.customer || {};
        const method = task.parameters.method || {};
        const [availableCurrencies, setCurrencies] = useState([]);

        const [methodInfo, setMethodInfo] = useState(null);
        const [exchangeRates, setExchangeRates] = useState({});
        const [usdExchangeRates, setUsdExchangeRates] = useState({});

        fields.push(
            <div key="customer" class="create-intent-subtitle">
                {intentLocale.fields.customer}
            </div>
        );

        fields.push(
            <Field key="customer.name">
                <TextField
                    outline
                    required
                    label={intentLocale.fields.customerName}
                    value={customer.name}
                    onChange={name => task.update({ customer: { ...customer, name } })} />
            </Field>
        );
        fields.push(
            <Field key="customer.email">
                <TextField
                    type="email"
                    required
                    outline
                    label={intentLocale.fields.customerEmail}
                    value={customer.email}
                    onChange={email => task.update({ customer: { ...customer, email } })} />
            </Field>
        );
        fields.push(
            <div key="customer.id-title" class="create-intent-subtitle">
                {intentLocale.fields.customerId}
            </div>
        );
        fields.push(
            <Field key="customer.id">
                <CodeholderPicker
                    limit={1}
                    value={customer.id ? [customer.id] : []}
                    onChange={ids => {
                        task.update({
                            customer: {
                                ...customer,
                                id: ids[0] || null,
                            },
                        });
                    }} />
            </Field>
        );

        fields.push(
            <div key="cnotes-title" class="create-intent-subtitle">
                {intentLocale.fields.customerNotes}
            </div>
        );
        fields.push(
            <Field>
                <textarea
                    class="notes-field"
                    value={task.parameters.customerNotes || ''}
                    onChange={e => task.update({ customerNotes: e.target.value || null })} />
            </Field>
        );
        fields.push(
            <div key="notes-title" class="create-intent-subtitle">
                {intentLocale.fields.internalNotes}
            </div>
        );
        fields.push(
            <Field>
                <textarea
                    class="notes-field"
                    value={task.parameters.internalNotes || ''}
                    onChange={e => task.update({ internalNotes: e.target.value || null })} />
            </Field>
        );

        /*
        fields.push(
            <div key="state-title" class="create-intent-subtitle">
                {intentLocale.fields.status}
            </div>
        );
        fields.push(
            <Field>
                <Select
                    class="status-select"
                    value={task.parameters.status || 'pending'}
                    onChange={status => task.update({ status })}
                    items={Object.keys(intentLocale.filters.statuses).filter(x => x)
                        .map(i => ({ value: i, label: intentLocale.filters.statuses[i] }))} />
            </Field>
        );
        */

        fields.push(
            <div key="method-title" class="create-intent-subtitle">
                {intentLocale.create.paymentMethod}
            </div>
        );

        fields.push(
            <Field key="method">
                <MethodPicker
                    onGetCurrencies={setCurrencies}
                    org={task.parameters.paymentOrg}
                    onOrgChange={paymentOrg => {
                        // clear all addons because they're org-specific
                        const purposes = (task.parameters.purposes || [])
                            .filter(purpose => purpose.type !== 'addon');
                        task.update({ paymentOrg, purposes });
                    }}
                    value={method.id}
                    type="manual"
                    onChange={id => {
                        if (id) task.update({ method: { id } });
                        else task.update({ method: null, currency: null });
                    }}
                    onItemData={data => {
                        if (data) {
                            setMethodInfo(data);
                            if (data.feeFixed?.cur) {
                                core.createTask('payments/exchangeRates', {
                                    base: data.feeFixed.cur,
                                }).runOnceAndDrop().then(result => {
                                    setExchangeRates(result);
                                });
                            }

                            core.createTask('payments/exchangeRates', {
                                base: 'USD',
                            }).runOnceAndDrop().then(result => {
                                setUsdExchangeRates(result);
                            });
                        }
                    }} />
            </Field>
        );

        if (method.id && methodInfo?.type === 'intermediary') {
            fields.push(
                <div key="intermediary-title" class="create-intent-subtitle">
                    {intentLocale.fields.intermediary}
                </div>
            );
            fields.push(
                <Field key="intermediary">
                    <IntermediaryEditor
                        slot="create"
                        editing
                        value={task.parameters.intermediary}
                        onChange={intermediary => task.update({ intermediary })} />
                </Field>
            );
        }

        if (method.id) {
            fields.push(
                <div key="currency-title" class="create-intent-subtitle">
                    {intentLocale.fields.currency}
                </div>
            );
            fields.push(
                <Field key="currency">
                    <Select
                        class="currency-select"
                        value={task.parameters.currency || ''}
                        onChange={currency => task.update({ currency })}
                        items={[!task.parameters.currency && {
                            value: '',
                            label: intentLocale.create.noCurrencySelected,
                            disabled: true,
                        }].filter(x => x).concat(Object.keys(currencies)
                            .filter(x => availableCurrencies.includes(x))
                            .map(c => ({ value: c, label: currencies[c] })))} />
                </Field>
            );
        }

        if (task.parameters.currency) {
            fields.push(
                <div key="purposes-title" class="create-intent-subtitle">
                    {intentLocale.create.purposes}
                </div>
            );
            fields.push(
                <Field key="purposes">
                    <PurposesPicker
                        org={task.parameters.paymentOrg}
                        currency={task.parameters.currency}
                        value={task.parameters.purposes || []}
                        onChange={purposes => task.update({ purposes })} />
                </Field>
            );
        }
        const ready = task.parameters.currency && method.id && task.parameters.purposes && task.parameters.purposes.length;

        let total = 0;
        let overMaxAmount = false;
        if (task.parameters.purposes) {
            total = task.parameters.purposes.map(p => p.amount).reduce((a, b) => a + b, 0);
        }
        if (methodInfo) {
            if (methodInfo.feePercent) {
                total *= 1 + methodInfo.feePercent;
            }
            if (methodInfo.feeFixed) {
                total += exchangeRates[task.parameters.currency] * methodInfo.feeFixed.val;
            }

            let maxAmount;
            if (methodInfo.maxAmount) {
                maxAmount = usdExchangeRates[task.parameters.currency] * methodInfo.maxAmount;
            } else {
                maxAmount = usdExchangeRates[task.parameters.currency] * intentLocale.create.hardMaxAmountUsd;
            }
            overMaxAmount = total > maxAmount;
        }

        const [autoSubmit, setAutoSubmit] = useState(true);

        if (ready) {
            const autoSubmitId = Math.random().toString(36);

            fields.push(
                <div key="total" class="create-intent-total">
                    <div>
                        {intentLocale.create.total}
                        {' '}
                        <currencyAmount.renderer value={total} currency={task.parameters.currency} />
                    </div>
                    <div class="total-note">
                        {intentLocale.create.totalNote}
                    </div>
                    {overMaxAmount && (
                        <Field class="total-above-max-amount" validate={() => {
                            throw null;
                        }}>
                            {intentLocale.create.totalOverMaxAmount}
                        </Field>
                    )}
                </div>
            );

            if (methodInfo?.type === 'manual') {
                fields.push(
                    <div key="autosubmit" class="create-intent-auto-submit">
                        <Checkbox
                            id={autoSubmitId}
                            checked={autoSubmit}
                            onChange={setAutoSubmit} />
                        {' '}
                        <label for={autoSubmitId}>
                            {intentLocale.create.autoSubmit}
                        </label>
                    </div>
                );
            }
        }

        const actuallyReady = ready && !overMaxAmount;

        return (
            <routerContext.Consumer>
                {routerContext => (
                    <TaskDialog
                        sheet
                        class="payments-task-create-intent"
                        open={open}
                        fullScreen={width => width < 400}
                        onClose={() => task.drop()}
                        title={intentLocale.create.title}
                        actionLabel={!!actuallyReady && intentLocale.create.button}
                        run={() => task.runOnce().then(id => {
                            routerContext.navigate(`/aksopago/pagoj/${id}`);
                            // immediately submit
                            if (methodInfo?.type === 'manual' && autoSubmit) {
                                core.createTask('payments/submitIntent', { id }).run();
                            }
                        })}>
                        <DynamicHeightDiv useFirstHeight>
                            {fields}
                        </DynamicHeightDiv>
                    </TaskDialog>
                )}
            </routerContext.Consumer>
        );
    },

    updateOrg ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={orgLocale.update.title}
                actionLabel={orgLocale.update.button}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={orgLocale.fields} />
            </TaskDialog>
        );
    },

    updateAddon ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={addonLocale.update.title}
                actionLabel={addonLocale.update.button}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={addonLocale.fields} />
            </TaskDialog>
        );
    },

    updateMethod ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={methodLocale.update.title}
                actionLabel={methodLocale.update.button}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={methodLocale.fields} />
            </TaskDialog>
        );
    },

    updateIntent ({ open, task }) {
        return (
            <TaskDialog
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.update.title}
                actionLabel={intentLocale.update.button}
                run={() => task.runOnce()}>
                <ChangedFields
                    changedFields={task.options._changedFields}
                    locale={intentLocale.fields} />
            </TaskDialog>
        );
    },

    deleteOrg: deleteDialog({
        locale: orgLocale.delete,
        objectView: ({ id }) => ['payments/org', { id }],
        objectName: ({ name }) => name,
    }),
    deleteAddon: deleteDialog({
        locale: addonLocale.delete,
    }),
    deleteMethod: deleteDialog({
        locale: methodLocale.delete,
        objectView: ({ org, id }) => ['payments/method', { org, id }],
        objectName: ({ name }) => name,
    }),
    deleteMethodThumbnail: deleteDialog({ locale: methodLocale.deleteThumbnail }),

    cancelIntent ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.actions.cancel.title}
                actionLabel={intentLocale.actions.cancel.button}
                running={task.running}
                run={() => task.runOnce()}>
                {intentLocale.actions.cancel.description}
            </TaskDialog>
        );
    },
    markIntentDisputed ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.actions.markDisputed.title}
                actionLabel={intentLocale.actions.markDisputed.button}
                run={() => task.runOnce()}>
                {intentLocale.actions.markDisputed.description}
            </TaskDialog>
        );
    },
    markIntentRefunded ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.actions.markRefunded.title}
                actionLabel={intentLocale.actions.markRefunded.button}
                run={() => task.runOnce()}>
                <div>
                    {intentLocale.actions.markRefunded.description}
                </div>

                <Field class="input-container" validate={() => {
                    const value = task.parameters.amount;
                    if (value < 0) return intentLocale.actions.markRefunded.lowerBound;
                    if (value > task.options._max) {
                        return intentLocale.actions.markRefunded.upperBound;
                    }
                }}>
                    <currencyAmount.editor
                        component={currencyAmount.editor}
                        outline
                        label={intentLocale.actions.markRefunded.amount}
                        value={task.parameters.amount}
                        onChange={amount => task.update({ amount })}
                        currency={task.options._currency} />
                </Field>
            </TaskDialog>
        );
    },
    _stripeDispute ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.actions.markDisputed.stripeTitle}
                actionLabel={intentLocale.actions.markDisputed.stripeButton}
                run={() => {
                    task.drop();
                    const a = document.createElement('a');
                    a.href = intentLocale.stripeIntentLink(task.options.id);
                    a.rel = 'noopener noreferrer';
                    a.target = '_blank';
                    a.click();
                }}>
                {intentLocale.actions.markDisputed.stripeDescription}
            </TaskDialog>
        );
    },
    _stripeRefund ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.actions.markRefunded.stripeTitle}
                actionLabel={intentLocale.actions.markRefunded.stripeButton}
                run={() => {
                    task.drop();
                    const a = document.createElement('a');
                    a.href = intentLocale.stripeIntentLink(task.options.id);
                    a.rel = 'noopener noreferrer';
                    a.target = '_blank';
                    a.click();
                }}>
                {intentLocale.actions.markRefunded.stripeDescription}
            </TaskDialog>
        );
    },
    markIntentSucceeded ({ open, task }) {
        const sendReceiptId = Math.random().toString(36);
        let locale = intentLocale.actions.markSucceeded;
        if (task.options._isIntermediary) locale = intentLocale.actions.markSucceededIntermediary;

        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={locale.title}
                actionLabel={locale.button}
                run={() => task.runOnce()}>
                {locale.description}
                <div class="input-container">
                    <Checkbox
                        id={sendReceiptId}
                        checked={!!task.parameters.sendReceipt}
                        onChange={sendReceipt => task.update({ sendReceipt })} />
                    {' '}
                    <label for={sendReceiptId}>{locale.sendReceipt}</label>
                </div>
            </TaskDialog>
        );
    },
    submitIntent ({ open, task }) {
        let locale = intentLocale.actions.submit;
        if (task.options._isIntermediary) locale = intentLocale.actions.submitIntermediary;

        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={locale.title}
                running={task.running}
                actionLabel={locale.button}
                run={() => task.runOnce()}>
                {locale.description}
            </TaskDialog>
        );
    },
    resendIntentReceipt ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-intent-action"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.resendReceipt.title}
                actionLabel={intentLocale.resendReceipt.button}
                run={() => task.runOnce()}>
                {intentLocale.resendReceipt.description}
                <Field class="input-container">
                    <TextField
                        outline
                        required
                        label={intentLocale.resendReceipt.email}
                        value={task.parameters.email || ''}
                        onChange={v => task.update(v || null)} />
                </Field>
            </TaskDialog>
        );
    },
    setIntentPurposeValidity ({ open, task }) {
        return (
            <TaskDialog
                class="payments-task-set-purpose-validity"
                open={open}
                onClose={() => task.drop()}
                title={intentLocale.setPurposeValidity.title}
                actionLabel={intentLocale.setPurposeValidity.button}
                run={() => task.runOnce()}>
                <div class="inner-field">
                    {intentLocale.setPurposeValidity.description}
                    <Select
                        class="inner-value"
                        value={task.parameters.invalid ? 'invalid' : 'valid'}
                        onChange={value => task.update({ invalid: value === 'invalid' })}
                        items={[
                            {
                                value: 'invalid',
                                label: intentLocale.setPurposeValidity.optInvalid,
                            },
                            {
                                value: 'valid',
                                label: intentLocale.setPurposeValidity.optValid,
                            },
                        ]} />
                </div>
            </TaskDialog>
        );
    },
};
