import { h } from 'preact';
import { createRef, PureComponent, useEffect, useRef, useState } from 'preact/compat';
import { Button, TextField } from 'yamdl';
import PostAddIcon from '@material-ui/icons/PostAdd';
import PhotoIcon from '@material-ui/icons/Photo';
import AddPhotoIcon from '@material-ui/icons/AddPhotoAlternate';
import RemoveIcon from '@material-ui/icons/Remove';
import TextArea from '../../../components/controls/text-area';
import SvgIcon from '../../../components/svg-icon';
import MdField from '../../../components/controls/md-field';
import Select from '../../../components/controls/select';
import { org } from '../../../components/data';
import RearrangingList from '../../../components/lists/rearranging-list';
import CodeMirror from '../../../components/codemirror-themed';
import { templateMarkings } from '../../../components/cm-templating';
import { TemplatingContext } from '../../../components/cm-templating-popup';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { connect } from '../../../core/connection';
import { useDataView } from '../../../core';
import { notifTemplates as locale } from '../../../locale';
import { getFormVarsForIntent } from './intents';
import './fields.less';

export const FIELDS = {
    base: {
        component ({ value }) {
            return <span class="notif-template-base">{locale.bases[value]}</span>;
        },
    },
    org: {
        weight: 0.25,
        slot: 'icon',
        component ({ value }) {
            return <org.renderer value={value} />;
        },
    },
    intent: {
        slot: 'title',
        component ({ value }) {
            return <span class="notif-template-intent">{locale.intents[value]}</span>;
        },
    },
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextField
                    required
                    class="template-name-editor"
                    label={locale.fields.name}
                    outline
                    maxLength={150}
                    value={value}
                    onChange={onChange}/>;
            }
            return value;
        },
    },
    description: {
        skipLabel: true,
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextArea
                    outline
                    maxLength={2000}
                    value={value}
                    onChange={onChange} />;
            }
            return value;
        },
    },
    script: {
        // does not render
        component: () => null,
    },
    subject: {
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextField
                    class="template-subject-editor"
                    label={locale.fields.subject}
                    required
                    outline
                    value={value}
                    maxLength={255}
                    editing={editing}
                    onChange={onChange} />;
            }
            return value;
        },
    },
    from: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange, item }) {
            if (editing) {
                return <DomainEmailEditor
                    required
                    value={value}
                    onChange={onChange}
                    org={item.org} />;
            }
            return value;
        },
    },
    fromName: {
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextField
                    outline
                    class="template-from-name-editor"
                    label={locale.fields.fromName}
                    maxLength={50}
                    value={value}
                    editing={editing}
                    onChange={onChange} />;
            }
            return value;
        },
    },
    replyTo: {
        component ({ value, editing, onChange, item }) {
            if (editing) {
                return <DomainEmailEditor
                    placeholder={locale.fields.replyToPlaceholder}
                    value={value}
                    onChange={onChange}
                    org={item.org} />;
            }
            return value;
        },
    },
    html: {
        shouldHide: item => item.base !== 'raw',
        component ({ value, editing, onChange, item }) {
            if (editing) {
                return <TemplatedCodeMirror
                    isHtml
                    item={item}
                    value={value}
                    onChange={value => {
                        onChange(value.slice(0, 100000));
                    }} />;
            }

            if (!value) return <div class="mail-body-html is-empty">{locale.raw.noHtmlVersion}</div>;
            return (
                <div class="mail-body-html">
                    <pre class="inner-code">{value}</pre>
                </div>
            );
        },
    },
    text: {
        shouldHide: item => item.base !== 'raw',
        component ({ value, editing, onChange, item }) {
            if (editing) {
                return <TemplatedCodeMirror
                    item={item}
                    value={value}
                    onChange={value => {
                        onChange(value.slice(0, 10000));
                    }} />;
            }
            if (!value) return <div class="mail-body-text is-empty">{locale.raw.noTextVersion}</div>;
            return (
                <div class="mail-body-text">
                    <pre class="inner-code">{value}</pre>
                </div>
            );
        },
    },
    modules: {
        shouldHide: item => item.base !== 'inherit',
        component ({ value, editing, onChange, item }) {
            return <ModulesEditor item={item} value={value} editing={editing} onChange={onChange} />;
        },
    },
};

function DomainEmailEditor ({ value, onChange, org, placeholder, required }) {
    const [domainsLoading, domainsError, domains] = useDataView('notifTemplates/emailDomains', {});
    const [address, setAddress] = useState('');
    const [domain, setDomain] = useState('');
    const stagedValue = useRef(null);
    const postNextState = useRef(false);

    const deriveState = () => {
        if (!value) return;
        const parts = value.split('@');
        setAddress(parts[0]);
        setDomain(parts[1]);
    };

    const postState = () => {
        if (address) {
            stagedValue.current = address + '@' + domain;
            onChange(stagedValue.current);
        } else {
            onChange(null);
        }
    };

    useEffect(() => {
        deriveState();
    }, []);

    useEffect(() => {
        if (stagedValue.current !== value) {
            deriveState();
        }
    }, [value]);

    useEffect(() => {
        if (postNextState.current) {
            postNextState.current = false;
            postState();
        }
    }, [postNextState.current]);

    const onAddressKeyDown = e => {
        if (e.key === '@') e.preventDefault();
    };
    const onAddressChange = e => {
        if (!e.target.value) {
            // cleared, clear domain too
            setDomain('');
        } else if (!domain) {
            // no domain selected, but typing an address
            if (domains) {
                setDomain((domains[org] ? domains[org][0] : '') || '');
            }
        }
        setAddress(e.target.value);
        postNextState.current = true;
    };
    const onDomainChange = domain => {
        setDomain(domain);
        postNextState.current = true;
    };

    const domainOptions = [];
    if (domainsLoading) {
        domainOptions.push({ value: null, label: '...' });
    }
    if (domainsError) {
        domainOptions.push({ value: null, label: locale.fields.emailDomainsError });
    }

    let shouldClearDomain = false;
    if (domains && domains[org]) {
        for (const domain of domains[org]) {
            domainOptions.push({ value: domain, label: domain });
        }
        if (!domains[org].includes(domain)) {
            shouldClearDomain = true;
            domainOptions.push({ value: domain, label: domain });
        }
    }

    useEffect(() => {
        if (shouldClearDomain) {
            setDomain('');
            postNextState.current = true;
        }
    }, [shouldClearDomain]);

    return (
        <div class="notif-template-domain-email-editor">
            <input
                required={required}
                class="domain-email-editor-address"
                value={address}
                placeholder={placeholder}
                onKeyDown={onAddressKeyDown}
                onChange={onAddressChange} />
            <span class="domain-email-editor-at-sign">@</span>
            <Select
                required={required}
                disabled={domainsLoading || domainsError}
                class="domain-email-editor-domain"
                items={domainOptions}
                value={domain}
                onChange={onDomainChange} />
        </div>
    );
}

const MAX_MODULE_COUNT = 16;
class ModulesEditor extends PureComponent {
    #itemKeys = new WeakMap();
    getItemKey (item) {
        if (!this.#itemKeys.has(item)) this.#itemKeys.set(item, Math.random().toString(36));
        return this.#itemKeys.get(item);
    }

    onMoveItem = (fromPos, toPos) => {
        const value = this.props.value.slice();
        value.splice(toPos, 0, value.splice(fromPos, 1)[0]);
        this.props.onChange(value);
    };

    addTextItem = () => {
        const value = this.props.value.slice();
        value.push({ type: 'text', button: null, columns: null });
        this.props.onChange(value);
    };
    addImageItem = () => {
        const value = this.props.value.slice();
        value.push({ type: 'image', url: '', alt: null });
        this.props.onChange(value);
    };

    render ({ item: topLevelItem, value, editing, onChange }) {
        if (!value) return null;
        const items = [];

        for (let i = 0; i < value.length; i++) {
            const item = value[i];
            const key = this.getItemKey(item);
            const index = i;
            const onModuleChange = module => {
                const newValue = value.slice();
                newValue[index] = module;
                this.#itemKeys.set(module, key);
                onChange(newValue);
            };
            const onRemoveModule = (value.length > 1) && (() => {
                const newValue = value.slice();
                newValue.splice(index, 1);
                onChange(newValue);
            });
            items.push(
                <div class="template-module" key={key}>
                    <Module
                        item={topLevelItem}
                        value={item}
                        editing={editing}
                        onChange={onModuleChange}
                        onRemove={onRemoveModule} />
                </div>
            );
        }

        if (editing && value.length < MAX_MODULE_COUNT) {
            items.push(
                <div key="~add" class="add-template-module">
                    <Button onClick={this.addTextItem}>
                        <PostAddIcon style={{ verticalAlign: 'middle' }} />
                        {' '}
                        {locale.modules.addText}
                    </Button>
                    <Button onClick={this.addImageItem}>
                        <AddPhotoIcon style={{ verticalAlign: 'middle' }} />
                        {' '}
                        {locale.modules.addImage}
                    </Button>
                </div>
            );
        }

        return (
            <RearrangingList
                class="notif-template-modules-editor"
                isItemDraggable={index => editing && index < value.length}
                canMove={(toPos) => toPos < value.length}
                onMove={this.onMoveItem}>
                {items}
            </RearrangingList>
        );
    }
}

function Module (props) {
    const { value } = props;
    if (!value) return null;
    if (value.type === 'image') return <ImageModule {...props} />;
    if (value.type === 'text') return <TextModule {...props} />;
    return '?';
}

function ColumnsDoubleIcon (props) {
    return (
        <SvgIcon {...props}>
            <g fill="currentColor" fillRule="evenodd"><path d="M21 20h-4v-2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-4v2h4v2h-2a2 2 0 00-2 2v4h6v-2z"/><path d="M3 21h8v-2H3v2zm0-4h8v-2H3v2zm0-4h8v-2H3v2zm0-4h8V7H3v2zm0-6v2h8V3H3zM13 9h8V7h-8v2zm0-6v2h8V3h-8z" fillRule="nonzero"/></g>
        </SvgIcon>
    );
}

function ColumnsSingleIcon (props) {
    return (
        <SvgIcon {...props}>
            <g fill="currentColor" fillRule="evenodd"><path d="M3 21h12v-2H3v2zm0-4h12v-2H3v2zm0-4h12v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z" fillRule="nonzero"/><path d="M19 22h2V12h-4v2h2z"/></g>
        </SvgIcon>
    );
}

function AddButtonIcon (props) {
    return (
        <SvgIcon {...props}>
            <path d="M15 11v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2zm5-5c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-1v-2h1V8H4v6h5v2H4c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2h16z" fill="currentColor" fillRule="nonzero"/>
        </SvgIcon>
    );
}

class TextModule extends PureComponent {
    render ({ item, value, editing, onChange, onRemove }) {
        const columns = [];
        const valueColumns = value.columns || [''];
        for (let i = 0; i < valueColumns.length; i++) {
            const index = i;
            columns.push(
                <TemplatedMdField
                    key={index}
                    item={item}
                    maxLength={20000}
                    rules={['blockquote', 'heading', 'emphasis', 'strikethrough', 'link', 'list', 'table', 'image']}
                    value={valueColumns[index]}
                    editing={editing}
                    onChange={v => {
                        const newColumns = valueColumns.slice();
                        newColumns[index] = v;
                        onChange({ ...value, columns: newColumns });
                    }}/>
            );
        }

        const switchColumnCount = () => {
            if (valueColumns.length === 2) {
                onChange({ ...value, columns: valueColumns.slice(0, 1) });
            } else {
                onChange({ ...value, columns: [valueColumns[0], ''] });
            }
        };

        const ColumnsIcon = valueColumns.length === 2
            ? ColumnsSingleIcon
            : ColumnsDoubleIcon;

        const addButton = () => {
            onChange({ ...value, button: { href: '', text: '' } });
        };
        const removeButton = () => {
            onChange({ ...value, button: null });
        };

        return (
            <div class="text-module">
                {editing && (
                    <div class="module-bar">
                        {onRemove ? (
                            <Button icon small onClick={onRemove}>
                                <RemoveIcon style={{ verticalAlign: 'middle' }} />
                            </Button>
                        ) : <span />}
                        <div class="module-settings">
                            {!value.button && (
                                <Button
                                    icon
                                    small
                                    onClick={addButton}
                                    title={locale.modules.addButton}>
                                    <AddButtonIcon style={{ verticalAlign: 'middle' }} />
                                </Button>
                            )}
                            <Button
                                icon
                                small
                                onClick={switchColumnCount}
                                title={valueColumns.length === 2
                                    ? locale.modules.setOneColumn
                                    : locale.modules.setTwoColumns}>
                                <ColumnsIcon style={{ verticalAlign: 'middle' }} />
                            </Button>
                        </div>
                    </div>
                )}
                <div class="text-columns">
                    {columns}
                </div>
                {value.button && (
                    editing ? (
                        <div class="text-button">
                            <div class="button-bar">
                                <Button icon small onClick={removeButton}>
                                    <RemoveIcon style={{ verticalAlign: 'middle' }} />
                                </Button>
                                <span class="button-title">
                                    {locale.modules.textButton}
                                </span>
                            </div>
                            <TemplatedTextField
                                class="button-field"
                                outline
                                label={locale.modules.textButtonHref}
                                type="url"
                                maxLength={200}
                                value={value.button.href}
                                onChange={href => {
                                    onChange({ ...value, button: { ...value.button, href } });
                                }}/>
                            <TemplatedTextField
                                class="button-field"
                                outline
                                label={locale.modules.textButtonLabel}
                                value={value.button.text}
                                maxLength={200}
                                onChange={text => {
                                    onChange({ ...value, button: { ...value.button, text } });
                                }}/>
                        </div>
                    ) : (
                        <div class="text-button">
                            <div class="button-title">
                                {locale.modules.textButton}
                            </div>
                            <div class="button-prototype">
                                <div class="prototype-inner">
                                    {value.button.text}
                                </div>
                                <div class="prototype-link">
                                    {value.button.href}
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        );
    }
}

class ImageModule extends PureComponent {
    render ({ value, editing, onChange, onRemove }) {
        if (editing) {
            return (
                <div class="image-module">
                    <div class="module-bar">
                        {onRemove ? (
                            <Button icon small onClick={onRemove}>
                                <RemoveIcon style={{ verticalAlign: 'middle' }} />
                            </Button>
                        ) : <span />}
                        <PhotoIcon style={{ verticalAlign: 'middle' }} />
                    </div>
                    <TemplatedTextField
                        class="image-field"
                        outline
                        label={locale.modules.imageUrl}
                        value={value.url}
                        onChange={url => onChange({ ...value, url })} />
                    <TemplatedTextField
                        class="image-field"
                        outline
                        label={locale.modules.imageAlt}
                        value={value.alt}
                        onChange={alt => onChange({ ...value, alt })} />
                </div>
            );
        }

        return (
            <div class="image-module">
                <div class="image-details">
                    <PhotoIcon style={{ verticalAlign: 'middle' }} />
                    <span class="image-alt">{value.alt}</span>
                </div>
                <div class="image-source">
                    {value.url}
                </div>
            </div>
        );
    }
}

class TemplatedTextField extends PureComponent {
    static contextType = TemplatingContext;

    onFocus = () => {
        this.context.didFocus(this);
    };
    onBlur = () => {
        this.context.didBlur(this);
    };

    textField = createRef();
    insertString (str) {
        const input = this.textField.current.inputNode;

        this.props.onChange(this.props.value.substr(0, input.selectionStart)
            + str + this.props.value.substr(input.selectionEnd));
    }

    render ({ ...props }) {
        return (
            <TextField
                ref={this.textField}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                {...props}
                onChange={this.props} />
        );
    }
}

const getKnownVarsInItem = itemRef => {
    const item = itemRef.current;
    if (!item) return new Set();

    const knownVars = new Set();
    for (const fv of getFormVarsForIntent(item.intent)) knownVars.add('@' + fv.name);
    if (item.script) for (const k in item.script) {
        if (typeof k === 'string' && !k.startsWith('_')) knownVars.add(k);
    }
    return knownVars;
};

class TemplatedCodeMirror extends PureComponent {
    static contextType = TemplatingContext;

    editor = createRef();
    templateMarkings = [];
    itemRef = { current: null };

    onFocus = () => {
        this.context.didFocus(this);
    };
    onBlur = () => {
        this.context.didBlur(this);
    };

    insertString (str) {
        const { view } = this.editor.current;
        view.dispatch(view.state.replaceSelection(str));
    }

    getKnownVars = () => getKnownVarsInItem(this.itemRef);

    render ({ item, value, onChange, isHtml }) {
        this.itemRef.current = item;

        return (
            <CodeMirror
                class="cm-notif-template-editor"
                ref={this.editor}
                value={value}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                basicSetup={{
                    // this breaks selection for some reason
                    highlightActiveLine: false,
                }}
                extensions={[
                    templateMarkings(locale.templateVars, this.getKnownVars),
                    EditorState.tabSize.of(4),
                    indentUnit.of('\t'),
                    EditorView.lineWrapping,
                    isHtml && html(),
                ].filter(x => x)}
                onChange={onChange} />
        );
    }
}

class TemplatedMdField extends PureComponent {
    static contextType = TemplatingContext;

    mdField = createRef();
    itemRef = { current: null };

    onFocus = () => {
        this.context.didFocus(this);
    };
    onBlur = () => {
        this.context.didBlur(this);
    };

    insertString (str) {
        const { view } = this.mdField.current.editor.current;
        view.dispatch(view.state.replaceSelection(str));
    }

    getKnownVars = () => getKnownVarsInItem(this.itemRef);

    render ({ item, ...props }) {
        this.itemRef.current = item;

        return (
            <MdField
                ref={this.mdField}
                extensions={[
                    templateMarkings(locale.templateVars, this.getKnownVars),
                ]}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                {...props} />
        );
    }
}
