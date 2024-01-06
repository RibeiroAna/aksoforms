import { base } from 'akso:config';
import * as store from './store';
import {
    LOGIN,
    AUTH_STATE,
    IS_ADMIN,
    TOTP_REQUIRED,
    TOTP_SETUP_REQUIRED,
    UEA_CODE,
    LOGIN_ID,
    IS_ACTUALLY_ADMIN,
} from './paths/login-keys';
import { LoginAuthStates } from '../protocol';
import * as log from './log';

const GET_AUTH_TRIES = [LOGIN, 'getAuthTries'];

/** runs GET /auth */
const getAuth = async () => {
    let tries = 1;

    // this does not use akso-client so we can run this while akso-client is still loading
    while (true) { // eslint-disable-line no-constant-condition
        try {
            log.debug('getting auth');
            const res = await fetch(new URL('auth', base).toString(), {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                },
            });
            log.debug('got auth');
            if (res.ok) {
                return res.json();
            } else if (res.status === 404) {
                return false;
            } else {
                throw new Error('unexpected response from /auth');
            }
        } catch (err) {
            log.error(`failed to get auth (try ${tries})`, err);
        }
        const nextTryDelay = 1000 * Math.min(60, 2 ** tries);
        store.insert(GET_AUTH_TRIES, [tries, Date.now() + nextTryDelay]);
        tries++;
        await new Promise(r => setTimeout(r, nextTryDelay));
    }
};

/** Initial GET /auth result */
export const initialAuth = getAuth();

store.insert(AUTH_STATE, LoginAuthStates.UNKNOWN);
initialAuth.then(auth => {
    store.remove(GET_AUTH_TRIES);
    if (auth) {
        const totpRequired = (auth.isAdmin || auth.totpSetUp);
        store.insert(AUTH_STATE, (totpRequired && !auth.totpUsed)
            ? LoginAuthStates.AUTHENTICATED
            : LoginAuthStates.LOGGED_IN);
        store.insert(IS_ADMIN, auth.isAdmin);
        store.insert(IS_ACTUALLY_ADMIN, auth.isAdmin);
        store.insert(TOTP_REQUIRED, totpRequired && !auth.totpUsed);
        store.insert(TOTP_SETUP_REQUIRED, auth.isAdmin && !auth.totpSetUp);
        store.insert(UEA_CODE, auth.newCode);
        store.insert(LOGIN_ID, auth.id);
    } else {
        store.insert(AUTH_STATE, LoginAuthStates.LOGGED_OUT);
    }
});

const lazyUserClient = import(/* webpackChunkName: 'akso-client' */ './user-client').then(res => res.default);
export default lazyUserClient.then(UserClient => {
    const client = new UserClient({ host: base });
    return initialAuth.then(auth => {
        if (auth) {
            client.loggedIn = true;
            client.totpRequired = auth.isAdmin || auth.totpSetUp;
            client.csrfToken = auth.csrfToken;
        }
        return client;
    }).catch(() => client); // probably an network error; just return the client and handle that issue later
});
