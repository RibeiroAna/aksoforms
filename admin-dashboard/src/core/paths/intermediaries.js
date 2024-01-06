import { crudList, crudCreate, crudGet, crudDelete, simpleDataView } from '../templates';
import { createStoreObserver } from '../view';

export const INTERMEDIARIES = 'intermediaries';
export const SIG_INTERMEDIARIES = '!intermediaries';

export const tasks = {
    list: crudList({
        apiPath: () => `/intermediaries`,
        fields: ['countryCode', 'codeholders'],
        map: (item) => (item.id = item.countryCode),
        storePath: (_, item) => [INTERMEDIARIES, item.id],
    }),
    intermediary: crudGet({
        apiPath: ({ id }) => `/intermediaries/${id}`,
        fields: ['countryCode', 'codeholders'],
        map: (item) => (item.id = item.countryCode),
        storePath: ({ id }) => [INTERMEDIARIES, id],
    }),
    create: async (options, params) => {
        if (!options._allowDup) {
            // check if it already exists
            try {
                await tasks.intermediary({ id: params.countryCode });
                throw { code: 'object-exists', message: 'An intermediary for that country already exists!' };
            } catch (err) {
                if (err && err.statusCode === 404) {
                    // all good
                } else {
                    throw err;
                }
            }
        }

        return await crudCreate({
            apiPath: (_, params) => `/intermediaries/${encodeURIComponent(params.countryCode)}`,
            fields: ['codeholders'],
            idField: 'countryCode',
            storePath: (_, id) => [INTERMEDIARIES, id],
            signalPath: () => [INTERMEDIARIES, SIG_INTERMEDIARIES],
            methodName: 'put',
            parseId: (id, options, params) => encodeURIComponent(params.countryCode),
        })(options, params);
    },
    update: (options, params) => tasks.create({ ...options, _allowDup: true }, params),
    delete: crudDelete({
        apiPath: ({ id }) => `/intermediaries/${id}`,
        storePath: ({ id }) => [INTERMEDIARIES, id],
        signalPath: () => [INTERMEDIARIES, SIG_INTERMEDIARIES],
    }),

};

export const views = {
    intermediary: simpleDataView({
        storePath: ({ id }) => [INTERMEDIARIES, id],
        get: ({ id }) => tasks.intermediary({ id }),
    }),
    sigIntermediaries: createStoreObserver([INTERMEDIARIES, SIG_INTERMEDIARIES]),
};
