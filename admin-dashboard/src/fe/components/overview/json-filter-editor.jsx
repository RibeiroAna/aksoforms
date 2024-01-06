import { h, createRef } from 'preact';
import { lazy, Suspense, PureComponent } from 'preact/compat';
import CodeMirror from '../codemirror-themed';
import {
    Decoration,
    EditorView,
    ViewPlugin,
    MatchDecorator,
    WidgetType,
} from '@codemirror/view';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import JSON5 from 'json5';
import { Dialog, Button } from 'yamdl';
import HelpIcon from '@material-ui/icons/Help';
import { search as locale } from '../../locale';
import './json-filter-editor.less';

const MdField = lazy(() => import('../controls/md-field'));

const DEFAULT_VALUE = '{\n\t\n}'; // must be equal to {}

// ID string used to identify our filter source format
// -- SOURCE FORMAT --
// source: { repr: AKSO_REPR, fragments: <fragments> }
// where <fragments> is an array of objects like { type: string, value: string }
// - type 'text': contains regular source text
// - type 'expr': contains a template expression
const AKSO_REPR = 'org.akso.admin.v1';
// delimiter we use in our CodeMirror source string to delimit templates
const EXPR_START = '<<<{';
const EXPR_END = '}>>>';

// template expressions { [expression]: value }
const EXPRS = {
    currentYear: () => new Date().getFullYear().toString(),
    lastYear: () => (new Date().getFullYear() - 1).toString(),
    nextYear: () => (new Date().getFullYear() + 1).toString(),
    currentDate: () => "'" + new Date().toISOString().split('T')[0] + "'",
};

function evalExpr (expr) {
    if (expr in EXPRS) return EXPRS[expr]();
    return '0';
}

// template markings: additional syntax highlighting for AKSO JSON templates
// (e.g. "this year")
class TemplateMarkingWidget extends WidgetType {
    constructor (expr) {
        super();
        this.expr = expr;
    }

    eq (other) {
        return this.expr === other.expr;
    }

    toDOM () {
        const node = document.createElement('span');
        if (EXPRS[this.expr]) {
            node.className = 'akso-json-marked-atom';
            node.textContent = locale.json.exprs[this.expr];
        } else {
            node.className = 'akso-json-marked-atom is-invalid';
            node.textContent = `?${this.expr}?`;
        }
        return node;
    }
}

const templateMarkingMatcher = new MatchDecorator({
    regexp: new RegExp(EXPR_START + '(.*?)' + EXPR_END, 'g'),
    decoration: match => Decoration.replace({
        widget: new TemplateMarkingWidget(match[1]),
    }),
});

const templateMarkings = ViewPlugin.fromClass(class {
    constructor (view) {
        this.markings = templateMarkingMatcher.createDeco(view);
    }
    update (update) {
        this.markings = templateMarkingMatcher.updateDeco(update, this.markings);
    }
}, {
    decorations: instance => instance.markings,
    provide: plugin => EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.markings || Decoration.none;
    }),
});

// inline errors
const addLineErrorMarks = StateEffect.define();
const clearLineErrorMarks = StateEffect.define();
const lineErrorMarks = StateField.define({
    create () {
        return Decoration.none;
    },
    update (value, tr) {
        // don’t need to map because it’ll be overridden anyway
        // value = value.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(addLineErrorMarks)) {
                value = value.update({ add: effect.value, sort: true });
            } else if (effect.is(clearLineErrorMarks)) {
                value = value.update({ filter: () => false });
            }
        }
        return value;
    },
    provide: f => EditorView.decorations.from(f),
});
class LineErrorWidget extends WidgetType {
    constructor (error) {
        super();
        this.error = error;
    }

    eq (other) {
        return this.error === other.error;
    }

    toDOM () {
        const node = document.createElement('div');
        node.className = 'json-error-message';
        node.textContent = this.error.message;
        return node;
    }
}

/**
 * JSON editor for advanced search filters.
 *
 * # Props
 * - value/onChange: object value
 * - expanded: bool
 * - onCollapse: callback
 * - disabled: disabled state
 * - suppressInitialRoundTrip: set to true to prevent onChange when initializing
 * - enableTemplates: bool - true to enable templating variables
 */
export default class JSONFilterEditor extends PureComponent {
    state = {
        helpOpen: false,
    };

    /** Serializes the object value into a string value. */
    loadStringValue () {
        const value = { ...this.props.value };
        delete value._disabled;
        let stringified = JSON5.stringify(value, undefined, 4);
        if (stringified === '{}') stringified = DEFAULT_VALUE;
        this.setState({ value: stringified });
    }

    toCMSource (value) {
        let source;
        if (!value.source || value.source.repr !== AKSO_REPR) {
            let stringified = JSON5.stringify(value.filter, undefined, '\t');
            if (stringified === '{}') stringified = DEFAULT_VALUE;
            source = {
                repr: AKSO_REPR,
                fragments: [{
                    type: 'text',
                    value: stringified,
                }],
            };
        } else {
            source = value.source;
        }

        return source.fragments.map(token => {
            if (token.type === 'text') return token.value;
            else if (token.type === 'expr') return EXPR_START + token.value + EXPR_END;
        }).join('');
    }

    onChange (cmSource) {
        let source = [];
        let rest = cmSource;
        let index;
        while ((index = rest.indexOf(EXPR_START)) !== -1) {
            const contentStart = index + EXPR_START.length;
            const contentLen = rest.substring(contentStart).indexOf(EXPR_END);
            if (contentLen === -1) {
                // no end! oh well
                source.push({ type: 'text', value: rest });
                rest = '';
            } else {
                if (index) {
                    source.push({ type: 'text', value: rest.substr(0, index) });
                }
                const exprContent = rest.substring(contentStart, contentStart + contentLen);
                source.push({ type: 'expr', value: exprContent });
                rest = rest.substring(contentStart + contentLen + EXPR_END.length);
            }
        }
        if (rest) source.push({ type: 'text', value: rest });

        if (!this.props.enableTemplates) {
            // convert all templates to regular text if they're not enabled
            source = [{
                type: 'text',
                value: source.map(({ type, value }) => {
                    if (type === 'text') return value;
                    else if (type === 'expr') return evalExpr(value);
                }).join(''),
            }];
        }

        const jsonString = source.map(({ type, value }) => {
            if (type === 'text') return value;
            else if (type === 'expr') return evalExpr(value);
        }).join('');
        const filter = this.validateJSON(jsonString) || {};
        this.props.onChange({
            ...this.props.value,
            source: {
                repr: AKSO_REPR,
                fragments: source,
            },
            filter,
        });
    }

    onInsertExpr = (expr) => {
        const { view } = this.editor.current;
        view.dispatch(view.state.replaceSelection(EXPR_START + expr + EXPR_END));
    };

    editor = createRef();

    validateJSON (value) {
        let error = null;
        let parsed;
        try {
            parsed = JSON5.parse(value);
        } catch (err) {
            const message = err.toString()
                .replace();

            error = {
                message,
                position: {
                    line: err.lineNumber - 1,
                    column: err.columnNumber - 1,
                },
            };
        }

        const { view } = this.editor.current;
        if (!view) {
            // try again later
            requestAnimationFrame(() => {
                this.validateJSON(value);
            });
            return;
        }

        view.dispatch({
            effects: clearLineErrorMarks.of(),
        });

        if (error) {
            let editorLine = view.state.doc.line(error.position.line + 1);
            if (!editorLine) editorLine = view.state.doc.line(view.state.doc.lines);

            if (error.position.line >= 0) {
                const lineDec = Decoration.line({
                    class: 'json-error-line',
                });
                const markDec = Decoration.mark({
                    class: 'json-error-mark',
                });
                view.dispatch({
                    effects: addLineErrorMarks.of([
                        lineDec.range(editorLine.from, editorLine.from),
                        markDec.range(
                            editorLine.from + error.position.column,
                            editorLine.from + error.position.column + 1,
                        ),
                    ]),
                });
            }

            const widget = Decoration.widget({
                block: true,
                side: 1,
                widget: new LineErrorWidget(error),
            });

            view.dispatch({
                effects: addLineErrorMarks.of([
                    widget.range(editorLine.to, editorLine.to),
                ]),
            });
        }

        return parsed;
    }

    componentDidMount () {
        if (!this.props.suppressInitialRoundTrip) {
            // update template variables and detect errors by doing a round-trip
            this.onChange(this.toCMSource(this.props.value));
        }
    }

    render () {
        const { value, disabled, enableTemplates } = this.props;
        const cmSource = this.toCMSource(value);

        return (
            <div
                class={'json-filter-editor' + (this.props.expanded ? '' : ' collapsed')}
                onClick={e => e.stopPropagation()}>
                <Button
                    icon
                    class="json-editor-help-button"
                    onClick={() => this.setState({ helpOpen: true })}>
                    <HelpIcon />
                </Button>
                <CodeMirror
                    ref={this.editor}
                    value={cmSource}
                    onChange={v => this.onChange(v)}
                    forceDark
                    readOnly={disabled}
                    basicSetup={{
                        // we're using javascript syntax but we don't want full JS autocompletion
                        autocompletion: false,
                        // this breaks selection for some reason
                        highlightActiveLine: false,
                    }}
                    extensions={[
                        javascript(),
                        templateMarkings,
                        lineErrorMarks,
                        EditorState.tabSize.of(4),
                        indentUnit.of('\t'),
                        EditorView.lineWrapping,
                    ]} />
                {enableTemplates && (
                    <div class="json-templates-container">
                        <JsonTemplates onInsert={this.onInsertExpr} />
                    </div>
                )}
                <Dialog
                    open={this.state.helpOpen}
                    onClose={() => this.setState({ helpOpen: false })}
                    fullScreen={width => width < 500}
                    title={locale.json.help.title}>
                    <Suspense fallback="…">
                        <MdField
                            rules={['link', 'list', 'image']}
                            value={locale.json.help.content} />
                    </Suspense>
                </Dialog>
            </div>
        );
    }
}

function JsonTemplates ({ onInsert }) {
    return (
        <div class="json-templates">
            <div class="inner-title">
                {locale.json.exprs.title}
            </div>
            <div class="inner-buttons">
                {Object.keys(EXPRS).map(id => (
                    <Button
                        key={id}
                        onClick={() => {
                            onInsert(id);
                        }}
                        class="expr-button">
                        {locale.json.exprs[id]}
                    </Button>
                ))}
            </div>
        </div>
    );
}
