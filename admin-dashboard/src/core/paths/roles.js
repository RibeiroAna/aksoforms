import { AbstractDataView, createStoreObserver } from '../view';
import asyncClient from '../client';
import * as log from '../log';
import * as store from '../store';
import {
    crudList,
    crudGet,
    crudCreate,
    crudUpdate,
    crudDelete,
    simpleDataView,
} from '../templates';

/** Data store path. */
export const ROLES = 'codeholder_roles';
export const SIG_ROLES = '!roles';

/** Loads all roles because there won’t be too many for that to be a problem */
async function loadAllRoles () {
    if (store.get([ROLES])) return;

    const client = await asyncClient;
    let total = Infinity;
    const items = [];
    while (total > items.length) {
        const res = await client.get('/codeholder_roles', {
            offset: items.length,
            limit: 100,
            fields: [
                'id',
                'name',
                'description',
                'public',
            ],
        });
        total = +res.res.headers.get('x-total-items');
        items.push(...res.body);

        if (res.body.length === 0) {
            log.error(
                `failed loading roles: we currently have ${items.length}`
                + ` and server reported total count ${total} but unexpectedly returned zero items;`
                + ` aborting and returning partial result`,
            );
            break;
        }
    }

    const roles = {};
    for (const item of items) {
        roles[item.id] = item;
    }

    store.insert([ROLES], roles);
}

export const tasks = {
    list: crudList({
        apiPath: () => `/codeholder_roles`,
        fields: ['id', 'name', 'description', 'public'],
        storePath: (_, item) => [ROLES, item.id],
    }),
    role: crudGet({
        apiPath: ({ id }) => `/codeholder_roles/${id}`,
        fields: ['id', 'name', 'description', 'public'],
        storePath: ({ id }) => [ROLES, id],
    }),
    create: crudCreate({
        apiPath: () => `/codeholder_roles`,
        fields: ['name', 'description', 'public'],
        storePath: (_, id) => [ROLES, id],
        signalPath: () => [ROLES, SIG_ROLES],
    }),
    update: crudUpdate({
        apiPath: ({ id }) => `/codeholder_roles/${id}`,
        storePath: ({ id }) => [ROLES, id],
    }),
    delete: crudDelete({
        apiPath: ({ id }) => `/codeholder_roles/${id}`,
        storePath: ({ id }) => [ROLES, id],
        signalPath: () => [ROLES, SIG_ROLES],
    }),
};

export const views = {
    /** roles/roles: a view of all roles */
    roles: class Roles extends AbstractDataView {
        constructor () {
            super();

            store.subscribe([ROLES], this.#onUpdate);
            if (store.get([ROLES])) this.#onUpdate();

            loadAllRoles().catch(err => this.emit('error', err));
        }

        #onUpdate = () => this.emit('update', store.get([ROLES]));

        drop () {
            store.unsubscribe([ROLES], this.#onUpdate);
        }
    },
    role: simpleDataView({
        storePath: ({ id }) => [ROLES, id],
        get: tasks.role,
    }),
    sigRoles: createStoreObserver([ROLES, SIG_ROLES]),
};
