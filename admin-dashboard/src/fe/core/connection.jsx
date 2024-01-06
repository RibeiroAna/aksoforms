import { h, Component } from 'preact';
import { createContext, forwardRef } from 'preact/compat';

/** This context contains a reference to the core worker interface (see worker.js). */
export const coreContext = createContext();

/**
 * Connects a component to a core view.
 *
 * If viewArgs[0] is a function, it will be passed the component props and must return an array of
 * arguments. Then viewArgs[1] may also be an array of prop names which will be shallow-compared
 * and, if they were changed, will cause the view to reload.
 *
 * @deprecated use the `useDataView` hook (from ./index), which is less jank
 */
export const connect = (...viewArgs) => (map = (id => id)) => Comp => {
    class InnerConnection extends Component {
        static contextType = coreContext;

        view = { data: null };
        state = { data: null, error: null, loaded: false };

        componentDidMount () {
            if (typeof viewArgs[0] === 'function') {
                this.view = this.context.createDataView(...(viewArgs[0](this.props)));
            } else this.view = this.context.createDataView(...viewArgs);
            this.view.on('update', this.#onUpdate);
            this.view.on('error', this.#onError);
            this.boundCore = this.context;
        }

        componentDidUpdate (prevProps) {
            if (this.context !== this.boundCore) {
                // core was destroyed and recreated! (e.g. because of a logout)
                // we need to reset the connection
                this.view = null;
            }

            if (typeof viewArgs[0] === 'function' && Array.isArray(viewArgs[1])) {
                let didChange = !this.view;
                for (const key of viewArgs[1]) {
                    if (prevProps[key] !== this.props[key]) {
                        didChange = true;
                        break;
                    }
                }

                if (didChange) {
                    this.view?.drop();
                    this.view = this.context.createDataView(...(viewArgs[0](this.props)));
                    this.view.on('update', this.#onUpdate);
                    this.view.on('error', this.#onError);
                    this.boundCore = this.context;
                }
            } else if (!this.view) {
                this.view?.drop();
                this.view = this.context.createDataView(...viewArgs);
                this.view.on('update', this.#onUpdate);
                this.view.on('error', this.#onError);
                this.boundCore = this.context;
            }
        }

        #onUpdate = data => {
            if (this.view.isDropped) return;
            this.setState({ data, loaded: true, error: null });
        };
        #onError = error => this.setState({ error });

        componentWillUnmount () {
            if (this.view) this.view.drop();
        }

        render () {
            const props = { ...this.props, ...map(this.view.data, this.context, this.state.error, this.state.loaded) };
            props.ref = props.coreConnForwardedRef;
            delete props.coreConnForwardedRef;
            return <Comp {...props} />;
        }
    }

    return forwardRef((props, ref) => <InnerConnection {...props} coreConnForwardedRef={ref} />);
};
