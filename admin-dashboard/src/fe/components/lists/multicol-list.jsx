import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring, globalAnimator } from 'yamdl';
import './multicol-list.less';

const lerp = (a, b, x) => (b - a) * x + a;

const VLIST_CHUNK_SIZE = 100;

/**
 * Renders multiple columns with fixed order, with items able to be animated in between.
 *
 * # Props (required)
 * - pick one:
 *     - `children`: array of items: `{ key: (identifier), column: (index), node: (vnode) }`
 *     - `onGetChunk`: async (column, offset, limit) =>
 *       { items: [{ key, column, id }], total: number }
 *        - `renderItem`: id => vnode
 *        - `columnAge`: (optional) array of numbers, pass to invalidate entire columns by changing
 *          their age
 * - `columns`: number of columns
 * - `itemHeight`: height of a single item
 */
export default class MulticolList extends PureComponent {
    itemData = new Map();
    columnRefs = [];

    state = {
        columnChunks: {},
        columnSizes: {},
    };

    getColumnAge (column) {
        return this.props.columnAge ? this.props.columnAge[column] : null;
    }

    loadingChunks = {};

    componentDidMount () {
        if (this.props.onGetChunk) {
            for (let i = 0; i < this.props.columns; i++) {
                this.loadChunk(i, 0);
            }
        }
    }

    loadChunk (column, chunk) {
        if (this.state.columnChunks[column] && this.state.columnChunks[column][chunk]) {
            return;
        }

        const currentAge = this.getColumnAge(column);
        if (this.loadingChunks[column] && this.loadingChunks[column].has(chunk)) return;
        if (!this.loadingChunks[column]) this.loadingChunks[column] = new Set();
        this.loadingChunks[column].add(chunk);

        this.props.onGetChunk(column, chunk * VLIST_CHUNK_SIZE, VLIST_CHUNK_SIZE).then(data => {
            if (this.getColumnAge(column) !== currentAge) return;
            this.loadingChunks[column].delete(chunk);

            const columnChunks = { ...this.state.columnChunks };
            const columnSizes = { ...this.state.columnSizes };

            columnChunks[column] = columnChunks[column] || {};
            columnChunks[column][chunk] = data.items;
            columnSizes[column] = data.total;

            this.setState({ columnChunks, columnSizes }, () => {
                globalAnimator.register(this);
            });
        }).catch(err => {
            if (this.getColumnAge(column) !== currentAge) return;
            this.loadingChunks[column].delete(chunk);

            console.error(err); // eslint-disable-line no-console
            // TODO: handle maybe
        });
    }

    invalidateChunks (column) {
        this.loadingChunks[column] = new Set();
        const columnChunks = { ...this.state.columnChunks };
        const columnSizes = { ...this.state.columnSizes };
        delete columnChunks[column];
        delete columnSizes[column];
        this.setState({ columnChunks, columnSizes }, () => {
            this.loadChunk(column, 0);
        });
    }

    onColumnScroll = e => {
        if (this.props.onGetChunk) {
            const column = e.currentTarget.dataset.column | 0;
            const scrollTop = e.currentTarget.scrollTop;
            const height = e.currentTarget.offsetHeight;

            const minItem = Math.floor(scrollTop / this.props.itemHeight);
            const maxItem = Math.ceil((scrollTop + height) / this.props.itemHeight);
            const minChunk = Math.floor(minItem / VLIST_CHUNK_SIZE);
            const maxChunk = Math.floor(maxItem / VLIST_CHUNK_SIZE);

            this.loadChunk(column, minChunk);
            if (minChunk !== maxChunk) this.loadChunk(column, maxChunk);
        }
        this.forceUpdate();
    };

    createItemData (item, index) {
        const data = {
            x: new Spring(1, 0.5),
            y: new Spring(1, 0.5),
            key: item.key,
            column: item.column,
            index,
            vnode: item.node,
            id: item.id,
        };
        data.x.value = data.x.target = item.column;
        data.y.value = data.y.target = index;
        this.itemData[item.key] = data;
    }

    update (dt) {
        let wantsUpdate = false;
        for (const key in this.itemData) {
            const item = this.itemData[key];
            item.x.target = item.column;
            item.y.target = item.index;
            item.x.update(dt);
            item.y.update(dt);

            if (!wantsUpdate && (item.x.wantsUpdate() || item.y.wantsUpdate())) wantsUpdate = true;
        }

        if (!wantsUpdate) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.children !== this.props.children) globalAnimator.register(this);
        if (prevProps.columnAge !== this.props.columnAge) {
            let invalidated = false;
            for (let i = 0; i < prevProps.columnAge.length; i++) {
                if (this.props.columnAge[i] !== prevProps.columnAge[i]) {
                    this.invalidateChunks(i);
                    invalidated = true;
                }
            }
            if (invalidated) globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render () {
        let columns = [];

        if ('children' in this.props) {
            const columnHeights = [];
            for (let i = 0; i < this.props.columns; i++) {
                columns.push([]);
                columnHeights.push(0);
            }

            for (const item of this.props.children) {
                if (!item.key) {
                    // eslint-disable-next-line no-console
                    console.error('no key in', item);
                    throw new Error('MulticolList: child has no key');
                }
                if (!this.itemData[item.key]) {
                    this.createItemData(item, columns[item.column].length);
                } else {
                    const data = this.itemData[item.key];
                    data.index = columnHeights[item.column];
                    columnHeights[item.column]++;
                    data.vnode = item.node;
                    data.id = item.id;
                    data.column = item.column;
                }
                const data = this.itemData[item.key];
                columns[Math.round(data.x.value)].push(data);
            }
        } else {
            const usedItemIds = new Set();
            for (let col = 0; col < this.props.columns; col++) {
                columns[col] = [];
                for (const chunkIndex in this.state.columnChunks[col]) {
                    const chunk = this.state.columnChunks[col][chunkIndex];
                    let i = +chunkIndex;
                    for (const item of chunk) {
                        if (!item.key) throw new Error('MulticolList: child has no key');
                        if (usedItemIds.has(item.key)) continue;
                        usedItemIds.add(item.key); // prevent duplicate items
                        if (!this.itemData[item.key]) {
                            this.createItemData(item, i);
                        } else {
                            const data = this.itemData[item.key];
                            data.index = i;
                            data.vnode = item.node;
                            data.id = item.id;
                            data.column = col;
                        }
                        const data = this.itemData[item.key];
                        columns[col].push(data);
                        i++;
                    }
                }
            }
        }

        const isItemFixed = item => item.x.value === Math.round(item.x.value);
        const columnScrollOffsets = this.columnRefs.map(column => column.scrollTop);
        const isColumnLayout = this.columnRefs[0]?.parentNode
            ? getComputedStyle(this.columnRefs[0]?.parentNode).flexDirection === 'column'
            : false;
        const columnWidth = this.columnRefs[0]?.offsetWidth;
        const maxColumnPixelHeight = this.columnRefs
            .map(column => column.offsetHeight)
            .reduce((a, b) => Math.max(a, b), 0);
        const renderItem = item => item.vnode ? item.vnode : this.props.renderItem(item.id);

        const floatingItems = columns.flatMap(column => (
            column.filter(item => !isItemFixed(item)).map(item => {
                const leftCol = Math.floor(item.x.value);
                const rightCol = Math.ceil(item.x.value);
                const leftScroll = columnScrollOffsets[leftCol] | 0;
                const rightScroll = columnScrollOffsets[rightCol] | 0;
                const scrollOffset = lerp(leftScroll, rightScroll, item.x.value - leftCol);
                let y = item.y.value * this.props.itemHeight - scrollOffset;

                let x = `${item.x.value * 100}%`;

                if (isColumnLayout) {
                    const leftColumnY = this.columnRefs[leftCol]?.offsetTop;
                    const rightColumnY = this.columnRefs[rightCol]?.offsetTop;
                    x = 0;
                    y += lerp(leftColumnY, rightColumnY, item.x.value - leftCol);
                }

                if (y > maxColumnPixelHeight) {
                    return null;
                }

                return (
                    <div
                        class="list-item floating"
                        key={item.key}
                        style={{
                            width: columnWidth,
                            transform: `translate(${x}, ${y}px)`,
                        }}>
                        {renderItem(item)}
                    </div>
                );
            })
        )).filter(x => x);

        columns = columns.map((column, i) => (
            <div
                class="column"
                ref={node => {
                    if (node && node !== this.columnRefs[i]) {
                        this.columnRefs[i] = node;
                        globalAnimator.register(this);
                    }
                }}
                data-column={i}
                onScroll={this.onColumnScroll}
                key={i}>
                {column.filter(isItemFixed).filter(item => {
                    if (!this.columnRefs[i]) return false;
                    const top = item.y.value * this.props.itemHeight;
                    const bottom = top + this.props.itemHeight;
                    const scrollTop = this.columnRefs[i].scrollTop;
                    const height = this.columnRefs[i].offsetHeight;
                    return bottom >= scrollTop && top < scrollTop + height;
                }).map(item => (
                    <div
                        class="list-item"
                        key={item.key}
                        style={{
                            width: '100%',
                            height: this.props.itemHeight,
                            transform: `translate(${
                                (item.x.value - i) * 100}%, ${
                                item.y.value * this.props.itemHeight}px)`,
                        }}>
                        {renderItem(item)}
                    </div>
                ))}
                <div class="column-scroll-height" style={{
                    height: column.length * this.props.itemHeight,
                }} />
            </div>
        ));

        return (
            <div class="multicol-list">
                {columns}
                {floatingItems}
            </div>
        );
    }
}
