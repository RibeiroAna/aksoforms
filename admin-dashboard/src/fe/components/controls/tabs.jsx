import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring, globalAnimator, Ripple } from 'yamdl';
import './tabs.less';

const ANIM_STAGGER_TIME = 0.1;

/**
 * Tabs
 *
 * # Props
 * - value/onChange: tab id
 * - tabs: { [id]: label }
 * - disabled: bool
 */
export default class Tabs extends PureComponent {
    scrollX = new Spring(1, 1);

    // two bounds for the tab line, one for left and one for right
    // values are in 0..(n-1) where n is the number of tabs
    // there are two of them because the animation is staggered
    lineLeft = new Spring(1, 0.3);
    lineRight = new Spring(1, 0.3);
    linePresence = new Spring(1, 0.3);
    linePos = null;

    bufferedLeft = new Set();
    bufferedRight = new Set();

    tabRefs = [];

    /** moves the tab line to a target position */
    moveLineTo (target) {
        const dir = this.linePos === null || target === null
            ? null
            : target < this.linePos ? 'left' : target > this.linePos ? 'right' : null;

        const wasHidden = this.linePresence.value < 0.01;
        const staggerTime = wasHidden ? 0 : ANIM_STAGGER_TIME;

        if (dir === 'left') {
            this.bufferedLeft = new Set([{ timeout: 0, target }]);
            this.bufferedRight.add({ timeout: staggerTime, target });
        } else if (dir === 'right') {
            this.bufferedRight = new Set([{ timeout: 0, target }]);
            this.bufferedLeft.add({ timeout: staggerTime, target });
        } else if (target !== null) {
            this.bufferedLeft.clear();
            this.bufferedRight.clear();
            this.lineLeft.value = this.lineLeft.target = target;
            this.lineRight.value = this.lineRight.target = target;
        }

        this.linePos = target;
        this.linePresence.target = target === null ? 0 : 1;
    }

    updateLineTarget () {
        let newIndex = Object.keys(this.props.tabs).findIndex(i => i === this.props.value);
        if (newIndex === -1) newIndex = null;
        this.moveLineTo(newIndex);
        globalAnimator.register(this);
    }

    rawIndexToPos (index) {
        let x = 0;
        for (let i = 0; i < this.tabRefs.length; i++) {
            if (!this.tabRefs[i]) continue;
            const tabWidth = this.tabRefs[i].width;
            if (i === index) {
                return x;
            }
            x += tabWidth;
        }
        return x;
    }
    indexToPos (index) {
        if (Math.floor(index) === index) return this.rawIndexToPos(index);
        const lower = this.rawIndexToPos(Math.floor(index));
        const upper = this.rawIndexToPos(Math.ceil(index));
        const p = index - Math.floor(index);
        return (upper - lower) * p + lower;
    }

    componentDidMount () {
        this.scrollX.target = null;
        this.updateLineTarget();
        this.scrollTabIntoView();
        globalAnimator.register(this);
    }

    componentDidUpdate (prevProps) {
        if (this.props.value !== prevProps.value) {
            this.updateLineTarget();
            this.scrollTabIntoView();
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    scrollTabIntoView () {
        if (!this.node) return;

        let tab;
        let i = 0;
        for (const id in this.props.tabs) {
            if (this.props.value === id) {
                tab = this.tabRefs[i];
                break;
            }
            i++;
        }

        if (tab) {
            const { scrollMin, scrollMax } = this.getScrollBounds();
            const targetX = Math.max(scrollMin,
                Math.min(tab.node.offsetLeft + (tab.node.offsetWidth - this.node.offsetWidth) / 2,
                    scrollMax));

            this.scrollX.target = targetX;
            globalAnimator.register(this);
        }
    }

    getScrollBounds () {
        const width = this.node.offsetWidth;
        const scrollWidth = this.contents.offsetWidth;
        const scrollMin = 0;
        const scrollMax = Math.max(0, scrollWidth - width);

        return { scrollMin, scrollMax };
    }

    update (dt) {
        if (!this.node) return;

        const { scrollMin, scrollMax } = this.getScrollBounds();

        // make sure scroll stays in bounds
        const scrollIsOOB = this.scrollX.value < scrollMin || this.scrollX.value > scrollMax;
        if (scrollIsOOB) {
            if (this.scrollX.value <= scrollMin) this.scrollX.target = scrollMin;
            else this.scrollX.target = scrollMax;
        }

        if (!this.scrollX.wantsUpdate()) this.scrollX.target = null;
        this.scrollX.setPeriod(this.scrollX.target === null ? 3 : 0.5);

        // dequeue buffered targets for lineLeft/Right
        for (const item of this.bufferedLeft) {
            item.timeout -= dt;
            if (item.timeout < 0) {
                this.lineLeft.target = item.target;
                this.bufferedLeft.delete(item);
            }
        }

        for (const item of this.bufferedRight) {
            item.timeout -= dt;
            if (item.timeout < 0) {
                this.lineRight.target = item.target;
                this.bufferedRight.delete(item);
            }
        }

        this.scrollX.update(dt);
        this.lineLeft.update(dt);
        this.lineRight.update(dt);
        this.linePresence.update(dt);

        const wantsUpdate = this.#dragging
            || this.scrollX.wantsUpdate()
            || this.lineLeft.wantsUpdate()
            || this.lineRight.wantsUpdate()
            || this.linePresence.wantsUpdate();

        if (!wantsUpdate) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    #dragging = false;
    #dragOffset = null;
    #lastDrag = null;
    #onStartDragging = e => {
        const { scrollMin, scrollMax } = this.getScrollBounds();
        if (scrollMax === scrollMin) return; // can't drag

        const clientX = e.clientX;
        const nodeRect = this.node.getBoundingClientRect();
        const x = clientX - nodeRect.left;
        this.#dragging = true;
        this.#dragOffset = x + this.scrollX.value;
        this.#lastDrag = [this.scrollX.value, Date.now()];
        this.scrollX.locked = true;

        window.addEventListener('pointermove', this.#onPointerMove);
        window.addEventListener('pointerup', this.#onPointerUp);
        window.addEventListener('pointercancel', this.#onPointerUp);

        globalAnimator.register(this);
    };
    #onPointerMove = e => {
        const clientX = e.clientX;
        const nodeRect = this.node.getBoundingClientRect();
        const x = clientX - nodeRect.left;

        let newScrollX = this.#dragOffset - x;

        const { scrollMin, scrollMax } = this.getScrollBounds();

        if (newScrollX < scrollMin) {
            let t = scrollMin - newScrollX;
            t = t ** 0.7;
            newScrollX = scrollMin - t;
        } else if (newScrollX > scrollMax) {
            let t = newScrollX - scrollMax;
            t = t ** 0.7;
            newScrollX = scrollMax + t;
        }

        const now = Date.now();
        const dt = (now - this.#lastDrag[1]) / 1000;
        if (dt > 0) {
            this.scrollX.velocity = (newScrollX - this.#lastDrag[0]) / dt;
            this.#lastDrag = [newScrollX, now];
        }

        this.scrollX.value = newScrollX;
    };
    #onPointerUp = () => {
        this.#dragging = false;
        this.scrollX.locked = false;
        window.removeEventListener('pointermove', this.#onPointerMove);
        window.removeEventListener('pointerup', this.#onPointerUp);
        window.removeEventListener('pointercancel', this.#onPointerUp);
    };

    render ({ value, disabled, onChange, tabs, ...extra }) {
        const contents = [];

        const lineIsIdle = !this.lineLeft.wantsUpdate() && !this.lineRight.wantsUpdate()
            && this.linePresence.value === 1
            && !this.bufferedLeft.size && !this.bufferedRight.size;

        let i = 0;
        for (const id in tabs) {
            const index = i;
            contents.push(
                <Tab
                    key={id}
                    disabled={disabled}
                    ref={node => this.tabRefs[index] = node}
                    onStartDragging={this.#onStartDragging}
                    onSelect={() => onChange(id)}
                    isActive={id === value}
                    hasLine={lineIsIdle && i === this.lineLeft.value}>
                    {tabs[id]}
                </Tab>
            );
            i++;
        }
        this.tabRefs.splice(i);

        if (!lineIsIdle) {
            const x = this.indexToPos(this.lineLeft.value);
            const x2 = this.indexToPos(this.lineRight.value + 1);
            const sx = (x2 - x) / 100;
            const sy = this.linePresence.value;

            contents.push(
                <div
                    class="p-dyn-line"
                    style={{
                        transform: `translateX(${x}px) scale(${sx}, ${sy})`,
                    }} />
            );
        }

        extra.class = (extra.class || '') + ' paper-tabs';

        return (
            <div
                {...extra}
                ref={node => this.node = node}>
                <div
                    class="p-contents"
                    ref={node => this.contents = node}
                    style={{
                        transform: `translateX(${-this.scrollX.value}px)`,
                    }}>
                    {contents}
                </div>
            </div>
        );
    }
}

class Tab extends PureComponent {
    #ripple;
    #startPos = null;
    #isDragging = false;
    #capturedPointer = null;
    #onPointerDown = e => {
        if (e.target !== this.node) return;
        this.#startPos = [e.clientX, e.clientY];
        this.#isDragging = false;
        this.#ripple.onPointerDown(e);
        this.node.setPointerCapture(e.pointerId);
        this.#capturedPointer = e.pointerId;
        e.preventDefault();
        e.stopPropagation();
    };
    #onPointerMove = e => {
        if (!this.#startPos) return; // pointer not down
        if (this.#isDragging) return;
        e.preventDefault();
        e.stopPropagation();
        const pos = [e.clientX, e.clientY];
        const dist = Math.hypot(pos[0] - this.#startPos[0], pos[1] - this.#startPos[1]);

        if (dist > 10) {
            this.#ripple.onUp(); // fake cancel
            this.props.onStartDragging(e);
            this.#isDragging = true;
        }
    };
    #onPointerUp = () => {
        if (this.#startPos && !this.#isDragging) {
            this.#ripple.onPointerUp();
            this.props.onSelect();
        }
        this.#startPos = null;
        if (this.#capturedPointer) {
            this.node.releasePointerCapture(this.#capturedPointer);
            this.#capturedPointer = null;
        }
    };
    #onPointerCancel = () => {
        this.#startPos = null;
        if (this.#capturedPointer) {
            this.node.releasePointerCapture(this.#capturedPointer);
            this.#capturedPointer = null;
        }
    };

    updateWidth () {
        this.width = this.node.offsetWidth;
    }

    componentDidMount () {
        this.updateWidth();
    }
    componentDidUpdate () {
        this.updateWidth();
    }

    render ({ isActive, disabled, hasLine, children }) {
        return (
            <button
                type="button"
                ref={node => this.node = node}
                disabled={disabled}
                class={'p-tab' + (isActive ? ' p-active' : '') + (hasLine ? ' p-line' : '')}
                onPointerDown={this.#onPointerDown}
                onPointerMove={this.#onPointerMove}
                onPointerUp={this.#onPointerUp}
                onPointerCancel={this.#onPointerCancel}>
                <Ripple ref={ripple => this.#ripple = ripple} />
                {children}
            </button>
        );
    }
}
