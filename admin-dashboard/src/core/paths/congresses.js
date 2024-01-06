import { evaluate } from '@tejo/akso-script';
import asyncClient from '../client';
import { AbstractDataView, createStoreObserver } from '../view';
import * as store from '../store';
import {
    makeParametersToRequestData,
    fieldDiff,
    filtersToAPI,
    makeClientFromAPI,
    makeClientToAPI,
} from '../list';
import { deepMerge } from '../../util';
import { crudCreate, crudDelete, crudGet, crudList, crudUpdate } from '../templates';

export const CONGRESSES = 'congresses';
export const DATA = 'data';
export const DATA_MAP = 'map';
export const INSTANCES = 'instances';
export const LOC_TAGS = 'location_tags';
export const LOCATIONS = 'locations';
export const PROG_TAGS = 'program_tags';
export const PROGRAMS = 'programs';
export const REG_FORM = 'registration_form';
export const CONGRESS_PARTICIPANTS = 'congress_participants';
export const SIG_CONGRESSES = '!congresses';
export const SIG_INSTANCES = '!instances';
export const SIG_LOC_TAGS = '!location_tags';
export const SIG_LOCATIONS = '!locations';
export const SIG_PROG_TAGS = '!program_tags';
export const SIG_PROGRAMS = '!programs';
export const SIG_CONGRESS_PARTICIPANTS = '!participants';

const locClientFilters = {
    type: {
        toAPI: type => ({ type }),
    },
    externalLoc: {
        toAPI: locations => ({ externalLoc: { $in: locations } }),
    },
    open: {
        toAPI: open => ({ $open: open }),
    },
    tags: {
        toAPI: tags => ({ tags: { $hasAny: tags } }),
    },
};
const progClientFilters = {
    timeSlice: {
        toAPI: ([from, to]) => (from && to) ? ({
            $and: [
                { timeTo: { $gt: from } },
                { timeFrom: { $lt: to } },
            ],
        }) : from ? ({
            timeTo: { $gt: from },
        }) : to ? ({
            timeFrom: { $lt: to },
        }) : ({}),
    },
    location: {
        toAPI: locations => ({ location: { $in: locations } }),
    },
    tags: {
        toAPI: tags => ({ tags: { $hasAny: tags } }),
    },
};

/** Reads a congress participant's dataId into a string. */
function pReadId (idBuffer) {
    return Buffer.from(idBuffer).toString('hex');
}
// congress participants
const pClientFields = {
    dataId: {
        apiFields: ['dataId'],
        fromAPI: part => pReadId(part.dataId),
        toAPI: () => ({}),
    },
    identity: {
        apiFields: ['codeholderId'],
        fromAPI: (part, regForm) => {
            const res = { codeholder: part.codeholderId };
            if (regForm && part.data) {
                const evalScript = (n) => {
                    const getFVar = id => {
                        if (id in part.data) return part.data[id];
                        if (id === '@is_member') return !!part.codeholderId;
                        return null;
                    };
                    if (n.startsWith('@')) return getFVar(n.substr(1));
                    try {
                        const stack = regForm.form.filter(x => x.el === 'script').map(x => x.script);
                        let invocations = 0;
                        return evaluate(stack, n, getFVar, {
                            shouldHalt: () => invocations++ > 4096,
                        });
                    } catch (err) {
                        return null;
                    }
                };

                res.name = evalScript(regForm.identifierName);
                res.email = evalScript(regForm.identifierEmail);
            }
            return res;
        },
        toAPI: v => ({ codeholderId: v.codeholder || null }),
    },
    approved: 'approved',
    notes: 'notes',
    price: {
        apiFields: ['price'],
        fromAPI: part => part.price,
        toAPI: () => ({}),
    },
    paid: {
        apiFields: ['amountPaid', 'hasPaidMinimum'],
        fromAPI: part => ({ amount: part.amountPaid, hasPaidMinimum: part.hasPaidMinimum }),
        toAPI: () => ({}),
    },
    isValid: {
        apiFields: ['isValid'],
        fromAPI: part => part.isValid,
        toAPI: () => ({}),
    },
    sequenceId: 'sequenceId',
    cancelledTime: 'cancelledTime',
    createdTime: {
        apiFields: ['createdTime'],
        fromAPI: part => part.createdTime,
        toAPI: () => ({}),
    },
    editedTime: {
        apiFields: ['editedTime'],
        fromAPI: part => part.editedTime,
        toAPI: () => ({}),
    },
    checkInTime: 'checkInTime',
    data: {
        apiFields: ['data'],
        fromAPI: part => part.data,
        toAPI: data => {
            if (!data) return {};
            const { '@$disableValidation': allowInvalidData, ...innerData } = data;
            return { allowInvalidData: allowInvalidData || false, data: innerData };
        },
    },
    customFormVars: 'customFormVars',
};
const DERIVED_PARTICIPANT_FIELDS = ['isValid', 'editedTime', 'price', 'paid'];
const pClientFilters = {
    approval: {
        toAPI: approval => ({ approved: approval === 'true' ? true : false }),
    },
    canceled: {
        toAPI: canceled => ({ cancelledTime: canceled === 'true' ? { $neq: null } : null }),
    },
    createdTime: {
        toAPI: ([a, b]) => ({
            createdTime: {
                $range: [
                    +a / 1000,
                    +b / 1000,
                ],
            },
        }),
    },
    amountPaid: {
        toAPI: range => ({ amountPaid: { $range: range } }),
    },
    hasPaidMinimum: {
        toAPI: hasPaid => ({ hasPaidMinimum: hasPaid === 'true' ? true : false }),
    },
    validity: {
        toAPI: validity => ({ isValid: validity === 'true' ? true : false }),
    },
    checkInTime: {
        toAPI: value => {
            if (value === true) return { checkInTime: { $neq: null } };
            if (value === false) return { checkInTime: null };
            if (Array.isArray(value)) {
                const [start, end] = value;
                return { checkInTime: { $range: [+start / 1000, +end / 1000] } };
            }
            return {};
        },
    },
    dataId: {
        toAPI: items => ({
            $or: items.map(item => ({ dataId: '==base64==' + Buffer.from(item, 'hex').toString('base64') })),
        }),
    },
    data: {
        toAPI: predicates => {
            const out = [];
            for (const predicate of predicates) {
                const { var: varName, op, value } = predicate;
                const name = `data.${varName}`;
                if (op === 'is') out.push({ [name]: value });
                else if (op === 'isnt') out.push({ $not: { [name]: value } });
                else if (op === 'lt') out.push({ [name]: { $lt: value } });
                else if (op === 'gt') out.push({ [name]: { $gt: value } });
                else if (op === 'in') out.push({ [name]: { $in: value.split(',') } });
                else if (op === 'nin') out.push({ [name]: { $nin: value.split(',') } });
            }
            return { $and: out };
        },
    },
};
const pParametersToRequestData = makeParametersToRequestData({
    clientFields: pClientFields,
    clientFilters: pClientFilters,
    idFieldName: 'dataId',
    doesExtraFieldExist: f => f.startsWith('data.'),
});
const pClientFromAPI = makeClientFromAPI(pClientFields);
const pClientToAPI = makeClientToAPI(pClientFields);

// FIXME: needs a lot more DRY

export const tasks = {
    list: crudList({
        apiPath: () => `/congresses`,
        fields: ['id', 'name', 'abbrev', 'org'],
        storePath: (_, { id }) => [CONGRESSES, id, DATA],
    }),

    congress: crudGet({
        apiPath: ({ id }) => `/congresses/${id}`,
        fields: ['id', 'name', 'abbrev', 'org'],
        storePath: ({ id }) => [CONGRESSES, id, DATA],
    }),
    create: crudCreate({
        apiPath: () => `/congresses`,
        fields: ['name', 'abbrev', 'org'],
        storePath: (_, id) => [CONGRESSES, id, DATA],
        signalPath: () => [CONGRESSES, SIG_CONGRESSES],
    }),
    update: crudUpdate({
        apiPath: ({ id }) => `/congresses/${id}`,
        storePath: ({ id }) => [CONGRESSES, id, DATA],
    }),
    delete: crudDelete({
        apiPath: ({ id }) => `/congresses/${id}`,
        storePaths: ({ id }) => [
            [CONGRESSES, id, DATA],
            [CONGRESSES, id],
        ],
        signalPath: () => [CONGRESSES, SIG_CONGRESSES],
    }),

    // MARK - instances

    listInstances: crudList({
        apiPath: ({ congress }) => `/congresses/${congress}/instances`,
        fields: ['id', 'name', 'humanId', 'dateFrom', 'dateTo', 'locationName'],
        storePath: ({ congress }, { id }) => [CONGRESSES, congress, INSTANCES, id, DATA],
    }),
    instance: crudGet({
        apiPath: ({ congress, id }) => `/congresses/${congress}/instances/${id}`,
        fields: [
            'id', 'name', 'humanId', 'dateFrom', 'dateTo', 'locationName', 'locationNameLocal',
            'locationCoords', 'locationAddress', 'tz',
        ],
        storePath: ({ congress, id }) => [CONGRESSES, congress, INSTANCES, id, DATA],
    }),
    createInstance: crudCreate({
        apiPath: ({ congress }) => `/congresses/${congress}/instances`,
        fields: [
            'name', 'humanId', 'dateFrom', 'dateTo', 'locationName', 'locationNameLocal',
            'locationCoords', 'locationAddress', 'tz',
        ],
        storePath: ({ congress }, id) => [CONGRESSES, congress, INSTANCES, id, DATA],
        signalPath: ({ congress }) => [CONGRESSES, congress, SIG_INSTANCES],
    }),
    updateInstance: crudUpdate({
        apiPath: ({ congress, id }) => `/congresses/${congress}/instances/${id}`,
        storePath: ({ congress, id }) => [CONGRESSES, congress, INSTANCES, id, DATA],
    }),
    deleteInstance: crudDelete({
        apiPath: ({ congress, id }) => `/congresses/${congress}/instances/${id}`,
        storePaths: ({ congress, id }) => [
            [CONGRESSES, congress, INSTANCES, id, DATA],
            [CONGRESSES, congress, INSTANCES, id],
        ],
        signalPath: ({ congress }) => [CONGRESSES, congress, SIG_INSTANCES],
    }),
    instanceMap: async ({ congress, id }) => {
        const client = await asyncClient;
        const res = await client.get(`/congresses/${congress}/instances/${id}/map`, {
            fields: ['boundSW', 'boundNE'],
        });
        const item = res.body;
        const existing = store.get([CONGRESSES, congress, INSTANCES, item.id, DATA_MAP]);
        store.insert([CONGRESSES, congress, INSTANCES, item.id, DATA_MAP], deepMerge(existing, item));
        return store.get([CONGRESSES, congress, INSTANCES, item.id, DATA_MAP]);
    },

    // MARK - location tags

    listLocationTags: crudList({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/location_tags`,
        fields: ['id', 'name'],
        storePath: ({ congress, instance }, { id }) => [CONGRESSES, congress, INSTANCES, instance, LOC_TAGS, id],
    }),
    locationTag: crudGet({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/location_tags/${id}`,
        fields: ['id', 'name'],
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, LOC_TAGS, id],
    }),
    createLocationTag: crudCreate({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/location_tags`,
        fields: ['name'],
        storePath: ({ congress, instance }, id) => [CONGRESSES, congress, INSTANCES, instance, LOC_TAGS, id],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_LOC_TAGS],
    }),
    updateLocationTag: crudUpdate({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/location_tags/${id}`,
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, LOC_TAGS, id],
    }),
    deleteLocationTag: crudDelete({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/location_tags/${id}`,
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, LOC_TAGS, id],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_LOC_TAGS],
    }),

    // MARK - locations

    listLocations: crudList({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/locations`,
        fields: ['id', 'name', 'description', 'll', 'icon', 'address', 'type', 'externalLoc'],
        filters: locClientFilters,
        storePath: ({ congress, instance }, { id }) => [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, id, DATA],
        withApiOptions: (opts, { externalOnly }) => {
            if (externalOnly) {
                if (opts.filter) opts.filter = { $and: [opts.filter, { type: 'external' }] };
                else opts.filter = { type: 'external' };
            }
        },
    }),
    location: crudGet({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/locations/${id}`,
        fields: ['id', 'name', 'description', 'll', 'icon', 'address', 'type', 'externalLoc',
            'rating.rating', 'rating.max', 'rating.type', 'openHours', 'thumbnail'],
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, id, DATA],
    }),
    createLocation: crudCreate({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/locations`,
        fields: ['name', 'description', 'll', 'icon', 'address', 'type', 'externalLoc', 'rating', 'openHours'],
        storePath: ({ congress, instance }, id) => [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, id, DATA],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_LOCATIONS],
    }),
    updateLocation: crudUpdate({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/locations/${id}`,
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, id, DATA],
    }),
    deleteLocation: crudDelete({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/locations/${id}`,
        storePaths: ({ congress, instance, id }) => [
            [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, id, DATA],
            [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, id],
        ],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_LOCATIONS],
    }),
    updateLocationThumbnail: async ({ congress, instance, id }, { thumbnail }) => {
        const client = await asyncClient;
        await client.put(`/congresses/${congress}/instances/${instance}/locations/${id}/thumbnail`, null, {}, [{
            name: 'thumbnail',
            type: thumbnail.type,
            value: thumbnail,
        }]);

        // load in background
        tasks.location({ congress, instance, id });
    },
    deleteLocationThumbnail: async ({ congress, instance, id }) => {
        const client = await asyncClient;
        await client.delete(`/congresses/${congress}/instances/${instance}/locations/${id}/thumbnail`);

        // load in background
        tasks.location({ congress, instance, id });
    },

    // MARK - tags of a location

    listTagsOfLocation: crudList({
        apiPath: ({ congress, instance, location }) => `/congresses/${congress}/instances/${instance}/locations/${location}/tags`,
        fields: ['id', 'name'],
        storePath: ({ congress, instance }, { id }) => [CONGRESSES, congress, INSTANCES, instance, LOC_TAGS, id],
    }),
    addTagToLocation: async ({ congress, instance, location, id }) => {
        const client = await asyncClient;
        await client.put(`/congresses/${congress}/instances/${instance}/locations/${location}/tags/${id}`);
        store.signal([CONGRESSES, congress, INSTANCES, instance, LOCATIONS, location, SIG_LOC_TAGS]);
    },
    removeTagFromLocation: async ({ congress, instance, location, id }) => {
        const client = await asyncClient;
        await client.delete(`/congresses/${congress}/instances/${instance}/locations/${location}/tags/${id}`);
        store.signal([CONGRESSES, congress, INSTANCES, instance, LOCATIONS, location, SIG_LOC_TAGS]);
    },

    // MARK - program tags

    listProgramTags: crudList({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/program_tags`,
        fields: ['id', 'name'],
        storePath: ({ congress, instance }, { id }) => [CONGRESSES, congress, INSTANCES, instance, PROG_TAGS, id],
    }),
    programTag: crudGet({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/program_tags/${id}`,
        fields: ['id', 'name'],
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, PROG_TAGS, id],
    }),
    createProgramTag: crudCreate({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/program_tags`,
        fields: ['name'],
        storePath: ({ congress, instance }, id) => [CONGRESSES, congress, INSTANCES, instance, PROG_TAGS, id],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_PROG_TAGS],
    }),
    updateProgramTag: crudUpdate({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/program_tags/${id}`,
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, PROG_TAGS, id],
    }),
    deleteProgramTag: crudDelete({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/program_tags/${id}`,
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, PROG_TAGS, id],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_PROG_TAGS],
    }),

    // MARK - programs

    listPrograms: crudList({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/programs`,
        fields: ['id', 'title', 'description', 'owner', 'timeFrom', 'timeTo', 'location'],
        filters: progClientFilters,
        storePath: ({ congress, instance }, { id }) => [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, id, DATA],
    }),
    program: crudGet({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/programs/${id}`,
        fields: ['id', 'title', 'description', 'owner', 'timeFrom', 'timeTo', 'location'],
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, id, DATA],
    }),
    createProgram: crudCreate({
        apiPath: ({ congress, instance }) => `/congresses/${congress}/instances/${instance}/programs`,
        fields: ['title', 'description', 'owner', 'timeFrom', 'timeTo', 'location'],
        storePath: ({ congress, instance }, id) => [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, id, DATA],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_PROGRAMS],
        omitNulls: true,
    }),
    updateProgram: crudUpdate({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/programs/${id}`,
        storePath: ({ congress, instance, id }) => [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, id, DATA],
    }),
    deleteProgram: crudDelete({
        apiPath: ({ congress, instance, id }) => `/congresses/${congress}/instances/${instance}/programs/${id}`,
        storePaths: ({ congress, instance, id }) => [
            [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, id, DATA],
            [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, id],
        ],
        signalPath: ({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_PROGRAMS],
    }),

    // MARK - tags of a program

    listTagsOfProgram: crudList({
        apiPath: ({ congress, instance, program }) => `/congresses/${congress}/instances/${instance}/programs/${program}/tags`,
        fields: ['id', 'name'],
        storePath: ({ congress, instance }, { id }) => [CONGRESSES, congress, INSTANCES, instance, PROG_TAGS, id],
    }),
    addTagToProgram: async ({ congress, instance, program, id }) => {
        const client = await asyncClient;
        await client.put(`/congresses/${congress}/instances/${instance}/programs/${program}/tags/${id}`);
        store.signal([CONGRESSES, congress, INSTANCES, instance, PROGRAMS, program, SIG_PROG_TAGS]);
    },
    removeTagFromProgram: async ({ congress, instance, program, id }) => {
        const client = await asyncClient;
        await client.delete(`/congresses/${congress}/instances/${instance}/programs/${program}/tags/${id}`);
        store.signal([CONGRESSES, congress, INSTANCES, instance, PROGRAMS, program, SIG_PROG_TAGS]);
    },

    // MARK - registration form
    registrationForm: async ({ congress, instance }) => {
        const client = await asyncClient;
        let res;
        try {
            res = await client.get(`/congresses/${congress}/instances/${instance}/registration_form`, {
                fields: [
                    'allowUse',
                    'allowGuests',
                    'editable',
                    'cancellable',
                    'manualApproval',
                    'confirmationNotifTemplateId',
                    'sequenceIds.startAt',
                    'sequenceIds.requireValid',
                    'price.var',
                    'price.currency',
                    'price.minUpfront',
                    'identifierName',
                    'identifierEmail',
                    'identifierCountryCode',
                    'form',
                    'customFormVars',
                ],
            });
        } catch (err) {
            if (err.statusCode === 404) {
                store.insert([CONGRESSES, congress, INSTANCES, instance, REG_FORM], null);
                return null;
            }
            throw err;
        }
        store.insert([CONGRESSES, congress, INSTANCES, instance, REG_FORM], res.body);
        return res.body;
    },
    deleteRegistrationForm: async ({ congress, instance }) => {
        const client = await asyncClient;
        await client.delete(`/congresses/${congress}/instances/${instance}/registration_form`);
        store.remove([CONGRESSES, congress, INSTANCES, instance, REG_FORM]);
    },
    setRegistrationForm: async ({ congress, instance }, { data }) => {
        const client = await asyncClient;
        await client.put(`/congresses/${congress}/instances/${instance}/registration_form`, data);
        store.insert([CONGRESSES, congress, INSTANCES, instance, REG_FORM], data);
    },

    // MARK - participants
    listParticipants: async ({ congress, instance }, parameters) => {
        const client = await asyncClient;

        const regFormPath = [CONGRESSES, congress, INSTANCES, instance, REG_FORM];
        let regForm = store.get(regFormPath);
        if (!regForm) {
            try {
                await tasks.registrationForm({ congress, instance });
                regForm = store.get(regFormPath);
            } catch { /* */ }
        }

        // need to remove data.* from fields because these aren't handled client-side
        const originalFields = parameters.fields;
        const pFields = [];
        const dataFields = [];
        for (const field of originalFields) {
            if (!field.id.startsWith('data.')) pFields.push(field);
            else dataFields.push(field.id);
        }

        const pFieldNames = pFields.map(x => x.id);
        const dataFieldNames = dataFields.map(x => x.id);
        if (regForm && pFieldNames.includes('identity')) {
            // we need all data fields for the identity field because we're running a script to
            // figure out the participant name
            for (const item of regForm.form) {
                if (item.el === 'input' && !dataFieldNames.includes(item.name)) dataFields.push('data.' + item.name);
            }
        }

        const { options, usedFilters, transientFields } = pParametersToRequestData({
            ...parameters,
            fields: pFields,
        });

        // now add them back
        options.fields.push(...dataFields);

        const result = await client.get(`/congresses/${congress}/instances/${instance}/participants`, options);
        const list = result.body;
        const totalItems = +result.res.headers.get('x-total-items');

        const items = [];

        for (const item of list) {
            const id = pReadId(item.dataId);
            const existing = store.get([CONGRESS_PARTICIPANTS, id]);
            store.insert([CONGRESS_PARTICIPANTS, id], deepMerge(existing, pClientFromAPI(item, regForm)));
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
    createParticipant: async ({ congress, instance }, params) => {
        const client = await asyncClient;
        let res;
        try {
            res = await client.post(`/congresses/${congress}/instances/${instance}/participants`, pClientToAPI(params));
        } catch (err) {
            if (err.statusCode === 409) {
                throw { code: 'congresses-already-registered', message: 'Codeholder already registered' };
            } else throw err;
        }
        const id = res.res.headers.get('x-identifier');
        store.insert([CONGRESS_PARTICIPANTS, id], params);
        store.signal([CONGRESSES, congress, INSTANCES, instance, SIG_CONGRESS_PARTICIPANTS]);
        return id;
    },
    participant: async ({ congress, instance, id }, { fields }) => {
        const apiFields = ['dataId'];
        for (const field of fields) {
            if (field === 'data') {
                // this is the data field, but it can't be fetched directly
                // instead, get the registration form and enumerate all subfields
                let formData = store.get([CONGRESSES, congress, INSTANCES, instance, REG_FORM]);
                if (!formData) {
                    formData = await tasks.registrationForm({ congress, instance });
                }
                apiFields.push(...formData.form
                    .filter(item => item.el === 'input')
                    .map(item => 'data.' + item.name));
            } else if (typeof pClientFields[field] === 'string') apiFields.push(pClientFields[field]);
            else apiFields.push(pClientFields[field].apiFields);
        }

        const regFormPath = [CONGRESSES, congress, INSTANCES, instance, REG_FORM];
        let regForm = store.get(regFormPath);
        if (!regForm) {
            try {
                await tasks.registrationForm({ congress, instance });
                regForm = store.get(regFormPath);
            } catch { /* */ }
        }
        if (regForm && apiFields.includes('codeholderId')) {
            // we need all data fields for the identity field because we're running a script to
            // figure out the participant name
            for (const item of regForm.form) {
                const field = 'data.' + item.name;
                if (item.el === 'input' && !apiFields.includes(field)) apiFields.push(field);
            }
        }

        const client = await asyncClient;
        const res = await client.get(`/congresses/${congress}/instances/${instance}/participants/${id}`, {
            fields: apiFields,
        });

        const existing = store.get([CONGRESS_PARTICIPANTS, id]);
        store.insert([CONGRESS_PARTICIPANTS, id], deepMerge(existing, pClientFromAPI(res.body)));

        return +id;
    },
    updateParticipant: async ({ congress, instance, id }, params) => {
        const client = await asyncClient;
        const existing = store.get([CONGRESS_PARTICIPANTS, id]);
        const diff = fieldDiff(pClientToAPI(existing), pClientToAPI(params));
        await client.patch(`/congresses/${congress}/instances/${instance}/participants/${id}`, diff);
        store.insert([CONGRESS_PARTICIPANTS, id], deepMerge(existing, params));

        // reload properties with values calculated on the server
        tasks.participant({ congress, instance, id }, { fields: DERIVED_PARTICIPANT_FIELDS }).catch(() => {
            // but if it fails that's not really an issue
        });
    },
    deleteParticipant: async ({ congress, instance, id }) => {
        const client = await asyncClient;
        await client.delete(`/congresses/${congress}/instances/${instance}/participants/${id}`);
        store.remove([CONGRESS_PARTICIPANTS, id]);
        store.signal([CONGRESSES, congress, INSTANCES, instance, SIG_CONGRESS_PARTICIPANTS]);
    },
    participantFiltersToAPI: async ({ filters }) => {
        return filtersToAPI(pClientFilters, filters);
    },
    resendParticipantConfirmation: async ({ congress, instance, id }) => {
        const client = await asyncClient;
        try {
            await client.post(`/congresses/${congress}/instances/${instance}/participants/${id}/!resend_confirmation_notif`);
        } catch (err) {
            if (err?.statusCode === 409) {
                throw { code: 'no-confirmation-template', message: 'Missing confirmation template' };
            } else {
                throw err;
            }
        }
    },
    sendParticipantsNotifTemplate: async ({ congress, instance, search, filters, jsonFilter }, { template, deleteOnComplete }) => {
        const client = await asyncClient;
        const { options } = pParametersToRequestData({
            search,
            filters,
            jsonFilter,
            fields: [],
        });
        delete options.fields;
        delete options.offset;
        delete options.limit;

        await client.post(`/congresses/${congress}/instances/${instance}/participants/!send_notif_template`, {
            notifTemplateId: template,
            deleteTemplateOnComplete: !!deleteOnComplete,
        }, options);
    },
};

export const views = {
    congress: class CongressView extends AbstractDataView {
        constructor (options) {
            super();
            this.id = options.id;

            store.subscribe([CONGRESSES, this.id, DATA], this.#onUpdate);
            const current = store.get([CONGRESSES, this.id, DATA]);
            if (current) setImmediate(this.#onUpdate);

            if (!options.noFetch) {
                tasks.congress({ id: this.id }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([CONGRESSES, this.id, DATA]), 'delete');
            } else {
                this.emit('update', store.get([CONGRESSES, this.id, DATA]));
            }
        };

        drop () {
            store.unsubscribe([CONGRESSES, this.id, DATA], this.#onUpdate);
        }
    },

    instance: class InstanceView extends AbstractDataView {
        constructor (options) {
            super();
            this.congress = options.congress;
            this.id = options.id;

            this.path = [CONGRESSES, this.congress, INSTANCES, this.id, DATA];

            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);

            if (!options.noFetch) {
                tasks.instance({ congress: this.congress, id: this.id }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) this.emit('update', store.get(this.path), 'delete');
            else this.emit('update', store.get(this.path));
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },

    locationTag: class LocationTagView extends AbstractDataView {
        constructor (options) {
            super();
            this.congress = options.congress;
            this.instance = options.instance;
            this.id = options.id;
            this.path = [CONGRESSES, this.congress, INSTANCES, this.instance, LOC_TAGS, this.id];
            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);
            if (!options.noFetch) {
                tasks.locationTag({
                    congress: this.congress,
                    instance: this.instance,
                    id: this.id,
                }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) this.emit('update', store.get(this.path), 'delete');
            else this.emit('update', store.get(this.path));
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },

    location: class LocationView extends AbstractDataView {
        constructor (options) {
            super();
            this.congress = options.congress;
            this.instance = options.instance;
            this.id = options.id;
            this.path = [CONGRESSES, this.congress, INSTANCES, this.instance, LOCATIONS, this.id, DATA];
            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);
            if (!options.noFetch) {
                tasks.location({
                    congress: this.congress,
                    instance: this.instance,
                    id: this.id,
                }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) this.emit('update', store.get(this.path), 'delete');
            else this.emit('update', store.get(this.path));
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },

    programTag: class ProgramTagView extends AbstractDataView {
        constructor (options) {
            super();
            this.congress = options.congress;
            this.instance = options.instance;
            this.id = options.id;
            this.path = [CONGRESSES, this.congress, INSTANCES, this.instance, PROG_TAGS, this.id];
            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);
            if (!options.noFetch) {
                tasks.programTag({
                    congress: this.congress,
                    instance: this.instance,
                    id: this.id,
                }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) this.emit('update', store.get(this.path), 'delete');
            else this.emit('update', store.get(this.path));
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },

    program: class ProgramView extends AbstractDataView {
        constructor (options) {
            super();
            this.congress = options.congress;
            this.instance = options.instance;
            this.id = options.id;
            this.path = [CONGRESSES, this.congress, INSTANCES, this.instance, PROGRAMS, this.id, DATA];
            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);
            if (!options.noFetch) {
                tasks.program({
                    congress: this.congress,
                    instance: this.instance,
                    id: this.id,
                }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) this.emit('update', store.get(this.path), 'delete');
            else this.emit('update', store.get(this.path));
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },

    registrationForm: class RegistrationFormView extends AbstractDataView {
        constructor (options) {
            super();
            this.congress = options.congress;
            this.instance = options.instance;
            this.path = [CONGRESSES, this.congress, INSTANCES, this.instance, REG_FORM];
            store.subscribe(this.path, this.#onUpdate);
            const current = store.get(this.path);
            if (current) setImmediate(this.#onUpdate);
            if (!options.noFetch) {
                tasks.registrationForm({
                    congress: this.congress,
                    instance: this.instance,
                }).catch(err => this.emit('error', err));
            }
        }
        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) this.emit('update', store.get(this.path), 'delete');
            else this.emit('update', store.get(this.path));
        };
        drop () {
            store.unsubscribe(this.path, this.#onUpdate);
        }
    },

    participant: class Participant extends AbstractDataView {
        constructor (options) {
            super();
            const { congress, instance, id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([CONGRESS_PARTICIPANTS, this.id], this.#onUpdate);
            const current = store.get([CONGRESS_PARTICIPANTS, this.id]);
            if (current) setImmediate(this.#onUpdate);

            let shouldFetch = !options.noFetch;
            if (options.lazyFetch) {
                shouldFetch = false;
                for (const field of options.fields) {
                    if (!current || current[field] === undefined) {
                        shouldFetch = true;
                        break;
                    }
                }
            }

            if (shouldFetch) {
                tasks.participant({ congress, instance, id }, { fields }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([CONGRESS_PARTICIPANTS, this.id]), 'delete');
            } else {
                this.emit('update', store.get([CONGRESS_PARTICIPANTS, this.id]));
            }
        };

        drop () {
            store.unsubscribe([CONGRESS_PARTICIPANTS, this.id], this.#onUpdate);
        }
    },

    sigCongresses: createStoreObserver([CONGRESSES, SIG_CONGRESSES]),
    sigInstances: createStoreObserver(({ congress }) => [CONGRESSES, congress, SIG_INSTANCES]),
    sigLocationTags: createStoreObserver(({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_LOC_TAGS]),
    sigLocations: createStoreObserver(({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_LOCATIONS]),
    sigTagsOfLocation: createStoreObserver(({ congress, instance, location }) => [CONGRESSES, congress, INSTANCES, instance, LOCATIONS, location, SIG_LOC_TAGS]),
    sigProgramTags: createStoreObserver(({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_PROG_TAGS]),
    sigPrograms: createStoreObserver(({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_PROGRAMS]),
    sigTagsOfProgram: createStoreObserver(({ congress, instance, program }) => [CONGRESSES, congress, INSTANCES, instance, PROGRAMS, program, SIG_PROG_TAGS]),
    sigParticipants: createStoreObserver(({ congress, instance }) => [CONGRESSES, congress, INSTANCES, instance, SIG_CONGRESS_PARTICIPANTS]),
};
