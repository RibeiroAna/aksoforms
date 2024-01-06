import { PureComponent } from 'preact/compat';

/**
 * An event proxy---essentially just binds events for the lifetime of the preact node.
 *
 * # Props
 * - target: target EventEmitter
 * - dom: bool, if true will use addEventListener/removeEventListener instead of on/removeListener
 *   (must be invariant)
 * - on(.*): binds the given function to (1)
 */
export default class EventProxy extends PureComponent {
    #previousTarget;
    #eventHandlers = new Map();

    componentDidMount () {
        this.componentDidUpdate();
    }

    componentDidUpdate () {
        if (this.#previousTarget) this.#unbindEvents(this.#previousTarget);
        this.#bindEvents(this.props.target);
        this.#previousTarget = this.props.target;
    }

    componentWillUnmount () {
        if (this.#previousTarget) this.#unbindEvents(this.#previousTarget);
    }

    #bindEvents = (target) => {
        const fnName = this.props.dom ? 'addEventListener' : 'on';
        for (const id in this.props) {
            if (id.startsWith('on')) {
                const eventName = id.substr(2);
                target[fnName](eventName, this.props[id]);
                this.#eventHandlers.set(eventName, this.props[id]);
            }
        }
    };

    #unbindEvents = (target) => {
        const fnName = this.props.dom ? 'removeEventListener' : 'removeListener';
        for (const [event, listener] of this.#eventHandlers) {
            target[fnName](event, listener);
        }
    };

    render () {
        return null;
    }
}
