import { util } from '@tejo/akso-client';
import { AbstractDataView, createStoreObserver } from '../view';
import * as store from '../store';
import * as log from '../log';
import asyncClient from '../client';
import { fieldsToOrder } from '../list';
import { deepMerge } from '../../util';

/** Data store path. */
export const COUNTRIES = 'countries';
export const COUNTRIES_LIST = [COUNTRIES, 'countries'];
export const COUNTRY_GROUPS_LIST = [COUNTRIES, 'countryGroups'];
export const COUNTRY_GROUPS_TOTAL = [COUNTRIES, 'countryGroupsCount'];
export const COUNTRY_GROUPS_LOCK = [COUNTRIES, 'countryGroupsLock'];
export const CACHED_LOCALES = [COUNTRIES, 'cachedLocales'];
export const LOCKED_LOCALES = [COUNTRIES, 'lockedLocales'];

store.subscribe([COUNTRIES], () => {}); // prevent GC

export const SIG_LIST = '!list';

/** available localization languages */
export const COUNTRY_LANGS = [
    'eo', 'en', 'fr', 'es', 'nl', 'pt', 'sk', 'zh', 'de',
];

/** Loads all countries */
async function loadCountries (locale) {
    if (!store.get(CACHED_LOCALES)) store.insert(CACHED_LOCALES, []);
    if (!store.get(LOCKED_LOCALES)) store.insert(LOCKED_LOCALES, []);
    if (store.get(CACHED_LOCALES).includes(locale)) return;

    if (store.get(LOCKED_LOCALES).includes(locale)) return;
    store.insert(LOCKED_LOCALES, store.get(LOCKED_LOCALES).concat([locale]));

    const client = await asyncClient;
    const res = await client.get('/countries', {
        limit: 300,
        fields: ['code', `name_${locale}`],
        order: [['name_eo', 'asc']],
    });

    for (const item of res.body) {
        const path = COUNTRIES_LIST.concat([item.code]);
        store.insert(path, deepMerge(store.get(path), item));
    }

    store.insert(LOCKED_LOCALES, store.get(LOCKED_LOCALES).splice(store.get(LOCKED_LOCALES).indexOf(locale), 1));
    store.insert(CACHED_LOCALES, store.get(CACHED_LOCALES).concat([locale]));
}

/** Loads all country groups */
async function loadAllCountryGroups () {
    if (store.get(COUNTRY_GROUPS_LOCK)) return;
    store.insert(COUNTRY_GROUPS_LOCK, true);

    // check if we already have all of them
    if (Object.keys(store.get(COUNTRY_GROUPS_LIST) || {}).length >= store.get(COUNTRY_GROUPS_TOTAL)) return;

    const client = await asyncClient;
    let total = Infinity;
    const items = [];
    while (total > items.length) {
        const res = await client.get('/country_groups', {
            offset: items.length,
            limit: 100,
            fields: ['code', 'name', 'countries'],
            order: [['name', 'asc']],
        });
        total = +res.res.headers.get('x-total-items');
        items.push(...res.body);

        if (res.body.length === 0) {
            log.error(
                `failed loading country groups: we currently have ${items.length}`
                + ` and server reported total count ${total} but unexpectedly returned zero items;`
                + ` aborting and returning partial result`,
            );
            break;
        }
    }

    for (const item of items) {
        const path = COUNTRY_GROUPS_LIST.concat([item.code]);
        store.insert(path, deepMerge(store.get(path), item));
    }

    store.insert(COUNTRY_GROUPS_TOTAL, total);
    store.insert(COUNTRY_GROUPS_LOCK, false);
}

export const tasks = {
    /** countries/list: lists countries */
    list: async (_, { search, offset, limit, fields }) => {
        const client = await asyncClient;

        const options = {
            offset,
            limit,
            fields: [
                'code',
                'enabled',
                ...COUNTRY_LANGS.map(code => `name_${code}`),
            ],
            order: fieldsToOrder(fields),
        };
        if (search && search.query) {
            const transformedQuery = util.transformSearch(search.query);
            if (transformedQuery.length < 3) {
                throw { code: 'search-query-too-short', message: 'search query too short' };
            }
            if (!util.isValidSearch(transformedQuery)) {
                throw { code: 'invalid-search-query', message: 'invalid search query' };
            }
            options.search = { cols: ['name_eo'], str: transformedQuery };
        }

        const res = await client.get('/countries', options);

        for (const item of res.body) {
            const path = COUNTRIES_LIST.concat([item.code]);
            store.insert(path, deepMerge(store.get(path), item));
        }

        return {
            items: res.body.map(item => item.code),
            total: +res.res.headers.get('x-total-items'),
            stats: {
                time: res.resTime,
                filtered: false,
            },
        };
    },

    /** countries/listGroups: lists country groups */
    listGroups: async (_, { search, offset, limit, fields }) => {
        const client = await asyncClient;

        const options = {
            offset,
            limit,
            fields: ['code', 'name'],
            order: fieldsToOrder(fields),
        };
        if (search && search.query) {
            const transformedQuery = util.transformSearch(search.query);
            if (transformedQuery.length < 3) {
                throw { code: 'search-query-too-short', message: 'search query too short' };
            }
            if (!util.isValidSearch(transformedQuery)) {
                throw { code: 'invalid-search-query', message: 'invalid search query' };
            }
            options.search = { cols: ['name'], str: transformedQuery };
        }

        const res = await client.get('/country_groups', options);

        for (const item of res.body) {
            const path = COUNTRY_GROUPS_LIST.concat([item.code]);
            store.insert(path, deepMerge(store.get(path), item));
        }

        return {
            items: res.body.map(item => item.code),
            total: +res.res.headers.get('x-total-items'),
            stats: {
                time: res.resTime,
                filtered: false,
            },
        };
    },

    /** countries/country: fetches a single country */
    country: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/countries/${id}`, {
            fields: [
                'code',
                'enabled',
                ...COUNTRY_LANGS.map(code => `name_${code}`),
            ],
        });
        const item = res.body;
        const path = COUNTRIES_LIST.concat([item.code]);
        store.insert(path, deepMerge(store.get(path), item));
        return item;
    },

    /** countries/group: fetches a single country group */
    group: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/country_groups/${id}`, {
            fields: ['code', 'name', 'countries'],
        });
        const item = res.body;
        if (!item.countries) item.countries = []; // TEMP: adjust for server bug
        const path = COUNTRY_GROUPS_LIST.concat([item.code]);
        store.insert(path, deepMerge(store.get(path), item));
        return item;
    },

    /** countries/update: updates a single country */
    update: async ({ id }, data) => {
        const client = await asyncClient;
        data = { ...data };

        delete data.code;

        await client.patch(`/countries/${id}`, data);

        const path = COUNTRIES_LIST.concat([id]);
        store.insert(path, deepMerge(store.get(path), data));
    },

    /** countries/createGroup: creates a single country group */
    createGroup: async (_, { code, name }) => {
        const client = await asyncClient;

        await client.post(`/country_groups`, { code, name });

        const path = COUNTRY_GROUPS_LIST.concat([code]);
        store.insert(path, { code, name });

        store.signal(COUNTRY_GROUPS_LIST.concat([SIG_LIST]));
    },

    /** countries/updateGroup: updates a country group */
    updateGroup: async ({ id }, { name }) => {
        const client = await asyncClient;

        await client.patch(`/country_groups/${id}`, { name });

        const path = COUNTRY_GROUPS_LIST.concat([id]);
        store.insert(path, deepMerge(store.get(path), { name }));
    },

    /** countries/deleteGroup: deletes a country group */
    deleteGroup: async (_, { id }) => {
        const client = await asyncClient;
        await client.delete(`/country_groups/${id}`);
        store.remove(COUNTRY_GROUPS_LIST.concat([id]));

        store.signal(COUNTRY_GROUPS_LIST.concat([SIG_LIST]));
    },

    /** countries/addGroupCountry: adds a country to a country group */
    addGroupCountry: async ({ group }, { country }) => {
        const client = await asyncClient;
        await client.put(`/country_groups/${group}/countries/${country}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const groupData = store.get(COUNTRY_GROUPS_LIST.concat([group]));
        if (groupData) {
            if (!groupData.countries.includes(country)) {
                groupData.countries.push(country);
                groupData.countries.sort();
            }
            store.insert(COUNTRY_GROUPS_LIST.concat([group]), groupData);
        }
    },
    /** countries/removeGroupCountry: removes a country from a country group */
    removeGroupCountry: async ({ group }, { country }) => {
        const client = await asyncClient;
        await client.delete(`/country_groups/${group}/countries/${country}`);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const groupData = store.get(COUNTRY_GROUPS_LIST.concat([group]));
        if (groupData) {
            if (groupData.countries.includes(country)) {
                groupData.countries.splice(groupData.countries.indexOf(country), 1);
                groupData.countries.sort();
            }
            store.insert(COUNTRY_GROUPS_LIST.concat([group]), groupData);
        }
    },
};

export const views = {
    /** countries/country: data view of a single country */
    country: class Country extends AbstractDataView {
        constructor ({ id, noFetch }) {
            super();
            this.id = id;
            store.subscribe(COUNTRIES_LIST.concat([id]), this.#onUpdate);
            if (store.get(COUNTRIES_LIST.concat([id]))) this.#onUpdate();

            if (!noFetch) {
                tasks.country({ id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = () => this.emit('update', store.get(COUNTRIES_LIST.concat([this.id])));
        drop () {
            store.unsubscribe(COUNTRIES_LIST.concat([this.id]));
        }
    },
    /** countries/group: data view of a single country group */
    group: class Group extends AbstractDataView {
        constructor ({ id, noFetch }) {
            super();
            this.id = id;
            store.subscribe(COUNTRY_GROUPS_LIST.concat([id]), this.#onUpdate);
            if (store.get(COUNTRY_GROUPS_LIST.concat([id]))) this.#onUpdate();

            if (!noFetch) {
                tasks.group({ id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = () => this.emit('update', store.get(COUNTRY_GROUPS_LIST.concat([this.id])));
        drop () {
            store.unsubscribe(COUNTRY_GROUPS_LIST.concat([this.id]));
        }
    },
    /**
     * countries/countries: lists all countries
     *
     * # Options
     * - locales: array of locales to fetch localized names in (e.g. `['eo', 'en']`)
     *   defaults to eo
     *
     * Data is an object mapping country codes to an object containing localized names, e.g.
     * `nl` ↦ `{ eo: 'Nederlando', en: 'Netherlands', ... }`
     */
    countries: class Countries extends AbstractDataView {
        constructor ({ locales = ['eo'] } = {}) {
            super();
            this.locales = locales;
            store.subscribe(COUNTRIES_LIST, this.#onUpdate);
            if (store.get(COUNTRIES_LIST)) this.#onUpdate();

            const promises = [];
            for (const locale of locales) {
                promises.push(loadCountries(locale));
            }
            Promise.all(promises).catch(err => this.emit('error', err));
        }
        #onUpdate = () => this.emit('update', store.get(COUNTRIES_LIST));
        drop () {
            store.unsubscribe(COUNTRIES_LIST, this.#onUpdate);
        }
    },
    /** countries/countryGroups: lists all country groups */
    countryGroups: class CountryGroups extends AbstractDataView {
        constructor () {
            super();
            store.subscribe(COUNTRY_GROUPS_LIST, this.#onUpdate);
            if (store.get(COUNTRY_GROUPS_LIST)) this.#onUpdate();

            loadAllCountryGroups().catch(err => this.emit('error', err));
        }
        #onUpdate = () => this.emit('update', store.get(COUNTRY_GROUPS_LIST));
        drop () {
            store.unsubscribe(COUNTRY_GROUPS_LIST, this.#onUpdate);
        }
    },

    /** countries/sigCountryGroups: emits a signal when the list of country groups may have changed */
    sigCountryGroups: createStoreObserver(COUNTRY_GROUPS_LIST.concat([SIG_LIST])),
};
