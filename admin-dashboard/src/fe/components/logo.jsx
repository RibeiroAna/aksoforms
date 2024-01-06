import { h, Component } from 'preact';
import { Spring, globalAnimator } from 'yamdl';
import './logo.less';

const PATH = 'M33 5h8.053c6.24 0 8.503.65 10.785 1.87a12.721 12.721 0 0 1 5.292 5.292C58.35 14.444'
    + ' 59 16.707 59 22.947V31H33V5z';

/**
 * The AKSO logo; animatable.
 *
 * # Props
 * - onUpdate: called on every animation frame with this object as the first argument
 * - style: additional style properties
 */
export default class Logo extends Component {
    states = [1, 8, 8, 7].map((_, i) => ({
        offset: i * Math.PI / 2,
        bounce: new Mass(4, -120, 0.63),
    }));
    rotation = new Spring(1, 1);
    spread = new Spring(0.3, 0.3);

    bounce (velocity) {
        for (const state of this.states) {
            state.bounce.velocity = velocity;
        }
        if (this.spread.target) this.spread.velocity -= 300;
        globalAnimator.register(this);
    }

    spin () {
        this.rotation.target += Math.PI;
        globalAnimator.register(this);
    }

    focus () {
        this.spread.target = 3;
        globalAnimator.register(this);
    }

    blur () {
        this.spread.target = 0;
        globalAnimator.register(this);
    }

    update (dt) {
        let wantsUpdate = false;
        for (const state of this.states) {
            state.bounce.update(dt);
            if (state.bounce.wantsUpdate) wantsUpdate = true;
        }
        this.rotation.update(dt);
        if (this.rotation.wantsUpdate()) wantsUpdate = true;
        this.spread.update(dt);
        if (this.spread.wantsUpdate()) wantsUpdate = true;
        if (!wantsUpdate) globalAnimator.deregister(this);
        this.forceUpdate();

        if (this.props.onUpdate) this.props.onUpdate(this);
    }


    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render () {
        const monochrome = this.props.monochrome;
        const spread = this.spread.value;

        return (
            <svg
                class={'akso-logo' + (monochrome ? ' is-monochrome' : '')}
                aria-hidden="true"
                role="presentation"
                viewBox="0 0 64 64"
                style={this.props.style}
                ref={node => this.node = node}>
                {this.states.map((state, i) => (
                    <path
                        class="corner"
                        data-i={i}
                        key={i}
                        d={PATH}
                        style={{
                            transformOrigin: '32px 32px',
                            transform: `rotate(${state.offset + this.rotation.value}rad) `
                                + `translate(${state.bounce.value + spread}px, ${-state.bounce.value - spread}px)`,
                        }} />
                ))}
            </svg>
        );
    }
}

class Mass {
    value = 0;
    velocity = 0;
    ground = 0;

    constructor (mass, gravity, bounce) {
        this.mass = mass;
        this.gravity = gravity;
        this.bounce = bounce;
    }

    update (elapsed) {
        let timeLeft = elapsed;
        while (timeLeft > 0) {
            const dt = Math.min(1 / 60, timeLeft);
            timeLeft -= dt;
            this.velocity += this.gravity * this.mass * dt;
            this.value += this.velocity * dt;

            if (this.value < this.ground) {
                this.value = this.ground;
                this.velocity *= -this.bounce;
            }
        }

        if (!this.wantsUpdate) {
            this.value = this.ground;
            this.velocity = 0;
        }
    }

    get wantsUpdate () {
        return Math.abs(this.value - this.ground)
            + Math.abs(this.velocity) / (this.gravity ** 2) > 1e-3;
    }
}
