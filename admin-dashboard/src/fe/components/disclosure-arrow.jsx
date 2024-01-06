import { h, Component } from 'preact';
import { Spring, globalAnimator } from 'yamdl';
import './disclosure-arrow.less';

/**
 * Renders an animated disclosure arrow.
 *
 * # Props
 * - dir: Either 'up', 'down', or 'none'
 */
export default class DisclosureArrow extends Component {
    #dirSpring = new Spring(0.6, 0.3);

    constructor (props) {
        super(props);
        this.#dirSpring.target = props.dir === 'up'
            ? -1 : props.dir === 'none' ? 0 : 1;
        this.#dirSpring.finish();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.dir !== this.props.dir) {
            this.#dirSpring.target = this.props.dir === 'up'
                ? -1 : this.props.dir === 'none' ? 0 : 1;
            globalAnimator.register(this);
        }
    }

    update (dt) {
        this.#dirSpring.update(dt);
        if (!this.#dirSpring.wantsUpdate()) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render () {
        const baseAngle = this.#dirSpring.value * 45;
        const dy = this.#dirSpring.value * 3;

        const line1 = { // left
            transform: `translateY(${dy}px) rotate(${180 + baseAngle}deg)`,
        };
        const line2 = { // right
            transform: `translateY(${dy}px) rotate(${-baseAngle}deg)`,
        };

        return (
            <span class="disclosure-arrow">
                <span class="da-line" style={line1} />
                <span class="da-line" style={line2} />
            </span>
        );
    }
}
