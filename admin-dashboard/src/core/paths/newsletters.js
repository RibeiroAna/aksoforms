import asyncClient from '../client';
import { crudList, crudCreate, crudGet, crudUpdate, crudDelete, simpleDataView } from '../templates';
import { createStoreObserver } from '../view';

const NEWSLETTERS = 'newsletters';
const SIG_NEWSLETTERS = '!newsletters';
const NEWSLETTER_UNSUBS = 'newsletter_unsubs';

export const tasks = {
    list: crudList({
        apiPath: () => `/newsletters`,
        fields: [
            'id',
            'org',
            'name',
            'description',
            'public',
            'numSubscribers',
        ],
        storePath: (_, item) => [NEWSLETTERS, item.id],
    }),
    newsletter: crudGet({
        apiPath: ({ id }) => `/newsletters/${id}`,
        fields: [
            'id',
            'org',
            'name',
            'description',
            'public',
            'numSubscribers',
        ],
        storePath: ({ id }) => [NEWSLETTERS, id],
    }),
    create: crudCreate({
        apiPath: () => `/newsletters`,
        fields: ['org', 'name', 'description', 'public'],
        storePath: (_, id) => [NEWSLETTERS, id],
        signalPath: () => [NEWSLETTERS, SIG_NEWSLETTERS],
    }),
    update: crudUpdate({
        apiPath: ({ id }) => `/newsletters/${id}`,
        storePath: ({ id }) => [NEWSLETTERS, id],
    }),
    delete: crudDelete({
        apiPath: ({ id }) => `/newsletters/${id}`,
        storePath: ({ id }) => [NEWSLETTERS, id],
        signalPath: () => [NEWSLETTERS, SIG_NEWSLETTERS],
    }),

    listUnsubscriptions: crudList({
        apiPath: ({ newsletter }) => `/newsletters/${newsletter}/unsubscriptions`,
        fields: [
            'id',
            'reason',
            'description',
            'time',
            'subscriberCount',
        ],
        storePath: ({ newsletter }, item) => [NEWSLETTER_UNSUBS, newsletter, item.id],
    }),

    send: async ({ newsletter }, { template, deleteOnComplete, additionalParams }) => {
        const client = await asyncClient;
        await client.post(`/newsletters/${newsletter}/!send_notif_template`, {
            notifTemplateId: template,
            deleteTemplateOnComplete: !!deleteOnComplete,
            ...(additionalParams || {}),
        }, {});
    },
};

export const views = {
    newsletter: simpleDataView({
        storePath: ({ id }) => [NEWSLETTERS, id],
        get: ({ id }) => tasks.newsletter({ id }),
        canBeLazy: true,
    }),
    sigNewsletters: createStoreObserver([NEWSLETTERS, SIG_NEWSLETTERS]),

    unsubscription: simpleDataView({
        storePath: ({ newsletter, id }) => [NEWSLETTER_UNSUBS, newsletter, id],
        canBeLazy: true,
    }),
};
