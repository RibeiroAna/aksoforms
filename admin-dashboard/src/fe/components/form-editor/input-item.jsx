import { h } from 'preact';
import { memo, createRef, PureComponent, useEffect, useMemo, useRef, useState } from 'preact/compat';
import { Button, Checkbox, Slider, TextField } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import ResetIcon from '@material-ui/icons/RotateLeft';
import RearrangingList from '../lists/rearranging-list';
import DynamicHeightDiv from '../layout/dynamic-height-div';
import CountryPicker from '../pickers/country-picker';
import TimeZoneEditor from '../controls/time-zone';
import MdField from '../controls/md-field';
import Select from '../controls/select';
import TextArea from '../controls/text-area';
import { FormContext, ValidatedTextField } from '../form';
import { WithCountries } from '../data/country';
import { date, time, timestamp, currencyAmount } from '../data';
import { ScriptableValue, ScriptableBool } from './script-expr';
import { evalExpr, validateFormInput, validateFormInputBaseRequirements } from './model';
import { data as dataLocale, formEditor as locale, currencies } from '../../locale';
import './input-item.less';

function Label ({ children, required, ...props }) {
    return (
        <label class="form-input-label" {...props}>
            {children}
            {required ? <span class="required-star"> *</span> : ''}
        </label>
    );
}
const FIELD_DESCRIPTION_RULES = ['emphasis', 'strikethrough', 'link', 'list', 'table', 'image'];
function Desc ({ value }) {
    if (!value) return;
    return (
        <MdField class="input-description" value={value} rules={FIELD_DESCRIPTION_RULES} />
    );
}

// TODO: better rendering (show/respect more fields)
const TYPES = {
    boolean: {
        render: memo(({ disabled, editing, value, onChange }) => {
            return (
                <div class="form-input-boolean">
                    <Checkbox
                        checked={value}
                        onChange={onChange}
                        disabled={!editing || disabled} />
                </div>
            );
        }),
        settings: {},
    },
    number: {
        render: memo(({ disabled, editing, item, value, onChange, disableValidation }) => {
            const input = (
                <div class="number-input">
                    <TextField
                        outline
                        placeholder={item.placeholder}
                        disabled={!editing || disabled}
                        value={value}
                        onChange={value => {
                            if (value) onChange(+value);
                            else onChange(null);
                        }}
                        type="number"
                        step={disableValidation ? null : item.step}
                        min={disableValidation ? null : item.min}
                        max={disableValidation ? null : item.max} />
                </div>
            );
            if (item.variant === 'slider') {
                return (
                    <div class="form-input-number with-slider">
                        <div class="number-input-slider">
                            <Slider
                                disabled={disabled}
                                min={item.min}
                                max={item.max}
                                value={Number.isFinite(value) ? value : item.min}
                                onChange={value => {
                                    const step = item.step || 1;
                                    value = Math.round(value * step) / step;
                                    onChange(value);
                                }} />
                        </div>
                        {input}
                    </div>
                );
            } else {
                return (
                    <div class="form-input-number">
                        {input}
                    </div>
                );
            }
        }),
        settings: {
            placeholder: true,
            step: true,
            min: true,
            max: true,
            variant: ['input', 'slider'],
        },
    },
    text: {
        render: memo(({ disabled, editing, item, value, onChange, disableValidation }) => {
            let error = null;
            const compiledPattern = new RegExp(item.pattern);
            if (!compiledPattern.test(value)) {
                error = item.patternError;
            }

            let Component = TextField;
            let extra = null;
            let type = 'text';
            if (item.variant === 'textarea') {
                Component = TextArea;
                extra = <div class="form-input-text-error">{error}</div>;
            } else if (item.variant === 'email') {
                type = 'email';
            } else if (item.variant === 'tel') {
                type = 'tel';
            } else if (item.variant === 'uri') {
                type = 'url';
            }

            return (
                <div class="form-input-text">
                    <Component
                        outline
                        type={type}
                        disabled={!editing || disabled}
                        required={disableValidation ? null : item.required}
                        placeholder={item.placeholder}
                        value={value || ''}
                        pattern={disableValidation ? null : item.pattern}
                        minLength={disableValidation ? null : item.minLength}
                        maxLength={disableValidation ? null : item.maxLength}
                        onChange={v => onChange(v || null)}
                        error={error} />
                    {extra}
                </div>
            );
        }),
        settings: {
            placeholder: true,
            pattern: true,
            patternError: true,
            minLength: true,
            maxLength: true,
            variant: ['text', 'textarea', 'email', 'tel', 'uri'],
            chAutofill: ['birthdate', 'email', 'officePhone', 'cellphone', 'landlinePhone', 'phone', 'website', 'profession', 'name', 'honorific', 'firstName', 'lastName', 'address', 'feeCountry', 'country', 'countryArea', 'city', 'cityArea', 'streetAddress', 'postalCode', 'sortingCode'],
        },
    },
    money: {
        render: memo(({ disabled, item, editing, value, onChange, disableValidation }) => {
            return (
                <div class="form-input-money">
                    <currencyAmount.editor
                        outline
                        disabled={!editing || disabled}
                        min={disableValidation ? null : item.min}
                        max={disableValidation ? null : item.max}
                        step={disableValidation ? null : item.step}
                        value={value}
                        onChange={onChange}
                        currency={item.currency} />
                </div>
            );
        }),
        settings: {
            placeholder: true,
            step: 'money',
            min: true,
            max: true,
            currency: true,
        },
    },
    enum: {
        render: memo(({ disabled, editing, item, value, onChange, disableValidation }) => {
            let options = item.options.map(opt => ({
                value: opt.value,
                label: opt.name,
                disabled: disableValidation ? null : opt.disabled,
            }));

            let editor;
            if (item.variant === 'select') {
                if (!value || !item.required) options = [{ value: null, label: '—' }].concat(options);
                editor = (
                    <Select
                        outline
                        disabled={!editing || disabled}
                        value={value}
                        onChange={editing && onChange}
                        items={options} />
                );
            } else {
                const items = [];
                for (const opt of options) {
                    const inputId = `form-editor-enum-${item.name}->${opt.value}`;
                    // TODO: use MD radios
                    items.push(
                        <li key={opt.value}>
                            <input
                                type="radio"
                                disabled={!editing || disabled || opt.disabled}
                                checked={value === opt.value}
                                onChange={e => {
                                    if (e.target.checked) {
                                        onChange(opt.value);
                                    }
                                }}
                                id={inputId}
                                name={item.name}
                                value={opt.value} />
                            <label for={inputId}>
                                {opt.label}
                            </label>
                        </li>
                    );
                }
                editor = <ul class="form-input-radio-group">{items}</ul>;
            }

            return (
                <div class="form-input-enum">
                    {editor}
                </div>
            );
        }),
        settings: {
            options: true,
            variant: ['select', 'radio'],
        },
    },
    country: {
        render: memo(({ disabled, editing, value, onChange, item, disableValidation }) => {
            return (
                <WithCountries>
                    {countries => {
                        const options = [];
                        if (!item.required || !value) options.push({ value: '', label: '—' });

                        for (const c in countries) {
                            const country = countries[c];
                            if (!disableValidation && item.exclude && item.exclude.includes(country.code)) continue;
                            options.push({ value: country.code, label: `${country.name_eo} (${country.code})` });
                        }

                        return (
                            <Select
                                outline
                                disabled={!editing || disabled}
                                value={value || ''}
                                onChange={onChange}
                                items={options} />
                        );
                    }}
                </WithCountries>
            );
        }),
        settings: {
            exclude: true,
            chAutofill: ['country', 'feeCountry'],
        },
    },
    date: {
        render: memo(({ disabled, editing, value, onChange }) => {
            return (
                <div class="form-input-date">
                    <date.editor
                        outline
                        disabled={!editing || disabled}
                        value={value}
                        onChange={editing && onChange} />
                </div>
            );
        }),
        settings: {
            min: 'date',
            max: 'date',
            chAutofill: ['birthdate'],
        },
    },
    time: {
        render: memo(({ disabled, editing, value, onChange }) => {
            return (
                <div class="form-input-time">
                    <time.editor
                        outline
                        useFmtValue
                        disabled={!editing || disabled}
                        value={value}
                        onChange={editing && onChange} />
                </div>
            );
        }),
        settings: {
            min: 'time',
            max: 'time',
        },
    },
    datetime: {
        render: memo(({ disabled, editing, value, onChange }) => {
            return (
                <div class="form-input-datetime">
                    <timestamp.editor
                        outline
                        disabled={!editing || disabled}
                        value={value}
                        onChange={editing && onChange} />
                </div>
            );
        }),
        settings: {
            min: 'datetime',
            max: 'datetime',
            tz: true,
        },
    },
    boolean_table: {
        render: memo(({ disabled, editing, item, value, onChange, disableValidation }) => {
            const excludedCells = disableValidation ? []
                : (item.excludeCells || []).map(([x, y]) => `${x},${y}`);
            const resizeValue = (value, rows, cols) => {
                if (!value) value = [];
                else value = value.slice();
                while (value.length < rows) value.push([]);
                while (value.length > rows) value.pop();
                for (let y = 0; y < rows; y++) {
                    const row = value[y].slice();
                    while (row.length < cols) row.push(excludedCells.includes(`${row.length},${y}`) ? null : false);
                    while (row.length > cols) row.pop();
                    value[y] = row;
                }
                return value;
            };

            const rows = [];
            if (item.headerTop) {
                const headerRow = [];
                if (item.headerLeft) headerRow.push(<th key="x"></th>);
                for (let x = 0; x < item.cols; x++) {
                    headerRow.push(<th key={x}>{item.headerTop[x]}</th>);
                }
                rows.push(<tr key="header">{headerRow}</tr>);
            }
            for (let y = 0; y < item.rows; y++) {
                const row = [];
                if (item.headerLeft) {
                    row.push(<th key="x">{item.headerLeft[y]}</th>);
                }
                for (let x = 0; x < item.cols; x++) {
                    const isExcluded = excludedCells.includes(`${x},${y}`);
                    const cellValue = !isExcluded && value && value[y] && value[y][x];
                    const cellY = y;
                    const cellX = x;
                    const onCellChange = v => {
                        const newValue = resizeValue(value, item.rows, item.cols);
                        newValue[cellY][cellX] = v;
                        onChange(newValue);
                    };
                    row.push(
                        <td key={x}>
                            <Checkbox
                                disabled={!editing || disabled || isExcluded}
                                checked={cellValue}
                                onChange={onCellChange} />
                        </td>
                    );
                }
                rows.push(<tr key={y}>{row}</tr>);
            }

            return (
                <div class="form-input-boolean-table">
                    <table>
                        <tbody>
                            {rows}
                        </tbody>
                    </table>
                </div>
            );
        }),
        settings: {
            booleanTable: true,
            cols: true,
            rows: true,
            minSelect: true,
            maxSelect: true,
            headerTop: true,
            headerLeft: true,
            excludeCells: true,
        },
    },
};

export default class InputItem extends PureComponent {
    static contextType = FormContext;
    node = createRef();

    state = {
        error: null,
        didInteract: false,
    };

    oldName = null;

    inputProxy = {
        validate: (...args) => this.validateTestInput(...args),
    };

    componentDidMount () {
        this.oldName = this.props.item.name || null;

        if (this.props.isEditingContext) {
            if (this.props.registerTestInput) this.props.registerTestInput(this.inputProxy);
            this.context.register(this);
        } else if (this.context) {
            this.context.deregister(this);
        }
        this.setDefaultIfNone();
    }

    setDefault () {
        this.props.onValueChange && this.props.onValueChange(this.resolveValues().default);
    }

    setDefaultIfNone () {
        if (this.props.onValueChange && this.props.value === undefined) {
            // FIXME: why does this need a delay?
            requestAnimationFrame(() => this.setDefault());
        }
    }

    componentDidUpdate (prevProps) {
        if (this.props.editing && prevProps.editing !== this.props.editing) {
            this.setState({ error: null });
        }
    }

    componentWillUnmount () {
        if (this.props.isEditingContext) {
            if (this.props.deregisterTestInput) this.props.deregisterTestInput(this.inputProxy);
            this.context.deregister(this);
        } else if (this.context) {
            this.context.deregister();
        }
    }

    validate () {
        this.setState({ error: null });
        if (!this.props.isEditingContext) {
            return true;
        }
        const type = this.props.item.type;
        const settings = TYPES[type]?.settings;
        if (!settings) return true;
        for (const k of DEFAULT_SETTINGS.concat(Object.keys(settings))) {
            const setting = SETTINGS[k];
            if (setting?.validate) {
                const error = setting.validate({
                    value: this.props.item[k],
                    item: this.props.item,
                });
                if (error) {
                    this.setState({ error });
                    // error :(
                    return false;
                }
            }
        }
        return true;
    }

    validateTestInput (submitting) {
        if (!this.props.editingData) {
            this.setState({ error: null });
            return true;
        }
        let error = validateFormInputBaseRequirements(this.props.item, this.props.previousNodes, this.props.value);
        if (!error && this.props.disableValidation) {
            this.setState({ error: null });
            return true;
        }
        if (!error) {
            error = validateFormInput(this.props.item, this.props.previousNodes, this.props.value);
        }
        if (!error) {
            this.setState({ error: null });
        } else if (submitting || this.state.didInteract) {
            this.setState({ error, didInteract: true }, () => {
                this.node.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }
        return error;
    }

    /** Evaluates any AKSO Script exprs in the item value. */
    resolveValues () {
        // TODO: cache?
        const item = this.props.item;

        // only these properties can be AKSO Script expressions
        const props = ['default', 'required', 'disabled'];
        const resolved = {};
        for (const prop of props) {
            if (item[prop] && typeof item[prop] === 'object') {
                // this is an AKSO Script expression (probably)
                resolved[prop] = evalExpr(item[prop], this.props.previousNodes);
            } else {
                resolved[prop] = item[prop];
            }
        }
        return resolved;
    }

    render ({
        editing,
        onStopEditing,
        item,
        onChange,
        value,
        onValueChange,
        previousNodes,
        editingData,
        isEditingContext,
        disableValidation,
        hasValues,
    }) {
        let contents;
        if (editing) {
            contents = (
                <InputSettings
                    editing={editing}
                    onStopEditing={onStopEditing}
                    key="settings"
                    oldName={this.oldName}
                    item={item}
                    onChange={onChange}
                    scriptCtx={{ previousNodes }} />
            );
        } else {
            const resolved = this.resolveValues();
            const Renderer = TYPES[item.type].render;
            const rendered = (
                <Renderer
                    required={resolved.required}
                    disabled={resolved.disabled}
                    default={resolved.default}
                    editing={editingData}
                    item={item}
                    value={value}
                    onChange={onValueChange}
                    disableValidation={disableValidation} />
            );

            contents = (
                <div class="input-rendered-container" key="input-rendered">
                    <div class="input-rendered">
                        <div class="input-details">
                            <Label required={resolved.required}>{item.label}</Label>
                            <Desc value={item.description} />
                        </div>
                        {isEditingContext && (
                            <div class="input-preview-label">
                                {locale.inputPreview}
                            </div>
                        )}
                        {isEditingContext ? (
                            <TestFormProxy
                                registerTestInput={this.props.registerTestInput}
                                deregisterTestInput={this.props.deregisterTestInput}>
                                {rendered}
                            </TestFormProxy>
                        ) : (
                            rendered
                        )}
                        {this.state.error && (
                            <InputError>
                                {this.state.error}
                            </InputError>
                        )}
                    </div>
                    {this.props.isEditingContext && (
                        <InputSettingsState
                            item={item}
                            resolved={resolved}
                            showResolved={hasValues}
                            scriptCtx={{ previousNodes }}
                            onReset={e => {
                                e.preventDefault();
                                this.setDefault();
                            }} />
                    )}
                </div>
            );
        }

        return (
            <div class="form-editor-input-item" ref={this.node}>
                {contents}
            </div>
        );
    }
}

class TestFormProxy extends PureComponent {
    formNode = createRef();

    componentDidMount () {
        this.props.registerTestInput(this);
    }
    componentWillUnmount () {
        this.props.deregisterTestInput(this);
    }

    validate (submitting) {
        let valid;
        if (submitting) valid = this.formNode.current.reportValidity();
        else valid = this.formNode.current.checkValidity();
        if (!valid) return true; // there's an error but we don't know what
    }

    register (input) {
        this.props.registerTestInput(input);
    }
    deregister (input) {
        this.props.deregisterTestInput(input);
    }

    render ({ children }) {
        return (
            <FormContext.Provider value={{
                register: this.register,
                deregister: this.deregister,
            }}>
                <form class="test-input-form" ref={this.formNode} onSubmit={e => {
                    e.preventDefault();
                }}>
                    {children}
                </form>
            </FormContext.Provider>
        );
    }
}

/** Just shows an error string. Scrolls itself into view when mounted in the DOM. */
class InputError extends PureComponent {
    node = createRef();

    componentDidMount () {
        this.node.current.scrollIntoView({ behavior: 'smooth' });
    }

    render ({ children }) {
        return <div class="input-error" ref={this.node}>{children}</div>;
    }
}

const DEFAULT_SETTINGS = [
    'name',
    'oldName',
    'label',
    'description',
    'default',
    'required',
    'disabled',
    'hideIfDisabled',
    'editable',
];

function InputSettings ({ item, onChange, scriptCtx, oldName }) {
    const type = TYPES[item.type];
    if (!type) return null;

    const controls = [];
    for (const k of DEFAULT_SETTINGS.concat(Object.keys(type.settings))) {
        controls.push(
            <InputSetting
                key={k}
                oldName={oldName}
                scriptCtx={scriptCtx}
                setting={k}
                options={type.settings[k]}
                item={item}
                onItemChange={onChange}
                value={item[k]}
                onChange={v => onChange({ ...item, [k]: v })}/>
        );
    }

    return (
        <div class="form-editor-input-settings">
            {controls}
        </div>
    );
}

const NAME_PATTERN = '^[\\w\\-:ĥŝĝĉĵŭĤŜĜĈĴŬ]+$';
const NAME_REGEX = new RegExp(NAME_PATTERN);

function Setting ({ label, stack, desc, children }) {
    let description = null;
    if (desc) {
        description = <div class="setting-description">{desc}</div>;
    }

    let className = 'form-editor-setting';
    if (stack) className += ' is-stack';

    if (!label) {
        return (
            <div class={className}>
                <div class="form-editor-setting-inner">
                    {children}
                </div>
                {description}
            </div>
        );
    }
    return (
        <div class={className + ' is-labeled'}>
            <div class="form-editor-setting-inner">
                <label class="form-editor-setting-label">{label}</label>
                {children}
            </div>
            {description}
        </div>
    );
}

const WANTS_ITEM = new WeakSet();
const wantsItem = component => {
    WANTS_ITEM.add(component);
    return component;
};

const SETTINGS = {
    name: {
        component: wantsItem(memo(({ value, item, onItemChange, oldName }) => {
            let helperLabel = null;
            if (oldName && oldName !== value) {
                helperLabel = `${locale.inputFields.oldName}: ${oldName}`;
            }

            return (
                <Setting label={locale.inputFields.name} desc={locale.inputFields.nameDesc}>
                    <ValidatedTextField
                        class="wider-text-field"
                        required
                        outline
                        value={value}
                        pattern={NAME_PATTERN}
                        helperLabel={helperLabel}
                        validate={value => {
                            if (!NAME_REGEX.test(value)) return locale.inputFields.namePatternError;
                        }}
                        maxLength={20}
                        onChange={name => {
                            const newItem = { ...item, name };
                            if (oldName) newItem.oldName = oldName;
                            onItemChange(newItem);
                        }} />
                </Setting>
            );
        })),
        validate: ({ value }) => {
            if (!value.match(NAME_PATTERN)) return locale.inputFields.namePatternError;
            return null;
        }
    },
    label: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.label} desc={locale.inputFields.labelDesc}>
                    <TextField
                        class="wider-text-field"
                        required
                        outline
                        value={value}
                        onChange={onChange} />
                </Setting>
            );
        }),
        validate: ({ value }) => {
            if (!value) return locale.inputFields.required;
            return null;
        },
    },
    description: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting stack label={locale.inputFields.description}>
                    <MdField
                        class="input-description-field"
                        value={value || ''}
                        onChange={v => onChange(v || null)}
                        editing
                        rules={FIELD_DESCRIPTION_RULES} />
                </Setting>
            );
        }),
    },
    default: {
        component: memo(({ value, onChange, scriptCtx }) => {
            return (
                <Setting label={locale.inputFields.default}>
                    <ScriptableValue
                        ctx={scriptCtx}
                        value={value}
                        onChange={onChange} />
                </Setting>
            );
        }),
    },
    required: {
        component: memo(({ value, onChange, scriptCtx }) => {
            return (
                <Setting label={locale.inputFields.required}>
                    <ScriptableBool
                        ctx={scriptCtx}
                        value={value}
                        onChange={onChange} />
                </Setting>
            );
        }),
    },
    disabled: {
        component: memo(({ value, onChange, scriptCtx }) => {
            return (
                <Setting label={locale.inputFields.disabled}>
                    <ScriptableBool
                        ctx={scriptCtx}
                        value={value}
                        onChange={onChange} />
                </Setting>
            );
        }),
    },
    hideIfDisabled: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.hideIfDisabled}>
                    <Checkbox
                        checked={value}
                        onChange={onChange} />
                </Setting>
            );
        }),
    },
    editable: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.editable} desc={locale.inputFields.editableDesc}>
                    <Checkbox
                        checked={value}
                        onChange={onChange} />
                </Setting>
            );
        }),
    },

    placeholder: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.placeholder}>
                    <TextField
                        outline
                        value={value || ''}
                        maxLength={50}
                        onChange={v => onChange(v || null)} />
                </Setting>
            );
        }),
    },
    step: {
        component: memo(({ value, onChange, options }) => {
            return (
                <Setting label={locale.inputFields.step}>
                    <TextField
                        outline
                        placeholder={locale.inputFields.stepEmpty}
                        type="number"
                        value={value || ''}
                        step={options === 'money' ? '1' : '0.000000000000001'}
                        min={options === 'money' ? '1' : '0'}
                        onChange={v => onChange(+v || null)} />
                </Setting>
            );
        }),
    },
    min: {
        component: wantsItem(memo(({ value, onChange, item, options }) => {
            let editor;
            if (options === 'date') {
                editor = (
                    <date.editor
                        outline
                        placeholder={locale.inputFields.minEmpty}
                        value={value || null}
                        onChange={v => onChange(v || null)}/>
                );
            } else if (options === 'time') {
                editor = (
                    <time.editor
                        outline nullable
                        placeholder={locale.inputFields.minEmpty}
                        value={value}
                        onChange={onChange} />
                );
            } else if (options === 'datetime') {
                editor = (
                    <timestamp.editor
                        outline
                        placeholder={locale.inputFields.minEmpty}
                        value={value || null}
                        onChange={onChange} />
                );
            } else {
                editor = (
                    <TextField
                        outline
                        placeholder={locale.inputFields.minEmpty}
                        required={item.variant === 'slider'}
                        error={(item.variant === 'slider' && !Number.isFinite(value)) && dataLocale.requiredField}
                        type="number"
                        value={Number.isFinite(value) ? value : ''}
                        step={item.step}
                        max={item.max}
                        onChange={v => Number.isFinite(parseFloat(v)) ? onChange(parseFloat(v)) : onChange(null)} />
                );
            }

            return (
                <Setting label={locale.inputFields.min}>
                    {editor}
                </Setting>
            );
        })),
    },
    max: {
        component: wantsItem(memo(({ value, onChange, item, options }) => {
            let editor;
            if (options === 'date') {
                editor = (
                    <date.editor
                        outline
                        placeholder={locale.inputFields.maxEmpty}
                        value={value || null}
                        onChange={v => onChange(v || null)}/>
                );
            } else if (options === 'time') {
                editor = (
                    <time.editor
                        outline nullable
                        placeholder={locale.inputFields.minEmpty}
                        value={value}
                        onChange={onChange} />
                );
            } else if (options === 'datetime') {
                editor = (
                    <timestamp.editor
                        outline
                        placeholder={locale.inputFields.maxEmpty}
                        value={value || null}
                        onChange={onChange} />
                );
            } else {
                editor = (
                    <TextField
                        outline
                        placeholder={locale.inputFields.maxEmpty}
                        required={item.variant === 'slider'}
                        error={(item.variant === 'slider' && !Number.isFinite(value)) && dataLocale.requiredField}
                        type="number"
                        value={Number.isFinite(value) ? value : ''}
                        step={item.step}
                        min={item.min}
                        onChange={v => Number.isFinite(parseFloat(v)) ? onChange(parseFloat(v)) : onChange(null)} />
                );
            }
            return (
                <Setting label={locale.inputFields.max}>
                    {editor}
                </Setting>
            );
        })),
    },
    variant: {
        component: memo(({ value, onChange, options }) => {
            return (
                <Setting label={locale.inputFields.variant}>
                    <Select
                        outline
                        value={value}
                        onChange={onChange}
                        items={options.map(option => ({
                            value: option,
                            label: locale.inputFields.variants[option],
                        }))} />
                </Setting>
            );
        }),
    },
    pattern: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.pattern}>
                    <TextField
                        outline
                        value={value || ''}
                        onChange={v => onChange(v || null)} />
                </Setting>
            );
        }),
    },
    patternError: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.patternError}>
                    <TextField
                        outline
                        value={value || ''}
                        onChange={v => onChange(v || null)} />
                </Setting>
            );
        }),
    },
    minLength: {
        component: wantsItem(memo(({ value, onChange, item }) => {
            return (
                <Setting label={locale.inputFields.minLength}>
                    <TextField
                        outline
                        placeholder={locale.inputFields.minLengthEmpty}
                        type="number"
                        value={value || ''}
                        min={0}
                        max={item.maxLength}
                        onChange={v => onChange(+v || null)} />
                </Setting>
            );
        })),
    },
    maxLength: {
        component: wantsItem(memo(({ value, onChange, item }) => {
            return (
                <Setting label={locale.inputFields.maxLength}>
                    <TextField
                        outline
                        placeholder={locale.inputFields.maxLengthEmpty}
                        type="number"
                        value={value || ''}
                        min={item.minLength || 0}
                        onChange={v => onChange(+v || null)} />
                </Setting>
            );
        })),
    },
    chAutofill: {
        component: memo(({ value, onChange, options }) => {
            return (
                <Setting label={locale.inputFields.chAutofill}>
                    <Select
                        outline
                        value={value || ''}
                        onChange={v => onChange(v || null)}
                        items={[{ value: '', label: '—' }].concat(options.map(option => ({
                            value: option,
                            label: locale.inputFields.chAutofillFields[option],
                        })))} />
                    <div class="ch-autofill-description">
                        {locale.inputFields.chAutofillDesc}
                    </div>
                </Setting>
            );
        }),
    },
    currency: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.currency}>
                    <Select
                        outline
                        value={value}
                        onChange={v => onChange(v || null)}
                        items={Object.keys(currencies).map(currency => ({
                            value: currency,
                            label: currencies[currency],
                        }))} />
                </Setting>
            );
        }),
    },
    options: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting stack label={locale.inputFields.options}>
                    <OptionsEditor value={value} onChange={onChange} />
                </Setting>
            );
        }),
        validate: ({ value }) => {
            for (const opt of value) {
                if (!opt.name) return dataLocale.requiredField;
                if (!opt.value) return dataLocale.requiredField;
            }
        },
    },
    exclude: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting stack label={locale.inputFields.exclude}>
                    <CountryPicker value={value} onChange={onChange} hideGroups />
                </Setting>
            );
        }),
    },
    tz: {
        component: memo(({ value, onChange }) => {
            return (
                <Setting label={locale.inputFields.tz}>
                    <TimeZoneEditor value={value} onChange={onChange} editing />
                </Setting>
            );
        }),
    },
    booleanTable: {
        component: wantsItem(memo(({ item, onItemChange }) => {
            const resizeHeader = (header, size) => {
                if (!header || header.length === size) return header;
                if (header.length > size) return header.slice(0, size);
                return header.concat([...new Array(size - header.length)].map(() => ''));
            };

            const resizeItem = (rows, cols) => {
                const headerTop = resizeHeader(item.headerTop, cols);
                const headerLeft = resizeHeader(item.headerLeft, rows);
                let excludeCells = null;
                if (item.excludeCells) {
                    excludeCells = [];
                    for (const cell of item.excludeCells) {
                        if (cell[0] < cols && cell[1] < rows) excludeCells.push(cell);
                    }
                }

                const nullIfZero = n => n === 0 ? null : n;

                return {
                    ...item,
                    rows,
                    cols,
                    minSelect: nullIfZero(Math.max(0, Math.min(item.minSelect, rows * cols))),
                    maxSelect: nullIfZero(Math.max(0, Math.min(item.maxSelect, rows * cols))),
                    headerTop,
                    headerLeft,
                    excludeCells,
                };
            };

            const setRows = v => onItemChange(resizeItem(v, item.cols));
            const setCols = v => onItemChange(resizeItem(item.rows, v));
            const setMinSelect = v => onItemChange({ ...item, minSelect: v });
            const setMaxSelect = v => onItemChange({ ...item, maxSelect: v });

            const enableHeaderTop = enabled => {
                if (enabled) {
                    onItemChange({ ...item, headerTop: [...new Array(item.cols)].map(() => null) });
                } else onItemChange({ ...item, headerTop: null });
            };
            const enableHeaderLeft = enabled => {
                if (enabled) {
                    onItemChange({ ...item, headerLeft: [...new Array(item.rows)].map(() => null) });
                } else onItemChange({ ...item, headerLeft: null });
            };

            const headerTopItems = [];
            const headerLeftItems = [];

            if (item.headerTop) {
                for (let i = 0; i < item.headerTop.length; i++) {
                    const index = i;
                    headerTopItems.push(
                        <div key={index} class="boolean-table-header-item">
                            <TextField
                                value={item.headerTop[i] || ''}
                                maxLength={20}
                                onChange={v => {
                                    const headerTop = item.headerTop.slice();
                                    headerTop[index] = v || null;
                                    onItemChange({ ...item, headerTop });
                                }} />
                        </div>
                    );
                }
            }
            if (item.headerLeft) {
                for (let i = 0; i < item.headerLeft.length; i++) {
                    const index = i;
                    headerLeftItems.push(
                        <div key={index} class="boolean-table-header-item">
                            <TextField
                                value={item.headerLeft[i] || ''}
                                maxLength={20}
                                onChange={v => {
                                    const headerLeft = item.headerLeft.slice();
                                    headerLeft[index] = v || null;
                                    onItemChange({ ...item, headerLeft });
                                }} />
                        </div>
                    );
                }
            }

            const excludedCells = item.excludeCells
                ? item.excludeCells.map(([x, y]) => `${x},${y}`)
                : [];
            const excludeCellsRows = [];
            for (let y = 0; y < item.rows; y++) {
                const row = [];
                for (let x = 0; x < item.cols; x++) {
                    const pos = [x, y];
                    const isExcluded = excludedCells.includes(`${x},${y}`);
                    const setExcluded = () => {
                        if (isExcluded) {
                            const i = excludedCells.indexOf(`${pos[0]},${pos[1]}`);
                            const excludeCells = item.excludeCells.slice();
                            excludeCells.splice(i, 1);
                            onItemChange({ ...item, excludeCells });
                        } else {
                            const excludeCells = item.excludeCells ? item.excludeCells.slice() : [];
                            excludeCells.push(pos);
                            onItemChange({ ...item, excludeCells });
                        }
                    };
                    row.push(
                        <td key={x}>
                            <Checkbox
                                checked={isExcluded}
                                onChange={setExcluded} />
                        </td>
                    );
                }
                excludeCellsRows.push(<tr key={y}>{row}</tr>);
            }
            const excludeCells = (
                <table>
                    <tbody>
                        {excludeCellsRows}
                    </tbody>
                </table>
            );

            return (
                <div>
                    <Setting label={locale.inputFields.rows}>
                        <TextField
                            type="number"
                            outline
                            value={item.rows | 0}
                            max={20}
                            onChange={v => setRows(+v | 0)} />
                    </Setting>
                    <Setting label={locale.inputFields.cols}>
                        <TextField
                            type="number"
                            outline
                            value={item.cols | 0}
                            max={20}
                            onChange={v => setCols(+v | 0)} />
                    </Setting>
                    <Setting label={locale.inputFields.minSelect}>
                        <TextField
                            type="number"
                            placeholder={locale.inputFields.minSelectEmpty}
                            outline
                            min={0}
                            max={item.maxSelect || (item.rows * item.cols)}
                            value={item.minSelect || ''}
                            onChange={v => setMinSelect(+v || null)} />
                    </Setting>
                    <Setting label={locale.inputFields.maxSelect}>
                        <TextField
                            type="number"
                            placeholder={locale.inputFields.maxSelectEmpty}
                            outline
                            min={item.minSelect | 0}
                            max={item.rows * item.cols}
                            value={item.maxSelect || ''}
                            onChange={v => setMaxSelect(+v || null)} />
                    </Setting>
                    <Setting label={locale.inputFields.headerTop}>
                        <Checkbox
                            checked={!!item.headerTop}
                            onChange={enableHeaderTop} />
                    </Setting>
                    <DynamicHeightDiv useFirstHeight>
                        {headerTopItems}
                    </DynamicHeightDiv>
                    <Setting label={locale.inputFields.headerLeft}>
                        <Checkbox
                            checked={!!item.headerLeft}
                            onChange={enableHeaderLeft} />
                    </Setting>
                    <DynamicHeightDiv useFirstHeight>
                        {headerLeftItems}
                    </DynamicHeightDiv>
                    <Setting stack label={locale.inputFields.excludeCells}>
                        {excludeCells}
                    </Setting>
                </div>
            );
        })),
    },
};

function InputSetting ({ setting, item, onItemChange, onChange, ...extra }) {
    const Renderer = SETTINGS[setting]?.component;
    if (!Renderer) return null;

    // PERFORMANCE: passing item data defeats memo change detection!
    // so we only pass item to settings that actually want it.
    // this fixes terrible performance issues.
    const settingWantsItem = WANTS_ITEM.has(Renderer);
    const pItem = settingWantsItem ? item : null;
    const pOnItemChange = settingWantsItem ? onItemChange : null;

    const outerOnChange = useRef(onChange);
    useEffect(() => {
        outerOnChange.current = onChange;
    }, [onChange]);

    // memoize onchange so it doesnt trigger a render
    const innerOnChange = useMemo(() => (...args) => {
        outerOnChange.current(...args);
    }, []);

    return <Renderer
        onChange={innerOnChange}
        item={pItem}
        onItemChange={pOnItemChange}
        {...extra} />;
}

class OptionsEditor extends PureComponent {
    addOption = () => {
        const value = this.props.value.slice();
        const item = {
            value: '',
            name: '',
            disabled: false,
        };
        value.push(item);
        this.props.onChange(value);
    };
    onMove = (fromPos, toPos) => {
        const value = this.props.value.slice();
        value.splice(toPos, 0, value.splice(fromPos, 1)[0]);
        this.props.onChange(value);
    };
    removeOption = opt => {
        if (this.props.value.length === 1) {
            this.props.onChange([
                { value: '', name: '', disabled: false },
            ]);
        } else {
            const value = this.props.value.slice();
            value.splice(value.indexOf(opt), 1);
            this.props.onChange(value);
        }
    };
    changeOption = (opt, newOpt) => {
        const value = this.props.value.slice();
        value[value.indexOf(opt)] = newOpt;
        this.optIds.set(newOpt, this.getOptId(opt));
        this.props.onChange(value);
    };

    optIds = new WeakMap();

    getOptId (opt) {
        if (!this.optIds.has(opt)) {
            this.optIds.set(opt, Math.random().toString(36));
        }
        return this.optIds.get(opt);
    }

    render ({ value }) {
        const items = [];
        for (const opt of value) {
            const optId = this.getOptId(opt);
            items.push(
                <OptionsEditorItem
                    key={optId}
                    onRemove={() => this.removeOption(opt)}
                    value={opt}
                    onChange={newOpt => this.changeOption(opt, newOpt)} />
            );
        }

        if (items.length < 256) {
            items.push(
                <div class="options-add-item" key="add-item">
                    <Button icon small onClick={() => this.addOption()}>
                        <AddIcon style={{ verticalAlign: 'middle' }} />
                    </Button>
                </div>
            );
        }

        return (
            <RearrangingList
                isItemDraggable={pos => pos < value.length}
                canMove={pos => pos < value.length}
                onMove={this.onMove}>
                {items}
            </RearrangingList>
        );
    }
}

function OptionsEditorItem ({ onRemove, value, onChange }) {
    return (
        <div class="options-item">
            <Button icon small onClick={onRemove}>
                <RemoveIcon style={{ verticalAlign: 'middle' }} />
            </Button>
            <TextField
                outline
                label={locale.inputFields.optionsName}
                required
                value={value.name}
                minlength={1}
                maxLength={50}
                onChange={v => onChange({ ...value, name: v })} />
            <TextField
                outline
                label={locale.inputFields.optionsValue}
                required
                error={!value.value && dataLocale.requiredField}
                value={value.value}
                minLength={1}
                maxLength={255}
                onChange={v => onChange({ ...value, value: v })} />
            <Select
                value={value.disabled.toString()}
                onChange={disabled => onChange({
                    ...value,
                    disabled: disabled === 'true' ? true : disabled === 'false' ? false : disabled,
                })}
                items={['true', 'onlyExisting', 'false'].map(k => ({
                    value: k,
                    label: locale.inputFields.optionsDisabled[k],
                }))} />
            {value.disabled === 'onlyExisting' ? (
                <div class="option-description">
                    {locale.inputFields.optionsOnlyExisting}
                </div>
            ) : null}
        </div>
    );
}

function InputSettingsState ({ item, resolved, scriptCtx, onReset, showResolved }) {
    return (
        <div class="input-settings-state">
            <ScriptValueState
                isDefault={{ reset: onReset }}
                label={locale.inputFields.default}
                value={item.default}
                resolved={resolved.default}
                showResolved={showResolved}
                scriptCtx={scriptCtx} />
            <ScriptValueState
                hideIfNotComputed // redundant with required * in label
                label={locale.inputFields.required}
                value={item.required}
                resolved={resolved.required}
                showResolved={showResolved}
                scriptCtx={scriptCtx} />
            <ScriptValueState
                hideIfDisabled={item.hideIfDisabled}
                label={locale.inputFields.disabled}
                value={item.disabled}
                resolved={resolved.disabled}
                showResolved={showResolved}
                scriptCtx={scriptCtx} />
            <MinMaxStepState item={item} />
        </div>
    );
}

function ScriptValueState ({ label, value, isDefault, hideIfDisabled, hideIfNotComputed, scriptCtx, resolved, showResolved }) {
    let contents = null;
    let isComputed = false;
    let defaultReset = null;
    let disabledHidden = null;

    if (isDefault) {
        defaultReset = (
            <Button class="default-reset" icon small onClick={isDefault.reset}>
                <ResetIcon />
            </Button>
        );
    }
    if (hideIfDisabled) {
        disabledHidden = <div>{locale.inputFields.hiddenIfDisabled}</div>;
    }

    if (value && typeof value === 'object') {
        contents = (
            <div class="script-value-computed">
                <div class="inner-expr">
                    <ScriptableValue
                        disabled
                        ctx={scriptCtx}
                        value={value} />
                </div>
                {showResolved ? (
                    <div class="expr-result">
                        <div class="er-pointer"></div>
                        <ScriptableValue
                            disabled
                            ctx={scriptCtx}
                            value={resolved} />
                    </div>
                ) : null}
            </div>
        );
        isComputed = true;
    } else if (isDefault) {
        contents = (
            <div class="script-value-default">
                <ScriptableValue
                    disabled
                    ctx={scriptCtx}
                    value={value} />
            </div>
        );
    } else if (typeof value === 'boolean') {
        if (value) contents = <CheckBoxIcon style={{ verticalAlign: 'middle' }} />;
        else contents = <CheckBoxOutlineBlankIcon style={{ verticalAlign: 'middle' }} />;
    } else {
        // TODO
        contents = '?';
    }

    if (hideIfNotComputed && !isComputed) return null;

    return (
        <div class="setting-state">
            <div class="value-label">{label}</div>
            <div class="value-contents">
                {contents}
                {disabledHidden}
            </div>
            {defaultReset}
        </div>
    );
}

function MinMaxStepState ({ item }) {
    const hasMinMax = Number.isFinite(item.min) || Number.isFinite(item.max);
    const hasStep = Number.isFinite(item.step);
    if (!hasMinMax && !hasStep) return null;

    return (
        <div class="setting-state">
            {hasMinMax && <div class="value-label">{locale.inputFields.minMaxRange}</div>}
            {hasMinMax && <div class="value-contents">{item.min}–{item.max}</div>}
            {hasStep && <div class="value-label">{locale.inputFields.step}</div>}
            {hasStep && <div class="value-contents">{item.step}</div>}
        </div>
    );
}
