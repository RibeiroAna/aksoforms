import ipaddr from 'ipaddr.js';
import asyncClient from '../client';
import { AbstractDataView } from '../view';
import * as store from '../store';
import { makeParametersToRequestData, makeClientFromAPI, filtersToAPI } from '../list';
import { deepMerge } from '../../util';

export const HTTP_LOG = 'httpLog';

const clientFields = {
    id: 'id',
    time: 'time',
    identity: {
        apiFields: ['codeholderId', 'apiKey'],
        fromAPI: request => {
            if (request.codeholderId !== null) {
                return { type: 'codeholder', id: request.codeholderId };
            } else if (request.apiKey !== null) {
                return { type: 'apiKey', id: request.apiKey };
            } else {
                return { type: 'none' };
            }
        },
        toAPI: value => {
            const request = {};
            if (value && value.type === 'codeholder') request.codeholderId = value.id;
            else if (value && value.type === 'apiKey') request.apiKey = value.id;
            return request;
        },
    },
    ip: 'ip',
    origin: 'origin',
    userAgent: 'userAgent',
    userAgentParsed: 'userAgentParsed',
    method: 'method',
    path: 'path',
    query: 'query',
    resStatus: 'resStatus',
    resTime: 'resTime',
    resLocation: 'resLocation',
};

const clientFilters = {
    codeholders: {
        toAPI: value => ({
            codeholderId: { $in: value },
        }),
    },
    time: {
        toAPI: ([a, b]) => ({
            time: { $gte: (+a / 1e3) | 0, $lte: (+b / 1e3) | 0 },
        }),
    },
    apiKey: {
        toAPI: value => {
            return {
                apiKey: '==base64==' + Buffer.from(value, 'hex').toString('base64'),
            };
        },
    },
    ip: {
        toAPI: value => {
            const ipArray = ipaddr.parse(value).toByteArray();
            return { ip: '==base64==' + Buffer.from(ipArray).toString('base64') };
        },
    },
    origin: { toAPI: value => ({ origin: value }) },
    method: { toAPI: value => ({ method: value }) },
    path: {
        toAPI: value => value.type === 'invert'
            ? { $not: { path: { $pre: value.path } } }
            : value.type === 'prefix'
                ? { path: { $pre: value.path } }
                : { path: value.path },
    },
    resStatus: { toAPI: value => ({ resStatus: value }) },
    resTime: { toAPI: value => ({ resTime: { $range: value } }) },
};

const parametersToRequestData = makeParametersToRequestData({
    searchFieldToTransientFields: [],
    clientFields,
    clientFilters,
});

const clientFromAPI = makeClientFromAPI(clientFields);

export const tasks = {
    /**
     * httpLog/list: fetches log items
     *
     * See codeholders/list for parameters and return value format.
     */
    list: async (_, parameters) => {
        const client = await asyncClient;

        const { options, usedFilters, transientFields } = parametersToRequestData(parameters);

        const result = await client.get('/http_log', options);
        let list = result.body;
        const totalItems = +result.res.headers.get('x-total-items');

        for (const item of list) {
            const existing = store.get([HTTP_LOG, item.id]);
            store.insert([HTTP_LOG, item.id], deepMerge(existing, clientFromAPI(item)));
        }

        list = list.map(item => item.id);

        return {
            items: list,
            total: totalItems,
            transientFields,
            stats: {
                time: result.resTime,
                filtered: usedFilters,
            },
        };
    },
    /** httpLog/filtersToAPI: converts client filters to API filters */
    filtersToAPI: async ({ filters }) => {
        return filtersToAPI(clientFilters, filters);
    },
};

export const views = {
    /**
     * httpLog/request: observes (and fetches) a request
     *
     * # Options
     * - id: request id
     * - fields: list of field ids to consider the minimal required set (will be fetched)
     * - noFetch: if true, will not fetch
     * - lazyFetch: if true, will only fetch if the data is missing
     */
    request: class RequestView extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([HTTP_LOG, this.id], this.#onUpdate);
            const current = store.get([HTTP_LOG, this.id]);
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
                tasks.list({}, {
                    jsonFilter: {
                        filter: { id },
                    },
                    fields: fields.map(field => ({ id: field, sorting: 'none' })),
                    limit: 1,
                }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([HTTP_LOG, this.id]), 'delete');
            } else {
                this.emit('update', store.get([HTTP_LOG, this.id]));
            }
        };

        drop () {
            store.unsubscribe([HTTP_LOG, this.id], this.#onUpdate);
        }
    },
};
