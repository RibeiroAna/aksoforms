import { UEACode, util } from '@tejo/akso-client';
import moment from 'moment';
import JSON5 from 'json5';
import { AbstractDataView, createStoreObserver } from '../view';
import asyncClient from '../client';
import * as store from '../store';
import * as log from '../log';
import { makeParametersToRequestData, makeClientFromAPI, makeClientToAPI, filtersToAPI } from '../list';
import { LOGIN_ID } from './login-keys';
import { deepMerge, deepEq } from '../../util';
import { crudList, crudGet, crudUpdate, simpleDataView } from '../templates';
import { CODEHOLDER_DELEGATIONS, SIG_DELEGATIONS, delegateFilters } from './delegations';

//! # Client-side codeholder representation
//! - fields with no value are null or an empty string
//! - fields that have not been loaded must be undefined
//!
//! ## Fields
//! - id: identical to API
//! - type: string 'human' or 'org'
//! - name: object { first, last, firstLegal, lastLegal, honorific }
//!   or object { full, local, abbrev }
//! - careOf: identical to API
//! - website: identical to API
//! - biography: identical to API
//! - code: object { new, old } where old always has a check letter
//! - creationTime: identical to API
//! - hasPassword: identical to API
//! - addressInvalid: identical to API
//! - address: object that’s identical to API, except every field also has a -Latin variant
//!   may have a magic `$latin: bool` key to only send one variant to the API
//! - feeCountry: identical to API
//! - membership: identical to API
//! - email: identical to API
//! - enabled: identical to API
//! - notes: identical to API
//! - officePhone: object { value, formatted }
//! - landlinePhone: object { value, formatted }
//! - cellphone: object { value, formatted }
//! - isDead: identical to API
//! - birthdate: identical to API
//! - age: object { now, atStartOfYear }
//! - deathdate: identical to API
//! - profilePicture: identical to API
//! - profilePictureHash: identical to API
//! - isActiveMember: identical to API
//! - profession: identical to API
//! - addressPublicity: identical to API
//! - emailPublicity: identical to API
//! - officePhonePublicity: identical to API
//! - profilePicturePublicity: identical to API
//! - lastNamePublicity: identical to API
//! - landlinePhonePublicity: identical to API
//! - cellphonePublicity: identical to API
//!
//! Read-only derived fields:
//!
//! - country: { fee, address }
//! - addressCity: identical to addressLatin.city
//! - addressCountryArea: identical to addressLatin.countryArea

/** Data store path. */
export const CODEHOLDERS = 'codeholders';
export const CODEHOLDER_PERMS = 'codeholderPerms';
export const CODEHOLDER_FILES = 'codeholderFiles';
export const CODEHOLDER_CHGREQS = 'codeholderChgReqs';
export const CODEHOLDER_CONGRESS_PARTICIPATIONS = 'codeholderCongressParticipations';

// signals
export const SIG_CODEHOLDERS = '!codeholders';
export const SIG_MEMBERSHIPS = '!memberships';
export const SIG_ROLES = '!roles';
export const SIG_FILES = '!files';

// used below; this is just here for DRY
const addressSubfields = [
    'country',
    'countryArea',
    'city',
    'cityArea',
    'streetAddress',
    'postalCode',
    'sortingCode',
];
// ditto
const phoneFormat = field => ({
    apiFields: [field, field + 'Formatted'],
    permFields: [field],
    fromAPI: codeholder => codeholder[field] === undefined
        ? undefined
        : { value: codeholder[field], formatted: codeholder[field + 'Formatted'] },
    // -Formatted is a derived property so we never serialize it
    toAPI: (value) => value?.value !== undefined ? { [field]: value.value } : {},
});

/**
 * Codeholder fields in the client-side representation.
 *
 * - apiFields: corresponding API fields for this field
 *   this can either be a string (for 1:1 mapping) or an array (for other mappings)
 * - fromAPI: maps an API codeholder to a value of this field. required fields can be assumed to
 *   exist in the API codeholder (if apiFields is a string, this is automatic)
 *   except in field history, required fields won’t be loaded there. use heuristics
 * - toAPI: maps a value of this field to a partial API codeholder
 *   (if apiFields is a string, this is automatic)
 * - requires: required client-side fields that must also be requested (for e.g. disambiguation)
 * - sort: API field to sort by. If not given, use apiFields in the given order
 */
const clientFields = {
    id: 'id',
    type: {
        apiFields: ['codeholderType'],
        fromAPI: codeholder => codeholder.codeholderType,
        toAPI: value => ({ codeholderType: value }),
        requires: ['enabled', 'isDead'],
    },
    name: {
        apiFields: [
            'firstName', 'lastName', 'firstNameLegal', 'lastNameLegal', 'honorific',
            'fullName', 'fullNameLocal', 'nameAbbrev',
        ],
        fromAPI: codeholder => {
            const value = {};
            let isEmpty = true;

            // use actual type or heuristics
            const codeholderType = codeholder.codeholderType || (codeholder.firstNameLegal ? 'human' : 'org');

            if (codeholderType === 'human') {
                for (const f of ['firstName', 'lastName', 'firstNameLegal', 'lastNameLegal', 'honorific']) {
                    const item = codeholder[f];
                    if (item !== undefined) {
                        isEmpty = false;
                        value[f.replace(/Name/, '')] = item;
                    }
                }
            } else if (codeholderType === 'org') {
                if (codeholder.fullName !== undefined
                    || codeholder.fullNameLocal !== undefined
                    || codeholder.nameAbbrev !== undefined) {
                    isEmpty = false;
                }
                if (codeholder.fullName !== undefined) value.full = codeholder.fullName;
                if (codeholder.fullNameLocal !== undefined) value.local = codeholder.fullNameLocal;
                if (codeholder.nameAbbrev !== undefined) value.abbrev = codeholder.nameAbbrev;
            }
            if (isEmpty) return undefined;
            return value;
        },
        toAPI: value => {
            const codeholder = {};
            if (typeof value === 'object' && ('firstLegal' in value)) {
                // human
                for (const f of ['firstName', 'lastName', 'firstNameLegal', 'lastNameLegal', 'honorific']) {
                    const cf = f.replace(/Name/, '');
                    if (value[cf] !== undefined) codeholder[f] = value[cf] || null;
                }
            } else if (typeof value === 'object') {
                // org
                if (value.full !== undefined) codeholder.fullName = value.full || null;
                if (value.local !== undefined) codeholder.fullNameLocal = value.local || null;
                if (value.abbrev !== undefined) codeholder.nameAbbrev = value.abbrev || null;
            }
            return codeholder;
        },
        requires: ['type', 'isDead'],
        sort: ['searchName'],
    },
    careOf: 'careOf',
    website: 'website',
    biography: 'biography',
    code: {
        apiFields: ['newCode', 'oldCode'],
        fromAPI: codeholder => codeholder.newCode === undefined && codeholder.oldCode === undefined
            ? undefined
            : { new: codeholder.newCode, old: codeholder.oldCode },
        // oldCode is read-only, so we only serialize newCode
        toAPI: value => value.new !== undefined ? { newCode: value.new } : {},
    },
    creationTime: 'creationTime',
    hasPassword: 'hasPassword',
    addressInvalid: 'addressInvalid',
    address: {
        apiFields: addressSubfields.flatMap(f => [`address.${f}`, `addressLatin.${f}`]),
        permFields: ['address', 'addressLatin'],
        fromAPI: codeholder => {
            const value = {};
            let isEmpty = true;
            for (const f of addressSubfields) {
                const aValue = codeholder.address ? codeholder.address[f] : undefined;
                if (aValue !== undefined) {
                    isEmpty = false;
                    value[f] = aValue;
                }
                const lValue = codeholder.addressLatin ? codeholder.addressLatin[f] : undefined;
                if (lValue !== undefined) {
                    isEmpty = false;
                    value[f + 'Latin'] = lValue;
                }
            }
            if (isEmpty) return undefined;
            return value;
        },
        toAPI: value => {
            const codeholder = {};
            const sendNormal = value.$latin !== true;
            const sendLatin = value.$latin !== false;
            if (sendNormal) codeholder.address = {};
            if (sendLatin) codeholder.addressLatin = {};
            for (const f of addressSubfields) {
                if (sendNormal && value[f]) codeholder.address[f] = value[f];
                if (sendLatin && value[f + 'Latin']) codeholder.addressLatin[f] = value[f + 'Latin'];
            }
            if (!Object.keys(codeholder.address).length) delete codeholder.address;
            if (!Object.keys(codeholder.addressLatin).length) delete codeholder.addressLatin;
            return codeholder;
        },
        sort: ['addressLatin.country', 'addressLatin.postalCode'],
    },
    feeCountry: 'feeCountry',
    membership: 'membership',
    email: 'email',
    enabled: 'enabled',
    notes: 'notes',
    officePhone: phoneFormat('officePhone'),
    landlinePhone: phoneFormat('landlinePhone'),
    cellphone: phoneFormat('cellphone'),
    isDead: 'isDead',
    birthdate: {
        apiFields: ['birthdate'],
        fromAPI: codeholder => codeholder.birthdate,
        toAPI: value => value !== undefined ? { birthdate: value } : {},
        requires: ['age'],
    },
    age: {
        apiFields: ['age', 'agePrimo'],
        fromAPI: codeholder => codeholder.age === undefined && codeholder.agePrimo === undefined
            ? undefined
            : { now: codeholder.age, atStartOfYear: codeholder.agePrimo },
        // agePrimo is a derived property so we never serialize it
        toAPI: value => value.now !== undefined ? { age: value.now } : {},
        requires: ['isDead'], // to ignore atStartOfYear when they’re dead
    },
    deathdate: 'deathdate',
    profilePicture: 'profilePicture',
    profilePictureHash: 'profilePictureHash',
    isActiveMember: 'isActiveMember',
    profession: 'profession',

    country: {
        apiFields: ['addressLatin.country', 'feeCountry'],
        fromAPI: codeholder => codeholder.feeCountry === undefined
            && (!codeholder.addressLatin || codeholder.addressLatin.country === undefined)
            ? undefined
            : {
                fee: codeholder.feeCountry,
                address: codeholder.addressLatin && codeholder.addressLatin.country,
            },
        toAPI: () => ({}),
    },
    addressCity: {
        apiFields: ['addressLatin.city'],
        fromAPI: codeholder => codeholder.addressLatin && codeholder.addressLatin.city,
        toAPI: () => ({}),
    },
    addressCountryArea: {
        apiFields: ['addressLatin.countryArea'],
        fromAPI: codeholder => codeholder.addressLatin && codeholder.addressLatin.countryArea,
        toAPI: () => ({}),
    },
    addressPublicity: 'addressPublicity',
    emailPublicity: 'emailPublicity',
    officePhonePublicity: 'officePhonePublicity',
    profilePicturePublicity: 'profilePicturePublicity',
    lastNamePublicity: 'lastNamePublicity',
    landlinePhonePublicity: 'landlinePhonePublicity',
    cellphonePublicity: 'cellphonePublicity',
    mainDescriptor: 'mainDescriptor',
    factoids: 'factoids',
    publicEmail: 'publicEmail',
    publicCountry: 'publicCountry',
};

const virtualDerivedFields = [
    'country',
    'addressCity',
    'addressCountryArea',
];

const fieldHistoryBlacklist = [
    'oldCode',
    'landlinePhoneFormatted',
    'officePhoneFormatted',
    'cellphoneFormatted',
];
const isFieldHistoryBlacklisted = field => fieldHistoryBlacklist.includes(field);

const fieldHistoryExtraFields = {
    name: ['lastNamePublicity'],
    profilePictureHash: ['profilePicturePublicity'],
    address: ['addressPublicity'],
    email: ['emailPublicity'],
    officePhone: ['officePhonePublicity'],
    landlinePhone: ['landlinePhonePublicity'],
    cellphone: ['cellphonePublicity'],
};

// fields that, when changed, should cause other fields to be refetched
// note that this maps *api fields* to *client fields*
const refetchFields = {
    birthdate: ['age'],
};

/** converts from API repr to client repr (see above) */
export const clientFromAPI = makeClientFromAPI(clientFields);
export const clientToAPI = makeClientToAPI(clientFields);

//! # Client-side filter representation
//! - type: 'human', or 'org'
//! - country: object { type, set } where type is one of null, 'fee', or 'address' and set is a
//!   list of countries and country groups
//! - enabled: true or false
//! - age: object { range, atStartOfYear } where range is a two-element array representing an
//!   inclusive interval and atStartOfYear is a bool
//! - hasOldCode: true or false
//! - hasEmail: true or false
//! - hasPassword: true or false
//! - addressInvalid: true or false
//! - isDead: true or false
//! - membership: array of objects { invert, lifetime, givesMembership, canuto, useRange, range, categories }
//!   where invert, lifetime, givesMembership, canuto, useRange are bool, range is an inclusive year
//!   interval, and categories is an array of membership category ids
//! - isActiveMember: array [lower bound year, upper bound year]
//! - deathdate: array [lower bound year, upper bound year]
//! - roles: object { roles: array of ids, date: date in RFC3339 }

/**
 * Client filter specs.
 *
 * - toAPI: converts client repr to an API filter
 * - fields: required API fields for this filter (wrt permissions)
 */
const clientFilters = {
    type: {
        toAPI: value => ({ codeholderType: value }),
        fields: ['codeholderType'],
    },
    country: {
        toAPI: ({ type, set }) => {
            const countryGroups = [];
            const countries = [];
            for (const item of set) {
                if (item.startsWith('x')) countryGroups.push(item);
                else countries.push(item);
            }
            const filterItems = [];
            if (type === null || type === 'fee') {
                filterItems.push({ feeCountry: { $in: countries } });
                filterItems.push({ feeCountryGroups: { $hasAny: countryGroups } });
            }
            if (type === null || type === 'address') {
                filterItems.push({ 'addressLatin.country': { $in: countries } });
                filterItems.push({ 'addressCountryGroups': { $hasAny: countryGroups } });
            }
            return { $or: filterItems };
        },
        // TODO: maybe there are user who can only see one but still want to use the filter?
        fields: ['feeCountry', 'addressLatin.country'],
    },
    enabled: {
        toAPI: value => ({ enabled: value }),
        fields: ['enabled'],
    },
    age: {
        toAPI: ({ range, atStartOfYear }) => ({ [atStartOfYear ? 'agePrimo' : 'age']: { $range: range } }),
        fields: ['age', 'agePrimo'],
    },
    hasOldCode: {
        toAPI: value => ({ oldCode: value ? { $neq: null } : null }),
        fields: ['oldCode'],
    },
    hasEmail: {
        toAPI: value => ({ email: value ? { $neq: null } : null }),
        fields: ['email'],
    },
    hasPassword: {
        toAPI: value => ({ hasPassword: value }),
        fields: ['hasPassword'],
    },
    addressInvalid: {
        toAPI: value => ({ addressInvalid: value }),
        fields: ['addressInvalid'],
    },
    isDead: {
        toAPI: value => ({ isDead: value }),
        fields: ['isDead'],
    },
    membership: {
        toAPI: value => {
            const items = value.map(({
                invert, lifetime, givesMembership, canuto, useRange, range, includePrevLifetime, categories,
            }) => {
                const filter = {};
                if (givesMembership !== null) filter.givesMembership = givesMembership;
                if (canuto !== null) filter.canuto = canuto;
                if (lifetime !== null) filter.lifetime = lifetime;
                if (useRange) {
                    let year;
                    if (range[0] === range[1]) year = range[0];
                    else year = { $range: range };

                    if (includePrevLifetime) {
                        filter.$or = [
                            {
                                lifetime: true,
                                year: { $lte: range[0] },
                            },
                            {
                                year,
                            },
                        ];
                    } else {
                        filter.year = year;
                    }
                }
                if (categories.length) filter.categoryId = { $in: categories };
                return invert ? { $not: { $membership: filter } } : { $membership: filter };
            });

            return items.length === 1 ? items[0] : { $and: items };
        },
        fields: ['membership'],
    },
    isActiveMember: {
        toAPI: range => ({
            $membership: {
                givesMembership: true,
                $or: [
                    {
                        lifetime: false,
                        year: { $range: range },
                    },
                    {
                        lifetime: true,
                        year: { $lte: range[0] },
                    },
                ],
            },
        }),
        fields: ['membership'],
    },
    deathdate: {
        toAPI: range => ({ deathdate: { $range: [`${range[0]}-01-01`, `${range[1]}-12-31`] } }),
        fields: ['deathdate'],
    },
    roles: {
        toAPI: ({ roles, date }) => {
            const dateFilter = {};
            if (date) {
                dateFilter.$and = [
                    {
                        $or: [
                            { durationFrom: { $lte: +moment.utc(date) / 1000 } },
                            { durationFrom: null },
                        ],
                    },
                    {
                        $or: [
                            { durationTo: { $gte: +moment.utc(date) / 1000 } },
                            { durationTo: null },
                        ],
                    },
                ];
            }

            return {
                $roles: {
                    roleId: { $in: roles.map(id => +id) },
                    ...dateFilter,
                },
            };
        },
        fields: [],
        perms: ['codeholder_roles.read'],
    },
    codeList: {
        toAPI: codes => {
            const newCodes = [];
            const oldCodes = [];

            for (const code of codes) {
                // does it roughly look like an old code?
                if (code.length === 4) {
                    oldCodes.push(code);
                    continue;
                }
                if (code.length === 6 && code.includes('-')) {
                    oldCodes.push(code.substr(0, 4));
                    continue;
                }
                newCodes.push(code);
            }

            if (!newCodes.length) return { oldCode: { $in: oldCodes } };
            else if (!oldCodes.length) return { newCode: { $in: newCodes } };
            return { $or: [{ newCode: { $in: newCodes } }, { oldCode: { $in: oldCodes } }] };
        },
        fields: ['newCode'],
    },
    delegations: {
        toAPI: filters => {
            const items = filters.map(({
                invert, filters,
            }) => {
                const filter = filtersToAPI(delegateFilters, filters) || {};
                return invert ? ({ $not: { $delegations: filter  } }) : ({ $delegations: filter });
            });
            return items.length > 1 ? { $and: items } : items[0];
        },
        fields: [],
    },
    newsletterSubscriptions: {
        toAPI: filter => {
            const subs = { id: { $in: filter.newsletters } };
            if (filter.time) {
                subs.time = {
                    $range: [
                        +new Date(filter.time[0] + 'T00:00:00Z') / 1000,
                        +new Date(filter.time[1] + 'T23:59:59Z') / 1000,
                    ],
                };
            }
            return { $newsletterSubscriptions: subs };
        },
    },
};

/**
 * Transient client fields that will be selected for a given search field.
 *
 * This is a list of exceptions; all other will be passed through as-is.
 */
const searchFieldToTransientFields = {
    nameOrCode: ['name', 'code'],
    searchAddress: ['address'],
};

/** Converts params to request options. See task codeholders/list for details. */
export const parametersToRequestData = makeParametersToRequestData({
    searchFieldToTransientFields,
    handleSearchFields: ({ query, field }) => {
        let prependedUeaCodeSearch;

        if (field === 'nameOrCode') {
            field = 'searchName';
            try {
                // if the query is a valid UEA code; prepend search
                const code = new UEACode(query);
                if (code.type === 'new') prependedUeaCodeSearch = { newCode: query };
                else prependedUeaCodeSearch = { oldCode: query };
            } catch { /* only search for name otherwise */ }
        } else if (['landlinePhone', 'officePhone', 'cellphone'].includes(field)) {
            // filter out non-alphanumeric characters because they might be interpreted as
            // search operators
            query = query.replace(/[^a-z0-9]/ig, '');
        }

        const transformedQuery = util.transformSearch(query);

        if (transformedQuery.length < 3) {
            throw { code: 'search-query-too-short', message: 'search query too short' };
        }

        if (!util.isValidSearch(transformedQuery)) {
            throw { code: 'invalid-search-query', message: 'invalid search query' };
        }

        return {
            search: { str: transformedQuery, cols: [field] },
            data: { prependedUeaCodeSearch },
        };
    },
    clientFields,
    clientFilters,
});

export const tasks = {
    /**
     * codeholders/fields: lists available fields according to permissions (it is recommended that
     * you use the corresponding view instead)
     * returns an array with field ids
     */
    fields: async () => {
        const client = await asyncClient;
        const fields = [];
        const ownFields = [];
        for (const field in clientFields) {
            const spec = clientFields[field];
            let hasPerm, hasOwnPerm;
            if (typeof spec === 'string') {
                hasPerm = await client.hasCodeholderField(spec, 'r');
                hasOwnPerm = await client.hasOwnCodeholderField(spec, 'r');
            } else if (typeof spec.apiFields === 'string') {
                hasPerm = await client.hasCodeholderField(spec.apiFields, 'r');
                hasOwnPerm = await client.hasOwnCodeholderField(spec.apiFields, 'r');
            } else if (spec.permFields) {
                for (const f of spec.permFields) {
                    if (await client.hasCodeholderField(f, 'r')) {
                        hasPerm = true;
                        break;
                    }
                }
                for (const f of spec.permFields) {
                    if (await client.hasOwnCodeholderField(f, 'r')) {
                        hasOwnPerm = true;
                        break;
                    }
                }
            } else {
                for (const f of spec.apiFields) {
                    if (await client.hasCodeholderField(f, 'r')) {
                        hasPerm = true;
                        break;
                    }
                }
                for (const f of spec.apiFields) {
                    if (await client.hasOwnCodeholderField(f, 'r')) {
                        hasOwnPerm = true;
                        break;
                    }
                }
            }
            if (hasPerm) fields.push(field);
            if (hasOwnPerm) ownFields.push(field);
        }
        return { fields, ownFields };
    },
    /**
     * codeholders/filters: lists available filters according to permissions (it is recommended
     * that you use the corresponding view instead)
     * returns an array with filter ids
     */
    filters: async () => {
        const client = await asyncClient;
        const filters = [];
        for (const filter in clientFilters) {
            const hasFields = await client.hasCodeholderFields('r', ...clientFilters[filter].fields);
            let hasPerms = true;
            for (const perm of (clientFilters[filter].perms || [])) {
                if (!await client.hasPerm(perm)) {
                    hasPerms = false;
                    break;
                }
            }
            if (hasFields && hasPerms) {
                filters.push(filter);
            }
        }
        return filters;
    },
    /** codeholders/filtersToAPI: converts filters to api repr */
    filtersToAPI: async ({ filters }) => {
        return filtersToAPI(clientFilters, filters);
    },
    /**
     * codeholders/list: fetches codeholders
     * options: none
     * parameters:
     *    - search: { field: string, query: string }
     *    - filters: object { [name]: { value, enabled } }
     *        - if key `_disabled` is set, will be disabled
     *    - jsonFilter: object { filter: object, error: string?, disabled: bool }
     *    - fields: [{ id: string, sorting: 'asc' | 'desc' | 'none' }]
     *    - offset: number
     *    - limit: number
     *    - skipCursed: bool - if true, will not add cursed items
     * returns:
     *    - items: [data store id list]
     *    - transientFields: [string]
     *    - total: number
     *    - cursed: array of cursed items or null
     *    - stats
     *        - filtered: bool
     *        - time: string
     */
    list: async (_, parameters) => {
        const client = await asyncClient;

        const {
            options, prependedUeaCodeSearch, usedFilters, transientFields,
        } = parametersToRequestData(parameters);

        const originalFields = options.fields;
        options.fields = [];
        const originalOrder = options.order;
        options.order = [];
        for (const f of originalFields) {
            if (await client.hasCodeholderField(f, 'r')) {
                options.fields.push(f);
            }
        }
        for (const f of originalOrder) {
            // always keep _ fields (e.g. _relevance). otherwise check if user has perms
            if (f[0].startsWith('_') || (await client.hasCodeholderField(f[0], 'r'))) {
                options.order.push(f);
            }
        }

        let itemToPrepend = null;
        if (!parameters.skipCursed && prependedUeaCodeSearch) {
            let filter = prependedUeaCodeSearch;
            if (options.filter && Object.keys(options.filter).length) {
                filter = { $and: [options.filter, prependedUeaCodeSearch] };
            }

            itemToPrepend = (await client.get('/codeholders', {
                filter,
                // only need to know about its existence on later pages
                fields: options.offset === 0 ? options.fields : [],
                limit: 1,
            })).body[0];
            if (itemToPrepend) itemToPrepend.isCursed = true;
        }

        if (itemToPrepend) {
            // there’s an extra item at the front
            // on the first page, just reduce the limit to compensate
            if (parameters.offset === 0) options.limit--;
            // and on any other page, reduce the offset to compensate
            else options.offset--;
        }

        const result = await client.get('/codeholders', options);
        let list = result.body;
        let totalItems = +result.res.headers.get('x-total-items');
        let cursed = null;

        if (itemToPrepend) {
            cursed = [];
            let isDuplicate = false;
            for (const item of list) {
                if (item.id === itemToPrepend.id) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                // prepend item on the first page if it’s not a duplicate
                if (parameters.offset === 0) {
                    list.unshift(itemToPrepend);
                    cursed.push(itemToPrepend.id);
                }
                totalItems++;
            }
        }

        for (const item of list) {
            const existing = store.get([CODEHOLDERS, item.id]);
            store.insert([CODEHOLDERS, item.id], deepMerge(existing, clientFromAPI(item)));
        }

        list = list.map(item => item.id);

        return {
            items: list,
            total: totalItems,
            cursed,
            transientFields,
            stats: {
                time: result.resTime,
                filtered: usedFilters,
            },
        };
    },
    /**
     * codeholders/codeholder: gets a single codeholder and puts it in the data store
     *
     * # Options
     * - id: codeholder id or `self`
     * - fields: client field ids
     *
     * Returns the resolved id (i.e. always a number, never `self`)
     */
    codeholder: async (_, { id, fields }) => {
        const client = await asyncClient;

        const rawApiFields = ['id'].concat(fields.flatMap(id => typeof clientFields[id] === 'string'
            ? [clientFields[id]]
            : clientFields[id].apiFields));
        const apiFields = [];

        for (const f of rawApiFields) {
            const fieldNames = [f];
            if (f.includes('.')) fieldNames.push(f.split('.')[0]); // also allow address instead of address.*
            let hasField = false;
            for (const f of fieldNames) {
                hasField = hasField || (id === 'self'
                    ? (await client.hasOwnCodeholderField(f, 'r'))
                    : (await client.hasCodeholderField(f, 'r')));
            }
            if (hasField) apiFields.push(f);
        }

        const res = await client.get(`/codeholders/${id}`, {
            fields: apiFields,
        });

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;

        const existing = store.get([CODEHOLDERS, storeId]);
        store.insert([CODEHOLDERS, storeId], deepMerge(existing, clientFromAPI(res.body)));

        return id;
    },
    /**
     * codeholders/create: creates a codeholder
     *
     * # Parameters
     * - all codeholder fields, really
     */
    create: async (_, data) => {
        const client = await asyncClient;
        const res = await client.post('/codeholders', clientToAPI(data));
        store.signal([CODEHOLDERS, SIG_CODEHOLDERS]);
        const id = +res.res.headers.get('x-identifier');
        store.insert([CODEHOLDERS, id], data);
        return id;
    },
    /**
     * codeholders/delete: deletes a codeholder
     *
     * # Options
     * - id: codeholder id
     */
    delete: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/codeholders/${id}`);

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.remove([CODEHOLDERS, storeId]);
        store.signal([CODEHOLDERS, SIG_CODEHOLDERS]);
    },
    /**
     * codeholders/update: updates a codeholder
     *
     * # Options
     * - id: codeholder id
     *
     * # Parameters
     * - updateComment: modCmt
     * - any codeholder fields; will be diffed
     */
    update: async ({ id }, data) => {
        const client = await asyncClient;
        const codeholderData = { ...data };
        delete codeholderData.updateComment;
        const options = {};
        if (data.updateComment) options.modCmt = data.updateComment;

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        const existing = store.get([CODEHOLDERS, storeId]);
        const currentData = clientToAPI(existing);
        const newData = clientToAPI(codeholderData);
        const diff = {};
        const refetch = [];

        for (const k in newData) {
            if (refetchFields[k]) refetch.push(refetchFields[k]);

            if (!deepEq(currentData[k], newData[k])) {
                diff[k] = newData[k];
            }
        }

        // if the user changes the profile picture while editing; the old hash will still be in
        // the codeholder data.
        // here we mitigate this
        delete diff.profilePicture;
        delete codeholderData.profilePicture;
        delete diff.profilePictureHash;
        delete codeholderData.profilePictureHash;

        try {
            await client.patch(`/codeholders/${id}`, diff, options);
        } catch (err) {
            if (err.statusCode === 400 && err.message.includes('email taken')) {
                throw { code: 'email-taken', message: 'email taken' };
            }
            throw err;
        }

        // also update data in store
        store.insert([CODEHOLDERS, storeId], deepMerge(existing, codeholderData));

        if (refetch.length) {
            // refetch requested
            // do a fetch, but we don't really mind if it fails
            tasks.codeholder({}, { id, fields: [refetch] }).catch(() => {});
        }
    },
    /**
     * codeholders/setProfilePicture: sets a codeholder’s profile picture
     *
     * # Options and Parameters
     * - id: codeholder id or `self`
     * - blob: file blob (which has an appropriate mime type)
     */
    setProfilePicture: async ({ id }, { blob }) => {
        const client = await asyncClient;
        await client.put(`/codeholders/${id}/profile_picture`, null, {}, [{
            name: 'picture',
            type: blob.type,
            value: blob,
        }]);
        // need to update profilePictureHash
        // but we don’t await this because when this fails it shouldn’t display an error
        tasks.codeholder({}, { id, fields: ['profilePictureHash'] }).catch(err => {
            log.error('failed to fetch new profile picture hash', err);
        });
    },
    removeProfilePicture: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/codeholders/${id}/profile_picture`);

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        const existing = store.get([CODEHOLDERS, storeId]);
        store.insert([CODEHOLDERS, storeId], deepMerge(existing, {
            profilePictureHash: null,
        }));
    },
    /**
     * codeholders/listFiles: lists files for a codeholder
     *
     * # Options and Parameters
     * - id: codeholder id
     * - offset, limit
     *
     * Returns { items, total }
     */
    listFiles: async ({ id }, { offset, limit }) => {
        const client = await asyncClient;
        const res = await client.get(`/codeholders/${id}/files`, {
            offset,
            limit,
            // all the fields
            fields: ['id', 'time', 'addedBy', 'name', 'description', 'mime', 'size', 'url'],
        });

        return { items: res.body, total: +res.res.headers.get('x-total-items') };
    },
    codeholderFile: async ({ id, file }) => {
        const client = await asyncClient;
        const res = await client.get(`/codeholders/${id}/files`, {
            offset: 0,
            limit: 1,
            filter: { id: +file },
            // all the fields
            fields: ['id', 'time', 'addedBy', 'name', 'description', 'mime', 'size', 'url'],
        });
        if (!res.body[0]) throw { code: 'not-found', message: 'file not found' };
        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.insert([CODEHOLDER_FILES, +storeId, +file], res.body[0]);
        return res.body[0].id;
    },
    /**
     * codeholders/uploadFile: uploads a file
     *
     * # Options and Parameters
     * - id: codeholder id
     * - name: file name
     * - description: optional file description
     * - file: blob
     */
    uploadFile: async ({ id }, { name, description, file }) => {
        const client = await asyncClient;
        const options = { name };
        if (description) options.description = description;
        await client.post(`/codeholders/${id}/files`, options, undefined, [{
            name: 'file',
            type: file.type,
            value: file,
        }]);

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.signal([CODEHOLDERS, storeId, SIG_FILES]);
    },
    /**
     * codeholders/deleteFile: deletes a file
     *
     * # Options and Parameters
     * - id: codeholder id
     * - file: file id
     */
    deleteFile: async ({ id, file }) => {
        const client = await asyncClient;
        await client.delete(`codeholders/${id}/files/${file}`);
        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.remove([CODEHOLDER_FILES, storeId, file]);
        store.signal([CODEHOLDERS, storeId, SIG_FILES]);
    },
    /**
     * codeholders/listMemberships: lists memberships for a codeholder
     *
     * # Options and Parameters
     * - id: codeholder id
     * - offset, limit
     *
     * Returns { items, total }
     */
    listMemberships: async ({ id }, { offset, limit, jsonFilter }) => {
        const client = await asyncClient;
        const res = await client.get(`/codeholders/${id}/membership`, {
            offset,
            limit,
            // most of the fields
            fields: [
                'id',
                'categoryId',
                'year',
                'nameAbbrev',
                'name',
                'givesMembership',
                'lifetime',
                'canuto',
            ],
            order: [['year', 'desc']],
            ...(jsonFilter ? { filter: jsonFilter.filter } : {}),
        });

        return { items: res.body, total: +res.res.headers.get('x-total-items') };
    },
    /**
     * codeholders/addMembership: adds a membership
     *
     * # Options and Parameters
     * - id: codeholder id
     * - category: category id
     * - year: year
     */
    addMembership: async ({ id }, { category, year, canuto }) => {
        const client = await asyncClient;
        await client.post(`/codeholders/${id}/membership`, {
            categoryId: +category,
            year: +year,
            canuto: !!canuto,
        });

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.signal([CODEHOLDERS, storeId, SIG_MEMBERSHIPS]);

        // need to update membership
        // but we don’t await this because when this fails it shouldn’t display an error
        tasks.codeholder({}, { id, fields: ['membership'] }).catch(err => {
            log.error('failed to fetch new memberships', err);
        });
    },
    /**
     * codeholders/deleteMembership: deletes a membership
     *
     * # Options and Parameters
     * - id: codeholder id
     * - membership: membership id
     */
    deleteMembership: async ({ id }, { membership }) => {
        const client = await asyncClient;
        await client.delete(`/codeholders/${id}/membership/${membership}`);

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.signal([CODEHOLDERS, storeId, SIG_MEMBERSHIPS]);

        // need to update membership
        // but we don’t await this because when this fails it shouldn’t display an error
        tasks.codeholder({}, { id, fields: ['membership'] }).catch(err => {
            log.error('failed to fetch new memberships', err);
        });
    },
    /**
     * codeholders/listRoles: lists roles for a codeholder
     *
     * # Options and Parameters
     * - id: codeholder id
     * - offset, limit
     * - filter (optional): verbatim filter
     *
     * Returns { items, total }
     */
    listRoles: async ({ id }, { offset, limit, filter }) => {
        const client = await asyncClient;
        const opts = {};
        if (filter) opts.filter = filter;
        const res = await client.get(`/codeholders/${id}/roles`, {
            offset,
            limit,
            // all of the fields
            fields: [
                'id',
                'durationFrom',
                'durationTo',
                'isActive',
                'dataCountry',
                'dataOrg',
                'dataString',
                'role.id',
                'role.name',
            ],
            order: [['durationTo', 'desc']],
            ...opts,
        });

        return { items: res.body, total: +res.res.headers.get('x-total-items') };
    },
    /**
     * codeholders/addRole: adds a role
     *
     * # Options and Parameters
     * - id: codeholder id
     * - role: role id
     * - durationFrom/durationTo: nullable date bounds
     */
    addRole: async ({ id }, { durationFrom, durationTo, role, ...extra }) => {
        const client = await asyncClient;
        await client.post(`/codeholders/${id}/roles`, {
            durationFrom: durationFrom ? +new Date(durationFrom) / 1000 : null,
            durationTo: durationTo ? +new Date(durationTo) / 1000 : null,
            roleId: +role,
            ...extra,
        });

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.signal([CODEHOLDERS, storeId, SIG_ROLES]);
    },
    /**
     * codeholders/updateRole: updates a role
     *
     * # Options and Parameters
     * - id: codeholder id
     * - entry: role id
     * - durationFrom/durationTo: nullable date bounds
     * - role: role id
     */
    updateRole: async ({ id, entry }, { durationFrom, durationTo, role, ...extra }) => {
        const client = await asyncClient;
        await client.patch(`/codeholders/${id}/roles/${entry}`, {
            durationFrom: durationFrom ? +new Date(durationFrom) / 1000 : null,
            durationTo: durationTo ? +new Date(durationTo) / 1000 : null,
            roleId: +role,
            ...extra,
        });

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.signal([CODEHOLDERS, storeId, SIG_ROLES]);
    },
    /**
     * codeholders/deleteRole: deletes a role
     *
     * # Options and Parameters
     * - id: codeholder id
     * - role: role entry id
     */
    deleteRole: async ({ id }, { role }) => {
        const client = await asyncClient;
        await client.delete(`/codeholders/${id}/roles/${role}`);

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.signal([CODEHOLDERS, storeId, SIG_ROLES]);
    },
    /**
     * codeholders/makeAddressLabels: spawns a task on the server
     *
     * # Options
     * see codeholders/list
     *
     * # Parameters
     * see api docs
     */
    makeAddressLabels: async ({ search, filters, jsonFilter, fields, snapshot, snapshotCompare }, parameters) => {
        const client = await asyncClient;
        const { options } = parametersToRequestData({ search, filters, jsonFilter, fields });
        delete options.fields;
        delete options.order;
        delete options.offset;
        delete options.limit;

        if (snapshot) {
            delete options.search;
            delete options.filter;

            parameters.snapshot = +snapshot.id;
            if (snapshotCompare) parameters.snapshotCompare = +snapshotCompare;
        }

        const roundParams = (p) => {
            if (Array.isArray(p)) {
                return p.map(roundParams);
            } else if (typeof p === 'object') {
                const newP = {};
                for (const k in p) {
                    newP[k] = roundParams(p[k]);
                }
                return newP;
            } else if (typeof p === 'number') return Math.round(p);
            return p;
        };

        await client.post('/codeholders/!make_address_labels', roundParams(parameters), options);
    },
    /**
     * codeholders/address: gets a codeholder’s formatted address
     *
     * # Options and Parameters
     * - id: codeholder id
     * - lang: language (defaults to eo)
     * - postal: whether to format as postalLatin
     */
    address: async ({ id }, { lang = 'eo', postal = false }) => {
        const client = await asyncClient;
        const res = await client.get(`/codeholders/${id}/address/${lang}`, {
            formatAs: postal ? 'postalLatin' : 'displayLatin',
        });
        return res.body[id];
    },
    /**
     * codeholders/fieldHistory: gets a codeholder field’s entire history
     *
     * Unlike the API, here mods contain the *new* value and not the *old* value.
     *
     * # Props
     * - id: codeholder id
     * - field: client field name
     *
     * # Returns
     * - items: modifications, sorted by time
     */
    fieldHistory: async ({ id, field }) => {
        const client = await asyncClient;

        let rawApiFields;
        if (field === 'password') {
            // special otherwise non-existent field
            rawApiFields = ['password'];
        } else {
            rawApiFields = typeof clientFields[field] === 'string'
                ? [clientFields[field]]
                : clientFields[field].apiFields.filter(x => !isFieldHistoryBlacklisted(x));

            if (fieldHistoryExtraFields[field]) rawApiFields.push(...fieldHistoryExtraFields[field]);
        }

        const apiFields = [];
        for (const f of rawApiFields) {
            if (await client.hasCodeholderField(f, 'r')) {
                apiFields.push(f);
            }
        }

        let histFields = apiFields;

        // special history endpoint
        if (field === 'address') histFields = ['address', ...(fieldHistoryExtraFields.address || [])];

        const mods = {
            // the “null” change; initial value at db creation time or something
            priori: {
                comment: null,
                author: null,
                time: 0,
                id: null,
                data: {},
            },
        };

        let currentValues;
        if (field === 'password') {
            currentValues = {};
        } else {
            currentValues = (await client.get(`/codeholders/${id}`, {
                fields: apiFields,
            })).body;
        }

        for (const fieldId of histFields) {
            let offset = 0;
            let total = null;
            let prevMod = 'priori';
            while (total === null || offset < total) {
                const res = await client.get(`/codeholders/${id}/hist/${fieldId}`, {
                    fields: ['val', 'modId', 'modTime', 'modBy', 'modCmt'],
                    offset,
                    limit: 100,
                    order: [['modId', 'asc']],
                });
                total = res.res.headers.get('x-total-items');
                if (res.body.length === 0 && offset < total) {
                    log.error('server returned zero items but we expected nonzero; aborting and returning partial');
                    total = 0;
                }
                offset += 100;

                for (const item of res.body) {
                    if (!mods[item.modId]) mods[item.modId] = {
                        comment: item.modCmt,
                        author: item.modBy,
                        time: item.modTime,
                        id: item.modId,
                        data: {},
                    };
                    // mod contains the *old* value; meaning this value goes in prevMod
                    if (prevMod) mods[prevMod].data[fieldId] = item.val[fieldId];
                    prevMod = item.modId;
                }
            }

            if (prevMod) mods[prevMod].data[fieldId] = currentValues[fieldId];
        }

        const modsByTime = Object.keys(mods).sort((a, b) => mods[a].time - mods[b].time);
        const currentData = {};
        for (const k of modsByTime) {
            // we’re operating under the assumption that not all fields might change for a given mod
            // so with multiple api fields, we might only have partial data sometimes
            // hence, we first assign the new partial data to the current data to update it
            Object.assign(currentData, mods[k].data);
            // then assign the merged data to the mod to have a complete snapshot
            mods[k].data = { ...currentData };
        }

        // now, decode the data into client-side reprs
        for (const k in mods) {
            mods[k].data = clientFromAPI(mods[k].data);
        }

        return {
            items: modsByTime.reverse().map(k => mods[k]),
        };
    },
    /**
     * codeholders/listLogins: lists login history
     *
     * # Options and Parameters
     * - id: codeholder id
     * - offset, limit
     */
    listLogins: async ({ id }, { offset, limit }) => {
        const client = await asyncClient;
        const res = await client.get(`/codeholders/${id}/logins`, {
            offset,
            limit,
            // all of the fields
            fields: [
                'id',
                'time',
                'timezone',
                'ip',
                'userAgent',
                'userAgentParsed',
                'll',
                'area',
                'country',
                'region',
                'city',
            ],
            order: [['time', 'desc']],
        });

        return { items: res.body, total: +res.res.headers.get('x-total-items') };
    },
    /** codeholders/createPassword: sends a password creation email */
    createPassword: async ({ id }, { org }) => {
        // first, obtain the user’s uea code
        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        const existing = store.get([CODEHOLDERS, storeId]);

        let ueaCode;
        if (existing.code && existing.code.new) ueaCode = existing.code.new;
        else {
            // we don’t have it; fetch
            await tasks.codeholder({}, { id, fields: ['code'] });
            try {
                ueaCode = store.get([CODEHOLDERS, storeId]).code.new;
            } catch {
                throw new Error('broken invariant: codeholder task must populate data or fail');
            }
        }

        const client = await asyncClient;
        await client.post(`/codeholders/${ueaCode}/!create_password`, { org });
    },
    /** codeholders/resetPassword: sends a password reset email */
    resetPassword: async ({ id }, { org }) => {
        // first, obtain the user’s uea code
        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        const existing = store.get([CODEHOLDERS, storeId]);

        let ueaCode;
        if (existing.code && existing.code.new) ueaCode = existing.code.new;
        else {
            // we don’t have it; fetch
            await tasks.codeholder({}, { id, fields: ['code'] });
            try {
                ueaCode = store.get([CODEHOLDERS, storeId]).code.new;
            } catch {
                throw new Error('broken invariant: codeholder task must populate data or fail');
            }
        }

        const client = await asyncClient;
        await client.post(`/codeholders/${ueaCode}/!forgot_password`, { org });
    },
    resetTotp: async ({ id }) => {
        const client = await asyncClient;
        try {
            await client.post(`/codeholders/${id}/!disable_totp`);
            return true;
        } catch (err) {
            if (err.statusCode === 404) return false;
            throw err;
        }
    },

    permissions: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/codeholders/${id}/permissions`);

        let memberRestrictions;
        try {
            const res = await client.get(`/codeholders/${id}/member_restrictions`, {
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
        const mrFilter = mrEnabled
            ? JSON5.stringify(memberRestrictions.filter, undefined, 4)
            : '{\n\t\n}';
        const mrFields = mrEnabled
            ? memberRestrictions.fields
            : {};

        const permData = {
            permissions: perms,
            mrEnabled,
            mrFilter,
            mrFields,
        };

        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        store.insert([CODEHOLDER_PERMS, storeId], permData);
        return permData;
    },
    setPermissions: () => {}, // dummy for UI
    setPermissionsPX: async ({ id }, { permissions }) => {
        const client = await asyncClient;
        await client.put(`/codeholders/${id}/permissions`, permissions.permissions);
        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        const existing = store.get([CODEHOLDER_PERMS, storeId]);
        store.insert([CODEHOLDER_PERMS, storeId], deepMerge(existing, {
            permissions: permissions.permissions,
        }));
    },
    setPermissionsMR: async ({ id }, { permissions }) => {
        const client = await asyncClient;
        const storeId = id === 'self' ? store.get(LOGIN_ID) : id;
        if (permissions.mrEnabled) {
            await client.put(`/codeholders/${id}/member_restrictions`, {
                filter: JSON5.parse(permissions.mrFilter),
                fields: permissions.mrFields,
            });
        } else {
            try {
                await client.delete(`/codeholders/${id}/member_restrictions`);
            } catch (err) {
                if (err.statusCode === 404) {
                    // not found; means there weren’t any in the first place
                } else {
                    throw err;
                }
            }
        }
        const existing = store.get([CODEHOLDER_PERMS, storeId]);
        store.insert([CODEHOLDER_PERMS, storeId], deepMerge(existing, {
            mrEnabled: permissions.mrEnabled,
            mrFilter: permissions.mrFilter,
            mrFields: permissions.mrFields,
        }));
    },

    codeSuggestions: async ({ keep }, parameters) => {
        const client = await asyncClient;

        const codeSuggestions = [];
        if (parameters.name) {
            codeSuggestions.push(...UEACode.suggestCodes({
                type: parameters.type,
                firstNames: [parameters.name.first, parameters.name.firstLegal],
                lastNames: [parameters.name.last, parameters.name.lastLegal],
                fullName: parameters.name.full,
                nameAbbrev: parameters.name.abbrev,
            }));
        }

        if (!codeSuggestions.length) return codeSuggestions;

        try {
            const res = await client.get('/codeholders/codes_available', {
                codes: codeSuggestions.join(','),
            });
            return codeSuggestions.filter(x => {
                if (keep && keep.includes(x)) return true;
                return res.body[x].available;
            });
        } catch (err) {
            log.warn(`Failed to fetch available codes (${err}); returning whole list`);
            return codeSuggestions;
        }
    },

    listAddrLabelPresets: async (_, { offset, limit }) => {
        const client = await asyncClient;
        const res = await client.get('/address_label_templates', {
            offset,
            limit,
            fields: [
                'id', 'name', 'paper', 'margins', 'cols', 'rows', 'colGap', 'rowGap',
                'cellPadding', 'fontSize', 'drawOutline',
            ],
        });
        return { items: res.body, total: +res.res.headers.get('x-total-items') };
    },
    createAddrLabelPreset: async (_, data) => {
        const client = await asyncClient;
        const res = await client.post('/address_label_templates', data);
        return +res.res.headers.get('x-identifier');
    },
    updateAddrLabelPreset: async ({ id }, data) => {
        const client = await asyncClient;
        await client.patch(`/address_label_templates/${id}`, data);
        return +id;
    },
    deleteAddrLabelPreset: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/address_label_templates/${id}`);
    },

    sendNotifTemplate: async ({ search, filters, jsonFilter, fields }, { template, deleteOnComplete }) => {
        const client = await asyncClient;
        const { options } = parametersToRequestData({ search, filters, jsonFilter, fields });
        delete options.fields;
        delete options.offset;
        delete options.limit;

        await client.post('/codeholders/!send_notif_template', {
            notifTemplateId: template,
            deleteTemplateOnComplete: !!deleteOnComplete,
        }, options);
    },

    /** Lists change requests. */
    changeRequests: crudList({
        apiPath: () => `/codeholders/change_requests`,
        fields: ['id', 'time', 'codeholderId', 'status', 'codeholderDescription', 'internalNotes'],
        filters: {
            status: {
                toAPI: values => ({ status: { $in: values } }),
            },
        },
        withApiOptions: (apiOpts, options) => {
            if (options.id) {
                const filter = { codeholderId: options.id };
                apiOpts.filter = apiOpts.filter ? ({ $and: [apiOpts.filter, filter] }) : filter;
            }
        },
        storePath: (_, { id }) => [CODEHOLDER_CHGREQS, id],
    }),
    changeRequest: crudGet({
        apiPath: ({ id }) => `/codeholders/change_requests/${id}`,
        fields: ['id', 'time', 'codeholderId', 'status', 'codeholderDescription', 'internalNotes', 'data'],
        storePath: ({ id }) => [CODEHOLDER_CHGREQS, id],
        map: item => {
            const clientData = clientFromAPI(item.data);
            item.data = {};
            for (const key in clientData) {
                if (virtualDerivedFields.includes(key)) continue;
                if (clientData[key] === undefined) continue;
                item.data[key] = clientData[key];
            }
        },
    }),
    updateChangeRequest: crudUpdate({
        apiPath: ({ id }) => `/codeholders/change_requests/${id}`,
        storePath: ({ id }) => [CODEHOLDER_CHGREQS, id],
    }),

    listDelegations: crudList({
        apiPath: ({ id }) => `/codeholders/${id}/delegations`,
        fields: [
            'org',
            'approvedBy',
            'approvedTime',
            'cities',
            'countries',
            'subjects',
            'hosting.maxDays',
            'hosting.maxPersons',
        ],
        storePath: ({ id }, item) => [CODEHOLDER_DELEGATIONS, id, item.org],
        map: (item, { id }) => {
            item.codeholderId = id;
            item.id = item.codeholderId + '~' + item.org;
        },
    }),
    delegations: crudGet({
        apiPath: ({ id, org }) => `/codeholders/${id}/delegations/${org}`,
        fields: [
            'org',
            'approvedBy',
            'approvedTime',
            'cities',
            'countries',
            'subjects',
            'hosting.maxDays',
            'hosting.maxPersons',
            'hosting.description',
            'hosting.psProfileURL',
            'tos.docDataProtectionUEA',
            'tos.docDataProtectionUEATime',
            'tos.docDelegatesUEA',
            'tos.docDelegatesUEATime',
            'tos.docDelegatesDataProtectionUEA',
            'tos.docDelegatesDataProtectionUEATime',
            'tos.paperAnnualBook',
            'tos.paperAnnualBookTime',
        ],
        storePathWithBody: ({ id }, item) => [CODEHOLDER_DELEGATIONS, id, item.org],
        map: (item, { id }) => {
            item.codeholderId = id;
            item.id = item.codeholderId + '~' + item.org;
        },
    }),
    setDelegations: async ({ id, org }, delegations) => {
        const client = await asyncClient;
        const obj = { ...delegations };
        delete obj.id;
        delete obj.org;
        delete obj.codeholderId;
        delete obj.approvedBy;
        delete obj.approvedTime;
        await client.put(`/codeholders/${id}/delegations/${org}`, obj);
        store.insert([CODEHOLDER_DELEGATIONS, id, org], delegations);
        store.signal([CODEHOLDER_DELEGATIONS, SIG_DELEGATIONS]);
    },
    // virtual task for task dialog
    createDelegations: async (_, delegations) => {
        const { codeholderId: id, org } = delegations;
        try {
            await tasks.delegations({ id, org });
            throw { code: 'object-exists', message: 'delegations already exist' };
        } catch (err) {
            if (err.statusCode !== 404) throw err;
        }
        return await tasks.setDelegations({ id, org }, delegations);
    },
    deleteDelegations: async ({ id, org }) => {
        const client = await asyncClient;
        await client.delete(`/codeholders/${id}/delegations/${org}`);
        store.remove([CODEHOLDER_DELEGATIONS, id, org]);
        store.signal([CODEHOLDER_DELEGATIONS, SIG_DELEGATIONS]);
    },

    congressParticipations: crudList({
        apiPath: ({ id }) => `/codeholders/${id}/congress_participations`,
        fields: [
            'congressId',
            'congressInstanceId',
            'dataId',
        ],
        storePath: ({ id }, { dataId }) => [CODEHOLDER_CONGRESS_PARTICIPATIONS, id, dataId],
        map: (item, { id }) => {
            item.codeholderId = id;
            item.dataId = Buffer.from(item.dataId).toString('hex');
            item.id = item.dataId;
        },
    }),
    congressParticipation: async ({ id, dataId }) => {
        // proxy task
        await tasks.congressParticipations({ id }, {
            jsonFilter: {
                filter: {
                    dataId: '==base64==' + Buffer.from(dataId, 'hex').toString('base64'),
                },
            },
        });
        return dataId;
    },
};

const CODEHOLDER_FETCH_BATCH_TIME = 50; // ms
const codeholderBatchIds = new Set();
const codeholderBatchFields = new Set();
const codeholderBatchCallbacks = new Set();
let flushCodeholdersTimeout;

function flushCodeholders () {
    flushCodeholdersTimeout = null;
    const ids = [...codeholderBatchIds];
    const fields = [...codeholderBatchFields];
    const callbacks = [...codeholderBatchCallbacks];
    codeholderBatchIds.clear();
    codeholderBatchFields.clear();
    codeholderBatchCallbacks.clear();

    if (!ids.length) return;

    tasks.list({}, {
        fields: fields.map(x => ({ id: x, sorting: 'none' })).concat([{ id: 'id', sorting: 'asc' }]),
        jsonFilter: {
            filter: {
                id: {
                    $in: ids,
                },
            },
        },
        limit: ids.length,
    }).then(res => {
        for (const callback of callbacks) callback(true, res.items);
    }).catch(err => {
        for (const callback of callbacks) callback(false, err);
    });
}

/** Fetches a codeholder’s details. Batches calls. */
function fetchCodeholderForView (id, fields) {
    if (id === 'self') {
        // can’t batch this one
        return tasks.codeholder({}, { id, fields });
    }
    if (codeholderBatchIds.size >= 100) {
        // we can only request 100 at once; flush now
        flushCodeholders();
    }
    codeholderBatchIds.add(+id);
    for (const field of fields) codeholderBatchFields.add(field);
    if (!flushCodeholdersTimeout) {
        flushCodeholdersTimeout = setTimeout(flushCodeholders, CODEHOLDER_FETCH_BATCH_TIME);
    }
    return new Promise((resolve, reject) => {
        codeholderBatchCallbacks.add((loaded, arg) => {
            if (loaded) {
                const items = arg;
                if (!items.includes(+id)) {
                    // id not found; codeholder doesn’t exist
                    const err = new Error(`codeholder ${id} does not exist`);
                    err.statusCode = 404;
                    reject(err);
                }
            } else {
                const error = arg;
                reject(error);
            }
        });
    });
}

export const views = {
    // FIXME: the following two views assume that permissions are **immutable**
    // however, this is not the case and we need to handle this at some point (maybe)
    // (edge cases don’t really seem to be a priority tbh so maybe never)
    /** codeholders/fields: lists available fields according to permissions */
    fields: class Fields extends AbstractDataView {
        constructor () {
            super();
            tasks.fields()
                .then(fields => this.emit('update', fields))
                .catch(err => this.emit('error', err));
        }
    },
    /** codeholders/fields: lists available filters according to permissions */
    filters: class Filters extends AbstractDataView {
        constructor () {
            super();
            tasks.filters()
                .then(fields => this.emit('update', fields))
                .catch(err => this.emit('error', err));
        }
    },
    /**
     * codeholders/codeholder: observes (and fetches) a codeholder
     *
     * # Options
     * - id: codeholder id
     * - fields: list of field ids to consider the minimal required set (will be fetched)
     * - noFetch: if true, will not fetch
     * - lazyFetch: if true, will only fetch if the data is missing
     */
    codeholder: class CodeholderView extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id === 'self' ? store.get(LOGIN_ID) : id; // resolve id
            this.fields = fields;

            store.subscribe([CODEHOLDERS, this.id], this.#onUpdate);
            const current = store.get([CODEHOLDERS, this.id]);
            if (current) setImmediate(this.#onUpdate);

            let shouldFetch = !options.noFetch;
            if (options.lazyFetch) {
                shouldFetch = false;
                for (const field of options.fields) {
                    if (!current || !current[field]) {
                        shouldFetch = true;
                        break;
                    }
                }
            }

            // Note that this specifically uses the id argument and not this.id so that we’re
            // fetching `self` instead of the resolved id if id is set to `self`
            if (shouldFetch) {
                fetchCodeholderForView(id, fields).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([CODEHOLDERS, this.id]), 'delete');
            } else {
                this.emit('update', store.get([CODEHOLDERS, this.id]));
            }
        };

        drop () {
            store.unsubscribe([CODEHOLDERS, this.id], this.#onUpdate);
        }
    },

    codeholderFile: class CodeholderFile extends AbstractDataView {
        constructor ({ id, codeholderId, noFetch }) {
            super();
            this.codeholderId = codeholderId === 'self' ? store.get(LOGIN_ID) : codeholderId; // resolve id
            this.id = id;
            store.subscribe([CODEHOLDER_FILES, this.codeholderId, this.id], this.#onUpdate);
            const current = store.get([CODEHOLDER_FILES, this.codeholderId, this.id]);
            if (current) setImmediate(this.#onUpdate);

            if (!noFetch) {
                tasks.codeholderFile({ id: codeholderId, file: id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([CODEHOLDER_FILES, this.codeholderId, this.id]), 'delete');
            } else {
                this.emit('update', store.get([CODEHOLDER_FILES, this.codeholderId, this.id]));
            }
        };
        drop () {
            store.unsubscribe([CODEHOLDER_FILES, this.codeholderId, this.id]);
        }
    },

    permissions: class CodeholderPerms extends AbstractDataView {
        constructor ({ id, noFetch }) {
            super();
            this.id = id === 'self' ? store.get(LOGIN_ID) : id; // resolve id
            store.subscribe([CODEHOLDER_PERMS, this.id], this.#onUpdate);
            const current = store.get([CODEHOLDER_PERMS, this.id]);
            if (current) setImmediate(this.#onUpdate);

            if (!noFetch) {
                tasks.permissions({ id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = () => this.emit('update', store.get([CODEHOLDER_PERMS, this.id]));
        drop () {
            store.unsubscribe([CODEHOLDER_PERMS, this.id]);
        }
    },

    changeRequest: simpleDataView({
        storePath: ({ id }) => [CODEHOLDER_CHGREQS, id],
        get: tasks.changeRequest,
    }),

    delegation: simpleDataView({
        storePath: ({ id, org }) => org ? [CODEHOLDER_DELEGATIONS, id, org] : [CODEHOLDER_DELEGATIONS, ...id.split('~')],
        get: tasks.delegations,
    }),

    congressParticipation: simpleDataView({
        storePath: ({ id, codeholder }) => [CODEHOLDER_CONGRESS_PARTICIPATIONS, codeholder, id],
        get: tasks.congressParticipation,
    }),

    /** codeholders/sigCodeholders: observes codeholders for client-side changes */
    sigCodeholders: createStoreObserver([CODEHOLDERS, SIG_CODEHOLDERS]),

    /**
     * codeholders/codeholderSigFiles: observes codeholder files for client-side changes
     *
     * # Options
     * - id: codeholder id
     */
    codeholderSigFiles: createStoreObserver(({ id }) => [CODEHOLDERS, id, SIG_FILES]),
    /**
     * codeholders/codeholderSigMemberships: observes codeholder memberships for client-side changes
     *
     * # Options
     * - id: codeholder id
     */
    codeholderSigMemberships: createStoreObserver(({ id }) => [CODEHOLDERS, id, SIG_MEMBERSHIPS]),
    /**
     * codeholders/codeholderSigRoles: observes codeholder roles for client-side changes
     *
     * # Options
     * - id: codeholder id
     */
    codeholderSigRoles: createStoreObserver(({ id }) => [CODEHOLDERS, id, SIG_ROLES]),

    sigDelegations: createStoreObserver([CODEHOLDER_DELEGATIONS, SIG_DELEGATIONS]),
};
