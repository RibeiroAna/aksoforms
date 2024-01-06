import { base32 } from 'rfc4648';
import { AbstractDataView, createStoreObserver } from '../view';
import asyncClient from '../client';
import * as log from '../log';
import * as store from '../store';
import { fieldDiff, makeParametersToRequestData, makeClientToAPI, makeClientFromAPI, filtersToAPI } from '../list';
import { clientFromAPI as codeholderFromAPI, clientToAPI as codeholderToAPI } from './codeholders';
import { deepMerge } from '../../util';
import { crudList, crudCreate, crudGet, crudUpdate, crudDelete } from '../templates';

/** Data store path. */
export const MEMBERSHIPS = 'memberships';
export const MEMBERSHIP_CATEGORIES = [MEMBERSHIPS, 'categories'];
export const MEMBERSHIP_CATEGORIES_LIST = [MEMBERSHIPS, 'all_categories'];
export const SIG_CATEGORIES = '!categories';
export const REGISTRATION_OPTIONS = [MEMBERSHIPS, 'options'];
export const SIG_OPTIONS = [MEMBERSHIPS, 'options', '!options'];
export const REGISTRATION_ENTRIES = [MEMBERSHIPS, 'entries'];
export const SIG_ENTRIES = [MEMBERSHIPS, 'entries', '!entires'];

/** Loads all membership categories because there won’t be too many for this to become a problem */
async function loadAllMembershipCategories () {
    if (store.get(MEMBERSHIP_CATEGORIES_LIST)) return;

    const client = await asyncClient;
    let total = Infinity;
    const items = [];
    while (total > items.length) {
        const res = await client.get('/membership_categories', {
            offset: items.length,
            limit: 100,
            fields: [
                'id',
                'nameAbbrev',
                'name',
                'description',
                'givesMembership',
                'lifetime',
                'availableFrom',
                'availableTo',
            ],
        });
        total = +res.res.headers.get('x-total-items');
        items.push(...res.body);

        if (res.body.length === 0) {
            log.error(
                `failed loading membership categories: we currently have ${items.length}`
                + ` and server reported total count ${total} but unexpectedly returned zero items;`
                + ` aborting and returning partial result`,
            );
            break;
        }
    }

    const categories = {};
    for (const item of items) {
        categories[item.id] = item;
    }

    store.insert(MEMBERSHIP_CATEGORIES_LIST, categories);
}

const CATEGORY_FIELDS = [
    'id',
    'nameAbbrev',
    'name',
    'description',
    'givesMembership',
    'lifetime',
    'availableFrom',
    'availableTo',
];

const OPTIONS_FIELDS = [
    'year',
    'enabled',
    'paymentOrgId',
    'currency',
    'offers',
];
const OPTIONS_DUP_FIELDS = [
    'paymentOrgId',
    'currency',
    'offers',
];

function entryReadId (idBuffer) {
    return base32.stringify(idBuffer);
}

const eClientFields = {
    id: {
        apiFields: ['id'],
        fromAPI: entry => entryReadId(entry.id),
        toAPI: () => ({}),
    },
    year: 'year',
    status: {
        apiFields: ['status', 'timeStatus'],
        fromAPI: entry => ({ status: entry.status, time: entry.timeStatus }),
        toAPI: () => ({}),
    },
    issue: {
        apiFields: ['pendingIssue.what', 'pendingIssue.where', 'fishyIsOkay'],
        fromAPI: entry => ({
            what: entry.pendingIssue?.what,
            where: entry.pendingIssue?.where,
            fishyIsOkay: entry.fishyIsOkay,
        }),
        toAPI: data => ({ fishyIsOkay: data.fishyIsOkay }),
    },
    newCodeholderId: 'newCodeholderId',
    timeSubmitted: 'timeSubmitted',
    internalNotes: 'internalNotes',
    offers: {
        apiFields: ['currency', 'offers'],
        fromAPI: entry => ({ currency: entry.currency, selected: entry.offers }),
        toAPI: data => ({ currency: data.currency, offers: data.selected }),
    },
    codeholderData: {
        apiFields: ['codeholderData'],
        requires: ['newCodeholderId'],
        fromAPI: entry => (typeof entry.codeholderData === 'object' && entry.codeholderData !== null)
            ? codeholderFromAPI({ codeholderType: 'human', ...entry.codeholderData })
            : entry.codeholderData,
        toAPI: data => {
            if (data === null || typeof data !== 'object') return { codeholderData: data };
            const mapped = codeholderToAPI(data);
            return {
                codeholderData: {
                    address: mapped.address,
                    feeCountry: mapped.feeCountry,
                    email: mapped.email,
                    firstName: mapped.firstName,
                    firstNameLegal: mapped.firstNameLegal,
                    lastName: mapped.lastName,
                    lastNameLegal: mapped.lastNameLegal,
                    honorific: mapped.honorific,
                    birthdate: mapped.birthdate,
                    cellphone: mapped.cellphone,
                },
            };
        },
    },
};
const eClientFilters = {
    year: {
        toAPI: year => ({ year }),
    },
    status: {
        toAPI: status => ({ status }),
    },
    codeholder: {
        toAPI: codeholders => ({
            $or: [
                { newCodeholderId: { $in: codeholders } },
                ...codeholders.map(id => ({ $codeholderData: +id })),
            ],
        }),
    },
};
const eParametersToRequestData = makeParametersToRequestData({
    clientFields: eClientFields,
    clientFilters: eClientFilters,
});
const eClientFromAPI = makeClientFromAPI(eClientFields, true);
const eClientToAPI = makeClientToAPI(eClientFields);

export const tasks = {
    listCategories: crudList({
        apiPath: () => '/membership_categories',
        storePath: (_, item) => [MEMBERSHIP_CATEGORIES, item.id],
        fields: CATEGORY_FIELDS,
    }),
    category: crudGet({
        apiPath: ({ id }) => `/membership_categories/${id}`,
        storePath: ({ id }) => [MEMBERSHIP_CATEGORIES, id],
        fields: CATEGORY_FIELDS,
    }),
    createCategory: crudCreate({
        apiPath: () => `/membership_categories`,
        storePath: (_, id) => [MEMBERSHIP_CATEGORIES, id],
        signalPath: () => MEMBERSHIP_CATEGORIES.concat([SIG_CATEGORIES]),
        fields: CATEGORY_FIELDS,
        then: (_, id) => {
            // fetch rest,
            tasks.category({ id }).catch(() => {});
        },
    }),
    updateCategory: crudUpdate({
        apiPath: ({ id }) => `/membership_categories/${id}`,
        storePath: ({ id }) => [MEMBERSHIP_CATEGORIES, id],
    }),
    deleteCategory: crudDelete({
        apiPath: ({ id }) => `/membership_categories/${id}`,
        storePath: ({ id }) => [MEMBERSHIP_CATEGORIES, id],
        signalPath: () => MEMBERSHIP_CATEGORIES.concat([SIG_CATEGORIES]),
    }),

    listOptions: crudList({
        apiPath: () => `/registration/options`,
        storePath: (_, item) => REGISTRATION_OPTIONS.concat([item.id]),
        // we do not request 'offers' here because that breaks things
        fields: ['year', 'enabled', 'paymentOrgId', 'currency'],
        map: item => {
            item.id = item.year;
        },
    }),
    options: async ({ id }) => {
        const client = await asyncClient;

        if (store.get(REGISTRATION_OPTIONS.concat([id]))?._virtual) return store.get(REGISTRATION_OPTIONS.concat([id]));

        const res = await client.get(`/registration/options/${id}`, {
            fields: OPTIONS_FIELDS,
        });
        res.body.id = res.body.year;
        store.insert(REGISTRATION_OPTIONS.concat([id]), res.body);
        return res.body;
    },
    createOptions: async (_, { year }) => {
        const id = parseInt(year, 10);
        if (!Number.isFinite(id)) throw { code: 'bad-request', message: 'Bad year number' };

        // check if it exists
        if (!store.get(REGISTRATION_OPTIONS.concat([id]))) {
            await tasks.options({ id: year }).catch(err => {
                if (err.statusCode === 404) return null;
                throw err;
            });
        }

        if (store.get(REGISTRATION_OPTIONS.concat([id]))) return year;
        store.insert(REGISTRATION_OPTIONS.concat([id]), {
            _virtual: true,
            id,
            year: id,
            enabled: false,
            currency: null,
            paymentOrgId: null,
            offers: [],
        });
        return year;
    },
    dupOptions: async ({ id }, { year }) => {
        const client = await asyncClient;
        try {
            await client.get(`/registration/options/${year}`, { fields: ['year'] });
            throw { code: 'object-exists', message: 'options for this year already exist' };
        } catch (err) {
            if (err.statusCode !== 404) throw err;
        }

        const fields = OPTIONS_DUP_FIELDS;
        const source = await client.get(`/registration/options/${id}`, { fields });

        const data = {
            enabled: false,
        };
        for (const f of fields) data[f] = source.body[f];

        await client.put(`/registration/options/${year}`, data);
        store.insert(REGISTRATION_OPTIONS.concat([year]), data);
        store.signal(SIG_OPTIONS);
        return year;
    },
    updateOptions: async ({ id }, params) => {
        const client = await asyncClient;
        const existing = store.get(REGISTRATION_OPTIONS.concat([id]));
        existing._virtual = false;
        const delta = fieldDiff(existing, params);
        const complete = { ...deepMerge(existing, delta) };
        delete complete.id;
        delete complete.year;
        delete complete._virtual;
        await client.put(`/registration/options/${id}`, complete);
        store.insert(REGISTRATION_OPTIONS.concat([id]), deepMerge(existing, params));
        store.signal(SIG_OPTIONS);
    },
    deleteOptions: crudDelete({
        apiPath: ({ id }) => `/registration/options/${id}`,
        storePath: ({ id }) => REGISTRATION_OPTIONS.concat([id]),
        signalPath: () => SIG_OPTIONS,
    }),

    listEntries: async (_, parameters) => {
        const client = await asyncClient;
        const { options, usedFilters, transientFields } = eParametersToRequestData(parameters);

        const res = await client.get('/registration/entries', options);

        for (const item of res.body) {
            const id = entryReadId(item.id);
            const existing = store.get(REGISTRATION_ENTRIES.concat([id]));
            store.insert(REGISTRATION_ENTRIES.concat([id]), deepMerge(existing, eClientFromAPI(item)));
        }

        return {
            items: res.body.map(item => entryReadId(item.id)),
            total: +res.res.headers.get('x-total-items'),
            transientFields,
            stats: {
                time: res.resTime,
                filtered: usedFilters,
            },
        };
    },
    entry: async ({ id }, { fields }) => {
        const client = await asyncClient;

        const res = await client.get(`/registration/entries/${id}`, {
            fields: ['id'].concat(fields.flatMap(id => typeof eClientFields[id] === 'string'
                ? [eClientFields[id]]
                : eClientFields[id].apiFields)),
        });
        const existing = store.get(REGISTRATION_ENTRIES.concat([id]));
        store.insert(REGISTRATION_ENTRIES.concat([id]), deepMerge(existing, eClientFromAPI(res.body)));
        return store.get(REGISTRATION_ENTRIES.concat([id]));
    },
    createEntry: async (_, params) => {
        const client = await asyncClient;
        const res = await client.post('/registration/entries', eClientToAPI(params));
        const id = res.res.headers.get('x-identifier');
        store.insert(REGISTRATION_ENTRIES.concat([id]), {
            status: { status: null, time: null },
            ...params,
        });
        store.signal(SIG_ENTRIES);
        return id;
    },
    updateEntry: async ({ id }, params) => {
        const client = await asyncClient;
        const existing = store.get(REGISTRATION_ENTRIES.concat([id]));
        const delta = fieldDiff(eClientToAPI(existing), eClientToAPI(params));

        await client.patch(`/registration/entries/${id}`, delta);
        store.insert(REGISTRATION_ENTRIES.concat([id]), deepMerge(existing, params));

        if (delta.fishyIsOkay) {
            // need to update from server
            this.entry({ id }, { fields: ['issue', 'newCodeholderId'] });
        }
    },
    deleteEntry: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/registration/entries/${id}`);
        store.remove(REGISTRATION_ENTRIES.concat([id]));
        store.signal(SIG_ENTRIES);
    },
    cancelEntry: async ({ id }) => {
        const client = await asyncClient;
        await client.post(`/registration/entries/${id}/!cancel`);
        // reload
        tasks.entry({ id }, { fields: ['status'] }).catch(() => {});
    },
    entryFiltersToAPI: async ({ filters }) => {
        return filtersToAPI(eClientFilters, filters);
    },
};

export const views = {
    /**
     * memberships/categories: a view of all membership categories and their (significant)
     * properties
     */
    categories: class Categories extends AbstractDataView {
        constructor () {
            super();

            store.subscribe(MEMBERSHIP_CATEGORIES_LIST, this.#onUpdate);
            if (store.get(MEMBERSHIP_CATEGORIES_LIST)) this.#onUpdate();

            loadAllMembershipCategories().catch(err => this.emit('error', err));
        }

        #onUpdate = () => this.emit('update', store.get(MEMBERSHIP_CATEGORIES_LIST));

        drop () {
            store.unsubscribe(MEMBERSHIP_CATEGORIES_LIST, this.#onUpdate);
        }
    },
    category: class MembershipCategory extends AbstractDataView {
        constructor ({ id, noFetch }) {
            super();
            this.id = id;

            store.subscribe([MEMBERSHIP_CATEGORIES, id], this.#onUpdate);
            if (store.get([MEMBERSHIP_CATEGORIES, id])) setImmediate(this.#onUpdate);

            if (!noFetch) {
                tasks.category({ id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([MEMBERSHIP_CATEGORIES, this.id]), 'delete');
            } else {
                this.emit('update', store.get([MEMBERSHIP_CATEGORIES, this.id]));
            }
        };
        drop () {
            store.unsubscribe([MEMBERSHIP_CATEGORIES, this.id], this.#onUpdate);
        }
    },
    sigCategories: createStoreObserver(MEMBERSHIP_CATEGORIES.concat([SIG_CATEGORIES])),

    options: class RegistrationOptions extends AbstractDataView {
        constructor ({ id, noFetch }) {
            super();
            this.id = id;

            store.subscribe(REGISTRATION_OPTIONS.concat([id]), this.#onUpdate);
            if (store.get(REGISTRATION_OPTIONS.concat([id]))) setImmediate(this.#onUpdate);

            if (!noFetch) {
                tasks.options({ id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get(REGISTRATION_OPTIONS.concat([this.id])), 'delete');
            } else {
                this.emit('update', store.get(REGISTRATION_OPTIONS.concat([this.id])));
            }
        };
        drop () {
            store.unsubscribe(REGISTRATION_OPTIONS.concat([this.id]), this.#onUpdate);
        }
    },
    sigOptions: createStoreObserver(SIG_OPTIONS),

    entry: class RegistrationEntry extends AbstractDataView {
        constructor ({ id, fields, noFetch, lazyFetch }) {
            super();
            this.id = id;
            this.fields = fields;

            store.subscribe(REGISTRATION_ENTRIES.concat([id]), this.#onUpdate);
            if (store.get(REGISTRATION_ENTRIES.concat([id]))) setImmediate(this.#onUpdate);

            store.subscribe(REGISTRATION_ENTRIES.concat([this.id]), this.#onUpdate);
            const current = store.get(REGISTRATION_ENTRIES.concat([this.id]));
            if (current) setImmediate(this.#onUpdate);

            let shouldFetch = !noFetch;
            if (lazyFetch) {
                shouldFetch = false;
                for (const field of fields) {
                    if (!current || !current[field]) {
                        shouldFetch = true;
                        break;
                    }
                }
            }

            if (shouldFetch) {
                tasks.entry({ id }, { fields }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get(REGISTRATION_ENTRIES.concat([this.id])), 'delete');
            } else {
                this.emit('update', store.get(REGISTRATION_ENTRIES.concat([this.id])));
            }
        };
        drop () {
            store.unsubscribe(REGISTRATION_ENTRIES.concat([this.id]), this.#onUpdate);
        }
    },
    sigEntries: createStoreObserver(SIG_ENTRIES),
};
