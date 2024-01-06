import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { globalAnimator } from 'yamdl';

const f = t => Math.sin(t * Math.PI);
const g = t => 2 / (1 + Math.exp(-4 * t)) - 1;

/**
 * A tiny indeterminate progress indicator.
 *
 * Bounces horizontally like the Firefox Quantum page load indicator.
 */
export default class TinyProgress extends PureComponent {
    state = {
        time: 0,
    };

    componentDidMount () {
        globalAnimator.register(this);
    }

    update (dt) {
        this.setState({ time: this.state.time + dt });
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render (props, { time }) {
        const x = g(f(time));
        const xOff = g(f(time - 0.3));

        const x1 = 12 + 8 * x;
        const x2 = 12 + 8 * xOff;

        return (
            <svg {...props} width="24" height="4">
                <line
                    x1={x1}
                    y1="2"
                    x2={x2}
                    y2="2"
                    stroke="currentColor"
                    stroke-linecap="round" // eslint-disable-line react/no-unknown-property
                    stroke-width="4" // eslint-disable-line react/no-unknown-property
                />
            </svg>
        );
    }
}
