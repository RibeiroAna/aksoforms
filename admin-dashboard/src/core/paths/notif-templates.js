import asyncClient from '../client';
import * as store from '../store';
import { deepMerge } from '../../util';
import { AbstractDataView, createStoreObserver } from '../view';
import { makeParametersToRequestData, makeClientFromAPI, makeClientToAPI } from '../list';
import { simpleDataView } from '../templates';

const NOTIF_TEMPLATES = 'notifTemplates';
const NOTIF_EMAIL_DOMAINS = 'notifEmailDomains';
const SIG_NOTIF_TEMPLATES = '!notifTemplates';

const clientFields = {
    org: 'org',
    base: 'base',
    name: 'name',
    description: 'description',
    intent: 'intent',
    script: 'script',
    subject: 'subject',
    from: 'from',
    fromName: 'fromName',
    replyTo: 'replyTo',
    html: 'html',
    text: 'text',
    modules: 'modules',
};
// fields that will be copied when duplicating a template
const DUPLICATE_FIELDS = [
    'org',
    'base',
    'name',
    'description',
    'intent',
    'script',
    'subject',
    'from',
    'fromName',
    'replyTo',
];
const DUPLICATE_FIELDS_RAW = ['html', 'text'];
const DUPLICATE_FIELDS_INHERIT = ['modules'];
const parametersToRequestData = makeParametersToRequestData({
    clientFields,
    clientFilters: {
        // TODO
    },
});
const clientFromAPI = makeClientFromAPI(clientFields);
const clientToAPI = makeClientToAPI(clientFields);

export const tasks = {
    list: async (_, parameters) => {
        const client = await asyncClient;
        const { options, usedFilters, transientFields } = parametersToRequestData(parameters);
        const result = await client.get('/notif_templates', options);
        const list = result.body;
        const totalItems = +result.res.headers.get('x-total-items');

        const items = [];

        for (const item of list) {
            const id = item.id;
            const existing = store.get([NOTIF_TEMPLATES, id]);
            store.insert([NOTIF_TEMPLATES, id], deepMerge(existing, clientFromAPI(item)));
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
    create: async (_, parameters) => {
        const client = await asyncClient;
        const res = await client.post('/notif_templates', clientToAPI(parameters));
        const id = res.res.headers.get('x-identifier');
        store.insert([NOTIF_TEMPLATES, id], parameters);
        store.signal([NOTIF_TEMPLATES, SIG_NOTIF_TEMPLATES]);
        return id;
    },
    template: async ({ id }, { fields }) => {
        const client = await asyncClient;
        fields = fields.map(item => item?.id || item);

        for (const id of fields) if (!clientFields[id]) throw { code: 'unknown-field', message: `unknown field ${id}`, extra: { field: id } };
        const res = await client.get(`/notif_templates/${id}`, {
            fields: ['id'].concat(fields.flatMap(id => typeof clientFields[id] === 'string'
                ? [clientFields[id]]
                : clientFields[id].apiFields)),
        });

        const existing = store.get([NOTIF_TEMPLATES, id]);
        store.insert([NOTIF_TEMPLATES, id], deepMerge(existing, clientFromAPI(res.body)));

        return +id;
    },
    duplicate: async ({ id }) => {
        const client = await asyncClient;
        const allFields = DUPLICATE_FIELDS.concat(DUPLICATE_FIELDS_RAW).concat(DUPLICATE_FIELDS_INHERIT);
        const source = await client.get(`/notif_templates/${id}`, { fields: allFields });

        const fields = DUPLICATE_FIELDS.concat(source.body.base === 'raw'
            ? DUPLICATE_FIELDS_RAW
            : DUPLICATE_FIELDS_INHERIT);

        const data = {};
        for (const f of fields) data[f] = source.body[f];

        const res = await client.post('/notif_templates', data);
        const newId = res.res.headers.get('x-identifier');
        store.insert([NOTIF_TEMPLATES, newId], clientFromAPI(data));
        store.signal([NOTIF_TEMPLATES, SIG_NOTIF_TEMPLATES]);
        return newId;
    },
    update: async ({ id }, parameters) => {
        const client = await asyncClient;
        const data = clientToAPI(parameters);
        // TODO: don't even serialize it instead of deleting it here
        delete data.id;
        delete data.org;
        delete data.base;
        delete data.intent;
        await client.patch(`/notif_templates/${id}`, data);
        const existing = store.get([NOTIF_TEMPLATES, id]);
        store.insert([NOTIF_TEMPLATES, id], deepMerge(existing, parameters));
    },
    delete: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/notif_templates/${id}`);
        store.remove([NOTIF_TEMPLATES, id]);
        store.signal([NOTIF_TEMPLATES, SIG_NOTIF_TEMPLATES]);
    },

    preview: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/notif_templates/${id}/render`);
        return res.body;
    },
    emailDomains: async () => {
        const client = await asyncClient;
        const res = await client.get(`/notif_templates/domains`);
        const domains = res.body;
        store.insert([NOTIF_EMAIL_DOMAINS], domains);
        return domains;
    },
};

export const views = {
    template: class NotifTemplate extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([NOTIF_TEMPLATES, this.id], this.#onUpdate);
            const current = store.get([NOTIF_TEMPLATES, this.id]);
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
                tasks.template({ id }, { fields }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([NOTIF_TEMPLATES, this.id]), 'delete');
            } else {
                this.emit('update', store.get([NOTIF_TEMPLATES, this.id]));
            }
        };

        drop () {
            store.unsubscribe([NOTIF_TEMPLATES, this.id], this.#onUpdate);
        }
    },

    emailDomains: simpleDataView({
        storePath: () => [NOTIF_EMAIL_DOMAINS],
        get: tasks.emailDomains,
        canBeLazy: true,
    }),

    sigTemplates: createStoreObserver([NOTIF_TEMPLATES, SIG_NOTIF_TEMPLATES]),
};
