import { h } from 'preact';
import { forwardRef, createContext, useContext } from 'preact/compat';

/** This context will contain a Perms instance (see akso-client) when active. */
export const permsContext = createContext(null);
export default permsContext;

/**
 * Connects a component to perms. Forwards refs.
 *
 * # Parameters
 * - `view`: the component
 * - `name`: the prop name at which perms will be passed to the component. Defaults to `perms`
 */
export function connectPerms (view, name = 'perms') {
    return forwardRef((props, ref) => {
        return (
            <permsContext.Consumer>
                {perms => h(view, { ref, ...props, [name]: perms })}
            </permsContext.Consumer>
        );
    });
}

export function usePerms () {
    return useContext(permsContext);
}