import { h, createRef } from 'preact';
import { PureComponent } from 'preact/compat';
import { TextField } from 'yamdl';
import DisplayError from '../utils/error';
import FormContext from './context';
import './validated-text-field.less';

/**
 * A validated text field is a text field that integrates with the <Form> component.
 * It inherits all props from TextField.
 *
 * # Additional Props
 * - validate: (value) => any error | null
 */
export default class ValidatedTextField extends PureComponent {
    state = {
        error: null,
        // whether we should continuously check for errors on every input
        continuous: false,
    };

    static contextType = FormContext;

    innerRef = createRef(null);

    get node () {
        return this.innerRef.current?.node;
    }

    get inputNode () {
        return this.innerRef.current?.inputNode;
    }

    focus () {
        this.innerRef.current.focus();
    }

    validate (submitting) {
        let error = null;
        try {
            if (this.props.validate) error = this.props.validate(this.props.value);
        } catch (e) {
            error = e;
        }
        if (error) {
            this.setState({ error, continuous: true });
            if (submitting) this.focus();
            return false;
        } else {
            this.setState({ error: null, continuous: false });
            return true;
        }
    }

    setError (error) {
        this.setState({ error, continuous: true });
    }

    componentDidMount () {
        this.context.register(this);
    }

    componentWillUnmount () {
        this.context.deregister(this);
    }

    componentDidUpdate (prevProps) {
        // we need to ignore NaN values because otherwise we'll get stuck in an infinite loop
        // (NaN != NaN, so we call validate, so the component updates, so we end up here again...)
        if (prevProps.value != this.props.value && !Number.isNaN(this.props.value) && this.state.continuous) {
            this.validate();
        }
    }

    onChange = (v, e) => {
        if (this.props.onChange) this.props.onChange(v, e);
        if (!e.defaultPrevented && this.state.continuous) {
            this.validate();
        }
    };

    onBlur = (e) => {
        if (this.props.onBlur) this.props.onBlur(e);
        if (!e.defaultPrevented) {
            this.validate();
        }
    };

    render ({ validate, onChange, onBlur, ...props }) {
        void validate, onChange, onBlur;

        let errorLabel = null;
        if (this.state.error && typeof this.state.error === 'string') {
            errorLabel = this.state.error;
        } else if (this.state.error) {
            errorLabel = <DisplayError class="validated-text-field-display-error" error={this.state.error} />;
        }

        return (
            <TextField
                ref={this.innerRef}
                error={errorLabel}
                onChange={this.onChange}
                onBlur={this.onBlur}
                {...props} />
        );
    }
}
