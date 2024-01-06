//! This file contains debug and error logging functions with a fancy prefix to distinguish them
//! from messages posted by the FE.

/* eslint-disable no-console */
export function any (f, ...args) {
    // this uses the %c%s formatting in console functions that’s apparently standardized (?)
    //
    // if the user ends up seeing mangled garbage, that browser is probably not supported anyway
    console[f](
        '%ccore%c ' + args.map(arg => typeof arg === 'string' ? '%s' : '%o').join(' '),
        'padding:1px 2px;border-radius:4px;border:1px solid #4ebc6b',
        '',
        ...args
    );
}

const debugEnabledState = [0, false];
function isDebugEnabled () {
    const now = Date.now();
    if (now - debugEnabledState[0] > 10000) {
        try {
            debugEnabledState[1] = sessionStorage.coreDebug;
        } catch {
            /* nothing */
        }
    }
    return debugEnabledState[1];
}

export function debug (...args) {
    if (!isDebugEnabled()) return;
    any('debug', ...args);
}
export function warn (...args) {
    any('warn', ...args);
}
export function error (...args) {
    any('error', ...args);
}
