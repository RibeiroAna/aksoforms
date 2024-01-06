import Markdown from 'markdown-it';
import { h } from 'preact';
import { createPortal, createRef, forwardRef, PureComponent, useEffect, useMemo, useState } from 'preact/compat';
import { globalAnimator, Button, Dialog, TextField, RootContext } from 'yamdl';
import FormatBoldIcon from '@material-ui/icons/FormatBold';
import FormatItalicIcon from '@material-ui/icons/FormatItalic';
import FormatStrikethroughIcon from '@material-ui/icons/FormatStrikethrough';
import TitleIcon from '@material-ui/icons/Title';
import InsertLinkIcon from '@material-ui/icons/InsertLink';
import InsertPhotoIcon from '@material-ui/icons/InsertPhoto';
import CodeIcon from '@material-ui/icons/Code';
import TableChartIcon from '@material-ui/icons/TableChart';
import FormatListBulletedIcon from '@material-ui/icons/FormatListBulleted';
// import FormatListNumberedIcon from '@material-ui/icons/FormatListNumbered';
import HelpIcon from '@material-ui/icons/Help';
import VisibilityIcon from '@material-ui/icons/Visibility';
import CloseIcon from '@material-ui/icons/Close';
import CodeMirror from '../codemirror-themed';
import { EditorView, keymap, placeholder as viewPlaceholder } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { EditorState, EditorSelection } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { layoutContext } from '../layout/dynamic-height-div';
import { data as locale } from '../../locale';
import { coreContext } from '../../core/connection';
import './md-field.less';

/**
 * Renders a markdown text field.
 *
 * # Props
 * - value/onChange: string
 * - editing: bool
 * - maxLength: optional; will show a counter
 * - rules: list of enabled rules
 * - inline: if true, will try to style it without line breaks
 * - singleLine: if true, will not allow line breaks
 * - ignoreLiveUpdates: ignores props.value while the user is typing to combat latency
 * - extensions: additional CodeMirror extensions
 * - placeholder: placeholder text
 */
export default class MarkdownTextField extends PureComponent {
    static contextType = layoutContext;

    state = {
        preview: false,
        focused: false,
        editorBarPopout: null,
        helpOpen: false,
    };

    #node = createRef();
    #cachedHtml = null;
    core = null;
    editor = createRef();

    updateCache () {
        const md = new Markdown('zero', {
            breaks: !this.props.singleLine,
        });
        if (!this.props.singleLine) md.enable('newline');
        if (this.props.rules) md.enable(this.props.rules);
        this.#cachedHtml = md.render(this.props.value || '');
        this.forceUpdate();
        this.context && this.context();
    }

    componentDidMount () {
        if (!this.props.editing) this.updateCache();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value) {
            this.#cachedHtml = null;
        }

        if ((!this.props.editing || this.state.preview) && this.#cachedHtml === null) {
            this.updateCache();
        }
        if (!this.props.editing && this.state.preview) this.setState({ preview: false });
    }

    #onFocus = () => {
        this.setState({ focused: true });
        if (this.props.onFocus) this.props.onFocus();
    };

    #onBlur = () => {
        this.setState({ focused: false });
        if (this.props.onBlur) this.props.onBlur();
    };

    #onEditorBarPopout = popout => {
        this.setState({ editorBarPopoutClosing: false, editorBarPopout: popout });
    };

    #closeEditorBarPopout = () => {
        if (this.state.editorBarPopoutClosing) return;
        this.setState({ editorBarPopoutClosing: true }, () => {
            setTimeout(() => {
                this.setState({ editorBarPopout: null });
                this.editor.current.view.focus();
            }, 300);
        });
    };

    #onContentsClick = e => {
        if (e.target instanceof HTMLAnchorElement) {
            e.preventDefault();

            this.core.createTask('openExternalLink', {
                link: e.target.href,
            });
        }
    };

    render ({
        value, editing, onChange, inline, disabled, rules, singleLine, maxLength, extensions, placeholder, ...extra
    }, { focused, preview, editorBarPopout, helpOpen }) {
        let editorBar, charCounter;

        if (editing) {
            editorBar = (
                <div class={'md-editor-bar' + (preview ? ' is-previewing' : '')}>
                    <Button
                        class="editor-preview-open-button"
                        disabled={preview}
                        onClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            this.setState({ preview: true });
                        }}>
                        {locale.mdEditor.previewOn}
                    </Button>
                    <div class="editor-bar-preview-state">
                        <label class="editor-preview-title">
                            {locale.mdEditor.previewTitle}
                        </label>
                        <Button
                            disabled={!preview}
                            class="editor-preview-close-button"
                            onClick={e => {
                                e.stopPropagation();
                                e.preventDefault();
                                this.setState({ preview: false }, () => {
                                    this.editor.current?.view?.focus();
                                });
                            }}>
                            {locale.mdEditor.previewOff}
                        </Button>
                    </div>
                </div>
            );

            let popoutBackdrop;
            let popout = null;
            const popoutClosing = this.state.editorBarPopoutClosing;
            if (editorBarPopout) {
                popoutBackdrop = (
                    <div
                        class={'editor-bar-request-backdrop' + (popoutClosing ? ' is-closing' : '')}
                        onClick={this.#closeEditorBarPopout} />
                );
                const Popout = editorBarPopout;
                popout = <Popout closing={popoutClosing} onClose={this.#closeEditorBarPopout} />;
            }

            const editorBarVisible = !!(focused || editorBarPopout);
            editorBar = (
                <EditorBarPortal
                    visible={editorBarVisible}
                    owner={this.#node}
                    requestBackdrop={popoutBackdrop}
                    request={popout}>
                    <EditorBar
                        visible={editorBarVisible}
                        rules={rules}
                        view={this.editor.current?.view}
                        onChange={onChange}
                        onPopout={this.#onEditorBarPopout}
                        onOpenHelp={() => {
                            this.setState({ helpOpen: true });
                            document.activeElement.blur();
                        }} />
                </EditorBarPortal>
            );

            if (maxLength && value) {
                const valueLen = ('' + value).length;
                if (maxLength - valueLen < 500) {
                    const isAtLimit = valueLen === maxLength;
                    charCounter = (
                        <div class={'editor-char-counter' + (isAtLimit ? ' is-at-limit' : '')}>
                            {valueLen}/{maxLength}
                        </div>
                    );
                }
            }
        }

        const rendered = (
            <div
                onClick={this.#onContentsClick}
                class={'markdown-contents' + (inline ? ' is-inline' : '')}
                dangerouslySetInnerHTML={{ __html: this.#cachedHtml }} />
        );

        let contents;
        if (editing) {
            contents = (
                <div class="md-editor-inner">
                    <InnerEditor
                        ref={this.editor}
                        value={value}
                        onChange={onChange}
                        singleLine={singleLine}
                        maxLength={maxLength}
                        disabled={disabled}
                        onFocus={this.#onFocus}
                        onBlur={this.#onBlur}
                        extensions={extensions}
                        placeholder={placeholder}
                        ignoreLiveUpdates={this.state.focused && this.props.ignoreLiveUpdates} />

                    <div class={'preview-flourish' + (!preview ? ' is-hidden' : '')} />
                    <div class={'preview-container' + (!preview ? ' is-hidden' : '')}>
                        <div class="preview-mark">{locale.mdEditor.previewTitle}</div>
                        {rendered}
                    </div>

                    <Button
                        icon small class="preview-button"
                        title={preview
                            ? locale.mdEditor.previewOff
                            : locale.mdEditor.previewOn}
                        onClick={e => {
                            e.stopPropagation();
                            e.preventDefault();
                            this.setState({ preview: !preview }, () => {
                                if (!this.state.preview) this.editor.current?.view?.focus();
                            });
                        }}>
                        {preview ? <CloseIcon /> : <VisibilityIcon />}
                    </Button>

                    {charCounter}

                    <Dialog
                        class="markdown-text-field-help-dialog"
                        backdrop
                        fullScreen={width => width < 900}
                        open={helpOpen}
                        onClose={() => this.setState({ helpOpen: false })}
                        title={locale.mdEditor.help.title}>
                        <AllHelp rules={singleLine ? rules : ['newline'].concat(rules)} />
                    </Dialog>
                </div>
            );
        } else {
            contents = rendered;
        }

        extra.class = (extra.class || '') + ' markdown-text-field'
            + (editing ? ' editing' : '')
            + (singleLine ? ' single-line' : '');

        return (
            <div {...extra} ref={this.#node}>
                <coreContext.Consumer>{ctx => {
                    this.core = ctx;
                    return null;
                }}</coreContext.Consumer>
                {editorBar}
                {contents}
            </div>
        );
    }
}

class EditorBarPortal extends PureComponent {
    static contextType = RootContext;

    state = {
        posX: 0,
        posY: 0,
        width: 0,
        visible: this.props.visible,
    };

    #updates = 0;
    update () {
        if (!this.props.owner.current) return;
        const rect = this.props.owner.current.getBoundingClientRect();

        let posX = rect.left;
        let posY = rect.top;
        if (window.visualViewport) {
            posX += window.visualViewport.offsetLeft;
            posY += window.visualViewport.offsetTop;
        }
        const width = rect.width;

        this.setState({ posX, posY, width });

        if (this.#updates > 12) {
            globalAnimator.deregister(this);
            this.#updates = 0;
        }
    }

    #onMutate = () => {
        globalAnimator.register(this);
        this.#updates = 0;
    };

    componentDidMount () {
        this.#onMutate();
        window.addEventListener('resize', this.#onMutate);
        window.addEventListener('pointermove', this.#onMutate);
        window.addEventListener('wheel', this.#onMutate);
        window.addEventListener('keydown', this.#onMutate);
        window.addEventListener('keyup', this.#onMutate);
    }
    componentWillUnmount () {
        globalAnimator.deregister(this);
        window.removeEventListener('resize', this.#onMutate);
        window.removeEventListener('pointermove', this.#onMutate);
        window.removeEventListener('wheel', this.#onMutate);
        window.removeEventListener('keydown', this.#onMutate);
        window.removeEventListener('keyup', this.#onMutate);
        clearTimeout(this.#setInvisibleTimeout);
    }

    shouldComponentUpdate (nextProps, nextState) {
        if (super.shouldComponentUpdate(nextProps, nextState)) {
            if (!this.props.visible && !nextProps.visible) return false;
            return true;
        }
        return false;
    }

    #setInvisibleTimeout = null;
    componentDidUpdate (prevProps) {
        if (!prevProps.visible && this.props.visible) {
            globalAnimator.register(this);
            clearTimeout(this.#setInvisibleTimeout);
            this.setState({ visible: true });
        } else if (prevProps.visible && !this.props.visible) {
            globalAnimator.deregister(this);

            clearTimeout(this.#setInvisibleTimeout);
            this.#setInvisibleTimeout = setTimeout(() => {
                this.setState({ visible: false });
            }, 500);
        }
    }

    render ({ children, requestBackdrop, request }, { posX, posY, width, visible }) {
        const transform = `translate(${posX}px, ${posY}px)`;

        if (!visible) return null;

        return createPortal(
            <div class="markdown-text-field-editor-bar-container">
                <div class="editor-bar-container-inner" style={{ transform, width }}>
                    {children}
                </div>
                {requestBackdrop}
                {request ? (
                    <div class="editor-bar-request-container" style={{ transform, width }}>
                        {request}
                    </div>
                ) : null}
            </div>,
            this.context || document.body,
        );
    }
}

const CM_BASIC_SETUP = {
    autocompletion: false,
    lineNumbers: false,
    foldGutter: false,
    closeBrackets: false,
    allowMultipleSelections: false,
    highlightSelectionMatches: false,
    // this breaks selection for some reason
    highlightActiveLine: false,
};

function convertShortcutToCm (shortcut) {
    const takeModifier = (mod) => {
        if (shortcut.includes(mod)) {
            shortcut = shortcut.replace(new RegExp(`[${mod}]`, 'g'), '');
            return true;
        }
        return false;
    };

    let out = '';
    if (takeModifier('⌃')) out += 'Mod-';
    if (takeModifier('⇧')) out += 'Shift-';
    if (takeModifier('⌥')) out += 'Alt-';

    return out + shortcut.toLowerCase();
}

const makeURLInputRequest = apply => function URLInputRequest ({ selection, onComplete }) {
    const [label, setLabel] = useState(selection);
    const [url, setUrl] = useState('');
    const complete = () => onComplete(apply(label, url));

    return (
        <div class="url-input-request">
            <TextField
                class="label-field"
                outline label={locale.mdEditor.urlLabel}
                value={label}
                onChange={setLabel} />
            <TextField
                class="url-field"
                outline label={locale.mdEditor.url}
                placeholder={locale.mdEditor.urlPlaceholder}
                value={url}
                onChange={setUrl} />
            <div class="req-footer">
                <Button outline class="insert-button" onClick={complete} disabled={!url}>
                    {locale.mdEditor.insertUrl}
                </Button>
            </div>
        </div>
    );
};


const FORMAT_FNS = {
    title: view => applyHeadings(view),
    bold: view => applyWrappingFormat('**', '**', view),
    italic: view => applyWrappingFormat('*', '*', view),
    strike: view => applyWrappingFormat('~~', '~~', view),
    code: view => applyWrappingFormat('`', '`', view),
};

const FORMAT_BUTTONS = {
    title: {
        icon: <TitleIcon />,
        rule: 'heading',
        apply: FORMAT_FNS.title,
    },
    bold: {
        icon: <FormatBoldIcon />,
        rule: 'emphasis',
        apply: FORMAT_FNS.bold,
    },
    italic: {
        icon: <FormatItalicIcon />,
        rule: 'emphasis',
        apply: FORMAT_FNS.italic,
    },
    strike: {
        icon: <FormatStrikethroughIcon />,
        rule: 'strikethrough',
        apply: FORMAT_FNS.strike,
    },
    link: {
        icon: <InsertLinkIcon />,
        rule: 'link',
        request: makeURLInputRequest((label, url) => view => {
            view.dispatch(view.state.replaceSelection(`[${label}](${url})`));
        }),
    },
    image: {
        icon: <InsertPhotoIcon />,
        rule: 'image',
        request: makeURLInputRequest((label, url) => view => {
            view.dispatch(view.state.replaceSelection(`![${label}](${url})`));
        }),
    },
    code: {
        icon: <CodeIcon />,
        rule: 'backticks',
        apply: FORMAT_FNS.code,
    },
    table: {
        icon: <TableChartIcon />,
        rule: 'table',
        request: () => <HelpSection rule="table" />,
    },
    ul: {
        icon: <FormatListBulletedIcon />,
        rule: 'list',
        request: () => <HelpSection rule="list" />,
    },
    // since we don't actually use these buttons, we can omit this for now
    /* ol: {
        icon: <FormatListNumberedIcon />,
        rule: 'list',
        request: () => <HelpSection rule="list" />,
    }, */
};


const editorKeymap = Object.keys(locale.mdEditor.formatButtonShortcuts).map(s => {
    const shortcut = convertShortcutToCm(locale.mdEditor.formatButtonShortcuts[s]);

    return {
        key: shortcut,
        run: FORMAT_FNS[s],
    };
});

const InnerEditor = forwardRef(({
    value,
    onChange,
    disabled,
    singleLine,
    maxLength,
    onFocus,
    onBlur,
    extensions,
    placeholder,
    ignoreLiveUpdates,
}, ref) => {
    const [localValue, setLocalValue] = useState(value);

    // memoize to avoid reconfiguring editor too often
    const editorExtensions = useMemo(() => [
        markdown(),
        EditorState.tabSize.of(4),
        indentUnit.of('\t'),
        EditorView.lineWrapping,
        placeholder && viewPlaceholder(placeholder),
        keymap.of(editorKeymap),
        ...(extensions || []),
    ].filter(x => x), [extensions, placeholder]);

    const editorOnChange = value => {
        if (maxLength && value.length > maxLength) value = value.substr(0, maxLength);
        if (singleLine) value = value.replace(/\n/g, '');

        setLocalValue(value);
        onChange(value);
    };

    return (
        <CodeMirror
            ref={ref}
            value={ignoreLiveUpdates ? localValue : value}
            indentWithTab={false}
            basicSetup={CM_BASIC_SETUP}
            readOnly={disabled}
            extensions={editorExtensions}
            onFocus={() => {
                setLocalValue(value);
                onFocus();
            }}
            onBlur={onBlur}
            onChange={editorOnChange} />
    );
});

/**
 * Applies a wrapping formatting tag, such as bold or italic.
 * - start: start tag
 * - end: end tag
 * - view: editor view
 */
function applyWrappingFormat (startTag, endTag, view) {
    view.dispatch(view.state.changeByRange(range => {
        const startMinusTag = range.from - startTag.length;
        const endPlusTag = range.to + endTag.length;

        const before = view.state.sliceDoc(startMinusTag, range.from);
        const after = view.state.sliceDoc(range.to, endPlusTag);

        if (before === startTag && after === endTag) {
            // tag already exists - remove it
            return {
                changes: [
                    { from: startMinusTag, to: range.from, insert: '' },
                    { from: range.to, to: endPlusTag, insert: '' },
                ],
                range: EditorSelection.range(range.from - startTag.length, range.to - startTag.length),
            };
        } else {
            // add it
            return {
                changes: [
                    { from: range.from, insert: startTag },
                    { from: range.to, insert: endTag },
                ],
                range: EditorSelection.range(range.from + startTag.length, range.to + startTag.length),
            };
        }
    }));
}

function applyHeadings (view) {
    view.dispatch(view.state.changeByRange(range => {
        const affectedLines = new Map();
        for (let i = range.from; i <= range.to; i++) {
            const line = view.state.doc.lineAt(i);
            affectedLines.set(line.number, line);
        }

        let start = range.from;
        let end = range.to;
        const changes = [];

        for (const line of affectedLines.values()) {
            const prefix = line.text.match(/^(#{1,6})(\s|$)/);
            const prevLen = prefix ? prefix[0].length : 0;
            let nextCount = 1;

            if (prefix) {
                const count = prefix[1].length;
                nextCount = count + 1;
                if (nextCount > 6) nextCount = 0;
            }

            const newPrefix = nextCount
                ? '#'.repeat(nextCount) + (prefix ? prefix[2] : ' ')
                : '';

            changes.push({
                from: line.from,
                to: line.from + prevLen,
                insert: newPrefix,
            });

            start += newPrefix.length - prevLen;
            end += newPrefix.length - prevLen;
        }

        return {
            changes,
            range: EditorSelection.range(start, end),
        };
    }));
}

function EditorBar ({ visible, rules, view, onChange, onPopout, onOpenHelp }) {
    const [actuallyVisible, setActuallyVisible] = useState(false);

    useEffect(() => {
        // we set visible with a delay so the animation can play
        setActuallyVisible(visible);
    }, [visible]);

    const buttons = [];

    const applyAction = apply => {
        apply(view);
        onChange(view.state.doc.toString());
    };

    for (const id in FORMAT_BUTTONS) {
        const btn = FORMAT_BUTTONS[id];
        if (!rules.includes(btn.rule)) continue;

        let shortcutLabel = locale.mdEditor.formatButtonShortcuts[id];
        if (shortcutLabel && navigator.userAgent.includes('Mac OS')) {
            shortcutLabel = shortcutLabel.replace(/⌃/g, '⌘');
        }

        buttons.push(
            <Button
                class="format-button"
                title={locale.mdEditor.formatButtons[id] + (shortcutLabel ? ` (${shortcutLabel})` : '')}
                // prevent focus stealing
                onTouchStart={e => e.preventDefault()}
                onMouseDown={e => e.preventDefault()}
                onClick={() => {
                    if (btn.request) {
                        const Request = btn.request;

                        const currentSelection = view.state.sliceDoc(
                            view.state.selection.main.from,
                            view.state.selection.main.to,
                        );

                        onPopout(({ closing, onClose }) => (
                            <div class={'format-button-request-container'
                                + (closing ? ' is-closing' : '')}>
                                <div class="format-button-request">
                                    <Request
                                        selection={currentSelection}
                                        onComplete={apply => {
                                            onClose();
                                            applyAction(apply);
                                        }} />
                                </div>
                            </div>
                        ));
                    } else applyAction(btn.apply);
                }}>
                {btn.icon}
            </Button>
        );
    }

    return (
        <div class={'markdown-text-field-editor-bar' + (actuallyVisible ? ' is-visible' : '')}>
            <div class="editor-bar-contents">
                {buttons}
                <div class="editor-bar-spacer" />
                <Button
                    title={locale.mdEditor.help.title}
                    class="help-button"
                    // prevent focus stealing
                    onTouchStart={e => e.preventDefault()}
                    onMouseDown={e => e.preventDefault()}
                    onClick={onOpenHelp}>
                    <HelpIcon />
                </Button>
            </div>
        </div>
    );
}

/** Renders all help. */
function AllHelp ({ rules }) {
    const sections = [];
    for (const rule in locale.mdEditor.help.rules) {
        if (rules.includes(rule)) sections.push(<HelpSection key={rule} rule={rule} />);
    }

    return (
        <div class="markdown-text-field-help">
            {sections}
        </div>
    );
}

const cachedHelpSections = {};
function HelpSection ({ rule }) {
    if (!cachedHelpSections[rule]) {
        const md = new Markdown();
        cachedHelpSections[rule] = md.render(locale.mdEditor.help.rules[rule]);
    }

    return (
        <div
            class="markdown-text-field-help-section"
            data-rule={rule}
            dangerouslySetInnerHTML={{ __html: cachedHelpSections[rule] }} />
    );
}
