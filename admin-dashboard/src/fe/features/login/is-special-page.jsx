export const Mode = {
    NORMAL: 0,
    CREATING_PASSWORD: 1,
    RESETTING_PASSWORD: 2,
    ONE_TIME_TOKEN: 3,
};

/** Returns the mode and possibly additional data for the current page. */
export function getPageMode () {
    const pathname = document.location.pathname;

    let match = pathname.match(/^\/ott$/);
    if (match) {
        const query = new URLSearchParams(document.location.search);
        const context = query.get('ctx');
        const token = query.get('token');
        return {
            mode: Mode.ONE_TIME_TOKEN,
            oneTimeToken: {
                context,
                token,
            },
        };
    }

    match = pathname.match(/^\/(krei_pasvorton|nova_pasvorto)\/([^/]+)\/([\da-fA-f]+)\/?$/);
    if (match) return {
        mode: match[1] === 'krei_pasvorton'
            ? Mode.CREATING_PASSWORD
            : Mode.RESETTING_PASSWORD,
        login: match[2],
        token: match[3],
    };
    return { mode: Mode.NORMAL };
}

/**
 * Returns true if the current page is a special page (such as the “create password” page) and
 * should always show the login screen.
 */
export default function isSpecialPage () {
    return getPageMode().mode !== Mode.NORMAL;
}
