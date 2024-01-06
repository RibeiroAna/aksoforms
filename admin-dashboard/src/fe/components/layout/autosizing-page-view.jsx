import { h, Component } from 'preact';
import { Spring } from 'yamdl';
import { layoutContext } from './dynamic-height-div';
import './autosizing-page-view.less';

const lerp = (a, b, x) => (b - a) * x + a;

/** Returns the height above which pages should be allowed to scroll vertically. */
const OVERFLOW_HEIGHT = () => window.innerHeight - 120;

/**
 * Container for multiple pages of varying height and fixed width.
 * Assumes fixed child count and mostly fixed child heights.
 *
 * # Props
 * - selected: number
 * - children: array of vnodes
 * - onPageChange: callback for when the animation finishes
 * - eager: if true, will check page heights every update
 * - alwaysOverflow: if true, will always allow overflow
 */
export default class AutosizingPageView extends Component {
    state = {
        x: 0,
        height: 0,
    };

    /** Item refs and heights. */
    items = {};

    /** Previously selected page. */
    prevSelected = 0;

    xSpring = new Spring(1, 0.5);
    heightSpring = new Spring(1, 0.5);

    constructor (props) {
        super(props);

        this.xSpring.on('update', x => {
            if (Math.abs(x - this.props.selected) < 0.1 && !this.firedPageChange) {
                this.firedPageChange = true;
                this.props.onPageChange && this.props.onPageChange(this.props.selected);
            }
            this.setState({ x });
        });
        this.heightSpring.on('update', height => this.setState({ height }));
    }

    componentDidMount () {
        this.xSpring.target = this.props.selected;
        this.xSpring.start();
        this.updatePageHeights();
        this.heightSpring.value = this.currentHeight();
        this.forceUpdate();

        window.addEventListener('resize', this.pageHeightChanged);

        // sometimes, the styles are applied *after* the vdom renders, so the page heights need
        // to be updated again
        setTimeout(this.pageHeightChanged, 100);
    }

    componentWillUnmount () {
        this.xSpring.stop();
        this.heightSpring.stop();

        window.removeEventListener('resize', this.pageHeightChanged);
    }

    componentWillUpdate (newProps) {
        if (newProps.selected != this.props.selected) {
            this.prevSelected = this.props.selected;
        }
    }

    componentDidUpdate (prevProps) {
        if (prevProps.selected !== this.props.selected) {
            this.xSpring.target = this.props.selected;
            this.xSpring.start();
            this.updatePageHeights();
            this.firedPageChange = false;
        }

        if (this.props.eager) {
            if (this.updatePageHeights()) {
                this.forceUpdate();
            }
        }
    }

    /** Updates page heights from the DOM. */
    updatePageHeights () {
        let changed = false;
        for (const key in this.items) {
            const item = this.items[key];
            if (!item.node) continue;
            const { offsetHeight } = item.node;
            if (offsetHeight !== item.height) {
                changed = true;
                item.height = offsetHeight;
            }
        }
        return changed;
    }

    /** Updates page heights and triggers a re-render. */
    pageHeightChanged = () => {
        this.updatePageHeights();
        this.forceUpdate();
    };

    /**
     * Returns the current height, i.e. the height of the current page or an interpolated value
     * when animating.
     */
    currentHeight () {
        const a = Math.floor(this.state.x);
        const b = Math.ceil(this.state.x);
        const t = this.state.x - a;
        if (this.items[a] && this.items[b]) {
            return Math.round(lerp(this.items[a].height, this.items[b].height, t));
        }
        return 0;
    }

    /** Returns a style object for a page with the given index. */
    pageStyle (index) {
        const offset = index - this.state.x;
        if (Math.abs(offset) >= 1) return { visibility: 'hidden' };
        return { transform: `translateX(${offset * 100}%)` };
    }

    render () {
        const children = [];

        let index = 0;
        for (const child of this.props.children) {
            const i = index++;
            const prevItem = this.items[i];
            children.push(
                <div
                    class="autosizing-page"
                    ref={node => this.items[i] = { node, height: prevItem ? prevItem.height : 0}}
                    style={this.pageStyle(i)}>
                    {child}
                </div>
            );
        }

        const currentHeight = this.currentHeight();
        let mayOverflow = false;
        let height = currentHeight;
        let minHeight = null;

        if (!this.props.alwaysOverflow && currentHeight > OVERFLOW_HEIGHT()) {
            mayOverflow = true;
            height = OVERFLOW_HEIGHT();
        } else if (this.props.alwaysOverflow) {
            minHeight = height;
            height = null;
        }

        return (
            <layoutContext.Provider value={() => this.updatePageHeights()}>
                <div
                    class={'autosizing-page-view' + (mayOverflow ? ' may-overflow' : '')
                        + (this.props.alwaysOverflow ? ' always-overflow' : '')}
                    style={{ height, minHeight }}>
                    {children}
                </div>
            </layoutContext.Provider>
        );
    }
}
