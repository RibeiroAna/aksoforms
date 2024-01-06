import {
    Decoration,
    EditorView,
    ViewPlugin,
    WidgetType,
} from '@codemirror/view';
import { data as locale } from '../locale';
import './cm-templating.less';

// template markings: additional syntax highlighting for notif template variables
export class TemplateMarkingWidget extends WidgetType {
    constructor (varNames, expr, classes) {
        super();
        this.varNames = varNames;
        this.expr = expr;
        this.classes = classes || '';
    }

    eq (other) {
        return this.expr === other.expr;
    }

    toDOM () {
        const node = document.createElement('span');
        node.className = 'akso-cm-template-marked-atom';

        const contents = this.expr;

        if (contents === '#else') {
            node.className += ' is-condition';
            node.textContent = locale.cmTemplating.condition.else;
        } else if (contents === '/if') {
            node.className += ' is-condition';
            node.textContent = locale.cmTemplating.condition.end;
        } else if (contents.startsWith('@')) {
            node.className += ' is-form-var';
            node.textContent = this.varNames[contents.substr(1)] || contents.substr(1);
        } else {
            node.className += ' is-script-var';
            node.textContent = contents;
        }
        if (this.classes) node.className += ' ' + this.classes;

        return node;
    }
}

export class ConditionStartWidget extends WidgetType {
    constructor (knownVars, varNames, expr, onChange) {
        super();
        this.knownVars = knownVars;
        this.varNames = varNames;
        this.expr = expr;
        this.onChange = onChange;
    }

    eq (other) {
        return this.expr === other.expr;
    }

    toDOM () {
        const node = document.createElement('span');
        node.className = 'akso-cm-template-marked-atom is-condition';

        const innerNode = document.createElement('select');

        for (const k of this.knownVars) {
            const option = document.createElement('option');
            option.value = k;
            option.textContent = k.startsWith('@') ? (this.varNames[k.substr(1)] || k) : k;
            innerNode.appendChild(option);
        }
        innerNode.value = this.expr;

        if (this.expr.startsWith('@')) {
            innerNode.className = 'inner-node is-form-var';
        } else {
            innerNode.className = 'inner-node is-script-var';
        }

        innerNode.addEventListener('change', () => {
            this.onChange(innerNode.value);
        });

        const prefix = document.createElement('span');
        const suffix = document.createElement('span');

        prefix.textContent = locale.cmTemplating.condition.if;
        suffix.textContent = locale.cmTemplating.condition.then;

        node.appendChild(prefix);
        node.appendChild(innerNode);
        node.appendChild(suffix);

        requestAnimationFrame(() => {
            // set a default value if none exists
            if (!this.expr) this.onChange([...this.knownVars][0] || '');
        });

        return node;
    }
}

const HANDLEBARS_CHARACTERS = '#/';

// inline errors & template markings
export function decoTemplateMarkings (varNames, knownVars, view) {
    const markings = [];

    for (let ln = 1; ln <= view.state.doc.lines; ln++) {
        const line = view.state.doc.line(ln);

        let error = null;
        let errorRange = null;

        let remaining = line.text;
        let ch = 0;
        while (remaining) {
            let m1 = remaining.match(/\{\{#if\s+([^{}]*?)\}\}/);
            let m2 = remaining.match(/\{\{([^{}]*?)\}\}/);

            if (m1 && m2) {
                if (m1.index <= m2.index) m2 = null;
                else m1 = null;
            }

            if (m1) {
                const m = m1;
                ch += m.index;
                const templateRange = [line.from + ch, line.from + ch + m[0].length];

                remaining = remaining.substr(m.index + m[0].length);
                ch += m[0].length;

                const contents = m[1].trim();
                if (contents && !knownVars.has(contents)) {
                    error = locale.mdEditor.templating.unknownVar(contents);
                    errorRange = templateRange;
                    break;
                }

                const deco = Decoration.replace({
                    widget: new ConditionStartWidget(
                        knownVars,
                        varNames,
                        contents,
                        newContents => {
                            const newCond = `{{#if ${newContents}}}`;
                            view.dispatch({
                                changes: {
                                    from: templateRange[0],
                                    to: templateRange[1],
                                    insert: newCond,
                                },
                            });
                        },
                    ),
                });

                markings.push(deco.range(templateRange[0], templateRange[1]));
                continue;
            }

            if (m2) {
                const m = m2;
                ch += m.index;
                const templateRange = [line.from + ch, line.from + ch + m[0].length];

                const contents = m[1];
                if (!HANDLEBARS_CHARACTERS.includes(contents[0])) {
                    if (!knownVars.has(contents)) {
                        error = locale.mdEditor.templating.unknownVar(contents);
                        errorRange = templateRange;
                        break;
                    }
                }

                remaining = remaining.substr(m.index + m[0].length);
                ch += m[0].length;

                const deco = Decoration.replace({
                    widget: new TemplateMarkingWidget(varNames, contents),
                });

                markings.push(deco.range(templateRange[0], templateRange[1]));
                continue;
            }

            // no more matches
            break;
        }

        if (error) {
            const markDec = Decoration.mark({
                class: 'akso-cm-template-error-mark',
            });
            markings.push(
                markDec.range(
                    errorRange[0],
                    errorRange[1],
                ),
            );
        }
    }

    markings.sort((a, b) => a.from - b.from);

    return Decoration.set(markings);
}

export const templateMarkings = (varNames, getKnownVars) => ViewPlugin.fromClass(class {
    constructor (view) {
        this.markings = decoTemplateMarkings(varNames, getKnownVars(), view);
    }
    update (update) {
        if (update.docChanged || update.viewportChanged) {
            this.markings = decoTemplateMarkings(varNames, getKnownVars(), update.view);
        }
    }
}, {
    decorations: instance => instance.markings,
    provide: plugin => EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.markings || Decoration.none;
    }),
});
