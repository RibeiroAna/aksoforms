import { base32 } from 'rfc4648';
import asyncClient from '../client';
import * as store from '../store';
import { deepMerge } from '../../util';
import { AbstractDataView, createStoreObserver } from '../view';
import {
    crudCreate,
    crudDelete,
    crudGet,
    crudList,
    crudUpdate,
    simpleDataView,
} from '../templates';
import { makeParametersToRequestData, makeClientFromAPI, makeClientToAPI, filtersToAPI } from '../list';

export const PAYMENT_ORGS = 'paymentOrgs';
export const SIG_PAYMENT_ORGS = '!paymentOrgs';
export const PO_DATA = 'poData';
export const PO_ADDONS = 'poAddons';
export const SIG_PO_ADDONS = '!poAddons';
export const PO_METHODS = 'poMethods';
export const SIG_PO_METHODS = '!poMethods';
export const PAYMENT_INTENTS = 'paymentIntents';
export const SIG_PAYMENT_INTENTS = '!paymentIntents';
export const EXCHANGE_RATES = 'exchRates';

//! # Data structure
//! ```
//! PAYMENT_ORGS
//! |- [org id]
//!    |- PO_DATA
//!    |  |- (org data)
//!    |- PO_ADDONS
//!    |  |- [addon id]
//!    |     |- ...
//!    |- PO_METHODS
//!       |- [method id]
//!          |- ...
//! PAYMENT_INTENTS
//! |- [intent id]
//!    |- ...
//! ```


function iReadId (idBuffer) {
    if (!idBuffer) return idBuffer;
    return base32.stringify(idBuffer);
}

// intents stuff
const iClientFields = {
    id: {
        apiFields: ['id'],
        fromAPI: intent => iReadId(intent.id),
        toAPI: () => ({}),
    },
    customer: {
        apiFields: ['codeholderId', 'customer.email', 'customer.name'],
        fromAPI: intent => intent.customer ? ({
            id: intent.codeholderId,
            email: intent.customer.email,
            name: intent.customer.name,
        }) : undefined,
        toAPI: customer => {
            if (customer) {
                const { id, email, name } = customer;
                return {
                    customer: { email, name },
                    codeholderId: id,
                };
            } else {
                return { customer: null };
            }
        },
    },
    method: {
        apiFields: ['paymentMethod'],
        fromAPI: intent => intent.paymentMethod,
        toAPI: ({ id }) => ({ paymentMethodId: id }),
    },
    org: 'org',
    paymentOrg: 'paymentOrgId',
    currency: 'currency',
    status: 'status',
    events: 'events',
    timeCreated: 'timeCreated',
    statusTime: 'statusTime',
    internalNotes: 'internalNotes',
    customerNotes: 'customerNotes',
    foreignId: 'foreignId',
    stripePaymentIntentId: 'stripePaymentIntentId',
    purposes: {
        apiFields: ['purposes'],
        fromAPI: intent => {
            if (!intent.purposes) return undefined;
            const purposes = [];
            for (const apiPurpose of intent.purposes) {
                const purpose = apiPurpose;
                if (purpose.type === 'trigger') {
                    if ('dataId' in purpose) purpose.dataId = Buffer.from(purpose.dataId).toString('hex');
                    if ('registrationEntryId' in purpose) purpose.dataId = iReadId(purpose.registrationEntryId);
                }
                purposes.push(purpose);
            }
            return purposes;
        },
        toAPI: purposes => {
            const apiPurposes = [];
            for (const purpose of purposes) {
                let apiPurpose = purpose;
                if (purpose.type === 'trigger') {
                    apiPurpose = { ...purpose };
                    delete apiPurpose.dataId;
                    if (apiPurpose.triggers === 'congress_registration') apiPurpose.dataId = Buffer.from(purpose.dataId, 'hex');
                    else if (apiPurpose.triggers === 'registration_entry') apiPurpose.registrationEntryId = base32.parse(purpose.dataId, { out: Buffer.allocUnsafe });
                }
                apiPurposes.push(apiPurpose);
            }
            return { purposes: apiPurposes };
        },
    },
    totalAmount: {
        apiFields: ['totalAmount'],
        fromAPI: intent => intent.totalAmount,
        toAPI: totalAmount => ({ totalAmount }),
        requires: ['currency'],
    },
    amountRefunded: 'amountRefunded',
    createdBy: 'createdBy',
    intermediary: {
        apiFields: ['intermediaryCountryCode', 'intermediaryIdentifier.year', 'intermediaryIdentifier.number'],
        fromAPI: intent => intent.intermediaryCountryCode ? ({
            country: intent.intermediaryCountryCode,
            year: intent.intermediaryIdentifier?.year,
            number: intent.intermediaryIdentifier?.number,
        }) : ('intermediaryCountryCode' in intent) ? null : undefined,
        toAPI: (intermediary) => {
            if (!intermediary) return {};
            const { country, year, number } = intermediary;
            return {
                intermediaryCountryCode: country || null,
                intermediaryIdentifier: (year || typeof number === 'number') ? ({ year, number }) : null,
            };
        },
    },
};
const iClientFilters = {
    customerName: {
        toAPI: value => ({ 'customer.name': { $pre: value } }),
    },
    customerEmail: {
        toAPI: value => ({ 'customer.email': value }),
    },
    paymentOrg: {
        toAPI: value => ({ paymentOrgId: value }),
    },
    paymentMethod: {
        toAPI: value => ({ paymentMethodId: value }),
    },
    org: {
        toAPI: value => ({ org: value }),
    },
    currencies: {
        toAPI: value => ({ currency: { $in: value } }),
    },
    status: {
        toAPI: value => ({ status: { $in: value } }),
    },
    purposeType: {
        toAPI: value => ({ $purposes: { type: value } }),
    },
    purposeInvalid: {
        toAPI: value => ({ $purposes: { invalid: value } }),
    },
    purposeTrigger: {
        toAPI: value => ({ $purposes: { triggers: value } }),
    },
    purposeTriggerStatus: {
        toAPI: value => ({ $purposes: { triggerStatus: value } }),
    },
    purposeDataId: {
        toAPI: value => {
            const conditions = [];
            {
                const buf = Buffer.from(value, 'hex');
                if (buf.length) {
                    conditions.push({
                        $purposes: {
                            dataId: '==base64==' + buf.toString('base64'),
                        },
                    });
                }
            }

            try {
                conditions.push({
                    $purposes: {
                        dataId: '==base64==' + Buffer.from(base32.parse(value)).toString('base64'),
                    },
                });
            } catch { /* whatever */ }

            if (!conditions.length) throw new Error('invalid data id');
            return { $or: conditions };
        },
    },
    timeCreated: { toAPI: range => ({ timeCreated: { $range: [range[0] / 1000, range[1] / 1000] } }) },
    statusTime: { toAPI: range => ({ statusTime: { $range: [range[0] / 1000, range[1] / 1000] } }) },
    succeededTime: { toAPI: range => ({ succeededTime: { $range: [range[0] / 1000, range[1] / 1000] } }) },
    refundedTime: { toAPI: range => ({ refundedTime: { $range: [range[0] / 1000, range[1] / 1000] } }) },
};

const iSearchFieldToTransientFields = {
    customerEmail: ['customer'],
    customerName: ['customer'],
};
const iParametersToRequestData = makeParametersToRequestData({
    searchFieldToTransientFields: iSearchFieldToTransientFields,
    mapSearchField: field => {
        if (field === 'customerEmail') return 'customer.email';
        if (field === 'customerName') return 'customer.name';
        return field;
    },
    clientFields: iClientFields,
    clientFilters: iClientFilters,
});
const iClientFromAPI = makeClientFromAPI(iClientFields);
const iClientToAPI = makeClientToAPI(iClientFields);
const INTENT_ALLOWED_PATCH_FIELDS = [
    'codeholderId',
    'customer',
    'internalNotes',
    'customerNotes',
    'foreignId',
];

export const tasks = {
    listOrgs: crudList({
        apiPath: () => `/aksopay/payment_orgs`,
        fields: ['id', 'org', 'name', 'description'],
        storePath: (_, { id }) => [PAYMENT_ORGS, id, PO_DATA],
    }),
    createOrg: crudCreate({
        apiPath: () => `/aksopay/payment_orgs`,
        fields: ['org', 'name', 'description'],
        omitNulls: true,
        storePath: (_, id) => [PAYMENT_ORGS, id, PO_DATA],
        signalPath: () => [PAYMENT_ORGS, SIG_PAYMENT_ORGS],
    }),
    getOrg: crudGet({
        apiPath: ({ id }) => `/aksopay/payment_orgs/${id}`,
        fields: ['id', 'org', 'name', 'description'],
        storePath: ({ id }) => [PAYMENT_ORGS, id, PO_DATA],
    }),
    updateOrg: crudUpdate({
        apiPath: ({ id }) => `/aksopay/payment_orgs/${id}`,
        storePath: ({ id }) => [PAYMENT_ORGS, id, PO_DATA],
    }),
    deleteOrg: crudDelete({
        apiPath: ({ id }) => `/aksopay/payment_orgs/${id}`,
        storePaths: ({ id }) => [
            [PAYMENT_ORGS, id, PO_DATA],
            [PAYMENT_ORGS, id, PO_ADDONS],
            [PAYMENT_ORGS, id, PO_METHODS],
            [PAYMENT_ORGS, id],
        ],
        signalPath: () => [PAYMENT_ORGS, SIG_PAYMENT_ORGS],
    }),
    listAddons: crudList({
        apiPath: ({ org }) => `/aksopay/payment_orgs/${org}/addons`,
        fields: ['id', 'name', 'description'],
        storePath: ({ org }, { id }) => [PAYMENT_ORGS, org, PO_ADDONS, id],
    }),
    createAddon: crudCreate({
        apiPath: ({ org }) => `/aksopay/payment_orgs/${org}/addons`,
        fields: ['name', 'description'],
        useAutoNull: true,
        storePath: ({ org }, id) => [PAYMENT_ORGS, org, PO_ADDONS, id],
        signalPath: ({ org }) => [PAYMENT_ORGS, org, SIG_PO_ADDONS],
    }),
    getAddon: crudGet({
        apiPath: ({ org, id }) => `/aksopay/payment_orgs/${org}/addons/${id}`,
        fields: ['id', 'name', 'description'],
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_ADDONS, id],
    }),
    updateAddon: crudUpdate({
        apiPath: ({ org, id }) => `/aksopay/payment_orgs/${org}/addons/${id}`,
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_ADDONS, id],
    }),
    deleteAddon: crudDelete({
        apiPath: ({ org, id }) => `/aksopay/payment_orgs/${org}/addons/${id}`,
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_ADDONS, id],
        signalPath: ({ org }) => [PAYMENT_ORGS, org, SIG_PO_ADDONS],
    }),
    listMethods: crudList({
        apiPath: ({ org }) => `/aksopay/payment_orgs/${org}/methods`,
        fields: ['id', 'type', 'name', 'internalDescription', 'internal'],
        storePath: ({ org }, { id }) => [PAYMENT_ORGS, org, PO_METHODS, id],
    }),
    createMethod: crudCreate({
        apiPath: ({ org }) => `/aksopay/payment_orgs/${org}/methods`,
        fields: [
            'type', 'stripeMethods', 'name', 'internalDescription', 'descriptionPreview',
            'description', 'currencies', 'paymentValidity', 'isRecommended', 'stripePublishableKey',
            'stripeSecretKey', 'feePercent', 'feeFixed', 'internal', 'prices', 'maxAmount',
            'thumbnail',
        ],
        storePath: ({ org }, id) => [PAYMENT_ORGS, org, PO_METHODS, id],
        signalPath: ({ org }) => [PAYMENT_ORGS, org, SIG_PO_METHODS],
    }),
    getMethod: crudGet({
        apiPath: ({ org, id }) => `/aksopay/payment_orgs/${org}/methods/${id}`,
        fields: [
            'id', 'type', 'stripeMethods', 'name', 'internalDescription', 'descriptionPreview',
            'description', 'currencies', 'paymentValidity', 'isRecommended',
            'stripePublishableKey', 'feePercent', 'feeFixed.val', 'feeFixed.cur',
            'internal', 'prices', 'maxAmount', 'thumbnail',
        ],
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_METHODS, id],
    }),
    updateMethod: crudUpdate({
        apiPath: ({ org, id }) => `/aksopay/payment_orgs/${org}/methods/${id}`,
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_METHODS, id],
    }),
    deleteMethod: crudDelete({
        apiPath: ({ org, id }) => `/aksopay/payment_orgs/${org}/methods/${id}`,
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_METHODS, id],
        signalPath: ({ org }) => [PAYMENT_ORGS, org, SIG_PO_METHODS],
    }),
    updateMethodThumbnail: async ({ org, id }, { thumbnail }) => {
        const client = await asyncClient;
        await client.put(`/aksopay/payment_orgs/${org}/methods/${id}/thumbnail`, null, {}, [{
            name: 'thumbnail',
            type: thumbnail.type,
            value: thumbnail,
        }]);

        // update in background
        tasks.getMethod({ org, id });
    },
    deleteMethodThumbnail: async ({ org, id }) => {
        const client = await asyncClient;
        await client.delete(`/aksopay/payment_orgs/${org}/methods/${id}/thumbnail`);

        // update in background
        tasks.getMethod({ org, id });
    },

    // MARK - INTENTS
    listIntents: async (_, parameters) => {
        const client = await asyncClient;
        const { options, usedFilters, transientFields } = iParametersToRequestData(parameters);
        const result = await client.get('/aksopay/payment_intents', options);
        const list = result.body;
        const totalItems = +result.res.headers.get('x-total-items');

        const items = [];

        for (const item of list) {
            const id = iReadId(item.id);
            const existing = store.get([PAYMENT_INTENTS, id]);
            store.insert([PAYMENT_INTENTS, id], deepMerge(existing, iClientFromAPI(item)));
            items.push(id);
        }

        return {
            items,
            total: totalItems,
            transientFields,
            stats: {
                time: result.resTime,
                filtered: usedFilters,
            },
        };
    },
    listPaymentIntents: (_, { jsonFilter, ...parameters }) => {
        const notIntermediaryFilter = { intermediaryCountryCode: null };

        return tasks.listIntents(_, {
            jsonFilter: {
                filter: (jsonFilter && !jsonFilter._disabled)
                    ? { $and: [jsonFilter.filter, notIntermediaryFilter] }
                    : notIntermediaryFilter,
            },
            ...parameters,
        });
    },
    listIntermediaryIntents: (_, { jsonFilter, ...parameters }) => {
        const intermediaryFilter = { $not: { intermediaryCountryCode: null } };

        return tasks.listIntents(_, {
            jsonFilter: {
                filter: (jsonFilter && !jsonFilter._disabled)
                    ? { $and: [jsonFilter.filter, intermediaryFilter] }
                    : intermediaryFilter,
            },
            ...parameters,
        });
    },

    createIntent: async (_, params) => {
        const client = await asyncClient;
        let res;
        try {
            res = await client.post('/aksopay/payment_intents', iClientToAPI(params));
        } catch (err) {
            if (err.statusCode === 417) {
                throw { code: 'payment-exceeds-max', message: 'Exceeds max allowed transaction amount' };
            }
            throw err;
        }
        const id = res.res.headers.get('x-identifier');
        store.insert([PAYMENT_INTENTS, id], params);
        store.signal([PAYMENT_INTENTS, SIG_PAYMENT_INTENTS]);
        return id;
    },
    getIntent: async ({ id }, { fields }) => {
        const client = await asyncClient;
        const res = await client.get(`/aksopay/payment_intents/${id}`, {
            fields: ['id'].concat(fields.flatMap(id => typeof iClientFields[id] === 'string'
                ? [iClientFields[id]]
                : iClientFields[id].apiFields)),
        });

        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, iClientFromAPI(res.body)));

        return store.get([PAYMENT_INTENTS, id]);
    },
    updateIntent: async ({ id }, params) => {
        const client = await asyncClient;
        const data = iClientToAPI(params);

        for (const k in data) {
            if (!INTENT_ALLOWED_PATCH_FIELDS.includes(k)) {
                delete data[k];
            }
        }

        await client.patch(`/aksopay/payment_intents/${id}`, data);
        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, params));
    },
    cancelIntent: async ({ id }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${id}/!cancel`);
        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, { status: 'canceled' }));
        // event log should be updated
        tasks.getIntent({ id }, { fields: ['events'] }).catch(() => {});
    },
    markIntentDisputed: async ({ id }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${id}/!mark_disputed`);
        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, { status: 'disputed' }));
        // event log should be updated
        tasks.getIntent({ id }, { fields: ['events'] }).catch(() => {});
    },
    markIntentRefunded: async ({ id }, { amount }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${id}/!mark_refunded`, {
            totalRefund: amount,
        });
        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, {
            status: 'refunded',
            amountRefunded: amount,
        }));
        // event log should be updated
        tasks.getIntent({ id }, { fields: ['events'] }).catch(() => {});
    },
    markIntentSucceeded: async ({ id }, { sendReceipt }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${id}/!mark_succeeded`, {
            sendReceipt: !!sendReceipt,
        });
        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, { status: 'succeeded' }));
        // event log should be updated
        tasks.getIntent({ id }, { fields: ['events'] }).catch(() => {});
    },
    submitIntent: async ({ id }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${id}/!submit`);
        const existing = store.get([PAYMENT_INTENTS, id]);
        store.insert([PAYMENT_INTENTS, id], deepMerge(existing, { status: 'submitted' }));
        // event log should be updated
        tasks.getIntent({ id }, { fields: ['events'] }).catch(() => {});
    },
    resendIntentReceipt: async ({ id }, { email }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${id}/!send_receipt`, {
            email,
        });
    },
    setIntentPurposeValidity: async ({ intent, purpose }, { invalid }) => {
        const client = await asyncClient;
        await client.post(`/aksopay/payment_intents/${intent}/!set_purpose_validity`, {
            purposeIndex: purpose,
            invalid,
        });
        // reset purposes field
        store.insert([PAYMENT_INTENTS, intent, 'purposes'], undefined);
        // update
        tasks.getIntent({ id: intent }, { fields: ['purposes'] }).catch(() => {});
    },

    report: async (_, { time, currency }) => {
        const client = await asyncClient;

        const res = await client.get('/aksopay/payment_intents/balance_report', {
            time: time.join('-'),
            currency,
        });

        return res.body;
    },

    iFiltersToAPI: async ({ filters }) => {
        return filtersToAPI(iClientFilters, filters);
    },

    exchangeRates: async ({ base }) => {
        const client = await asyncClient;
        const res = await client.get('/aksopay/exchange_rates', { base });
        store.insert([EXCHANGE_RATES, base], res.body);
        return res.body;
    },
};
export const views = {
    org: simpleDataView({
        storePath: ({ id }) => [PAYMENT_ORGS, id, PO_DATA],
        get: tasks.getOrg,
    }),

    addon: simpleDataView({
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_ADDONS, id],
        get: tasks.getAddon,
    }),

    method: simpleDataView({
        storePath: ({ org, id }) => [PAYMENT_ORGS, org, PO_METHODS, id],
        get: tasks.getMethod,
    }),

    intent: class Intent extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([PAYMENT_INTENTS, this.id], this.#onUpdate);
            const current = store.get([PAYMENT_INTENTS, this.id]);
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

            if (shouldFetch) {
                tasks.getIntent({ id }, { fields }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([PAYMENT_INTENTS, this.id]), 'delete');
            } else {
                this.emit('update', store.get([PAYMENT_INTENTS, this.id]));
            }
        };

        drop () {
            store.unsubscribe([PAYMENT_INTENTS, this.id], this.#onUpdate);
        }
    },

    exchangeRates: simpleDataView({
        storePath: ({ base }) => [EXCHANGE_RATES, base],
        get: tasks.exchangeRates,
        canBeLazy: true,
    }),

    sigOrgs: createStoreObserver([PAYMENT_ORGS, SIG_PAYMENT_ORGS]),
    sigAddons: createStoreObserver(({ org }) => [PAYMENT_ORGS, org, SIG_PO_ADDONS]),
    sigMethods: createStoreObserver(({ org }) => [PAYMENT_ORGS, org, SIG_PO_METHODS]),
    sigIntents: createStoreObserver([PAYMENT_INTENTS, SIG_PAYMENT_INTENTS]),
};
