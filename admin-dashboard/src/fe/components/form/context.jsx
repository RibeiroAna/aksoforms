import { createContext } from 'preact/compat';

/**
 * Context that contains an interface to the [Form] component.
 *
 * Every Form will create an instance of this context, allowing form components to register
 * themselves.
 */
export default createContext({
    /** Register a form component (should be passed the component instance as the first arg). */
    register: () => {},
    /** Deregisters a previously registered component (pass component as first arg). */
    deregister: () => {},
    /** Validates form fields and shows result to user */
    reportValidity: () => {},
});

