import { h } from 'preact';
import { createRef, PureComponent } from 'preact/compat';
import { Window, ExprView, DefsView, RenderViewRoot, viewPool, model } from '@tejo/akso-script-editor';
import ResizeObserver from 'resize-observer-polyfill';
import './script-views.less';

/**
 * Mounts an ASCE view root in a react component.
 * - init: () => ViewRoot
 * - deinit: optional (ViewRoot) => void
 */
class MountedViewRoot extends PureComponent {
    mountPoint = createRef(null);

    componentDidMount () {
        this.viewRoot = this.props.init();
        this.mountPoint.current.appendChild(this.viewRoot.node);
    }

    componentWillUnmount () {
        if (this.props.deinit) this.props.deinit(this.viewRoot);
    }

    render ({ init, deinit, ...extra }) {
        void init, deinit;
        return (
            <div
                {...extra}
                class={'form-editor-render-view-root ' + (extra.class || '')}
                ref={this.mountPoint} />
        );
    }
}

/**
 * Shows an expression.
 *
 * # Props
 * - expr: expression to show. Should be a raw AKSO Script expression (i.e. not an editor expr)
 * - editorExpr: ctx => expr, editor expression to show (override)
 * - init/deinit: callbacks
 */
export class RawExprView extends PureComponent {
    getEditorExpr () {
        if (this.props.editorExpr) return this.props.editorExpr(this.modelCtx);
        const key = 'key';
        const rawExprRoot = model.fromRawDefs({ [key]: this.props.expr }, this.modelCtx);
        let keyDef;
        for (const def of rawExprRoot.defs) {
            if (def.name === key) {
                keyDef = def;
                break;
            }
        }
        if (!keyDef) return null; // ???
        const expr = keyDef.expr;
        if (!expr) return null;
        model.resolveRefs(rawExprRoot, true);
        return expr;
    }

    init = () => {
        this.root = new RenderViewRoot();
        this.root.setOverflow('visible');
        this.modelCtx = model.createContext();
        this.modelCtx.onMutation(node => {
            const view = viewPool.get(node);
            if (view) view.needsLayout = true;
        });
        this.exprView = new ExprView(this.getEditorExpr());
        this.exprView.needsLayout = true;
        this.updateExtRefs();
        this.root.pushWindow(this.exprView);
        if (this.props.init) this.props.init(this.exprView, this.root);
        return this.root;
    };

    deinit = () => {
        this.root.destroy();
    };

    invalidateEditorExpr () {
        this.exprView.expr = this.getEditorExpr();
        this.updateExtRefs();
        this.exprView.needsLayout = true;
    }

    updateExtRefs () {
        const previousNodes = this.props.previousNodes;
        if (previousNodes) {
            const previousDefs = previousNodes
                .filter(x => x)
                .map(node => node.defs)
                .filter(x => Object.keys(x).length);
            const formVars = previousNodes
                .filter(x => x)
                .flatMap(node => node.formVars);
            this.modelCtx.externalDefs = previousDefs;
            this.modelCtx.formVars = formVars;
        }
        this.modelCtx.notifyExternalDefsMutation();
        this.modelCtx.notifyFormVarsMutation();
        const defs = {
            type: 'd',
            defs: new Set(),
            floatingExpr: new Set(),
            ctx: this.modelCtx,
        };
        const def = { type: 'ds', name: '___', expr: this.exprView.expr, ctx: this.modelCtx };
        defs.defs.add(def);
        model.resolveRefs(defs);
        this.exprView.needsLayout = true;
    }

    componentDidUpdate (prevProps) {
        if (prevProps.expr !== this.props.expr) {
            this.exprView.expr = this.getEditorExpr();
            this.exprView.needsLayout = true;
        }
        if (prevProps.previousNodes !== this.props.previousNodes) {
            this.updateExtRefs();
        }
    }

    render ({ init, deinit, expr, previousNodes, ...props }) {
        void init, deinit, expr, previousNodes;
        return (
            <MountedViewRoot
                {...props}
                key={expr && expr.t} // workaround for render bug when changing types
                class={'form-editor-raw-expr-view ' + (props.class || '')}
                init={this.init}
                deinit={this.deinit} />
        );
    }
}

/**
 * Shows the name of a ref.
 *
 * - name: string
 * - def: bool
 */
export class RefNameView extends PureComponent {
    init = (exprView) => {
        this.exprView = exprView;
        exprView._isDemo = true;
        if (this.props.def) exprView.isDef = true;
    };
    rawExprView = createRef();
    componentDidUpdate (prevProps) {
        if (prevProps.name !== this.props.name) {
            this.rawExprView.current.invalidateEditorExpr();
        }
    }
    render ({ name, def, ...props }) {
        void def;
        // use a fake editor expr
        return (
            <RawExprView
                {...props}
                init={this.init}
                ref={this.rawExprView}
                editorExpr={ctx => ({ type: 'r', name, ctx })} />
        );
    }
}

/**
 * Shows a preview of defs in the given script object.
 *
 * # Props
 * - script: raw script object
 * - previousNodes: previous nodes
 */
export class DefsPreview extends PureComponent {
    init = () => {
        this.root = new RenderViewRoot();
        this.modelCtx = model.createContext();
        this.modelCtx.onMutation(node => {
            const view = viewPool.get(node);
            if (view) view.needsLayout = true;
        });
        this.defs = model.fromRawDefs(this.props.script, this.modelCtx);
        this.updateExtRefs();
        model.resolveRefs(this.defs, true);
        this.defsView = new DefsView(this.defs);
        this.window = new Window();
        this.window.addSubview(this.defsView);
        this.updateWindowSize();
        this.root.pushWindow(this.window);
        return this.root;
    };

    updateExtRefs () {
        const previousNodes = this.props.previousNodes;
        if (previousNodes) {
            const previousDefs = previousNodes
                .filter(x => x)
                .map(node => node.defs)
                .filter(x => Object.keys(x).length);
            const formVars = previousNodes
                .filter(x => x)
                .flatMap(node => node.formVars);
            this.modelCtx.externalDefs = previousDefs;
            this.modelCtx.formVars = formVars;
        }
        model.resolveRefs(this.defs);
        this.modelCtx.notifyExternalDefsMutation();
        this.modelCtx.notifyFormVarsMutation();
        if (this.defsView) {
            this.defsView.needsValueUpdate = true;
            this.defsView.needsLayout = true;
        }
    }

    deinit = () => {
        this.root.destroy();
    };

    node = createRef();

    componentDidMount () {
        this.resizeObserver = new ResizeObserver(() => this.updateWindowSize());
        this.resizeObserver.observe(this.node.current);
        this.updateWindowSize();
    }

    updateWindowSize () {
        if (!this.node.current || !this.window) return;
        this.window.size = [
            this.node.current.offsetWidth,
            this.node.current.offsetHeight,
        ];
    }

    componentDidUpdate (prevProps) {
        if (prevProps.script !== this.props.script) {
            this.defs = model.fromRawDefs(this.props.script, this.modelCtx);
            model.resolveRefs(this.defs, true);
            this.defsView.defs = this.defs;
            this.defsView.needsValueUpdate = true;
            this.defsView.needsLayout = true;
        }
        if (prevProps.previousNodes !== this.props.previousNodes) {
            // FIXME: this is probably way too often
            this.updateExtRefs();
        }
    }

    render ({ script, previousNodes, ...props }) {
        void script, previousNodes;
        return (
            <div
                {...props}
                class={'form-editor-defs-preview-container ' + (props.class || '')}
                ref={this.node}>
                <MountedViewRoot
                    class="form-editor-defs-preview"
                    init={this.init}
                    deinit={this.deinit} />
            </div>
        );
    }
}
