import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import { Button, Checkbox, Dialog, MenuIcon, TextField } from 'yamdl';
import { base32 } from 'rfc4648';
import Select from '../../../components/controls/select';
import Segmented from '../../../components/controls/segmented';
import { Form, ValidatedTextField, Field } from '../../../components/form';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import StaticOverviewList from '../../../components/lists/overview-list-static';
import OverviewListItem from '../../../components/lists/overview-list-item';
import MdField from '../../../components/controls/md-field';
import { currencyAmount } from '../../../components/data';
import {
    paymentIntents as locale,
    paymentAddons as addonLocale,
    currencies,
} from '../../../locale';
import { FIELDS as ADDON_FIELDS } from './orgs/addons/fields';
import TriggerPicker from './trigger-picker';
import './purposes-picker.less';

const ADDON_FIELD_IDS = Object.keys(ADDON_FIELDS).map(id => ({ id }));
const REDUCED_ADDON_FIELDS = ADDON_FIELDS;

export default class PurposesPicker extends PureComponent {
    state = {
        pickerOpen: false,
    };

    #open = () => {
        this.setState({ pickerOpen: true });
    };

    render ({ org, value, onChange, currency }, { pickerOpen }) {
        const purposes = value.map((item, i) => {
            return (
                <Purpose
                    key={i}
                    org={org}
                    currency={currency}
                    value={item}
                    onChange={item => {
                        const list = [...value];
                        list[i] = item;
                        onChange(list);
                    }}
                    onRemove={() => {
                        const list = [...value];
                        list.splice(i, 1);
                        onChange(list);
                    }} />
            );
        });

        return (
            <span class="payment-purposes-picker">
                <DynamicHeightDiv>
                    <div class="purposes-picker-inner">
                        {purposes}
                    </div>
                </DynamicHeightDiv>
                <Button
                    class="purposes-picker-add"
                    onClick={e => {
                        e.stopPropagation();
                        this.#open();
                    }}>
                    <AddIcon style={{ verticalAlign: 'middle' }} />
                </Button>

                <AddPurposeDialog
                    org={org}
                    open={pickerOpen}
                    onAdd={item => onChange(value.concat([item]))}
                    onClose={() => this.setState({ pickerOpen: false })} />
            </span>
        );
    }
}

function Purpose ({ org, value, onChange, onRemove, currency }) {
    const { type } = value;

    const amountEditor = currency ? (
        <currencyAmount.editor
            outline
            currency={currency}
            value={value.amount}
            onChange={amount => onChange({ ...value, amount })} />
    ) : (
        <span class="purpose-no-currency">
            {locale.purposesPicker.selectCurrencyFirst}
        </span>
    );

    const setOriginalAmountEnabled = enabled => {
        if (enabled) {
            onChange({ ...value, originalAmount: value.amount });
        } else {
            onChange({ ...value, originalAmount: null });
        }
    };

    const discountSwitchId = Math.random().toString(36);
    const isDiscounted = ('originalAmount' in value) && value.originalAmount !== null;
    const discountEditor = currency ? (
        <div class="discount">
            <div class="discount-switch">
                <Checkbox
                    class="switch-box"
                    id={discountSwitchId}
                    checked={isDiscounted}
                    onChange={setOriginalAmountEnabled} />
                <label for={discountSwitchId}>
                    {locale.purposesPicker.useOriginalAmount}
                </label>
            </div>
            {isDiscounted ? (
                <div class="discount-editor">
                    <currencyAmount.editor
                        label={locale.purposesPicker.originalAmount}
                        outline
                        currency={currency}
                        value={value.originalAmount}
                        onChange={originalAmount => onChange({ ...value, originalAmount })} />
                </div>
            ) : null}
        </div>
    ) : null;

    const removeButton = (
        <Button class="remove-button" onClick={e => {
            e.stopPropagation();
            onRemove();
        }}>
            <MenuIcon type="close" />
        </Button>
    );

    if (type === 'manual') {
        return (
            <div class="payment-purpose is-manual">
                <div class="purpose-inner">
                    <div class="purpose-details">
                        <div class="purpose-title">{value.title}</div>
                        <MdField
                            class="purpose-description"
                            rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                            value={value.description} />
                    </div>
                    <div class="purpose-amount-container">
                        {amountEditor}
                        {discountEditor}
                    </div>
                </div>
                {removeButton}
            </div>
        );
    } else if (type === 'addon') {
        return (
            <div class="payment-purpose is-addon">
                <div class="purpose-inner">
                    <OverviewListItem
                        doFetch compact view="payments/addon"
                        skipAnimation
                        id={value.paymentAddonId}
                        options={{ org }}
                        selectedFields={ADDON_FIELD_IDS}
                        fields={REDUCED_ADDON_FIELDS}
                        index={0}
                        locale={addonLocale.fields} />
                    <div class="purpose-amount-container">
                        {amountEditor}
                        {discountEditor}
                    </div>
                </div>
                {removeButton}
            </div>
        );
    } else if (type === 'trigger') {
        const triggerSwitchId = Math.random().toString(36);
        const setTriggerAmountEnabled = enabled => {
            if (enabled) {
                onChange({
                    ...value,
                    triggerAmount: {
                        amount: value.amount,
                        currency,
                    },
                });
            } else onChange({ ...value, triggerAmount: null });
        };

        return (
            <div class="payment-purpose is-trigger">
                <div class="purpose-inner">
                    <div class="purpose-details">
                        <div class="trigger-details">
                            <span class="purpose-type">
                                {locale.purposesPicker.types.trigger}
                            </span>
                            <span class="trigger-type">
                                {locale.triggers[value.triggers]}
                            </span>
                        </div>
                        <div class="purpose-title">{value.title}</div>
                        <MdField
                            class="purpose-description"
                            rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                            value={value.description} />
                        <div class="purpose-data-id-container">
                            <span class="purpose-data-id">{value.dataId}</span>
                        </div>
                    </div>
                    <div class="purpose-amount-container">
                        {amountEditor}
                        {discountEditor}
                        <div class="trigger-amount">
                            <div class="trigger-amount-switch">
                                <Checkbox
                                    class="switch-box"
                                    checked={!!value.triggerAmount}
                                    onChange={setTriggerAmountEnabled}
                                    id={triggerSwitchId} />
                                <label for={triggerSwitchId}>
                                    {locale.purposesPicker.useTriggerAmount}
                                </label>
                            </div>
                            {value.triggerAmount ? (
                                <div class="trigger-amount-editor">
                                    <Select
                                        class="trigger-amount-editor-currency"
                                        items={Object.keys(currencies).map(c => ({
                                            value: c,
                                            label: currencies[c],
                                        }))}
                                        value={value.triggerAmount.currency}
                                        onChange={currency => onChange({
                                            ...value,
                                            triggerAmount: {
                                                ...value.triggerAmount,
                                                currency,
                                            },
                                        })} />
                                    <currencyAmount.editor
                                        class="trigger-amount-editor-inner"
                                        outline
                                        value={value.triggerAmount.amount}
                                        onChange={amount => onChange({
                                            ...value,
                                            triggerAmount: {
                                                ...value.triggerAmount,
                                                amount,
                                            },
                                        })}
                                        currency={value.triggerAmount.currency} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
                {removeButton}
            </div>
        );
    }
}

class AddPurposeDialog extends PureComponent {
    state = {
        type: 'manual',
        addonOffset: 0,
        manualTitle: '',
        manualDescription: null,
        triggerType: Object.keys(locale.triggers)[0],
        triggerDataId: '',
    };

    #add = (id) => {
        if (this.state.type === 'manual') {
            this.props.onAdd({
                type: 'manual',
                title: this.state.manualTitle,
                description: this.state.manualDescription,
                amount: 0,
            });
        } else if (this.state.type === 'addon') {
            this.props.onAdd({
                type: 'addon',
                paymentAddonId: id,
                amount: 0,
            });
        } else if (this.state.type === 'trigger') {
            this.props.onAdd({
                type: 'trigger',
                title: this.state.manualTitle,
                description: this.state.manualDescription,
                triggers: this.state.triggerType,
                amount: 0,
                dataId: this.state.triggerDataId,
            });
        }
        this.props.onClose();
    };

    render ({ org, open, onClose }, { type, addonOffset, manualTitle, manualDescription }) {
        let contents = '';

        const nameField = () => (
            <Field>
                <TextField
                    required
                    label={locale.purposesPicker.manual.title}
                    outline
                    value={manualTitle}
                    onChange={manualTitle => this.setState({ manualTitle })}/>
            </Field>
        );
        const descField = () => (
            <Field>
                <label>{locale.purposesPicker.manual.description}</label>
                <MdField
                    rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                    editing value={manualDescription || ''}
                    onChange={value => this.setState({ manualDescription: value || null })}/>
            </Field>
        );

        if (type === 'manual') {
            contents = (
                <Form onSubmit={this.#add} class="manual-purpose">
                    {nameField()}
                    {descField()}
                    <div class="form-footer">
                        <Button raised type="submit">
                            {locale.purposesPicker.addPurposeButton}
                        </Button>
                    </div>
                </Form>
            );
        } else if (type === 'addon') {
            if (!org) {
                contents = (
                    <div class="no-org">
                        {locale.purposesPicker.selectMethodFirst}
                    </div>
                );
            } else {
                contents = (
                    <StaticOverviewList
                        compact
                        emptyLabel={locale.purposesPicker.noAddons}
                        task="payments/listAddons"
                        view="payments/addon"
                        options={{ org }}
                        viewOptions={{ org }}
                        fields={REDUCED_ADDON_FIELDS}
                        sorting={{ name: 'asc' }}
                        offset={addonOffset}
                        onSetOffset={addonOffset => this.setState({ addonOffset })}
                        onItemClick={id => this.#add(id)}
                        limit={10}
                        locale={addonLocale.fields}/>
                );
            }
        } else if (type === 'trigger') {
            contents = (
                <Form onSubmit={this.#add} class="trigger-purpose">
                    <Field>
                        <Select
                            value={this.state.triggerType}
                            onChange={triggerType => this.setState({ triggerType })}
                            items={Object.keys(locale.triggers).map(v => ({
                                value: v,
                                label: locale.triggers[v],
                            }))} />
                    </Field>
                    {nameField()}
                    {descField()}
                    <Field>
                        <ValidatedTextField
                            outline
                            label={locale.purposesPicker.dataId}
                            validate={value => {
                                if (this.state.triggerType === 'congress_registration') {
                                    // 12 bytes = 24 hex chars
                                    if (!value.match(/[0-9a-f]{24}/i)) return locale.purposesPicker.invalidDataId;
                                } else if (this.state.triggerType === 'registration_entry') {
                                    try {
                                        base32.parse(value);
                                    } catch {
                                        return locale.purposesPicker.invalidDataId;
                                    }
                                }
                            }}
                            class="trigger-data-id-field"
                            value={this.state.triggerDataId.toString('hex')}
                            onChange={triggerDataId => {
                                this.setState({ triggerDataId });
                            }}
                            trailing={(
                                <TriggerPicker
                                    type={this.state.triggerType}
                                    onChange={id => this.setState({ triggerDataId: id })} />
                            )} />
                    </Field>
                    <div class="form-footer">
                        <Button raised type="submit">
                            {locale.purposesPicker.addPurposeButton}
                        </Button>
                    </div>
                </Form>
            );
        }

        return (
            <Dialog
                class="payment-purposes-picker-dialog"
                backdrop
                title={locale.purposesPicker.addTitle}
                open={open}
                onClose={onClose}
                fullScreen={width => width < 400}>
                <div class="type-selection">
                    <Segmented selected={type} onSelect={type => this.setState({ type })}>
                        {Object.keys(locale.purposesPicker.types).map(id => ({
                            id,
                            label: locale.purposesPicker.types[id],
                        }))}
                    </Segmented>
                </div>
                <DynamicHeightDiv>
                    {contents}
                </DynamicHeightDiv>
            </Dialog>
        );
    }
}
