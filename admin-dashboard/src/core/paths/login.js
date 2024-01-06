import asyncClient from '../client';
import * as store from '../store';
import {
    LOGIN,
    AUTH_STATE,
    IS_ADMIN,
    TOTP_REQUIRED,
    TOTP_SETUP_REQUIRED,
    UEA_CODE,
    LOGIN_ID,
    COMPLETED,
    IS_ACTUALLY_ADMIN,
} from './login-keys';
import { LoginAuthStates } from '../../protocol';
import { createStoreObserver } from '../view';

export const tasks = {
    /** login/login: performs login */
    login: async (_, { login, password, allowNonAdmin }) => {
        const client = await asyncClient;
        if (client.loggedIn) {
            throw { code: 'already-logged-in', message: 'already logged in' };
        }
        store.insert(COMPLETED, false);
        store.insert(AUTH_STATE, LoginAuthStates.AUTHENTICATING);
        let result;
        try {
            result = await client.logIn(login, password);
        } catch (err) {
            if (err.statusCode === 409) {
                store.insert(AUTH_STATE, LoginAuthStates.LOGGED_OUT);
                throw { code: 'needs-password-setup', message: err.toString() };
            }

            store.insert(AUTH_STATE, LoginAuthStates.LOGGED_OUT);
            throw { code: err.statusCode, message: err.toString() };
        }

        store.insert(AUTH_STATE, (!client.totpRequired || result.totpUsed) ? LoginAuthStates.LOGGED_IN : LoginAuthStates.AUTHENTICATED);
        store.insert(IS_ADMIN, result.isAdmin || allowNonAdmin);
        store.insert(IS_ACTUALLY_ADMIN, result.isAdmin);
        store.insert(UEA_CODE, result.newCode);
        store.insert(LOGIN_ID, result.id);
        if (client.totpRequired) {
            store.insert(TOTP_REQUIRED, client.totpRequired && !result.totpUsed);
            store.insert(TOTP_SETUP_REQUIRED, result.isAdmin && !result.totpSetUp);
        }

        return result;
    },
    /** login/overrideIsAdmin: for testing purposes; allow overriding isAdmin */
    overrideIsAdmin: async ({ override }) => {
        store.insert(IS_ADMIN, override ? true : store.get(IS_ACTUALLY_ADMIN));
    },
    /**
     * login/totp: verifies the totp code
     *
     * pass a secret to set up TOTP instead
     */
    totp: async ({ secret }, { code, remember }) => {
        const client = await asyncClient;
        if (store.get(AUTH_STATE) !== LoginAuthStates.AUTHENTICATED) {
            throw { code: 'invalid-state', message: 'can only use totp in authenticated state' };
        }
        store.insert(AUTH_STATE, LoginAuthStates.VERIFYING_TOTP);
        try {
            if (secret) {
                await client.totpSetup(Buffer.from(secret), code, remember);
            } else {
                await client.totpLogIn(code, remember);
            }
        } catch (err) {
            store.insert(AUTH_STATE, LoginAuthStates.AUTHENTICATED);
            throw { code: err.statusCode, message: err.toString() };
        }
        store.insert(AUTH_STATE, LoginAuthStates.LOGGED_IN);
    },
    /** login/removeTotp: removes totp */
    removeTotp: async () => {
        const client = await asyncClient;
        await client.totpRemove();
    },
    /**
     * login/logOut: logs the user out and purges the data store to get rid of PII and sensitive
     * data (though it should be noted that this is by no means secure)
     */
    logOut: async () => {
        const client = await asyncClient;
        if (!client.loggedIn) {
            throw { code: 'not-logged-in', message: 'not logged in' };
        }
        if (store.get(AUTH_STATE) !== LoginAuthStates.LOGGED_IN
            && store.get(AUTH_STATE) !== LoginAuthStates.AUTHENTICATED) {
            throw { code: 'invalid-state', message: 'can only log out when authenticated' };
        }
        store.insert(AUTH_STATE, LoginAuthStates.LOGGING_OUT);
        try {
            await client.logOut();
        } catch (err) {
            store.insert(AUTH_STATE, LoginAuthStates.LOGGED_IN);
            throw err;
        }
        store.insert(AUTH_STATE, LoginAuthStates.LOGGED_OUT);
        store.insert(COMPLETED, true);
    },
    /** login/hasPassword: checks if the user has a password */
    hasPassword: async (_, { login }) => {
        const client = await asyncClient;

        if (store.get(AUTH_STATE) !== LoginAuthStates.LOGGED_OUT) {
            throw { code: 'invalid-state', message: 'cannot check hasPassword if not logged out' };
        }

        try {
            await client.logIn(login, '');
            // this should not succeed under any circumstances
            throw { code: 'confused', message: 'login with empty-string password succeeded (???)' };
        } catch (err) {
            if (err.statusCode === 409) return false;
            else if (err.statusCode === 401)  return true;
            else throw { code: err.statusCode, message: err.toString() };
        }
    },
    /** login/createPassword: creates a password */
    createPassword: async ({ login, token }, { password, allowNonAdmin }) => {
        const client = await asyncClient;

        store.insert(AUTH_STATE, LoginAuthStates.AUTHENTICATING);

        try {
            // FIXME: add this to user-client.js instead of using private APIs here
            await client.req({
                method: 'POST',
                path: `/codeholders/${login}/!create_password_use`,
                body: {
                    key: Buffer.from(token, 'hex'),
                    password,
                },
                _allowLoggedOut: true,
            });
            return await tasks.login({}, { login, password, allowNonAdmin });
        } catch (err) {
            store.insert(AUTH_STATE, LoginAuthStates.LOGGED_OUT);
            throw { code: err.statusCode, message: err.toString() };
        }
    },
    /**
     * login/initCreatePassword: sends password reset email
     *
     * Set create to true if the codeholder doesn’t have a password yet.
     */
    initCreatePassword: async ({ create = false }, { login }) => {
        const client = await asyncClient;

        try {
            // FIXME: add this to user-client.js instead of using private APIs here
            await client.req({
                method: 'POST',
                path: `/codeholders/${login}/!${create ? 'create' : 'forgot'}_password`,
                _allowLoggedOut: true,
                body: {
                    org: 'akso',
                },
            });
        } catch (err) {
            throw { code: err.statusCode, message: err.toString() };
        }
    },

    // these are not really related to login but used on the login screen

    apiVersion: async () => {
        const client = await asyncClient;
        const res = await fetch(client.client.createURL('/'));
        if (!res.ok) throw { statusCode: res.status };
        const text = await res.text();
        const version = text.match(/version:\s*([^\n]+)/i);
        if (!version) throw { code: 'no-version', message: 'Could not find version string' };
        return version[1];
    },

    getOneTimeToken: async ({ ctx, token }) => {
        const client = await asyncClient;
        const res = await client.req({
            method: 'GET',
            path: `/tokens`,
            query: { ctx, token },
            _allowLoggedOut: true,
        });
        return res.body;
    },
    submitOneTimeToken: async ({ ctx, token, unsubscribeReason }) => {
        const body = { ctx, token };
        if (ctx === 'unsubscribe_newsletter') {
            body.unsubscribeReason = unsubscribeReason;
        }

        const client = await asyncClient;
        await client.req({
            method: 'PUT',
            path: `/tokens`,
            body,
            _allowLoggedOut: true,
        });
    },
};

/** login: observes the entire login data store (it’s constant-sized that so this is fine) */
export const views = createStoreObserver([LOGIN]);
