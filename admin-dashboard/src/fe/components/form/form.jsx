import { h, createRef } from 'preact';
import { PureComponent } from 'preact/compat';
import FormContext from './context';

/**
 * A `<form>` with validation handling.
 *
 * # Props
 * - onSubmit: submission handler
 *
 * # Examples
 * ```jsx
 * render() {
 *     return (
 *         <Form onSubmit={() => alert('form submitted')}>
 *             <ValidatedTextField
 *                 validate={() => {
 *                     if (this.state.value !== 'valid') return 'error label';
 *                 }}
 *                 value={this.state.value}
 *                 onChange={value => this.setState({ value })} />
 *         </Form>
 *     );
 * }
 * ```
 */
export default class Form extends PureComponent {
    static contextType = FormContext;
    node = createRef();

    /** Form fields registered using [FormContext]. */
    fields = new Set();

    /**
     * Validates all form fields.
     * @return {boolean} true if successful.
     */
    validate () {
        let valid = true;
        for (const field of this.fields) {
            if (!field.validate(true)) {
                valid = false;
            }
        }
        return valid;
    }

    reportValidity = () => {
        if (!this.validate()) return false;
        if (!this.node.current.reportValidity()) return false;
        return true;
    };

    componentDidMount () {
        // register the form inside a parent form context if applicable
        if (this.context) this.context.register(this);
    }
    componentWillUnmount () {
        if (this.context) this.context.deregister(this);
    }

    /** FormContext register handler */
    onRegister = field => {
        this.fields.add(field);
    };

    /** FormContext deregister handler */
    onDeregister = field => {
        this.fields.delete(field);
    };

    /** Native `submit` event handler */
    onSubmit = e => {
        e.preventDefault();
        this.submit();
    };

    submit () {
        if (this.validate()) {
            this.props.onSubmit();
        }
    }

    requestSubmit () {
        this.node.current.requestSubmit();
    }

    render () {
        return (
            <FormContext.Provider value={{
                register: this.onRegister,
                deregister: this.onDeregister,
                reportValidity: this.reportValidity,
            }}>
                <form
                    ref={this.node}
                    {...this.props}
                    onSubmit={this.onSubmit}>
                    {this.props.children}
                </form>
            </FormContext.Provider>
        );
    }
}
