import { h } from 'preact';
import { PureComponent, useState } from 'preact/compat';
import { Button, Checkbox, TextField } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import Segmented from '../controls/segmented';
import Select from '../controls/select';
import NumberField from '../controls/number-field';
import { formEditor as locale } from '../../locale';
import './custom-form-vars.less';

const VAR_PREFIX = '@@v_';

export default class CustomFormVars extends PureComponent {
    #itemKeys = new Map();
    #newVars = new WeakSet();

    /**
     * >> which item is which?
     * we keep track of items using random ids so when rearranging we can assign the correct
     * key again
     */
    getItemKey (name) {
        if (!this.#itemKeys.has(name)) this.#itemKeys.set(name, Math.random().toString(36));
        return this.#itemKeys.get(name);
    }

    renameItem (oldName, newName) {
        if (newName === oldName) return;
        this.#itemKeys.set(newName, this.#itemKeys.get(oldName));
        this.#itemKeys.delete(oldName);

        const vars = { ...this.props.vars };
        vars[newName] = { ...vars[oldName] };

        if (this.#newVars.has(vars[oldName])) {
            this.#newVars.add(vars[newName]);
        }

        if (!vars[newName].oldName && !this.#newVars.has(vars[newName])) {
            vars[newName].oldName = oldName;
        }
        delete vars[oldName];
        this.props.onVarsChange(vars);
    }

    removeItem (name) {
        this.#itemKeys.delete(name);

        const vars = { ...this.props.vars };
        delete vars[name];

        this.props.onVarsChange(vars);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.editing !== this.props.editing) {
            // don't retain knowledge of new variables across edits
            if (!this.props.editing) {
                this.#newVars = new WeakSet();
            }
        }
    }

    render ({ editing, vars, onVarsChange }) {
        const listItems = [];

        for (const k in vars) {
            const item = vars[k];
            const key = this.getItemKey(k);

            listItems.push(
                <CustomFormVar
                    key={key}
                    name={k}
                    onRename={newName => this.renameItem(k, newName)}
                    editing={editing}
                    value={item}
                    onChange={item => {
                        const newVars = { ...vars };
                        newVars[k] = item;
                        onVarsChange(newVars);
                    }}
                    onRemove={() => this.removeItem(k)} />
            );
        }

        if (!editing && !listItems.length) return null;

        if (editing) {
            listItems.push(
                <AddVar key="~add" onAdd={name => {
                    const newVar = {
                        type: 'text',
                        default: null,
                    };
                    this.#newVars.add(newVar);
                    onVarsChange({ ...vars, [VAR_PREFIX + name]: newVar });
                }} />
            );
        }

        return (
            <div class="custom-form-vars">
                <div class="inner-title">
                    {locale.customFormVars.title}
                </div>
                {listItems}
            </div>
        );
    }
}

function CustomFormVar ({ editing, name, onRename, value, onChange, onRemove }) {
    if (!editing) {
        let defaultValue = null;
        if (value.default !== null) {
            if (value.type === 'boolean') defaultValue = locale.customFormVars.bool[value];
            else defaultValue = value.default.toString();
        }

        return (
            <div class="custom-form-var">
                <div class="item-header">
                    <div class="item-name">
                        {name}
                    </div>
                    <div class="item-type">
                        {locale.customFormVars.types[value.type]}
                    </div>
                </div>
                {value.default === null ? (
                    <div class="item-default is-none">
                        {locale.customFormVars.emptyDefault}
                    </div>
                ) : (
                    <div class="item-default">
                        {locale.customFormVars.defaultValue}:
                        {' '}
                        {defaultValue}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div class={'custom-form-var' + (editing ? ' is-editing' : '')}>
            <div class="item-header">
                <Button icon small onClick={onRemove}>
                    <RemoveIcon />
                </Button>
                <NameTextField
                    value={name}
                    onChange={onRename} />
                <Select
                    value={value.type}
                    onChange={type => {
                        if (type === value.type) return;
                        onChange({ ...value, type, default: null });
                    }}
                    items={[
                        { value: 'boolean', label: locale.customFormVars.types.boolean },
                        { value: 'number', label: locale.customFormVars.types.number },
                        { value: 'text', label: locale.customFormVars.types.text },
                    ]} />
            </div>
            <DefaultValue
                type={value.type}
                value={value.default}
                onChange={v => onChange({ ...value, default: v })} />
        </div>
    );
}

const nameFieldOnKeyDown = e => {
    const re = /[\w\-:ĥŝĝĉĵŭ]/;
    if (e.key.length === 1 && !re.test(e.key)) e.preventDefault();
};

function NameTextField ({ value, onChange }) {
    const [editingValue, setEditingValue] = useState(null);
    value = value.substring(VAR_PREFIX.length);

    return (
        <TextField
            outline
            leading={VAR_PREFIX}
            maxLength={18}
            value={editingValue !== null ? editingValue : value}
            onChange={setEditingValue}
            onFocus={() => {
                setEditingValue(value);
            }}
            onKeyDown={e => {
                nameFieldOnKeyDown(e);
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            }}
            onBlur={() => {
                onChange(VAR_PREFIX + editingValue);
                setEditingValue(null);
            }} />
    );
}

function DefaultValue ({ type, value, onChange }) {
    let editor = null;

    if (value !== null && type === 'boolean') {
        editor = (
            <Segmented
                selected={value ? 'true' : 'false'}
                onSelect={newValue => onChange(newValue === 'true')}>
                {[
                    { id: 'false', label: locale.customFormVars.bool.false },
                    { id: 'true', label: locale.customFormVars.bool.true },
                ]}
            </Segmented>
        );
    } else if (value !== null && type === 'number') {
        editor = (
            <NumberField
                outline
                value={value}
                onChange={onChange} />
        );
    } else if (value !== null && type === 'text') {
        editor = (
            <TextField
                outline
                value={value}
                onChange={onChange} />
        );
    }

    const checkboxId = Math.random().toString(36);

    return (
        <div class="item-default">
            <div class="default-enable">
                <Checkbox
                    id={checkboxId}
                    checked={value !== null}
                    onChange={enabled => {
                        if (enabled) {
                            if (type === 'boolean') onChange(false);
                            else if (type === 'number') onChange(0);
                            else onChange('');
                        } else {
                            onChange(null);
                        }
                    }} />
                {' '}
                <label for={checkboxId}>
                    {locale.customFormVars.useDefaultValue}
                </label>
            </div>
            {editor}
        </div>
    );
}

function AddVar ({ onAdd }) {
    const [newName, setNewName] = useState('');

    return (
        <div class="add-var">
            <TextField
                outline
                leading={VAR_PREFIX}
                value={newName}
                maxLength={18}
                onKeyDown={nameFieldOnKeyDown}
                onChange={setNewName} />
            <Button icon small disabled={!newName} onClick={() => {
                onAdd(newName);
                setNewName('');
            }}>
                <AddIcon />
            </Button>
        </div>
    );
}
