import { createStoreObserver } from '../view';
import asyncClient from '../client';
import {
    crudList,
    crudGet,
    crudCreate,
    crudUpdate,
    crudDelete,
    simpleDataView,
} from '../templates';
import JSON5 from 'json5';

export const LISTS = 'lists';
export const SIG_LISTS = '!lists';

export const tasks = {
    /** lists/list: lists lists */
    list: crudList({
        apiPath: () => '/lists',
        fields: ['id', 'name', 'description'],
        storePath: (_, item) => [LISTS, item.id],
    }),
    /** lists/item: fetches a single list */
    item: crudGet({
        apiPath: ({ id }) => `/lists/${id}`,
        fields: ['id', 'name', 'description', 'filters', 'memberFilter'],
        map: item => {
            // try converting filters to JSON5 syntax
            item.filters = item.filters.map(filter => {
                try {
                    return JSON5.stringify(JSON.parse(filter), undefined, '\t');
                } catch {
                    return filter;
                }
            });
        },
        storePath: ({ id }) => [LISTS, id],
    }),
    /** lists/create: creates a list */
    create: crudCreate({
        apiPath: () => `/lists`,
        fields: ['name', 'description', 'filters'],
        storePath: (_, id) => [LISTS, id],
        signalPath: () => [LISTS, SIG_LISTS],
    }),
    /** lists/update: updates a list */
    update: crudUpdate({
        apiPath: ({ id }) => `/lists/${id}`,
        map: delta => {
            if ('filters' in delta) {
                // convert back from JSON5 syntax
                delta.filters = delta.filters.map(filter => JSON.stringify(JSON5.parse(filter)));
            }
        },
        storePath: ({ id }) => [LISTS, id],
    }),
    /** lists/delete: deletes a list */
    delete: crudDelete({
        apiPath: ({ id }) => `/lists/${id}`,
        storePath: ({ id }) => [LISTS, id],
        signalPath: () => [LISTS, SIG_LISTS],
    }),
    /** lists/codeholders: lists codeholders that are part of a list */
    codeholders: async ({ id }, { offset, limit }) => {
        const client = await asyncClient;
        const res = await client.get(`/lists/${id}/codeholders`, {
            offset,
            limit,
        });

        const res2 = await client.get(`/codeholders`, {
            fields: [
                'id',
                'firstName',
                'lastName',
                'firstNameLegal',
                'lastNameLegal',
                'honorific',
                'fullName',
                'profilePictureHash',
            ],
            filter: { id: { $in: res.body } },
            offset: 0,
            limit,
        });
        const codeholders = Object.fromEntries(res2.body.map(c => [c.id, c]));

        return {
            items: res.body.map(id => codeholders[id]),
            total: Infinity, // not supported in API
        };
    },
};

export const views = {
    /** lists/list: data view of a single list */
    list: simpleDataView({
        storePath: ({ id }) => [LISTS, id],
        get: tasks.item,
    }),

    /** lists/sigLists: emits a signal when the list of lists may have changed */
    sigLists: createStoreObserver([LISTS, SIG_LISTS]),
};
