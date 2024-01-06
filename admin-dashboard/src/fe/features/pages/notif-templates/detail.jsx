import { h } from 'preact';
import { lazy, Suspense, useState } from 'preact/compat';
import { Button, CircularProgress } from 'yamdl';
import VisibilityIcon from '@material-ui/icons/Visibility';
import EditIcon from '@material-ui/icons/Edit';
import SendIcon from '@material-ui/icons/Send';
import { CopyIcon } from '../../../components/icons';
import DetailPage from '../../../components/detail/detail-page';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import DetailShell from '../../../components/detail/detail-shell';
import { LinkButton } from '../../../router';
import { coreContext } from '../../../core/connection';
import { notifTemplates as locale } from '../../../locale';
import { FIELDS } from './fields';
import { getFormVarsForIntent } from './intents';
import TemplatingPopup, { TemplatingContext } from '../../../components/cm-templating-popup';
import './detail.less';
import { usePerms } from '../../../perms';

let cachedAKSOScriptEditor = null;
const AKSOScriptEditor = () => {
    if (!cachedAKSOScriptEditor) {
        cachedAKSOScriptEditor = import('@tejo/akso-script-editor').then(r => r.default);
    }
    return cachedAKSOScriptEditor;
};
const DefsPreview = lazy(async () => ({
    default: (await import('../../../components/form-editor/script-views')).DefsPreview,
}));

export default class NotifTemplate extends DetailPage {
    state = {
        edit: null,
        org: null,
        intent: null,
    };

    locale = locale;

    createCommitTask (changedFields, edit) {
        return this.context.createTask('notifTemplates/update', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    onData = data => {
        if (data) {
            this.setState({ org: data.org, intent: data.intent });
        }
    };

    componentDidMount () {
        super.componentDidMount();
        window.addEventListener('resize', this.onResize);
    }

    componentWillUnmount () {
        super.componentWillUnmount();
        this.detachScriptEditor();
        window.removeEventListener('resize', this.onResize);
    }

    get id () {
        return +this.props.match[1];
    }

    openScriptEditor = (defs) => AKSOScriptEditor().then(Editor => new Promise(resolve => {
        // it's fine for this to be a potentially delayed action, because if the AKSO script editor
        // hasn't loaded yet, then the def preview hasn't either
        const editor = new Editor();
        editor.setFormVars(getFormVarsForIntent(this.state.intent));
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
    }));

    // TODO: dedup code with form editor
    scriptEditor = null;
    attachScriptEditor (editor) {
        if (this.scriptEditor) this.detachScriptEditor();
        this.scriptEditor = editor;
        const editorNode = document.createElement('div');
        editorNode.className = 'notif-template-script-node-root';
        editorNode.appendChild(editor.node);
        document.body.appendChild(editorNode);
        this.onResize();
    }

    detachScriptEditor () {
        if (!this.scriptEditor) return;
        document.body.removeChild(this.scriptEditor.node.parentNode);
        this.scriptEditor.destroy();
        this.scriptEditor = null;
    }

    onResize = () => {
        if (!this.scriptEditor) return;
        this.scriptEditor.width = window.innerWidth;
        this.scriptEditor.height = window.innerHeight;
    };

    renderActions ({ perms }, { org }) {
        const { id } = this;
        const actions = [];

        if (perms.hasPerm(`notif_templates.create.${org}`)) {
            actions.push({
                icon: <CopyIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.duplicate.menuItem,
                action: () => this.context.createTask('notifTemplates/duplicate', { id }),
            });
        }

        if (perms.hasPerm(`notif_templates.update.${org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (perms.hasPerm(`notif_templates.delete.${org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('notifTemplates/delete', { id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        const { id } = this;

        return (
            <div class="notif-template-page">
                <DetailShell
                    view="notifTemplates/template"
                    id={id}
                    options={{ fields: Object.keys(FIELDS) }}
                    onData={this.onData}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}>
                    {data => (
                        <DetailContents
                            id={id}
                            item={edit || data}
                            editing={editing}
                            onItemChange={edit => this.setState({ edit })}
                            openScriptEditor={this.openScriptEditor} />
                    )}
                </DetailShell>
            </div>
        );
    }
}

function DetailField ({ field, item, editing, onItemChange }) {
    const Cmp = FIELDS[field].component;
    return <Cmp
        value={item[field]}
        onChange={v => onItemChange({ ...item, [field]: v })}
        editing={editing}
        item={item}
        onItemChange={onItemChange} />;
}

function DetailContents ({ id, item, editing, onItemChange, openScriptEditor }) {
    const perms = usePerms();
    const [templatingContext] = useState(TemplatingContext.create());

    const org = <DetailField field="org" item={item} />;

    const editScript = () => {
        openScriptEditor(item.script || {}).then(script => {
            onItemChange({ ...item, script });
        });
    };

    let intentLink;
    let onSendIntent;

    if (item.intent === 'codeholder' && perms.hasPerm('codeholders.read')) {
        intentLink = `/membroj`;
        onSendIntent = (core) => {
            core.createTask('notifTemplates/_sendCodeholderInfo');
        };
    }

    const formVars = getFormVarsForIntent(item.intent);

    const knownItems = new Set();
    if (item.script) for (const k in item.script) {
        if (typeof k === 'string' && !k.startsWith('_')) knownItems.add(`${k}`);
    }
    for (const fv of formVars) knownItems.add(`@${fv.name}`);

    return (
        <div class="notif-template-detail">
            <DynamicHeightDiv useFirstHeight>
                <div class="detail-header">
                    <div class="header-title">
                        {!editing ? <span class="header-org">{org}</span> : null}
                        <DetailField field="name" editing={editing} item={item} onItemChange={onItemChange} />
                    </div>
                    <div class="header-info">
                        <DetailField field="base" item={item} />
                        <DetailField field="intent" item={item} />
                    </div>
                    <div class="detail-description">
                        {editing ? <div class="description-label">{locale.fields.description}</div> : null}
                        <DetailField field="description" editing={editing} item={item} onItemChange={onItemChange} />
                    </div>
                    {!editing ? (
                        <div class="detail-preview-link">
                            <LinkButton target={`/amasmesaghoj/${id}/antauhvido`}>
                                <VisibilityIcon style={{ verticalAlign: 'middle' }} />
                                {' '}
                                {locale.preview.button}
                            </LinkButton>
                            {intentLink && (
                                <coreContext.Consumer>
                                    {core => (
                                        <LinkButton target={intentLink} onClick={() => {
                                            if (onSendIntent) onSendIntent(core);
                                        }}>
                                            <SendIcon style={{ verticalAlign: 'middle' }} />
                                            {' '}
                                            {locale.sendIntent}
                                        </LinkButton>
                                    )}
                                </coreContext.Consumer>
                            )}
                        </div>
                    ) : null}
                </div>
            </DynamicHeightDiv>
            <div class="template-script">
                {editing ? (
                    <Button icon fab class="template-script-edit-button" onClick={editScript}>
                        <EditIcon style={{ verticalAlign: 'middle' }} />
                    </Button>
                ) : null}
                <Suspense fallback={<CircularProgress indeterminate />}>
                    <DefsPreview
                        previousNodes={[{
                            defs: {},
                            formVars,
                        }]}
                        script={item.script || {}} />
                </Suspense>
            </div>
            <TemplatingContext.Provider value={templatingContext}>
                <div class="mail-contents">
                    <DynamicHeightDiv useFirstHeight>
                        <div class="mail-header">
                            <div class="mail-sender">
                                <div class="sender-name">
                                    <DetailField field="fromName" editing={editing} item={item} onItemChange={onItemChange} />
                                </div>
                                <div class="sender-address">
                                    <DetailField field="from" editing={editing} item={item} onItemChange={onItemChange} />
                                </div>
                            </div>
                            <div class="mail-subject">
                                <DetailField field="subject" editing={editing} item={item} onItemChange={onItemChange} />
                            </div>
                            <div class="mail-reply-to">
                                {editing ? <div class="reply-to-label">{locale.fields.replyTo}</div> : null}
                                <DetailField field="replyTo" editing={editing} item={item} onItemChange={onItemChange} />
                            </div>
                        </div>
                    </DynamicHeightDiv>
                    <div class="mail-body">
                        {item.base === 'raw' ? (
                            <div class="mail-body-raw">
                                <div class="body-type-banner">{locale.fields.html}</div>
                                <DetailField field="html" editing={editing} item={item} onItemChange={onItemChange} />
                                <div class="body-type-banner">{locale.fields.text}</div>
                                <DetailField field="text" editing={editing} item={item} onItemChange={onItemChange} />
                            </div>
                        ) : (
                            <div class="mail-body-modules">
                                <DetailField field="modules" editing={editing} item={item} onItemChange={onItemChange} />
                            </div>
                        )}
                    </div>
                </div>
                <TemplatingPopup
                    title={locale.templating.insertTitle}
                    varName={name => locale.templateVars[name] || name}
                    knownItems={knownItems}
                    item={item}
                    editing={editing} />
            </TemplatingContext.Provider>
        </div>
    );
}

