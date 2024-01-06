import { createRef, h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring, globalAnimator } from 'yamdl';
import SidebarContents from './contents';
import './style.less';

/** Width of the region at the left screen edge from which the sidebar may be dragged out. */
const EDGE_DRAG_WIDTH = 50;

/**
 * After holding down on the edge for this long, the sidebar will peek out and start a dragging
 * action.
 */
const PEEK_TIMEOUT = 0.2;

/**
 * Renders the sidebar.
 *
 * # Props
 * - permanent: Whether or not the sidebar should be permanent and inline or slide out temporarily.
 *   If this is true, `open` will be ignored.
 * - open/onOpen/onClose: open state
 * - currentPage: Current page identifier passed to the SidebarContents
 * - locked: if true, will lock the sidebar to user interactions
 */
export default class Sidebar extends PureComponent {
    node = createRef();
    backdropNode = createRef();

    /** The spring used to animate the sidebar’s X position. */
    position = new Spring(1, 0.5);

    /** Called when the sidebar drag ends, by the sidebar drag handler. */
    onDragEnd = (open) => {
        if (open && this.props.onOpen) this.props.onOpen();
        else if (!open && this.props.onClose) this.props.onClose();
    };

    sidebarDragHandler = new SidebarDragHandler(this, this.position, this.onDragEnd);

    /** Updates the spring target; called when the `open` property changes. */
    updateSpringTarget () {
        this.position.target = this.props.permanent || this.props.open ? 1 : 0;
        this.position.locked = false;
        globalAnimator.register(this);
    }

    update (dt) {
        this.sidebarDragHandler.update(dt);
        this.position.update(dt);
        this.onSpringUpdate(this.position.value);

        if (!this.position.wantsUpdate() && !this.sidebarDragHandler.wantsUpdate()) {
            globalAnimator.deregister(this);
        }
    }

    /** Called when the position spring updates. */
    onSpringUpdate = (position) => {
        position = Math.max(0, position);
        if (position <= 1) {
            this.node.current.style.transform = `translateX(-${(1 - position) * 100}%)`;
        } else {
            const mapped = 1 + Math.pow(position - 1, 0.3) / 20;
            this.node.current.style.transform = `scaleX(${mapped})`;
        }
        this.node.current.style.visibility = position === 0 ? 'hidden' : '';
        this.backdropNode.current.style.opacity = this.props.permanent ? 0 : Math.min(1, position);
    };

    componentDidMount () {
        this.updateSpringTarget();
        if ((this.props.permanent || this.props.open) && !this.animatingIn) {
            this.position.value = 1;
        }
        if (!this.props.permanent) this.sidebarDragHandler.bind();
        this.sidebarDragHandler.setSidebarNode(this.node.current);
        globalAnimator.register(this);
    }

    /** Will animate the sidebar sliding in. */
    animateIn (delay) {
        this.position.value = 0;
        this.onSpringUpdate(0);
        this.position.stop();
        this.animatingIn = true;
        this.position.locked = true;
        setTimeout(() => this.position.locked = false, delay);
        globalAnimator.register(this);
    }

    componentDidUpdate (prevProps) {
        if (this.props.open !== prevProps.open) {
            this.position.locked = false;
            this.updateSpringTarget();
        }
        if (this.props.permanent !== prevProps.permanent) {
            if (!this.props.permanent) this.sidebarDragHandler.bind();
            else this.sidebarDragHandler.unbind();
            this.updateSpringTarget();
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        this.sidebarDragHandler.unbind();
    }

    #contents;

    render () {
        let className = 'app-sidebar-container';
        if (this.props.permanent) className += ' permanent';
        if (!this.props.permanent && this.props.open) className += ' open';

        return (
            <div class={className}>
                <div
                    class="app-sidebar-backdrop"
                    ref={this.backdropNode}
                    onClick={() => {
                        this.position.locked = false;
                        this.props.onClose();
                    }} />
                <div
                    class="app-sidebar"
                    ref={this.node}
                    onKeyDown={e => {
                        if (e.key === 'Escape') {
                            this.position.locked = false;
                            this.props.onClose();
                        }
                    }}
                    // don’t focus the scroll view
                    tabIndex={-1}
                    onFocus={e => {
                        if (e.target === e.currentTarget) {
                            e.preventDefault();
                            e.target.blur();
                            this.#contents.focus();
                        }
                    }}>
                    <SidebarContents
                        ref={contents => this.#contents = contents}
                        locked={this.props.locked}
                        currentPage={this.props.currentPage}
                        onLogout={this.props.onLogout}
                        onDirectTransition={this.props.onDirectTransition}
                        permissions={this.props.permissions} />
                </div>
            </div>
        );
    }
}

/** Handles sidebar touch-dragging. */
class SidebarDragHandler {
    /** True if a touch drag may turn into a sidebar drag. */
    mayDrag = false;

    /** True if the sidebar is currently being dragged. */
    isDragging = false;

    /** Temporarily stores the sidebar width. */
    sidebarWidth = 0;

    /** Initial touch position X. */
    startTouchX = 0;
    /** Initial touch position Y. */
    startTouchY = 0;
    /** Previous touch position. */
    lastTouchX = 0;
    /** Initial spring value offset. */
    startTouchOffset = 0;
    /** Previous event timestamp. */
    lastTouchTime = 0;

    /**
     * # Parameters
     * - owner: { update: number => void } - update target
     * - sidebarSpring: Spring - the sidebar spring. Should be 0 when closed and 1 when open.
     * - onEnd: `(bool) => void` - called when the user ends the drag with whether or not the
     *   sidebar should be considered open or not.
     */
    constructor (owner, sidebarSpring, onEnd) {
        this.owner = owner;
        this.spring = sidebarSpring;
        this.onEnd = onEnd;
    }

    /** Sets the sidebar node. */
    setSidebarNode (sidebarNode) {
        this.sidebarNode = sidebarNode;
    }

    /** Binds global event handlers. */
    bind () {
        window.addEventListener('touchstart', this.onTouchStart);
        window.addEventListener('touchmove', this.onTouchMove, { passive: false });
        window.addEventListener('touchend', this.onTouchEnd, { passive: false });
        window.addEventListener('touchcancel', this.onTouchCancel);
    }

    /** Unbinds global event handlers. */
    unbind () {
        window.removeEventListener('touchstart', this.onTouchStart);
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('touchend', this.onTouchEnd);
        window.removeEventListener('touchcancel', this.onTouchCancel);
    }

    /**
     * Returns true if a touch event should be ignored, e.g. because the target is a button.
     *
     * # Parameters
     * - target: Node
     */
    shouldIgnoreEventFor (target) {
        if (!target) return false;
        if (target.tagName === 'BUTTON') return true;
        if (target.tagName === 'INPUT') return true;
        if (target.tagName === 'TEXTAREA') return true;
        if (target.tagName === 'A') return true;
        return this.shouldIgnoreEventFor(target.parentNode);
    }

    onTouchStart = e => {
        this.isDragging = false;

        if (this.shouldIgnoreEventFor(e.target)) return;

        if (e.touches.length > 1) {
            // exit if there are multiple touches
            this.mayDrag = false;
            this.peekTimeout = null;
            return;
        }

        this.sidebarWidth = this.sidebarNode.offsetWidth;
        if (this.spring.target === 0) {
            // currently closed; start peek timeout
            this.peekTimeout = PEEK_TIMEOUT;
        }

        this.startTouchX = this.lastTouchX = e.touches[0].clientX;
        this.startTouchY = e.touches[0].clientY;
        this.lastTouchTime = Date.now();

        this.mayDrag = this.spring.target === 1 || this.startTouchX < EDGE_DRAG_WIDTH;

        this.spring.velocity = 0;

        globalAnimator.register(this.owner);
    };

    peekTimeout = null;
    peekWaiting = false;

    update (dt) {
        if (this.peekTimeout !== null) {
            this.peekTimeout -= dt;
            if (this.peekTimeout < 0) {
                this.peekTimeout = null;
                if (this.mayDrag && !this.isDragging) {
                    this.spring.target = EDGE_DRAG_WIDTH / this.sidebarWidth;
                    this.peekWaiting = true;

                    // HACK: fire last event again to update position
                    this.onPointerMove(this.lastTouchX, this.startTouchY);
                }
            }
        }
        if (this.peekWaiting && this.mayDrag) {
            if (Math.abs(this.spring.value - EDGE_DRAG_WIDTH / this.sidebarWidth) < 1e-2) {
                // close enough
                this.peekWaiting = false;
                // start dragging
                this.isDragging = true;
                this.startTouchOffset = this.lastTouchX / this.sidebarWidth - this.spring.value;
                this.spring.locked = true;
            }
        }
    }

    wantsUpdate () {
        return this.peekTimeout !== null || this.peekWaiting;
    }

    onPointerMove (touchX, touchY, preventDefault) {
        let signal = null;

        if (this.mayDrag && !this.isDragging) {
            const wouldClose = this.spring.target === 1;
            const touchXIsMovingInTheRightDirection = wouldClose
                ? touchX < this.startTouchX
                : touchX > this.startTouchX;
            const touchXIsMovingInTheWrongDirection = wouldClose
                ? touchX > this.startTouchX
                : touchX < this.startTouchX;
            const touchYHasntMovedTooFar = Math.abs(touchY - this.startTouchY) < 5;
            if (touchXIsMovingInTheRightDirection && touchYHasntMovedTooFar) {
                this.isDragging = true;
                this.startTouchOffset = touchX / this.sidebarWidth - this.spring.value;
                this.spring.locked = true;
                signal = 'drag';
            } else if (touchXIsMovingInTheWrongDirection) {
                this.mayDrag = false;
                signal = 'cancel';
            }
        }

        if (this.isDragging) {
            if (preventDefault) preventDefault();

            this.spring.value = touchX / this.sidebarWidth - this.startTouchOffset;
            const deltaTime = (Date.now() - this.lastTouchTime) / 1000;
            if (deltaTime !== 0) {
                this.spring.velocity = (touchX - this.lastTouchX) / this.sidebarWidth / deltaTime;
            }

            // make sure update is still being fired
            globalAnimator.register(this.owner);
        }

        this.lastTouchX = touchX;
        this.lastTouchTime = Date.now();

        return signal;
    }

    onTouchMove = e => {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        const signal = this.onPointerMove(touchX, touchY, () => e.preventDefault());

        if (signal === 'drag') {
            // started drag
            this.peekTimeout = null;
            this.peekWaiting = false;
        } else if (signal === 'cancel') {
            this.peekTimeout = null;
            this.peekWaiting = false;
            this.spring.locked = false;
        }
    };

    onTouchEnd = e => {
        this.spring.locked = false;
        this.spring.target = Math.round(this.spring.target);
        this.peekTimeout = null;
        this.peekWaiting = false;

        if (this.isDragging) {
            e.preventDefault();
            this.isDragging = false;

            // guess where it’s going to land
            const projectedPosition = this.spring.value + this.spring.velocity;
            if (projectedPosition < 0.5) {
                this.spring.target = 0;
                this.onEnd(false);
            } else {
                this.spring.target = 1;
                this.onEnd(true);
            }
        }
        globalAnimator.register(this.owner);
    };

    onTouchCancel = () => {
        this.spring.locked = false;
        this.spring.target = Math.round(this.spring.target);
        this.peekTimeout = null;
        this.peekWaiting = false;

        if (this.isDragging) {
            this.isDragging = false;
        }
        globalAnimator.register(this.owner);
    };
}
