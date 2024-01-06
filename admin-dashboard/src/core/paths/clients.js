import JSON5 from 'json5';
import { createStoreObserver } from '../view';
import asyncClient from '../client';
import * as store from '../store';
import { deepMerge } from '../../util';
import {
    crudDelete,
    crudGet,
    crudList,
    crudUpdate,
    simpleDataView,
} from '../templates';

export const CLIENTS = 'clients';
export const CLIENT_PERMS = 'clientPerms';
export const SIG_CLIENTS = '!clients';

export const tasks = {
    /** clients/list: lists clients */
    list: crudList({
        apiPath: () => `/clients`,
        fields: ['name', 'apiKey', 'ownerName', 'ownerEmail'],
        specialSearchFields: (search, options, transientFields) => {
            if (search.field === 'apiKey') {
                try {
                    const key = Buffer.from(search.query, 'hex');
                    if (key.length !== 16) throw new Error('invalid length');
                    options.filter = { apiKey: key };
                    transientFields.push('apiKey');
                } catch {
                    throw { code: 'invalid-api-key', message: 'invalid API key' };
                }
                return true;
            }
            return false;
        },
        map: (item) => {
            item.id = item.apiKey.toString('hex');
        },
        storePath: (_, { id }) => [CLIENTS, id],
    }),

    /** clients/client: returns a single client */
    client: crudGet({
        apiPath: ({ id }) => `/clients/${id}`,
        fields: ['name', 'apiKey', 'ownerName', 'ownerEmail'],
        map: (item) => {
            item.id = item.apiKey.toString('hex');
        },
        storePath: ({ id }) => [CLIENTS, id],
    }),

    /** clients/create: creates a client */
    create: async (_, { name, ownerName, ownerEmail }) => {
        const client = await asyncClient;
        const res = await client.post('/clients', { name, ownerName, ownerEmail });
        store.signal([CLIENTS, SIG_CLIENTS]);
        return {
            id: res.res.headers.get('x-identifier'),
            secret: Buffer.from(res.body.apiSecret).toString('hex'),
        };
    },
    // dummy for UI
    _createdSecret: async () => {},

    /** clients/update: updates a client */
    update: crudUpdate({
        apiPath: ({ id }) => `/clients/${id}`,
        storePath: ({ id }) => [CLIENTS, id],
    }),

    /** clients/delete: deletes a client */
    delete: crudDelete({
        apiPath: ({ id }) => `/clients/${id}`,
        storePath: ({ id }) => [CLIENTS, id],
        signalPath: () => [CLIENTS, SIG_CLIENTS],
    }),

    /** clients/permissions: returns permissions of a client */
    permissions: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/clients/${id}/permissions`);

        let memberRestrictions = null;
        try {
            const res = await client.get(`/clients/${id}/member_restrictions`, {
                fields: ['filter', 'fields'],
            });
            memberRestrictions = res.body;
        } catch (err) {
            if (err.statusCode === 404) {
                memberRestrictions = null;
            } else {
                throw err;
            }
        }

        const perms = res.body.map(({ permission }) => permission);
        const mrEnabled = !!memberRestrictions;
        const mrFilter = memberRestrictions
            ? JSON5.stringify(memberRestrictions.filter, undefined, 4)
            : '{\n\t\n}';
        const mrFields = memberRestrictions
            ? memberRestrictions.fields
            : {};

        const permData = {
            permissions: perms,
            mrEnabled,
            mrFilter,
            mrFields,
        };

        store.insert([CLIENT_PERMS, id], permData);
        return permData;
    },
    setPermissions: () => {}, // dummy for UI
    /** clients/setPermissionsPX: sets client permissions (ONLY sends permissions to server) */
    setPermissionsPX: async ({ id }, { permissions }) => {
        const client = await asyncClient;
        await client.put(`/clients/${id}/permissions`, permissions.permissions);
        const existing = store.get([CLIENT_PERMS, id]);
        store.insert([CLIENT_PERMS, id], deepMerge(existing, {
            permissions: permissions.permissions,
        }));
    },
    /** clients/setPermissionsMR: sets client permissions (ONLY sends MR to server) */
    setPermissionsMR: async ({ id }, { permissions }) => {
        const client = await asyncClient;
        const existing = store.get([CLIENT_PERMS, id]);
        if (permissions.mrEnabled) {
            await client.put(`/clients/${id}/member_restrictions`, {
                filter: JSON5.parse(permissions.mrFilter),
                fields: permissions.mrFields,
            });
        } else {
            try {
                await client.delete(`/clients/${id}/member_restrictions`);
            } catch (err) {
                if (err.statusCode === 404) {
                    // not found; means there weren’t any in the first place
                } else {
                    throw err;
                }
            }
        }
        store.insert([CLIENT_PERMS, id], deepMerge(existing, {
            mrEnabled: permissions.mrEnabled,
            mrFilter: permissions.mrFilter,
            mrFields: permissions.mrFields,
        }));
    },
};

export const views = {
    /**
     * clients/client: data view of a client.
     *
     * # Options
     * - id: client id
     * - noFetch: if true, will not fetch any new data
     */
    client: simpleDataView({
        storePath: ({ id }) => [CLIENTS, id],
        get: tasks.client,
    }),
    /**
     * clients/permissions: views a client’s permissions
     *
     * # Options
     * - id: client id
     * - noFetch: if true, will not fetch any new data
     */
    permissions: simpleDataView({
        storePath: ({ id }) => [CLIENT_PERMS, id],
        get: tasks.permissions,
    }),

    sigClients: createStoreObserver([CLIENTS, SIG_CLIENTS]),
};
