import { createStoreObserver } from '../view';
import { TASKS } from '../store';

/**
 * Turns a path lazy by making it a function that returns a promise with the actual object when
 * called.
 *
 * @param f - the () => import(...) closure
 * @param map - maps on the result of f
 */
const lazyPath = (f, map) => {
    let promise;
    function lazy () {
        if (!promise) {
            promise = f().then(map).catch(err => {
                promise = null;
                throw { type: 'chunk-load-failed', message: 'failed to load chunk: ' + err.toString() };
            });
        }
        return promise;
    }
    lazy.isLazy = true; // this marks the function as a lazy path instead of a regular object
    return lazy;
};
const mapTasks = res => res.tasks;
const mapViews = res => res.views;

const clients = () => import(/* webpackChunkName: 'core-clients' */ './clients');
const codeholders = () => import(/* webpackChunkName: 'core-codeholders', webpackPrefetch: true */ './codeholders');
const congresses = () => import(/* webpackChunkName: 'core-congresses' */ './congresses');
const countries = () => import(/* webpackChunkName: 'core-countries', webpackPrefetch: true */ './countries');
const delegations = () => import(/* webpackChunkName: 'core-delegations' */ './delegations');
const adminGroups = () => import(/* webpackChunkName: 'core-admin' */ './admin-groups');
const adminStatus = () => import(/* webpackChunkName: 'core-admin' */ './admin-status');
const geoDb = () => import(/* webpackChunkName: 'core-geo-db' */ './geo-db');
const httpLog = () => import(/* webpackChunkName: 'core-admin' */ './http-log');
const intermediaries = () => import(/* webpackChunkName: 'core-intermediaries' */ './intermediaries');
const login = () => import(/* webpackChunkName: 'core-login', webpackPrefetch: true */ './login');
const lists = () => import(/* webpackChunkName: 'core-lists' */ './lists');
const perms = () => import(/* webpackChunkName: 'core-login', webpackPrefetch: true */ './perms');
const memberships = () => import(/* webpackChunkName: 'core-memberships' */ './memberships');
const magazines = () => import(/* webpackChunkName: 'core-magazines' */ './magazines');
const newsletters = () => import(/* webpackChunkName: 'core-newsletters' */ './newsletters');
const notifTemplates = () => import(/* webpackChunkName: 'core-notif-templates' */ './notif-templates');
const roles = () => import(/* webpackChunkName: 'core-codeholders' */ './roles');
const statistics = () => import(/* webpackChunkName: 'core-statistics' */ './statistics');
const queries = () => import(/* webpackChunkName: 'core-queries' */ './queries');
const tasks_ = () => import(/* webpackChunkName: 'core-tasks' */ './tasks');
const votes = () => import(/* webpackChunkName: 'core-votes' */ './votes');
const debug = () => import(/* webpackChunkName: 'core-debug' */ './debug');

/** Task definitions. */
export const tasks = {
    // generic tasks for generic dialogs, which will be dropped as soon as they’re run
    /** info: takes title and message options (strings probably) */
    info: async () => {},
    openExternalLink: async () => {},

    clients: lazyPath(clients, mapTasks),
    codeholders: lazyPath(codeholders, mapTasks),
    congresses: lazyPath(congresses, mapTasks),
    countries: lazyPath(countries, mapTasks),
    delegations: lazyPath(delegations, mapTasks),
    adminGroups: lazyPath(adminGroups, mapTasks),
    adminStatus: lazyPath(adminStatus, mapTasks),
    geoDb: lazyPath(geoDb, mapTasks),
    httpLog: lazyPath(httpLog, mapTasks),
    intermediaries: lazyPath(intermediaries, mapTasks),
    login: lazyPath(login, mapTasks),
    lists: lazyPath(lists, mapTasks),
    memberships: lazyPath(memberships, mapTasks),
    magazines: lazyPath(magazines, mapTasks),
    notifTemplates: lazyPath(notifTemplates, mapTasks),
    newsletters: lazyPath(newsletters, mapTasks),
    roles: lazyPath(roles, mapTasks),
    statistics: lazyPath(statistics, mapTasks),
    queries: lazyPath(queries, mapTasks),
    perms: lazyPath(perms, mapTasks),
    payments: lazyPath(payments, mapTasks),
    tasks: lazyPath(tasks_, mapTasks),
    votes: lazyPath(votes, mapTasks),
    debug: lazyPath(debug, mapTasks),
};

/** View definitions. */
export const views = {
    clients: lazyPath(clients, mapViews),
    codeholders: lazyPath(codeholders, mapViews),
    congresses: lazyPath(congresses, mapViews),
    countries: lazyPath(countries, mapViews),
    delegations: lazyPath(delegations, mapViews),
    adminGroups: lazyPath(adminGroups, mapViews),
    adminStatus: lazyPath(adminStatus, mapViews),
    geoDb: lazyPath(geoDb, mapViews),
    httpLog: lazyPath(httpLog, mapViews),
    intermediaries: lazyPath(intermediaries, mapViews),
    login: lazyPath(login, mapViews),
    lists: lazyPath(lists, mapViews),
    memberships: lazyPath(memberships, mapViews),
    magazines: lazyPath(magazines, mapViews),
    notifTemplates: lazyPath(notifTemplates, mapViews),
    newsletters: lazyPath(newsletters, mapViews),
    roles: lazyPath(roles, mapViews),
    statistics: lazyPath(statistics, mapViews),
    perms: lazyPath(perms, mapViews),
    payments: lazyPath(payments, mapViews),
    tasks: lazyPath(tasks_, mapViews),
    votes: lazyPath(votes, mapViews),
    debug: lazyPath(debug, mapViews),

    /** #tasks: a map of all current tasks to their paths; used for task views in the FE */
    [TASKS]: createStoreObserver([TASKS], tasks => {
        const data = {};
        for (const id in tasks) {
            data[id] = tasks[id].path;
        }
        return data;
    }),
};
