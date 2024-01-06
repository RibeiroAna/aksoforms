import { h } from 'preact';
import { createRef, PureComponent } from 'preact/compat';
import { Button } from 'yamdl';
import CodeIcon from '@material-ui/icons/Code';
import { RawExprView } from './script-views';
import ScriptContext from './script-context';

function isProbablyExpr (value) {
    return value !== null && !Array.isArray(value) && typeof value === 'object';
}

/**
 * A scriptable value. Always presents itself as an AKSO Script value regardless of actual
 * representation. Will try to stick to normal JS values instead of AKSO Script if possible.
 */
export class ScriptableValue extends PureComponent {
    static contextType = ScriptContext;

    node = createRef(null);

    castValue (v) {
        // override in subclasses
        return v;
    }

    simplifyValue (v) {
        if (isProbablyExpr(v)) {
            if (v.t === 'u') return null;
            else if (v.t === 'b') return v.v;
            else if (v.t === 'n') return v.v;
            else if (v.t === 's') return v.v;
            else if (v.t === 'm') return v.v;
        }
        return v;
    }

    getValue () {
        const value = this.castValue(this.simplifyValue(this.props.value));

        if (value === null) {
            return { t: 'u' };
        } else if (typeof value === 'boolean') {
            return { t: 'b', v: value };
        } else if (typeof value === 'number') {
            return { t: 'n', v: value };
        } else if (typeof value === 'string') {
            return { t: 's', v: value };
        } else if (Array.isArray(value)) {
            return { t: 'm', v: value };
        } else if (isProbablyExpr(value)) {
            // an actual akso script value probably
            return value;
        }
        return { t: 'u' };
    }

    onClick = () => {
        if (this.props.disabled) return;
        const v = this.simplifyValue(this.props.value);
        this.beginEditing(v).then(v => this.props.onChange(this.simplifyValue(v))).catch(() => {});
    };

    async beginEditing (value) {
        if (value === null) return value;
        else if (typeof value === 'boolean') return !value;
        this.openEditor();
        return value;
    }

    openEditor = () => {
        const previousNodes = this.props.ctx && this.props.ctx.previousNodes;

        const nodeRect = this.node.current.getBoundingClientRect();
        const location = [nodeRect.left, nodeRect.top];
        this.context.openExpr(this.getValue() || ({ t: 'null' }), {
            location,
            previousNodes,
        }).then(value => {
            this.props.onChange(this.castValue(this.simplifyValue(value)));
        });
    };

    render ({ ctx, disabled }) {
        return (
            <div class="form-editor-scriptable-value" ref={this.node}>
                <RawExprView
                    onClick={this.onClick}
                    expr={this.getValue()}
                    previousNodes={ctx && ctx.previousNodes} />
                {!disabled && (
                    <Button class="edit-script-button" icon small onClick={this.openEditor}>
                        <CodeIcon style={{ verticalAlign: 'middle' }} />
                    </Button>
                )}
            </div>
        );
    }
}

/** - value: bool or AKSO Script ref */
export class ScriptableBool extends ScriptableValue {
    castValue (v) {
        // TODO: cast expr too
        if (isProbablyExpr(v)) return v;
        return !!v;
    }
}

export class ScriptableString extends ScriptableValue {
    castValue (v) {
        // TODO: cast expr too
        if (isProbablyExpr(v)) return v;
        return '' + v;
    }
}
