import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import DragHandleIcon from '@material-ui/icons/DragHandle';
import { Spring, globalAnimator } from 'yamdl';
import ResizeObserver from 'resize-observer-polyfill';
import './rearranging-list.less';

/**
 * Material list with drag controls.
 *
 * # Props
 * - children: array of elements
 * - isItemDraggable: fn(index) -> bool
 * - canMove: fn(toPos) -> bool
 * - onMove: fn(fromPos, toPos)
 * - spacing: vertical spacing between items
 * - itemHeight: item height override. If not set, will use dynamic height. This prop is expected
 *   to be constant, and weird things may happen if it changes between dynamic/non-dynamic height.
 */
export default class RearrangingList extends PureComponent {
    itemData = new Map();
    observer = new ResizeObserver(entries => {
        let didUpdate = false;

        const keysByNode = new Map();
        for (const [k, v] of this.itemData) {
            if (v.node) keysByNode.set(v.node, k);
        }
        for (const entry of entries) {
            if (keysByNode.has(entry.target)) {
                let height = 0;
                // there are multiple versions of the ResizeObserver API, all different...
                if (entry.contentBoxSize?.length) {
                    height = entry.contentBoxSize[0].blockSize;
                } else if (entry.contentBoxSize) {
                    height = entry.contentBoxSize.blockSize;
                } else {
                    height = entry.contentRect.height;
                }
                const itemData = this.itemData.get(keysByNode.get(entry.target));
                const newHeight = Math.round(height);
                if (newHeight !== itemData.height) {
                    itemData.height = Math.round(height);
                    didUpdate = true;
                }
            }
        }

        if (didUpdate) this.beginAnimating();
    });

    updateItemHeights () {
        let didUpdate = false;
        for (const item of this.itemData.values()) {
            if (!item.node) continue;
            const itemHeight = Math.round(item.node.offsetHeight);

            if (item.height !== itemHeight) {
                item.height = itemHeight;
                didUpdate = true;
            }
        }
        if (didUpdate) this.beginAnimating();
    }

    createItemData (node, index) {
        const spring = new Spring(1, 0.5);
        spring.value = spring.target = this.indexToYOffset(index);
        let domNode = null;
        const self = this;
        this.itemData.set(node.key, {
            index,
            height: 0,
            spring,
            vnode: node,
            get node () {
                return domNode;
            },
            set node (n) {
                if (domNode) self.observer.unobserve(domNode);
                domNode = n;
                if (domNode && !self.props.itemHeight) self.observer.observe(domNode);
            },
        });
    }

    /** Called by the global animator. */
    update (dt) {
        let wantsUpdate = false;
        for (const [key, item] of this.itemData) {
            item.spring.locked = this.state.draggingKey === key;
            if (this.state.draggingKey === key) {
                if (dt > 0) item.spring.velocity = (this.dragTarget - item.spring.value) / dt;
                item.spring.value = item.spring.target = this.dragTarget;
            } else if (item.index >= this.indexPush.from && item.index < this.indexPush.to) {
                item.spring.target = this.indexToYOffset(item.index) + this.indexPush.amount;
            } else item.spring.target = this.indexToYOffset(item.index);

            if (item.spring.wantsUpdate()) wantsUpdate = true;
            item.spring.update(dt);
        }
        if (!wantsUpdate) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    beginAnimating () {
        globalAnimator.register(this);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.itemHeight !== this.props.itemHeight) this.beginAnimating();
        if (prevProps.children !== this.props.children) this.beginAnimating();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    state = {
        draggingKey: null,
    };

    lastDraggingKey = null;

    /** List container node ref. */
    node = null;

    /** Offset from the cursor to the top of the item being dragged. */
    dragOffset = 0;

    /** Spring target for the item being dragged. */
    dragTarget = 0;

    /** New index for the item being dragged. */
    dragEndIndex = 0;

    /** Target index mapping during a drag operation. */
    indexPush = {
        from: 0,
        to: 0,
        amount: 1,
    };

    /**
     * Returns the height of the item at the given index. Ignores drag state.
     * If the index is out of bounds, will approximate something that seems reasonable.
     */
    getItemHeight (index) {
        if (this.props.itemHeight) return Math.round(this.props.itemHeight);

        if (index < 0) index = 0;
        if (index >= this.props.children.length) index = this.props.children.length - 1;
        const child = this.props.children[index];
        if (child) {
            const data = this.itemData.get(child.key);
            if (data) return Math.round(data.height);
        }
        return 0;
    }

    get spacing () {
        return this.props.spacing || 0;
    }

    /** Converts a (possibly float) index to a y offset. Ignores drag state. */
    indexToYOffset (index) {
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += this.getItemHeight(i) + this.spacing;
        }
        const fractionalPart = index - Math.floor(index);
        if (fractionalPart > 0) {
            offset += fractionalPart * this.getItemHeight(index);
        }
        return offset;
    }

    /** Returns a (float) index for a y offset. Ignores drag state. */
    indexFromYOffset (offset) {
        if (offset < 0) return 0;
        let o = 0, p = 0;
        let index = 0;
        for (let i = 0; i < this.props.children.length; i++) {
            if (o < offset) {
                index = i;
                p = o;
            } else break;
            o += this.getItemHeight(i) + this.spacing;
        }
        const remainingPart = offset - p;
        if (remainingPart > 0) {
            index += remainingPart / (o - p);
        }
        return index;
    }

    onPointerDown (clientX, clientY, key) {
        if (!this.node) return;
        const listRect = this.node.getBoundingClientRect();
        const y = clientY - listRect.top;
        const itemIndex = this.itemData.get(key).index;

        this.dragOffset = y - this.indexToYOffset(itemIndex);
        this.dragTarget = this.indexToYOffset(itemIndex);
        this.dragEndIndex = itemIndex;
        this.indexPush.amount = 0;

        this.lastDraggingKey = key;
        this.setState({ draggingKey: key });
    }

    onPointerMove (clientX, clientY) {
        const listRect = this.node.getBoundingClientRect();
        const y = clientY - listRect.top;

        const item = this.itemData.get(this.state.draggingKey);
        const newItemIndex = Math.floor(this.indexFromYOffset(y));

        if (this.props.canMove(newItemIndex)) {
            if (newItemIndex < item.index) {
                this.indexPush.from = newItemIndex;
                this.indexPush.to = item.index;
                this.indexPush.amount = this.getItemHeight(item.index);
            } else if (newItemIndex > item.index) {
                this.indexPush.from = item.index;
                this.indexPush.to = newItemIndex + 1;
                this.indexPush.amount = -this.getItemHeight(item.index);
            } else this.indexPush.amount = 0;

            this.dragEndIndex = newItemIndex;
        }

        this.dragTarget = y - this.dragOffset;
        this.beginAnimating();
    }

    onPointerUp () {
        this.indexPush.amount = 0;
        const item = this.itemData.get(this.state.draggingKey);
        // this fixes a minor glitch where the item will momentarily render with
        // spring value = spring target
        item.spring.target = item.index;
        this.props.onMove(item.index, this.dragEndIndex);
        this.setState({ draggingKey: null });
        this.beginAnimating();
    }

    onMouseDownOnItem = (e, key) => {
        e.preventDefault();
        this.onPointerDown(e.clientX, e.clientY, key);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
    };
    onTouchStartOnItem = (e, key) => {
        this.onPointerDown(e.touches[0].clientX, e.touches[0].clientY, key);
        window.addEventListener('touchmove', this.onTouchMove, { passive: false });
        window.addEventListener('touchend', this.onTouchEnd, { passive: false });
    };
    onMouseMove = e => this.onPointerMove(e.clientX, e.clientY);
    onTouchMove = e => {
        e.preventDefault();
        this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    onMouseUp = () => {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        this.onPointerUp();
    };
    onTouchEnd = () => {
        window.removeEventListener('touchmove', this.onTouchMove);
        window.removeEventListener('touchend', this.onTouchEnd);
        this.onPointerUp();
    };

    render () {
        // hack to fix incorrect item heights sometimes
        if (this._hackTimeout) clearTimeout(this._hackTimeout);
        this._hackTimeout = setTimeout(() => this.updateItemHeights(), 20);

        let index = 0;
        const itemKeys = new Set();
        for (const item of this.props.children) {
            if (!item.key) throw new Error('RearrangingList: child has no key prop');
            itemKeys.add(item.key);
            if (!this.itemData.has(item.key)) {
                this.createItemData(item, index);
            } else {
                const data = this.itemData.get(item.key);
                data.index = index;
                data.vnode = item;
            }
            index++;
        }

        for (const key of this.itemData.keys()) {
            if (!itemKeys.has(key)) this.itemData.delete(key);
        }

        const items = [];

        for (const [key, item] of this.itemData) {
            const posY = item.spring.value;
            const draggable = this.props.isItemDraggable(item.index);

            let className = 'rearranging-list-item';
            if (this.state.draggingKey === key) className += ' dragging';
            else if (this.lastDraggingKey === key) {
                if (Math.abs(item.spring.value - item.spring.target) > 4) {
                    // item that was being dragged has not reached its resting position yet
                    className += ' dragging';
                } else {
                    this.lastDraggingKey = null;
                }
            }

            items.push(
                <div
                    key={key}
                    className={className}
                    data-height={item.height}
                    ref={node => (this.itemData.get(key) && (this.itemData.get(key).node = node))}
                    style={{
                        transform: `translateY(${posY}px)`,
                    }}>
                    <div className="rearranging-list-item-content">
                        {item.vnode}
                    </div>
                    {draggable && (
                        <div
                            className="rearranging-list-item-drag-handle"
                            onMouseDown={e => this.onMouseDownOnItem(e, key)}
                            onTouchStart={e => this.onTouchStartOnItem(e, key)}>
                            <DragHandleIcon className="rearranging-list-item-drag-icon" />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div
                className={(this.props.class || '') + ' rearranging-list'}
                ref={node => this.node = node}>
                <div
                    className="rearranging-list-scroll-height"
                    style={{ height: this.indexToYOffset(this.props.children.length) }} />
                {items}
            </div>
        );
    }
}
