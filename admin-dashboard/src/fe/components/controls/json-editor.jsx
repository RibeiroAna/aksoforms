import { h, createRef, Component } from 'preact';
import JSON5 from 'json5';
import CodeMirror from '../codemirror-themed';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import '../overview/json-filter-editor.less';

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
 * This editor edits a raw JSON serialized string.
 *
 * # Props
 * - value/onChange: string value
 * - disabled: if true, will be read-only
 * - strict: if true, will use JSON instead of JSON5
 */
export default class JSONEditor extends Component {
    editor = createRef();

    validateJSON (value) {
        let error = null;
        try {
            if (this.props.strict) {
                JSON.parse(value);
            } else {
                JSON5.parse(value);
            }
        } catch (err) {
            const message = err.toString();

            error = {
                message,
                position: { line: 0, column: 0 },
            };

            if (this.props.strict) {
                const lineColGuess = message.match(/at\s+(\d+):(\d+)/)
                    || message.match(/at\s+line\s+(\d+)\s+column\s+(\d+)/);

                if (lineColGuess) {
                    error.position.line = +lineColGuess[1] - 1;
                    error.position.column = +lineColGuess[2] - 1;
                }
            } else {
                error.position.line = err.lineNumber - 1;
                error.position.column = err.columnNumber - 1;
            }
        }

        const { view } = this.editor.current;

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
    }

    onChange (jsonString) {
        this.validateJSON(jsonString);
        this.props.onChange(jsonString);
    }

    render ({ value, disabled }) {
        return (
            <div
                class="json-editor"
                onClick={e => e.stopPropagation()}>
                <CodeMirror
                    ref={this.editor}
                    value={value}
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
                        lineErrorMarks,
                        EditorState.tabSize.of(4),
                        indentUnit.of('\t'),
                        EditorView.lineWrapping,
                    ]} />
            </div>
        );
    }
}
