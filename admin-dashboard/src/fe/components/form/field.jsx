import { h, createRef } from 'preact';
import { PureComponent } from 'preact/compat';
import { globalAnimator, Spring } from 'yamdl';
import FormContext from './context';
import DisplayError from '../utils/error';
import './field.less';

export default class Field extends PureComponent {
    state = {
        /**
         * The set of error props.
         * @type {Object|null}
         */
        error: null,
        /**
         * If true, will continuously check validity instead of only when validation is triggered
         * externally (such as by the Form being submitted).
         */
        continuous: false,
    };

    static contextType = FormContext;

    node = createRef();
    translateX = new Spring(0.4, 0.3);

    /** Shakes the component to indicate an error. */
    shake () {
        this.translateX.velocity = 500;
        globalAnimator.register(this);
        this.node.current?.scrollIntoView && this.node.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
        });
    }

    /** Manually sets an error. */
    setError (error) {
        this.setState({ error, continuous: true });
    }

    /**
     * Validates the value using the `validate` prop.
     * @param {boolean} submitting - if true, will shake the component on error. Should be falsy
     *                               by default because the shaking animation is distracting.
     */
    validate (submitting) {
        try {
            if (this.props.validate) {
                const error = this.props.validate(this.props.value);
                if (error) throw error;
            }
            this.setState({ error: null, continuous: false });
            return true;
        } catch (error) {
            this.setError(error);
            if (submitting) this.shake();
            return false;
        }
    }

    update (dt) {
        this.translateX.update(dt);
        if (!this.translateX.wantsUpdate()) {
            globalAnimator.deregister(this);
        }
        this.forceUpdate();
    }

    componentDidMount () {
        this.context.register(this);
    }

    componentWillUnmount () {
        this.context.deregister(this);
        globalAnimator.deregister(this);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value != this.props.value && this.state.continuous) {
            this.validate();
        }
    }

    render ({ class: className, children, ...extra }) {
        const style = {
            transform: `translateX(${this.translateX.value}px)`,
        };

        extra.style = Object.assign(extra.style || {}, style);

        let error = null;
        if (this.state.error) {
            if (typeof this.state.error === 'string') {
                error = (
                    <div class="form-field-container-error">
                        {this.state.error}
                    </div>
                );
            } else if (error) {
                error = (
                    <div class="form-field-container-error">
                        <DisplayError error={this.state.error} />
                    </div>
                );
            }
        }

        return (
            <div class={'form-field-container ' + (className || '')} {...extra} ref={this.node}>
                {children}
                {error}
            </div>
        );
    }
}
