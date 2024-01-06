import { createRef, h } from 'preact';
import { PureComponent, createContext } from 'preact/compat';
import { RtSpring, ElementAnimationController } from 'yamdl';
import EventProxy from '../utils/event-proxy';

export const layoutContext = createContext();

/**
 * Animates changes in height to fit children.
 *
 * # Caveats
 * Assumes all children will be laid out vertically without overlapping.
 * Does not support children with margins.
 * Does not always detect children resizing (especially 2nd-order children). Use the layoutContext
 * to signal changes if necessary.
 *
 * # Props
 * - useCooldown: bool
 *    - lastChangeTime: number
 *    - cooldown: cooldown time
 * - useFirstHeight: bool
 * - lazy: bool - if true, will not add a `height` style if no animation is happening
 */
export default class DynamicHeightDiv extends PureComponent {
    static contextType = layoutContext;

    resizeObserver = new ResizeObserver(() => {
        this.updateHeight();
    });
    // TODO

    #height = new RtSpring({ period: 0.5 });
    #node = createRef();
    #animCtrl = new ElementAnimationController(({ height }) => {
        return { height: height + 'px' };
    }, this.#node, {
        useAnimationFillForwards: !this.props.lazy,
    });

    updateHeight = () => {
        if (!this.#node.current) return;
        const height = [...this.#node.current.children]
            .map(child => child.offsetHeight)
            .reduce((a, b) => a + b, 0);
        this.#height.setTarget(height);

        if (!this._usedFirstHeight && this.props.useFirstHeight) {
            this._usedFirstHeight = true;
            this.#height.setValue(this.#height.target);
        }

        this.#animCtrl.setInputs({ height: this.#height });
    };

    #scheduledUpdate;
    #ffScheduledUpdate;
    scheduleUpdate = () => {
        clearTimeout(this.#scheduledUpdate);
        clearTimeout(this.#ffScheduledUpdate);

        const now = Date.now();
        const nextUpdateTime = this.props.useCooldown
            ? Math.max(now + 1, this.props.lastChangeTime + this.props.cooldown)
            : now + 1;

        this.#scheduledUpdate = setTimeout(this.updateHeight, nextUpdateTime - now);
        // also a schedule update further in the future
        // because sometimes layout may be just a tad off
        this.#ffScheduledUpdate = setTimeout(this.updateHeight, nextUpdateTime - now + 1000);
    };

    componentDidMount () {
        this.#animCtrl.didMount();
        this.updateHeight();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.children !== this.props.children) this.scheduleUpdate();
        this.#animCtrl.useAnimationFillForwards = !this.props.lazy;
        if (prevProps.lazy !== this.props.lazy) this.#animCtrl.resolve();
    }

    componentWillUnmount () {
        this.#animCtrl.drop();
        clearTimeout(this.#scheduledUpdate);
        clearTimeout(this.#ffScheduledUpdate);
    }

    render ({ useCooldown, useFirstHeight, lazy, ...props }) {
        void useCooldown;
        void useFirstHeight;

        const style = props.style || {};
        if (!lazy) {
            style.height = this.#height.getValue();
        }

        return (
            <div {...props} ref={this.#node} style={style}>
                <EventProxy dom target={window} onresize={this.updateHeight} />
                <layoutContext.Provider value={this.scheduleUpdate}>
                    {props.children}
                </layoutContext.Provider>
            </div>
        );
    }
}
