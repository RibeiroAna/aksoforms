import { h } from 'preact';
import { lazy, Suspense, Fragment, PureComponent } from 'preact/compat';
import { Button, CircularProgress, Checkbox, TextField } from 'yamdl';
import TuneIcon from '@material-ui/icons/Tune';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import { formEditor as locale, currencies, data as dataLocale } from '../../locale';
import { currencyAmount } from '../data';
import { RefNameView } from './script-views';
import { Field } from '../form';
import { evalExpr } from './model';
import Select from '../controls/select';
import DynamicHeightDiv from '../layout/dynamic-height-div';
import FormContext from '../form/context';
import './settings.less';

const FLAGS = [
    'allowUse',
    'allowGuests',
    'editable',
    'cancellable',
    'manualApproval',
];

/** Renders a control with general form settings (TODO: generalize; this is for congresses!). */
export default class FormEditorSettings extends PureComponent {
    state = { expanded: false };

    static contextType = FormContext;

    componentDidMount () {
        this.context.register(this);
    }

    componentWillUnmount () {
        this.context.deregister(this);
    }

    validate (submitting) {
        if (submitting) {
            const err = this.getError();
            if (err) {
                this.setState({ expanded: true });
            }
            return !err;
        }
    }

    getError () {
        const { value } = this.props;
        const knownVars = findKnownVariables(this.props.previousNodes);

        for (const v of VARIABLES) {
            if (v.required && !value[v.key]) return dataLocale.requiredField;
            if (value[v.key] && !knownVars.has(value[v.key])) {
                this.props.onChange({ [v.key]: null, ...value });
                return dataLocale.requiredField;
            }
        }
        if (value.price && !value.price.var) {
            return dataLocale.requiredField;
        } else if (value.price && !knownVars.has(value.price.var)) {
            this.props.onChange({
                price: {
                    ...value.price,
                    var: null,
                },
                ...value,
            });
            return dataLocale.requiredField;
        }
    }

    render ({
        org, value, editing, onChange, previousNodes, disableCurrencyChange,
    }, { expanded }) {
        let settings = null;
        if (expanded) {
            settings = (
                <Fragment>
                    <Flags
                        value={value}
                        editing={editing}
                        onChange={onChange} />
                    <Price
                        disableCurrencyChange={disableCurrencyChange}
                        previousNodes={previousNodes}
                        editing={editing}
                        value={value.price}
                        onChange={price => onChange({ ...value, price })} />
                    <Variables
                        previousNodes={previousNodes}
                        editing={editing}
                        value={value}
                        onChange={onChange} />
                    <SequenceIds
                        value={value.sequenceIds}
                        editing={editing}
                        onChange={sequenceIds => onChange({ ...value, sequenceIds })} />
                    <ConfirmationNotifTemplate
                        org={org}
                        value={value.confirmationNotifTemplateId}
                        editing={editing}
                        onChange={v => onChange({ ...value, confirmationNotifTemplateId: v })} />
                </Fragment>
            );
        } else {
            settings = <SettingsSummary value={value} />;
        }

        return (
            <div class={'form-editor-settings' + (expanded ? ' is-expanded' : '')}>
                <div class="settings-title" onClick={() => this.setState({ expanded: !expanded })}>
                    <TuneIcon />
                    <span class="inner-title">{locale.settings.title}</span>
                    <Button icon small>
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </Button>
                </div>
                {settings}
            </div>
        );
    }
}

function SettingsSummary ({ value }) {
    return (
        <div class="settings-summary">
            <div class="summary-flags">
                {FLAGS.map(flag => (
                    <span class="summary-flag" key={flag}>
                        {value[flag]
                            ? <CheckIcon className="i-icon" style={{ verticalAlign: 'middle' }} />
                            : <CloseIcon className="i-icon" style={{ verticalAlign: 'middle' }} />}
                        {' '}
                        {locale.settings.flags[flag]}
                    </span>
                ))}
                <span class="summary-flag">
                    {value.sequenceIds
                        ? <CheckIcon className="i-icon" style={{ verticalAlign: 'middle' }} />
                        : <CloseIcon className="i-icon" style={{ verticalAlign: 'middle' }} />}
                    {' '}
                    {locale.settings.sequenceIds.enabled}
                </span>
            </div>
            {value.price ? (
                <div class="summary-price">
                    <div>
                        <CheckIcon className="i-icon" style={{ verticalAlign: 'middle' }}/>
                        {' '}
                        {locale.settings.price.enabled}
                    </div>
                    <div class="price-inner">
                        <div class="i-price-var">
                            <RefNameView class="form-editor-settings-var-ref" name={value.price.var} />
                            {' '}
                            <span class="price-currency">
                                {currencies[value.price.currency]}
                            </span>
                        </div>
                        {value.price.minUpfront ? (
                            <div class="i-price-min">
                                {locale.settings.price.minUpfront}
                                {': '}
                                <currencyAmount.renderer
                                    value={value.price.minUpfront}
                                    currency={value.price.currency} />
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
            <table class="summary-vars">
                <tbody>
                    {VARIABLES.map(({ key, required }) => (
                        (value[key] || required) ? (
                            <tr class="summary-var" key={key}>
                                <td>
                                    {locale.settings.variables[key]}
                                </td>
                                <td>
                                    {value[key] ? (
                                        <RefNameView class="form-editor-settings-var-ref" name={value[key]} />
                                    ) : '—'}
                                </td>
                            </tr>
                        ) : null
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Flags ({ value, editing, onChange }) {
    const flags = FLAGS.map(flag => (
        <Flag
            key={flag}
            editing={editing}
            flag={flag}
            value={value[flag]}
            onChange={v => onChange({ ...value, [flag]: v })} />
    ));

    return (
        <div class="settings-flags">
            {flags}
        </div>
    );
}

function Flag ({ flag, editing, value, onChange }) {
    const labelId = 'flag' + Math.random().toString(36);

    return (
        <Field class="settings-flag">
            <Checkbox
                class="flag-checkbox"
                disabled={!editing}
                id={labelId}
                checked={value}
                onChange={onChange} />
            <label for={labelId}>{locale.settings.flags[flag]}</label>
            <div class="flag-description">
                {locale.settings.flags[flag + 'Desc']}
            </div>
        </Field>
    );
}

function Price ({ value, editing, onChange, previousNodes, disableCurrencyChange }) {
    const labelId = 'price' + Math.random().toString(36);
    const onChangeEnabled = enabled => {
        if (enabled) onChange({ currency: 'USD', var: null, minUpfront: null });
        else onChange(null);
    };

    const contents = [];
    if (value) {
        contents.push(
            <Field key="value" class="settings-item"
                validate={() => {
                    if (!value.var) return dataLocale.requiredField;
                }}>
                <label class="settings-item-title">
                    {locale.settings.price.variable}
                </label>
                <div class="currency-select-container">
                    <AscVarPicker
                        autoWidth
                        previousNodes={previousNodes}
                        editing={editing}
                        value={value.var}
                        onChange={v => onChange({ ...value, var: v })} />
                    <Select
                        class="currency-select"
                        disabled={!editing || disableCurrencyChange}
                        outline
                        items={Object.keys(currencies).map(c => ({ value: c, label: currencies[c] }))}
                        value={value.currency}
                        onChange={currency => onChange({ ...value, currency })} />
                </div>
                {editing && disableCurrencyChange ? (
                    <div class="settings-item-description">
                        {locale.settings.price.currencyChangeDisabled}
                    </div>
                ) : null}
                <div class="settings-item-description">
                    {locale.settings.price.description}
                </div>
            </Field>
        );

        let priceValue = null;
        if (value.var) {
            priceValue = evalExpr({ t: 'c', f: 'id', a: [value.var] }, previousNodes);
        }

        contents.push(
            <Field key="preview" class="settings-item">
                <span>{locale.settings.price.pricePreview}</span>
                {' '}
                {(typeof priceValue === 'number') ? (
                    <currencyAmount.renderer
                        disabled={!editing}
                        currency={value.currency}
                        value={priceValue} />
                ) : (
                    locale.settings.price.notANumber
                )}
            </Field>
        );
        contents.push(
            <Field key="min" class="settings-item">
                <currencyAmount.editor
                    outline
                    disabled={!editing}
                    currency={value.currency}
                    label={locale.settings.price.minUpfront}
                    value={value.minUpfront || 0}
                    onChange={v => onChange({ ...value, minUpfront: v || null })} />
            </Field>
        );
    }

    return (
        <div class="settings-price">
            <div class="settings-flag">
                <Checkbox
                    id={labelId}
                    disabled={!editing}
                    class="flag-checkbox"
                    checked={!!value}
                    onChange={onChangeEnabled} />
                <label for={labelId}>{locale.settings.price.enabled}</label>
            </div>
            <DynamicHeightDiv class="settings-flag-options">
                {contents}
            </DynamicHeightDiv>
        </div>
    );
}

// TODO: *really* should be moving this outta here and into congresses
const NotifTemplatePicker = lazy(() => import('../../features/pages/notif-templates/picker'));
function ConfirmationNotifTemplate ({ org, value, editing, onChange }) {
    return (
        <div class="settings-confirmation-notif">
            <label>
                {locale.settings.confirmationNotifTemplateId.label}
            </label>
            <Suspense fallback={<CircularProgress indeterminate />}>
                <NotifTemplatePicker
                    disabled={!editing}
                    jsonFilter={{ org, intent: 'congress_registration' }}
                    value={value}
                    onChange={onChange} />
            </Suspense>
        </div>
    );
}

function SequenceIds ({ value, editing, onChange }) {
    const labelId = 'seqids' + Math.random().toString(36);
    const onChangeEnabled = enabled => {
        if (enabled) onChange({ startAt: 1, requireValid: true });
        else onChange(null);
    };

    const contents = [];
    if (value) {
        contents.push(
            <Field key="startat" class="settings-item">
                <TextField
                    outline
                    disabled={!editing}
                    label={locale.settings.sequenceIds.startAt}
                    value={value.startAt | 0}
                    onChange={v => onChange({ ...value, startAt: +v | 0 })} />
            </Field>
        );
        const validId = 'flag' + Math.random().toString(36);
        contents.push(
            <Field key="reqvalid" class="settings-flag">
                <Checkbox
                    id={validId}
                    disabled={!editing}
                    class="flag-checkbox"
                    checked={value.requireValid}
                    onChange={requireValid => onChange({ ...value, requireValid })} />
                <label for={validId}>{locale.settings.sequenceIds.requireValid}</label>
                <div class="flag-description">
                    {locale.settings.sequenceIds.requireValidDesc}
                </div>
            </Field>
        );
    }

    return (
        <div class="settings-seq-ids">
            <div class="settings-flag">
                <Checkbox
                    id={labelId}
                    disabled={!editing}
                    class="flag-checkbox"
                    checked={!!value}
                    onChange={onChangeEnabled} />
                <label for={labelId}>{locale.settings.sequenceIds.enabled}</label>
            </div>
            <DynamicHeightDiv class="settings-flag-options">
                {contents}
            </DynamicHeightDiv>
        </div>
    );
}

const VARIABLES = [
    { key: 'identifierName', required: true },
    { key: 'identifierEmail', required: true },
    { key: 'identifierCountryCode', required: false },
];

function Variables ({ previousNodes, editing, value, onChange }) {
    const variables = [];
    for (const v of VARIABLES) {
        variables.push(
            <Field key={v.key} class="settings-item settings-variable"
                validate={() => {
                    if (v.required && !value[v.key]) {
                        return dataLocale.requiredField;
                    }
                }}>
                <label class="settings-item-title">
                    {locale.settings.variables[v.key]}
                    {v.required ? ' *' : ''}
                </label>
                <AscVarPicker
                    optional={!v.required}
                    previousNodes={previousNodes}
                    editing={editing}
                    value={value[v.key]}
                    onChange={x => onChange({ ...value, [v.key]: x })} />
            </Field>
        );
    }

    return (
        <div class="settings-variables settings-flag-options">
            <div class="settings-section-title">
                {locale.settings.variables.title}
            </div>
            {variables}
        </div>
    );
}

function findKnownVariables (previousNodes) {
    const knownVariables = new Set();
    for (const item of previousNodes) {
        if (item && item.defs) {
            for (const name in item.defs) {
                if (typeof name !== 'string' || name.startsWith('_')) continue;
                knownVariables.add(name);
            }
            for (const v of item.formVars) {
                if (!v.name || v.name.startsWith('@')) continue;
                const name = '@' + v.name;
                knownVariables.add(name);
            }
        }
    }
    return knownVariables;
}

function AscVarPicker ({ previousNodes, editing, value, onChange, optional, autoWidth }) {
    const knownVariables = findKnownVariables(previousNodes);
    const ascVariables = [];
    if (optional) {
        ascVariables.push({
            value: null,
            label: '—',
        });
    }
    for (const name of knownVariables) {
        ascVariables.push({
            value: name,
            label: <RefNameView class="form-editor-settings-var-ref" name={name} />,
        });
    }
    const varValue = knownVariables.has(value) ? value : null;
    return (
        <Select
            style={autoWidth ? null : { width: '100%' }}
            rendered
            disabled={!editing}
            emptyLabel={locale.settings.variables.noVariableSelected}
            outline
            items={ascVariables}
            value={varValue}
            onChange={onChange} />
    );
}
