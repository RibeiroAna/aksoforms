import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Spring } from 'yamdl';
import './segmented.less';

const lerp = (a, b, x) => (b - a) * x + a;

/**
 * A segmented selection control (see iOS).
 * Apparently these are not part of Material Design but they’re too convenient not to be used.
 *
 * Pass an array of objects as its children like so:
 *
 * ```js
 * <Segmented>
 *     {[
 *         {
 *             id: 'option-1',
 *             label: 'Option 1',
 *         },
 *     ]}
 * </Segmented>
 * ```
 *
 * # Props
 * - children: a list of objects with the following properties:
 *   - `id`: a unique identifier that will be used for the `selected` prop
 *   - `label`: a label string or component
 *   - `alt`: alternate text label
 *   - `disabled`: if true, will render it disabled
 * - selected/onSelect: the selected option’s id
 * - disabled: bool
 */
export default class Segmented extends PureComponent {
    state = {
        backgroundPos: 0,
    };

    /** Animates the background rectangle while it’s moving. */
    backgroundPos = new Spring(1, 0.2);
    node = null;
    /** Child refs used to get rectangle sizes for the background animation. */
    childRefs = [];

    constructor (props) {
        super(props);

        this.backgroundPos.on('update', backgroundPos => this.setState({ backgroundPos }));
    }

    componentDidMount () {
        // set background value so it doesn’t glitch when pressed
        let targetPos = -1;
        for (let i = 0; i < this.props.children.length; i++) {
            if (this.props.children[i].id === this.props.selected) {
                targetPos = i;
                break;
            }
        }
        this.backgroundPos.value = this.backgroundPos.target = targetPos;
        this.setState({ backgroundPos: targetPos });
    }

    componentDidUpdate (prevProps) {
        if (prevProps.selected !== this.props.selected
            || prevProps.children.length !== this.props.children.length) {
            // set new background target because either the selected item or the number of children
            // changed
            this.updateBackgroundPos();
        }
    }

    updateBackgroundPos (props = this.props) {
        if (this.dragging) return;
        let targetPos = -1;
        for (let i = 0; i < props.children.length; i++) {
            if (props.children[i].id === props.selected) {
                targetPos = i;
                break;
            }
        }
        this.backgroundPos.target = targetPos;
        if (this.backgroundPos.wantsUpdate()) {
            this.backgroundPos.start();
        }
    }

    componentWillUnmount () {
        this.backgroundPos.stop();
    }

    screenToIndexPos (clientX) {
        let index = null;
        let container;
        for (let i = 0; i < this.childRefs.length; i++) {
            const rect = this.childRefs[i].getBoundingClientRect();
            if (rect.left <= clientX && rect.right > clientX) {
                index = i + (clientX - rect.left) / rect.width - 0.5;
                container = rect;
                break;
            }
        }
        return { index, container };
    }

    onPointerDown = e => {
        const pos = this.screenToIndexPos(e.clientX);
        if (pos.index !== null) {
            this.dragOffset = (e.clientX - (pos.container.left + pos.container.right) / 2) / pos.container.width;
            this.backgroundPos.target = pos.index - this.dragOffset;
        }
        this.backgroundPos.start();
        this.dragging = true;
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    };

    onPointerMove = e => {
        const pos = this.screenToIndexPos(e.clientX);
        if (pos.index !== null) this.backgroundPos.target = pos.index - this.dragOffset;
        this.backgroundPos.start();
    };

    onPointerUp = e => {
        const pos = this.screenToIndexPos(e.clientX);
        this.dragging = false;
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        if (pos.index !== null) {
            let index = Math.round(pos.index);
            index = Math.min(index, this.props.children.length - 1);
            this.props.onSelect(this.props.children[index].id);
        } else {
            this.updateBackgroundPos();
        }
    };

    render () {
        const idleBackgroundPos = !(this.backgroundPos.wantsUpdate() && this.node) && !this.dragging;

        let animatedBackground = null;
        if (!idleBackgroundPos) {
            const nodeRect = this.node.getBoundingClientRect();
            let left = Math.floor(this.state.backgroundPos);
            let right = Math.ceil(this.state.backgroundPos);

            while (left < 0) {
                left++;
                right++;
            }
            while (right >= this.props.children.length) {
                left--;
                right--;
            }

            const p = this.state.backgroundPos - left;

            const leftRect = this.childRefs[left] && this.childRefs[left].getBoundingClientRect();
            const rightRect = this.childRefs[right] && this.childRefs[right].getBoundingClientRect();

            let targetChild = null;
            for (const c of this.props.children) {
                if (c.id === this.props.selected) {
                    targetChild = c;
                    break;
                }
            }

            if (leftRect && rightRect) {
                const dx = lerp(leftRect.left, rightRect.left, p) - nodeRect.left;
                const dy = lerp(leftRect.top, rightRect.top, p) - nodeRect.top;
                const width = lerp(leftRect.width, rightRect.width, p);
                const height = lerp(leftRect.height, rightRect.height, p);
                const styleWidth = Math.round(width);
                const styleHeight = Math.round(height);
                const sx = styleWidth / width;
                const sy = styleHeight / height;
                const transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
                const style = { transform, width: styleWidth, height: styleHeight };
                let className = 'segmented-control-background';
                if (targetChild && targetChild.class) className += ' ' + targetChild.class;
                animatedBackground = <div
                    class={className}
                    style={style} />;
            }
        }

        const options = this.props.children.map((option, index) => {
            let className = 'segmented-control-option';
            if (option.id === this.props.selected) {
                className += ' selected';
                if (!idleBackgroundPos) className += ' hidden-background';
            }
            if (option.class) className += ' ' + option.class;
            return (
                <button
                    key={option.id}
                    class={className}
                    type="button"
                    role="radio"
                    title={option.alt}
                    aria-label={option.alt}
                    aria-checked={option.id === this.props.selected}
                    disabled={this.props.disabled || option.disabled}
                    onPointerDown={this.onPointerDown}
                    onClick={() => !option.disabled && this.props.onSelect(option.id)}
                    ref={node => this.childRefs[index] = node}>
                    {option.label}
                </button>
            );
        });

        // drop excess child refs
        this.childRefs.splice(this.props.children.length);

        const nodeProps = { ...this.props };
        delete nodeProps.selected;
        delete nodeProps.onSelect;
        nodeProps.class = (nodeProps.class || '') + ' segmented-control';

        return (
            <div {...nodeProps} ref={node => this.node = node}>
                {animatedBackground}
                {options}
            </div>
        );
    }
}
