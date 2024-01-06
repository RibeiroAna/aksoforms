//! Constants used in the Core-FE protocol.

export const LoginAuthStates = {
    UNKNOWN: 0,
    LOGGED_OUT: 1,
    AUTHENTICATING: 2,
    AUTHENTICATED: 3,
    VERIFYING_TOTP: 4,
    LOGGED_IN: 5,
    LOGGING_OUT: 6,
};
