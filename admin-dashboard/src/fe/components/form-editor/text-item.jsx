import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import Segmented from '../controls/segmented';
import MdField from '../controls/md-field';
import { ScriptableString } from './script-expr';
import { evalExpr } from './model';
import { formEditor as locale } from '../../locale';
import TemplatingPopup, { TemplatingContext } from '../cm-templating-popup';
import { templateMarkings } from '../cm-templating';
import './text-item.less';

const RULES = [
    'blockquote', 'code', 'heading', 'hr', 'table', 'emphasis', 'image', 'link', 'list', 'strikethrough',
];

export default class TextItem extends PureComponent {
    changeType = type => {
        const currentType = (typeof this.props.item.text === 'string') ? 'text' : 'script';
        if (type === currentType) return;
        if (type === 'text') {
            let string = '';
            if (this.props.item.text.t === 's') {
                // string expr
                string = this.props.item.text.v;
            }
            this.props.onChange({ ...this.props.item, text: string });
        } else if (type === 'script') {
            this.props.onChange({
                ...this.props.item,
                text: { t: 's', v: this.props.item.text },
            });
        }
    };

    templatingContext = TemplatingContext.create();
    mdField = createRef();

    getKnownVars = () => {
        const knownVars = new Set();
        for (const item of this.props.previousNodes) {
            for (const k of Object.keys(item.defs)) {
                if (k.startsWith('_')) continue;
                knownVars.add(k);
            }
            for (const { name } of item.formVars) {
                knownVars.add('@' + name);
            }
        }
        return knownVars;
    };

    extensions = [templateMarkings({}, this.getKnownVars)];

    onFocus = () => {
        this.templatingContext.didFocus(this);
    };

    onBlur = () => {
        this.templatingContext.didBlur(this);
    };

    insertString (str) {
        const { view } = this.mdField.current.editor.current;
        view.dispatch(view.state.replaceSelection(str));
    }

    render ({ item, onChange, editing, editable, isEditingContext, hasValues }) {
        let contents = null;
        let knownItems = new Set();

        if (editing) {
            knownItems = this.getKnownVars();

            contents = <MdField
                ref={this.mdField}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                editing={editing}
                rules={RULES}
                value={item.text}
                onChange={text => onChange({ ...item, text })}
                extensions={this.extensions} />;
        } else if (isEditingContext && !hasValues) {
            contents = (
                <MdField
                    key="editor-preview"
                    class="expr-preview"
                    rules={RULES}
                    value={item.text} />
            );
        } else {
            const emptyString = Symbol('empty string');
            const emptyStringDefs = {
                defs: { [emptyString]: { t: 's', v: '' } },
                formVars: [],
            };

            const ifRegex = /\{\{#if\s+(.+?)}}(.+?)(?:\{\{#else}}(.+?))?\{\{\/if}}/gs;
            const identifierRegex = /\{\{([^#/].*?)}}/gs;

            const renderedText = (item.text || '')
                .replace(ifRegex, (m, cond, body, body2) => {
                    try {
                        const condValue = evalExpr({
                            t: 'c',
                            f: 'id',
                            a: [cond],
                        }, this.props.previousNodes);
                        if (condValue) {
                            return body;
                        } else {
                            return body2;
                        }
                    } catch {
                        return `<?${cond} ? ${body} : ${body2}?>`;
                    }
                })
                .replace(identifierRegex, (m, id) => {
                    const expr = {
                        t: 'c',
                        f: '++',
                        a: [emptyString, id],
                    };
                    try {
                        return evalExpr(expr, this.props.previousNodes.concat(emptyStringDefs));
                    } catch {
                        return `<?${id}?>`;
                    }
                });

            contents = (
                <MdField
                    key="preview"
                    class="expr-preview"
                    rules={RULES}
                    value={renderedText} />
            );
        }

        return (
            <TemplatingContext.Provider value={this.templatingContext}>
                <div class="form-editor-text-item">
                    {contents}
                    <TemplatingPopup
                        title={locale.templating.insertTitle}
                        varName={name => name}
                        knownItems={knownItems}
                        item={item}
                        editing={editing} />
                </div>
            </TemplatingContext.Provider>
        );
    }
}
