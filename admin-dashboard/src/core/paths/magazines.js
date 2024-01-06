import { base32 } from 'rfc4648';
import asyncClient from '../client';
import * as store from '../store';
import { createStoreObserver } from '../view';
import { crudList, crudCreate, crudGet, crudUpdate, crudDelete, getRawFile, simpleDataView } from '../templates';
import { clientFromAPI as codeholderFromAPI } from './codeholders';

export const MAGAZINES = 'magazines';
export const SIG_MAGAZINES = '!magazines';
export const M_DATA = 'mData';
export const EDITIONS = 'editions';
export const SIG_EDITIONS = '!editions';
export const E_DATA = 'eData';
export const FILES = 'files';
export const TOC = 'toc';
export const SIG_TOC = '!toc';
export const SNAPSHOTS = 'snapshots';
export const SIG_SNAPSHOTS = '!snapshots';
export const RECITATIONS = 'recitations';
export const SUBSCRIPTIONS = 'subscriptions';
export const SIG_SUBSCRIPTIONS = '!subscriptions';

//! Data structure:
//! MAGAZINES
//! |- SIG_MAGAZINES
//! |- [magazine id]
//! |  |- M_DATA
//! |  |  |- (magazine data)
//! |  |- EDITIONS
//! |     |- SIG_EDITIONS
//! |     |- [edition id]
//! |        |- E_DATA
//! |        |  |- (edition data)
//! |        |- FILES
//! |        |  |- (file data)
//! |        |- TOC
//! |        |  |- SIG_TOC
//! |        |  |- [entry id]
//! |        |     |- E_DATA
//! |        |     |  |- (entry data)
//! |        |     |- RECITATIONS
//! |        |        |- (recitation metadata)
//! |        |- SNAPSHOTS
//! |           |- SIG_SNAPSHOTS
//! |           |- [snapshot id]
//! |              |- (snapshot data)
//! |- SUBSCRIPTIONS
//!    |- SIG_SUBSCRIPTIONS
//!    |- [subscription id]
//!       |- (subscription id)

function makeSubId (item) {
    return item.magazineId + '+' + item.rawId;
}
function readSubId (id) {
    const parts = id.split('+');
    return { magazineId: parts[0], rawId: parts[1] };
}

const subFilters = {
    paperVersion: {
        toAPI: paperVersion => ({ paperVersion }),
    },
};

export const tasks = {
    listMagazines: crudList({
        apiPath: () => `/magazines`,
        fields: ['id', 'org', 'name', 'description', 'issn'],
        storePath: (_, item) => [MAGAZINES, item.id, M_DATA],
    }),
    createMagazine: crudCreate({
        apiPath: () => `/magazines`,
        fields: ['org', 'name', 'description', 'issn'],
        storePath: (_, id) => [MAGAZINES, id, M_DATA],
        signalPath: () => [MAGAZINES, SIG_MAGAZINES],
    }),
    magazine: crudGet({
        apiPath: ({ id }) => `/magazines/${id}`,
        fields: ['id', 'org', 'name', 'description', 'issn', 'subscribers'],
        storePath: ({ id }) => [MAGAZINES, id, M_DATA],
    }),
    updateMagazine: crudUpdate({
        apiPath: ({ id }) => `/magazines/${id}`,
        storePath: ({ id }) => [MAGAZINES, id, M_DATA],
    }),
    deleteMagazine: crudDelete({
        apiPath: ({ id }) => `/magazines/${id}`,
        storePaths: ({ id }) => [
            [MAGAZINES, id, M_DATA],
            [MAGAZINES, id, EDITIONS],
            [MAGAZINES, id],
        ],
        signalPath: () => [MAGAZINES, SIG_MAGAZINES],
    }),

    listEditions: crudList({
        apiPath: ({ magazine }) => `/magazines/${magazine}/editions`,
        fields: ['id', 'idHuman', 'date', 'description', 'published'],
        storePath: ({ magazine }, item) => [MAGAZINES, magazine, EDITIONS, item.id, E_DATA],
    }),
    createEdition: crudCreate({
        apiPath: ({ magazine }) => `/magazines/${magazine}/editions`,
        fields: ['idHuman', 'date', 'description'],
        storePath: ({ magazine }, id) => [MAGAZINES, magazine, EDITIONS, id, E_DATA],
        signalPath: ({ magazine }) => [MAGAZINES, magazine, EDITIONS, SIG_EDITIONS],
    }),
    edition: crudGet({
        apiPath: ({ magazine, id }) => `/magazines/${magazine}/editions/${id}`,
        fields: ['id', 'idHuman', 'date', 'description', 'published', 'subscribers', 'thumbnail'],
        storePath: ({ magazine, id }) => [MAGAZINES, magazine, EDITIONS, id, E_DATA],
    }),
    updateEdition: crudUpdate({
        apiPath: ({ magazine, id }) => `/magazines/${magazine}/editions/${id}`,
        map: delta => {
            delete delta.thumbnail;
        },
        storePath: ({ magazine, id }) => [MAGAZINES, magazine, EDITIONS, id, E_DATA],
    }),
    deleteEdition: crudDelete({
        apiPath: ({ magazine, id }) => `/magazines/${magazine}/editions/${id}`,
        storePaths: ({ magazine, id }) => [
            [MAGAZINES, magazine, EDITIONS, id, FILES],
            [MAGAZINES, magazine, EDITIONS, id, TOC],
            [MAGAZINES, magazine, EDITIONS, id, E_DATA],
            [MAGAZINES, magazine, EDITIONS, id],
        ],
        signalPath: ({ magazine }) => [MAGAZINES, magazine, EDITIONS, SIG_EDITIONS],
    }),

    editionFiles: crudGet({
        apiPath: ({ magazine, id }) => `/magazines/${magazine}/editions/${id}/files`,
        fields: ['format', 'downloads', 'size', 'url'],
        storePath: ({ magazine, id }) => [MAGAZINES, magazine, EDITIONS, id, FILES],
    }),
    editionFile: getRawFile({
        apiPath: ({ magazine, id }, { format }) => `/magazines/${magazine}/editions/${id}/files/${format}`,
    }),
    updateEditionFile: async ({ magazine, id }, { format, file }) => {
        const client = await asyncClient;
        await client.put(`/magazines/${magazine}/editions/${id}/files/${format}`, null, {}, [{
            name: 'file',
            type: file.type,
            value: file,
        }]);

        // refresh data in background
        store.remove([MAGAZINES, magazine, EDITIONS, id, FILES]);
        tasks.editionFiles({ magazine, id }).catch(() => {});
    },
    deleteEditionFile: async ({ magazine, id }, { format }) => {
        const client = await asyncClient;
        await client.delete(`/magazines/${magazine}/editions/${id}/files/${format}`);

        // refresh data in background
        store.remove([MAGAZINES, magazine, EDITIONS, id, FILES]);
        tasks.editionFiles({ magazine, id }).catch(() => {});
    },

    updateEditionThumbnail: async ({ magazine, id }, { thumbnail }) => {
        const client = await asyncClient;
        await client.put(`/magazines/${magazine}/editions/${id}/thumbnail`, null, {}, [{
            name: 'thumbnail',
            type: thumbnail.type,
            value: thumbnail,
        }]);

        // load in background
        tasks.edition({ magazine, id });
    },
    deleteEditionThumbnail: async ({ magazine, id }) => {
        const client = await asyncClient;
        await client.delete(`/magazines/${magazine}/editions/${id}/thumbnail`);

        // load in background
        tasks.edition({ magazine, id });
    },

    listTocEntries: crudList({
        apiPath: ({ magazine, edition }) => `/magazines/${magazine}/editions/${edition}/toc`,
        fields: ['id', 'page', 'title', 'author', 'recitationAuthor', 'highlighted'],
        storePath: ({ magazine, edition }, item) => [MAGAZINES, magazine, EDITIONS, edition, TOC, item.id, E_DATA],
    }),
    createTocEntry: crudCreate({
        apiPath: ({ magazine, edition }) => `/magazines/${magazine}/editions/${edition}/toc`,
        fields: ['page', 'title', 'author', 'recitationAuthor', 'highlighted', 'text'],
        storePath: ({ magazine, edition }, id) => [MAGAZINES, magazine, EDITIONS, edition, TOC, id, E_DATA],
        signalPath: ({ magazine, edition }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, SIG_TOC],
    }),
    tocEntry: crudGet({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/toc/${id}`,
        fields: ['id', 'page', 'title', 'author', 'recitationAuthor', 'highlighted', 'text'],
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, id, E_DATA],
    }),
    updateTocEntry: crudUpdate({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/toc/${id}`,
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, id, E_DATA],
    }),
    deleteTocEntry: crudDelete({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/toc/${id}`,
        storePaths: ({ magazine, edition, id }) => [
            [MAGAZINES, magazine, EDITIONS, edition, TOC, id, RECITATIONS],
            [MAGAZINES, magazine, EDITIONS, edition, TOC, id, E_DATA],
            [MAGAZINES, magazine, EDITIONS, edition, TOC, id],
        ],
        signalPath: ({ magazine, edition }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, SIG_TOC],
    }),

    tocRecitations: crudGet({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/toc/${id}/recitation`,
        fields: ['format', 'downloads', 'size', 'url'],
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, id, RECITATIONS],
    }),
    updateTocRecitation: async ({ magazine, edition, id }, { format, file }) => {
        const client = await asyncClient;
        await client.put(`/magazines/${magazine}/editions/${edition}/toc/${id}/recitation/${format}`, null, {}, [{
            name: 'file',
            type: file.type,
            value: file,
        }]);

        // refresh metadata in background
        store.remove([MAGAZINES, magazine, EDITIONS, edition, TOC, id, RECITATIONS]);
        tasks.tocRecitations({ magazine, edition, id }).catch(() => {});
    },
    deleteTocRecitation: async ({ magazine, edition, id }, { format }) => {
        const client = await asyncClient;
        await client.delete(`/magazines/${magazine}/editions/${edition}/toc/${id}/recitation/${format}`);

        // refresh metadata in background
        store.remove([MAGAZINES, magazine, EDITIONS, edition, TOC, id, RECITATIONS]);
        tasks.tocRecitations({ magazine, edition, id }).catch(() => {});
    },

    listSnapshots: crudList({
        apiPath: ({ magazine, edition }) => `/magazines/${magazine}/editions/${edition}/paper_snapshots`,
        fields: ['id', 'time', 'name'],
        storePath: ({ magazine, edition }, { id }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, id],
    }),
    snapshot: crudGet({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/paper_snapshots/${id}`,
        fields: ['id', 'time', 'name'],
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, id],
    }),
    createSnapshot: crudCreate({
        apiPath: ({ magazine, edition }) => `/magazines/${magazine}/editions/${edition}/paper_snapshots`,
        fields: ['name'],
        storePath: ({ magazine, edition }, id) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, id],
        signalPath: ({ magazine, edition }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, SIG_SNAPSHOTS],
    }),
    updateSnapshot: crudUpdate({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/paper_snapshots/${id}`,
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, id],
    }),
    deleteSnapshot: crudDelete({
        apiPath: ({ magazine, edition, id }) => `/magazines/${magazine}/editions/${edition}/paper_snapshots/${id}`,
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, id],
        signalPath: ({ magazine, edition }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, SIG_SNAPSHOTS],
    }),
    snapshotCodeholders: async ({ magazine, edition, id, compare, idsOnly }, { offset, limit, countriesOnly, countryLocale }) => {
        const client = await asyncClient;
        const options = { offset, limit };
        if (compare) options.compare = compare;
        const res = await client.get(`/magazines/${magazine}/editions/${edition}/paper_snapshots/${id}/codeholders`, options);

        if (idsOnly) {
            return {
                items: res.body,
                total: +res.res.headers.get('x-total-items'),
            };
        }

        const codeholders = {};

        if (res.body.length) {
            const options = {
                filter: { id: { $in: res.body } },
                offset: 0,
                limit: res.body.length,
                fields: [],
            };
            let chFields;
            if (countriesOnly) {
                chFields = ['id', 'address.country'];
            } else {
                chFields = [
                    'id',
                    'codeholderType',
                    'oldCode', 'newCode',
                    'firstName', 'lastName', 'firstNameLegal', 'lastNameLegal', 'honorific',
                    'fullName', 'fullNameLocal', 'nameAbbrev',
                    'address.country',
                    'address.countryArea',
                    'address.city',
                    'address.cityArea',
                    'address.streetAddress',
                    'address.postalCode',
                    'address.sortingCode',
                    'addressLatin.country',
                    'addressLatin.countryArea',
                    'addressLatin.city',
                    'addressLatin.cityArea',
                    'addressLatin.streetAddress',
                    'addressLatin.postalCode',
                    'addressLatin.sortingCode',
                ];
            }
            for (const f of chFields) {
                if (await client.hasCodeholderField(f, 'r')) {
                    options.fields.push(f);
                }
            }
            const res2 = await client.get(`/codeholders`, options);
            for (const item of res2.body) codeholders[item.id] = codeholderFromAPI(item);

            if (!countriesOnly) {
                const res3 = await client.get(`/codeholders/${res.body.join(',')}/address/${countryLocale || 'eo'}`);
                for (const id in res3.body) {
                    codeholders[id].formattedAddress = res3.body[id];
                }
            }
        }

        return {
            items: res.body.map(id => codeholders[id] || id),
            total: +res.res.headers.get('x-total-items'),
        };
    },

    listSubscriptions: crudList({
        apiPath: ({ magazine }) => `/magazines/${magazine}/subscriptions`,
        fields: ['id', 'year', 'codeholderId', 'createdTime', 'internalNotes', 'paperVersion'],
        filters: subFilters,
        map: (item, { magazine }) => {
            item.rawId = base32.stringify(item.id);
            item.magazineId = magazine;
            item.id = makeSubId(item);
        },
        storePath: (_, item) => [SUBSCRIPTIONS, makeSubId(item)],
    }),
    listCodeholderSubscriptions: crudList({
        apiPath: ({ codeholder }) => `/codeholders/${codeholder}/magazine_subscriptions`,
        fields: ['id', 'year', 'magazineId', 'createdTime', 'internalNotes', 'paperVersion'],
        map: (item, { codeholder }) => {
            item.rawId = base32.stringify(item.id);
            item.codeholderId = codeholder;
            item.id = makeSubId(item);
        },
        storePath: (_, item) => [SUBSCRIPTIONS, makeSubId(item)],
    }),
    createSubscription: crudCreate({
        apiPath: (_, { magazineId }) => `/magazines/${magazineId}/subscriptions`,
        fields: ['year', 'codeholderId', 'internalNotes', 'paperVersion'],
        storePath: (_, item) => [SUBSCRIPTIONS, makeSubId(item)],
        signalPath: () => [SUBSCRIPTIONS, SIG_SUBSCRIPTIONS],
        parseId: id => id,
    }),
    subscription: crudGet({
        apiPath: ({ magazine, rawId, id }) => `/magazines/${magazine || readSubId(id).magazineId}/subscriptions/${rawId || readSubId(id).rawId}`,
        fields: ['id', 'year', 'codeholderId', 'createdTime', 'internalNotes', 'paperVersion'],
        storePath: ({ magazine, rawId, id }) => [SUBSCRIPTIONS, magazine ? makeSubId({ magazineId: magazine, rawId }) : id],
        map: (item, { magazine, id }) => {
            item.rawId = base32.stringify(item.id);
            item.magazineId = magazine || readSubId(id).magazineId;
            item.id = makeSubId(item);
        },
    }),
    updateSubscription: crudUpdate({
        apiPath: ({ magazine, rawId, id }) => `/magazines/${magazine || readSubId(id).magazineId}/subscriptions/${rawId || readSubId(id).rawId}`,
        storePath: ({ magazine, rawId, id }) => [SUBSCRIPTIONS, magazine ? makeSubId({ magazineId: magazine, rawId }) : id],
    }),
    deleteSubscription: crudDelete({
        apiPath: ({ magazine, rawId, id }) => `/magazines/${magazine || readSubId(id).magazineId}/subscriptions/${rawId || readSubId(id).rawId}`,
        storePath: ({ magazine, rawId, id }) => [SUBSCRIPTIONS, magazine ? makeSubId({ magazineId: magazine, rawId }) : id],
        signalPath: () => [SUBSCRIPTIONS, SIG_SUBSCRIPTIONS],
    }),
};

export const views = {
    magazine: simpleDataView({
        storePath: ({ id }) => [MAGAZINES, id, M_DATA],
        get: tasks.magazine,
    }),
    sigMagazines: createStoreObserver([MAGAZINES, SIG_MAGAZINES]),
    edition: simpleDataView({
        storePath: ({ magazine, id }) => [MAGAZINES, magazine, EDITIONS, id, E_DATA],
        get: tasks.edition,
    }),
    sigEditions: createStoreObserver(({ magazine }) => [MAGAZINES, magazine, EDITIONS, SIG_EDITIONS]),
    editionFiles: simpleDataView({
        storePath: ({ magazine, id }) => [MAGAZINES, magazine, EDITIONS, id, FILES],
        get: tasks.editionFiles,
    }),
    tocEntry: simpleDataView({
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, id, E_DATA],
        get: tasks.tocEntry,
    }),
    sigTocEntries: createStoreObserver(({ magazine, edition }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, SIG_TOC]),
    tocRecitations: simpleDataView({
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, TOC, id, RECITATIONS],
        get: tasks.tocRecitations,
    }),
    snapshot: simpleDataView({
        storePath: ({ magazine, edition, id }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, id],
        get: tasks.snapshot,
    }),
    sigSnapshots: createStoreObserver(({ magazine, edition }) => [MAGAZINES, magazine, EDITIONS, edition, SNAPSHOTS, SIG_SNAPSHOTS]),
    subscription: simpleDataView({
        storePath: ({ magazine, rawId, id }) => [SUBSCRIPTIONS, magazine ? makeSubId({ magazineId: magazine, rawId }) : id],
        get: tasks.subscription,
    }),
    sigSubscriptions: createStoreObserver(() => [SUBSCRIPTIONS, SIG_SUBSCRIPTIONS]),
};
