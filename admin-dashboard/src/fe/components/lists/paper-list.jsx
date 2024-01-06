import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring, globalAnimator } from 'yamdl';
import ResizeObserver from 'resize-observer-polyfill';
import './paper-list.less';

const lerp = (a, b, x) => (b - a) * x + a;
const clamp = (x, l, h) => Math.max(l, Math.min(x, h));

const DAMPING = 1;
const RESPONSE = 0.4;
const USE_SCALE = true;

/**
 * Renders a vertical array of animatable material paper.
 *
 * # Props
 * - children: array of objects with, uh, various properties (TODO: docs)
 */
export default class PaperList extends PureComponent {
    /** ResizeObserver that observes all children. */
    resizeObserver = new ResizeObserver(() => globalAnimator.register(this));

    childNodes = [];
    childStates = [];

    update (deltaTime, setInitialState) {
        // sync childStates count with child count
        while (this.childStates.length < this.props.children.length) {
            const lastState = this.childStates[this.childStates.length - 1];
            const child = this.props.children[this.childStates.length];

            const y = new Spring(DAMPING, RESPONSE);
            y.value = y.target = lastState ? lastState.y.value : 0;
            const height = new Spring(DAMPING, RESPONSE);
            height.value = height.target = 0;
            const hidden = new Spring(DAMPING, RESPONSE);
            hidden.value = hidden.target = child.hidden ? 1 : 0;

            const forceUpdate = () => this.forceUpdate();
            y.on('update', forceUpdate);
            height.on('update', forceUpdate);
            hidden.on('update', forceUpdate);

            this.childStates.push({ y, height, hidden });
        }

        while (this.childStates.length > this.props.children.length) {
            this.childStates.pop();
        }

        let wantsUpdate = false;

        let yAccum = 0;
        let i = 0;
        for (const state of this.childStates) {
            const index = i++;
            const child = this.props.children[index];

            if (!this.childNodes[index]) {
                // FIXME: for some reason update is called even after the component was unmounted
                return;
            }

            state.hidden.target = child.hidden ? 1 : 0;

            const offsetHeight = this.childNodes[index].offsetHeight;

            state.y.target = lerp(yAccum, yAccum - offsetHeight / 2, state.hidden.value);
            state.height.target = offsetHeight;

            if (setInitialState) {
                state.y.value = state.y.target;
                state.height.value = state.height.target;
            }

            yAccum += offsetHeight * (1 - state.hidden.value);

            state.y.update(deltaTime);
            state.height.update(deltaTime);
            state.hidden.update(deltaTime);

            if (!wantsUpdate && (state.y.wantsUpdate() || state.height.wantsUpdate()
                || state.hidden.wantsUpdate())) {
                wantsUpdate = true;
            }
        }

        this.nodeHeight = yAccum;

        if (!wantsUpdate) {
            globalAnimator.deregister(this);
        }
    }

    /** Returns the style object for a child at the given index. */
    getChildStyle (index) {
        if (!this.childStates[index] || !this.childNodes[index]) return;
        const state = this.childStates[index];
        const childHeight = this.childNodes[index].offsetHeight;
        const scaleY = this.props.children[index].staticHeight
            ? 1
            : state.height.value / childHeight;
        const clipY = state.height.value < childHeight
            ? `inset(0 0 ${childHeight - state.height.value} 0)`
            : null;
        const baseOpacity = 1 - state.hidden.value;
        const opacity = clamp(baseOpacity * 3 - 2, 0, 1);

        return {
            transform: `translateY(${state.y.value}px)` + (USE_SCALE ? ` scaleY(${scaleY})` : ''),
            clipPath: USE_SCALE ? null : clipY,
            zIndex: Math.round(lerp(this.props.children[index].zIndex | 0, 0, state.hidden.value)),
            opacity,
            pointerEvents: state.hidden.value > 0.5 ? 'none' : '',
        };
    }

    onWindowResize = () => globalAnimator.register(this);

    componentDidMount () {
        this.update(0, true);
        window.addEventListener('resize', this.onWindowResize);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.children !== this.props.children) {
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        window.removeEventListener('resize', this.onWindowResize);
    }

    render () {
        const props = { ...this.props };
        delete props.layout;

        props.class = (props.class || '') + ' paper-list';

        const paper = [];
        let paperSpanStart = null;
        let paperSpanEnd = null;
        let paperKey = 0;
        const startPaper = (top, height) => {
            if (paperSpanStart === null) {
                paperSpanStart = paperSpanEnd = top;
            }
            paperSpanEnd += height;
        };
        const endPaper = () => {
            if (paperSpanStart !== null) {
                const top = paperSpanStart;
                const bottom = paperSpanEnd;
                paper.push(
                    <div
                        key={'p' + (paperKey++)}
                        class="paper"
                        style={{
                            transform: `translateY(${top}px)`,
                            height: bottom - top,
                        }} />
                );
                paperSpanStart = null;
            }
        };

        const items = [];
        for (let i = 0; i < this.props.children.length; i++) {
            const { node, paper, flush } = this.props.children[i];
            const state = this.childStates[i];
            const hidden = state ? !!state.hidden.target : true;
            const style = this.getChildStyle(i);
            const index = i;
            items.push(
                <div
                    key={i}
                    class="paper-list-item"
                    style={style}
                    aria-hidden={hidden}
                    ref={node => {
                        this.childNodes[index] = node;
                        if (node) {
                            this.resizeObserver.observe(node);
                        }
                    }}>
                    {node}
                </div>
            );

            if (state && paper) {
                startPaper(
                    state.y.value + state.height.value * state.hidden.value / 2,
                    state.height.value * (1 - state.hidden.value),
                );
            } else if (state && (state.hidden.value < 0.9 || flush)) endPaper();
        }

        // GC node refs
        while (this.childNodes.length > this.props.children.length) {
            this.childNodes.pop();
        }

        return (
            <div {...props} style={{ height: this.nodeHeight }}>
                {paper}
                {items}
            </div>
        );
    }
}
