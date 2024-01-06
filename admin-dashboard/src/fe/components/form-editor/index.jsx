import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, Menu } from 'yamdl';
import AKSOScriptEditor from '@tejo/akso-script-editor';
import InputIcon from '@material-ui/icons/Input';
import TextIcon from '@material-ui/icons/Subject';
import ScriptIcon from '@material-ui/icons/Code';
import CheckIcon from '@material-ui/icons/Check';
import FormEditorSettings from './settings';
import CustomFormVars from './custom-form-vars';
import RearrangingList from '../lists/rearranging-list';
import FormEditorItem from './item';
import ScriptContext from './script-context';
import { createInput, getGlobalDefs, getAscDefs } from './model';
import { formEditor as locale } from '../../locale';
import './index.less';

export class ScriptContextProvider extends PureComponent {
    /**
     * Opens the AKSO Script Editor in full screen.
     *
     * - defs: akso script definitions object
     * - options:
     *     - previousNodes: array of { defs, formVars } to be able to use variables from other
     *       scripts and such
     */
    openScriptEditor = (defs, options = {}) => new Promise(resolve => {
        const editor = new AKSOScriptEditor();

        const previousNodes = options.previousNodes;
        if (previousNodes) {
            const previousDefs = previousNodes
                .filter(x => x)
                .map(node => node.defs)
                .filter(x => Object.keys(x).length);
            const formVars = previousNodes
                .filter(x => x)
                .flatMap(node => node.formVars);
            editor.loadExternalDefs(previousDefs);
            editor.setFormVars(formVars);
        }

        editor.load(defs);
        editor.onCancel = () => {
            resolve(defs);
            this.detachScriptEditor();
        };
        editor.onSave = () => {
            resolve(editor.save());
            this.detachScriptEditor();
        };
        this.attachScriptEditor(editor);
    });

    /** Opens the AKSO Script Editor for editing only a single expression. */
    openScriptExprEditor = (expr, options) => new Promise(resolve => {
        const editor = new AKSOScriptEditor();

        const previousNodes = options.previousNodes;
        if (previousNodes) {
            const previousDefs = previousNodes
                .filter(x => x)
                .map(node => node.defs)
                .filter(x => Object.keys(x).length);
            const formVars = previousNodes
                .filter(x => x)
                .flatMap(node => node.formVars);
            editor.loadExternalDefs(previousDefs);
            editor.setFormVars(formVars);
        }

        editor.loadInRawExprMode(expr, {
            location: options.location,
            onClose: () => {
                resolve(editor.saveRawExpr());
                this.detachScriptEditor();
            },
        });
        this.attachScriptEditor(editor);
    });

    scriptContext = {
        openDefs: this.openScriptEditor,
        openExpr: this.openScriptExprEditor,
    };

    // attaching and detaching from the DOM

    scriptEditor = null;
    attachScriptEditor (editor) {
        if (this.scriptEditor) this.detachScriptEditor();
        this.scriptEditor = editor;
        const editorNode = document.createElement('dialog');
        editorNode.className = 'form-editor-script-node-root';
        editorNode.appendChild(editor.node);
        if (this.props.reallyOnTop) editorNode.classList.add('really-on-top');
        document.body.appendChild(editorNode);
        if (editorNode.showModal) editorNode.showModal();
        this.onResize();
    }

    detachScriptEditor () {
        if (!this.scriptEditor) return;
        const editorNode = this.scriptEditor.node.parentNode;
        if (editorNode.close) editorNode.close();
        document.body.removeChild(editorNode);
        this.scriptEditor.destroy();
        this.scriptEditor = null;
    }

    onResize = () => {
        if (!this.scriptEditor) return;
        this.scriptEditor.width = window.innerWidth;
        this.scriptEditor.height = window.innerHeight;
    };

    componentDidMount () {
        window.addEventListener('resize', this.onResize);
    }
    componentWillUnmount () {
        window.removeEventListener('resize', this.onResize);
        this.detachScriptEditor();
    }

    render ({ children }) {
        return <ScriptContext.Provider value={this.scriptContext}>{children}</ScriptContext.Provider>;
    }
}

/**
 * The Form Editor is the component used to edit e.g. registration forms.
 * It allows editing both the form data (i.e. like a user would) and editing the form itself.
 *
 * The implementation will generally assume that form data and the form itself will not be edited
 * simultaneously, so there may be weird states caused by entering form data and then editing the
 * form.
 *
 * If editingFormData is set to true, this will also interact with FormContext to validate the form
 * before submission.
 *
 * # Props
 * - isEditingContext: bool - whether to show internal details
 * - editing: bool
 * - value: { allowUse, allowGuests, ..., form } object (see API docs)
 * - onChange: (value) => void callback
 * - formData/onFormDataChange: optional form data
 * - editingFormData: set to false to disable
 * - skipSettings: TEMPORARY for not rendering settings
 * - skipNonInputs: will not render modules that aren't inputs
 * - disableValidation: bool
 * - disableCurrencyChange: bool
 */
export default class FormEditor extends PureComponent {
    state = {
        /** Form input name -> form input value */
        formData: {},
    };

    items = createRef();

    stopEditing () {
        this.items.current.stopEditing();
    }

    render ({
        skipSettings,
        skipNonInputs,
        value,
        editing,
        onChange,
        additionalVars,
        editingFormData,
        isEditingContext,
        disableValidation,
        disableCurrencyChange,
        org,
    }) {
        if (!value) return null;

        const formData = this.props.formData || this.state.formData;

        return (
            <div class="form-editor">
                <ScriptContextProvider>
                    <FormEditorItems
                        ref={this.items}
                        org={org}
                        skipSettings={skipSettings}
                        skipNonInputs={skipNonInputs}
                        editing={editing}
                        settings={value}
                        onSettingsChange={onChange}
                        items={value.form}
                        onItemsChange={form => onChange({ ...value, form })}
                        editingData={editingFormData}
                        isEditingContext={isEditingContext}
                        values={formData}
                        onValuesChange={values => {
                            if (this.props.onFormDataChange) {
                                if (!editingFormData) return;
                                this.props.onFormDataChange(values);
                            } else this.setState({ formData });
                        }}
                        customVars={value.customFormVars}
                        onCustomVarsChange={v => onChange({ ...value, customFormVars: v })}
                        additionalVars={additionalVars}
                        disableValidation={disableValidation}
                        disableCurrencyChange={disableCurrencyChange} />
                </ScriptContextProvider>
            </div>
        );
    }
}

class FormEditorItems extends PureComponent {
    state = {
        /** Item key that is currently being edited */
        editingItem: null,
    };

    stopEditing () {
        this.setState({ editingItem: null });
    }

    addItem (item, skipEditing) {
        const itemIndex = this.props.items.length;
        if (!skipEditing) this.setState({ editingItem: this.getItemKey(itemIndex) });
        this.props.onItemsChange(this.props.items.concat([item]));
    }

    addInput = (type) => this.addItem(createInput(type));
    addText = () => {
        this.addItem({
            el: 'text',
            text: '',
        });
    };
    addScript = () => {
        this.addItem({
            el: 'script',
            script: {},
        }, true);
    };

    #itemKeys = [];
    /**
     * >> which item is at which index?
     * we keep track of items using random ids so when rearranging we can assign the correct
     * key again
     */
    getItemKey (index) {
        if (!this.#itemKeys[index]) this.#itemKeys[index] = Math.random().toString(36);
        return this.#itemKeys[index];
    }

    onMoveItem = (fromPos, toPos) => {
        if (toPos < 0 || toPos > this.props.items.length) return;
        const items = this.props.items.slice();
        items.splice(toPos, 0, items.splice(fromPos, 1)[0]);
        this.#itemKeys.splice(toPos, 0, this.#itemKeys.splice(fromPos, 1)[0]);
        this.props.onItemsChange(items);
    };
    removeItem (i) {
        const items = this.props.items.slice();
        items.splice(i, 1);
        this.#itemKeys.splice(i, 1);
        this.props.onItemsChange(items);
    }

    initFormEditing () {
        // initialize form editing by creating all fields and setting them to null if necessary
        if (!this.props.editingData) return;
        const inputKeys = new Set();
        const newValues = { ...this.props.values };
        for (const item of this.props.items) {
            if (item.el === 'input') {
                if (!item.name) continue;
                inputKeys.add(item.name);
                if (!(item.name in newValues)) newValues[item.name] = null;
            }
        }
        for (const k in newValues) {
            if (k === '@$disableValidation') continue; // special key used to disable validation

            if (!inputKeys.has(k)) delete newValues[k];
        }

        this.props.onValuesChange(newValues);
    }

    componentDidMount () {
        this.initFormEditing();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.editingData !== this.props.editingData) {
            this.initFormEditing();
        }
    }

    currentBatch = {};
    currentBatchTimeout = null;
    batchValueChange (name, value) {
        this.currentBatch[name] = value;
        clearTimeout(this.currentBatchTimeout);

        this.currentBatchTimeout = setTimeout(() => {
            this.props.onValuesChange({ ...this.props.values, ...this.currentBatch });
            this.currentBatch = {};
        }, 1);
    }

    testInputs = new Set();

    registerTestInput = (input) => {
        this.testInputs.add(input);
    };
    deregisterTestInput = (input) => {
        this.testInputs.delete(input);
    };

    render ({
        editing, settings, onSettingsChange, items, onItemsChange, values, additionalVars,
        skipSettings, skipNonInputs, editingData, isEditingContext, disableValidation, disableCurrencyChange,
        customVars, onCustomVarsChange,
        org,
    }, { editingItem }) {
        const listItems = [];

        const modelCustomVars = [];
        for (const k in customVars) {
            const value = customVars[k].default;
            const type = ({
                null: 'u',
                boolean: 'b',
                number: 'n',
                string: 's',
            })[value === null ? 'null' : typeof value];

            modelCustomVars.push({
                name: k.substring(1), // remove leading @
                type,
                value,
            });
        }

        const hasValues = !!Object.keys(values).find(k => values[k] !== null);

        const previousNodes = [getGlobalDefs((additionalVars || []).concat(modelCustomVars))];
        for (let i = 0; i < items.length; i++) {
            const index = i;
            const key = this.getItemKey(index);
            const name = items[i].name || '???';
            if (!skipNonInputs || items[i].el === 'input') {
                listItems.push(
                    <FormEditorItem
                        key={key}
                        onMoveItem={(dir) => this.onMoveItem(index, index + dir)}
                        editable={editing}
                        isEditingContext={isEditingContext}
                        disableValidation={disableValidation}
                        previousNodes={previousNodes.slice()}
                        editing={editing && (editingItem === key)}
                        onEditingChange={editing => {
                            if (editing) this.setState({ editingItem: key });
                            else if (editingItem === key) this.setState({ editingItem: null });
                        }}
                        item={items[index]}
                        onChange={item => {
                            const newItems = items.slice();
                            newItems[index] = item;
                            onItemsChange(newItems);
                        }}
                        registerTestInput={this.registerTestInput}
                        deregisterTestInput={this.deregisterTestInput}
                        editingData={editingData}
                        hasValues={hasValues}
                        value={values[name]}
                        onValueChange={value => this.batchValueChange(name, value)}
                        onRemove={() => this.removeItem(i)} />
                );
            }
            previousNodes.push(getAscDefs(items[i], values[name]));
        }

        if (editing) {
            listItems.push(
                <FormEditorAddItem
                    key="~add"
                    canAdd={items.length < 255}
                    addInput={this.addInput}
                    addText={this.addText}
                    addScript={this.addScript} />
            );
        }

        return (
            <div class="form-editor-items">
                {!skipSettings && (
                    <FormEditorSettings
                        org={org}
                        editing={editing}
                        value={settings}
                        onChange={onSettingsChange}
                        previousNodes={previousNodes}
                        disableCurrencyChange={disableCurrencyChange} />
                )}
                {isEditingContext && (
                    <CustomFormVars
                        editing={editing}
                        vars={customVars}
                        onVarsChange={onCustomVarsChange} />
                )}
                {isEditingContext && (
                    <TestInputs
                        inputs={this.testInputs}
                        values={values}
                        onValuesChange={this.props.onValuesChange} />
                )}
                <RearrangingList
                    spacing={16}
                    isItemDraggable={() => false}
                    canMove={() => false}
                    onMove={() => {}}>
                    {listItems}
                </RearrangingList>
            </div>
        );
    }
}

class TestInputs extends PureComponent {
    state = {
        didValidate: false,
    };

    validate = () => {
        let passed = true;

        for (const input of this.props.inputs) {
            try {
                const error = input.validate(true);
                passed &&= !error;
            } catch { /* */ }
        }

        if (passed) {
            this.setState({ didValidate: true });
            setTimeout(() => {
                this.setState({ didValidate: false });
            }, 1000);
        }
    };

    clearInputs = () => {
        this.props.onValuesChange({});
    };

    render ({ values }) {
        const hasValues = !!Object.keys(values).find(k => values[k] !== null);

        return (
            <div class={'form-editor-test-inputs' + (hasValues ? ' is-active' : '')}>
                <div class="inner-title">
                    {locale.testInputsBar.title}
                </div>
                <Button onClick={this.validate} class={'validate-button' + (this.state.didValidate ? ' did-validate' : '')}>
                    <span class="inner-contents">
                        <span class="inner-label">
                            {locale.testInputsBar.validate}
                        </span>
                        <span class="inner-check">
                            <CheckIcon style={{ verticalAlign: 'middle' }} />
                        </span>
                    </span>
                </Button>
                <Button onClick={this.clearInputs}>{locale.testInputsBar.clear}</Button>
            </div>
        );
    }
}

class FormEditorAddItem extends PureComponent {
    state = {
        addInputMenuPos: null,
        addInputMenuOpen: null,
    };

    render ({ canAdd, addInput, addText, addScript }, { addInputMenuPos, addInputMenuOpen }) {
        if (!canAdd) return null;

        return (
            <div class="form-editor-add-item">
                <Menu
                    open={!!addInputMenuOpen}
                    position={addInputMenuPos}
                    onClose={() => this.setState({ addInputMenuOpen: false })}
                    items={Object.keys(locale.inputTypes).map(id => ({
                        label: locale.inputTypes[id],
                        action: () => addInput(id),
                    }))} />
                <Button onClick={e => {
                    this.setState({
                        addInputMenuPos: [e.clientX, e.clientY],
                        addInputMenuOpen: true,
                    });
                }}>
                    <InputIcon style={{ verticalAlign: 'middle' }} />
                    {' '}
                    {locale.itemTypes.input}
                </Button>
                <Button onClick={addText}>
                    <TextIcon style={{ verticalAlign: 'middle' }} />
                    {' '}
                    {locale.itemTypes.text}
                </Button>
                <Button onClick={addScript}>
                    <ScriptIcon style={{ verticalAlign: 'middle' }} />
                    {' '}
                    {locale.itemTypes.script}
                </Button>
            </div>
        );
    }
}
