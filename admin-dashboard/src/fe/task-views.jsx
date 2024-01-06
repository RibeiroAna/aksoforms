// --- TASK VIEW REGISTRY ---
// copy-pasted from core/paths
const lazyPath = (f, map = (res => res.default)) => {
    let promise;
    function lazy () {
        if (!promise) {
            promise = f().then(map).catch(err => {
                promise = null;
                throw new Error('failed to load chunk: ' + err.toString());
            });
        }
        return promise;
    }
    lazy.isLazy = true;
    return lazy;
};
const genericTaskViews = () => import(/* webpackChunkName: "generic-tasks" */ './tasks');
const taskViews = {
    info: lazyPath(genericTaskViews, res => res.info),
    openExternalLink: lazyPath(genericTaskViews, res => res.openExternalLink),
    login: lazyPath(() => import(/* webpackChunkName: "login-tasks" */ './features/login/tasks')),
    clients: lazyPath(() => import(/* webpackChunkName: "clients-tasks" */ './features/pages/administration/clients/tasks')),
    congresses: lazyPath(() => import(/* webpackChunkName: "congresses-tasks" */ './features/pages/congresses/tasks')),
    countries: lazyPath(() => import(/* webpackChunkName: "countries-tasks" */ './features/pages/administration/countries/tasks')),
    codeholders: lazyPath(() => import(/* webpackChunkName: "codeholders-tasks" */ './features/pages/codeholders/tasks')),
    delegations: lazyPath(() => import(/* webpackChunkName: "delegations-tasks" */ './features/pages/delegations/tasks')),
    adminGroups: lazyPath(() => import(/* webpackChunkName: "admin-groups-tasks" */ './features/pages/administration/groups/tasks')),
    lists: lazyPath(() => import(/* webpackChunkName: "lists-tasks" */ './features/pages/lists/tasks')),
    intermediaries: lazyPath(() => import(/* webpackChunkName: "intermediaries-tasks" */ './features/pages/intermediaries/intermediaries/tasks')),
    memberships: lazyPath(() => import(/* webpackChunkName: "memberships-tasks" */ './features/pages/memberships/tasks')),
    magazines: lazyPath(() => import(/* webpackChunkName: "magazines-tasks" */ './features/pages/magazines/tasks')),
    newsletters: lazyPath(() => import(/* webpackChunkName: "newsletters-tasks" */ './features/pages/newsletters/tasks')),
    notifTemplates: lazyPath(() => import(/* webpackChunkName: "notif-templates-tasks" */ './features/pages/notif-templates/tasks')),
    roles: lazyPath(() => import(/* webpackChunkName: "roles-tasks" */ './features/pages/roles/tasks')),
    payments: lazyPath(() => import(/* webpackChunkName: "payments-tasks" */ './features/pages/payments/tasks')),
    votes: lazyPath(() => import(/* webpackChunkName: "votes-tasks" */ './features/pages/votes/tasks')),
    queries: lazyPath(() => import(/* webpackChunkName: "queries-tasks" */ './features/queries')),
};
export const loadTaskView = async (taskPath) => {
    if (!taskPath) return null;
    const path = taskPath.split('/');
    let o = taskViews;
    for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (!(p in o)) return null;
        o = o[p];
        if (o.isLazy) o = await o();
        if (i === path.length - 1) {
            return o || null;
        }
    }
};
