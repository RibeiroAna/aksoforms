import { crudList, crudCreate, crudGet, crudUpdate, crudDelete, simpleDataView } from '../templates';
import { filtersToAPI } from '../list';
import { createStoreObserver } from '../view';
import asyncClient from '../client';
import * as store from '../store';

export const CODEHOLDER_DELEGATIONS = 'codeholderDelegations';
export const SIG_DELEGATIONS = '!delegations';
export const DELEGATION_SUBJECTS = 'delegationSubjects';
export const DELEGATION_APPLICATIONS = 'delegationApplications';
export const SIG_SUBJECTS = '!subjects';
export const SIG_APPLICATIONS = '!applications';

export const delegateFilters = {
    org: {
        toAPI: org => ({ org }),
    },
    approvedBy: {
        toAPI: codeholders => ({ approvedBy: { $in: codeholders } }),
    },
    approvedTime: {
        toAPI: () => {
            // TODO
            return {};
        },
    },
    hostingMaxDays: {
        toAPI: range => ({ 'hosting.maxDays': { $range: range } }),
    },
    hostingMaxPersons: {
        toAPI: range => ({ 'hosting.maxPersons': { $range: range } }),
    },
    subjects: {
        toAPI: items => ({ subjects: { $hasAny: items } }),
    },
    cities: {
        toAPI: items => ({ cities: { $hasAny: items } }),
    },
    countries: {
        toAPI: items => ({ $countries: { country: { $in: items } } }),
    },
    countryLevels: {
        toAPI: level => ({ $countries: { level } }),
    },
    appearsInPaperAnnualBook: {
        toAPI: appears => ({ 'tos.paperAnnualBook': appears }),
    },
    // TODO: tos fields
};

const applicationFilters = {
    codeholderId: {
        toAPI: codeholders => ({ codeholderId: { $in: codeholders } }),
    },
    status: {
        toAPI: status => ({ status }),
    },
    statusTime: {
        toAPI: ([a, b]) => ({
            statusTime: { $gte: (+a / 1000) | 0, $lte: (+b / 1000) | 0 },
        }),
    },
};

export const tasks = {
    listDelegates: crudList({
        apiPath: () => `/delegations/delegates`,
        fields: [
            'codeholderId',
            'org',
            'approvedBy',
            'approvedTime',
            'cities',
            'countries',
            'subjects',
            'hosting.maxDays',
            'hosting.maxPersons',
        ],
        filters: delegateFilters,
        storePath: (_, item) => [CODEHOLDER_DELEGATIONS, item.codeholderId, item.org],
        map: item => {
            item.id = item.codeholderId + '~' + item.org;
        },
    }),
    delegateFiltersToAPI: async ({ filters }) => {
        return filtersToAPI(delegateFilters, filters);
    },

    // hack: used in export
    listDelegatesExt: crudList({
        apiPath: () => `/delegations/delegates`,
        fields: [
            'codeholderId',
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
            'tos.docDelegatesUEA',
            'tos.docDelegatesDataProtectionUEA',
            'tos.paperAnnualBook',
        ],
        filters: delegateFilters,
        storePath: (_, item) => [CODEHOLDER_DELEGATIONS, item.codeholderId, item.org],
        map: item => {
            item.id = item.codeholderId + '~' + item.org;
        },
    }),

    listSubjects: crudList({
        apiPath: () => `/delegations/subjects`,
        fields: ['id', 'org', 'name', 'description'],
        filters: delegateFilters,
        storePath: (_, item) => [DELEGATION_SUBJECTS, item.id],
    }),
    subject: crudGet({
        apiPath: ({ id }) => `/delegations/subjects/${id}`,
        fields: ['id', 'org', 'name', 'description'],
        storePath: ({ id }) => [DELEGATION_SUBJECTS, id],
    }),
    createSubject: crudCreate({
        apiPath: () => `/delegations/subjects`,
        fields: ['org', 'name', 'description'],
        storePath: (_, id) => [DELEGATION_SUBJECTS, id],
        signalPath: () => [DELEGATION_SUBJECTS, SIG_SUBJECTS],
    }),
    updateSubject: crudUpdate({
        apiPath: ({ id }) => `/delegations/subjects/${id}`,
        storePath: ({ id }) => [DELEGATION_SUBJECTS, id],
    }),
    deleteSubject: crudDelete({
        apiPath: ({ id }) => `/delegations/subjects/${id}`,
        storePath: ({ id }) => [DELEGATION_SUBJECTS, id],
        signalPath: () => [DELEGATION_SUBJECTS, SIG_SUBJECTS],
    }),

    listApplications: crudList({
        apiPath: () => `/delegations/applications`,
        filters: applicationFilters,
        fields: [
            'id', 'org', 'status', 'statusTime', 'statusBy',
            'applicantNotes', 'internalNotes', 'time', 'subjects', 'cities',
            // 'countries', 'codeholderId',
            'codeholderId',
            'hosting',
        ],
        storePath: (_, { id }) => [DELEGATION_APPLICATIONS, id],
    }),
    applicationFiltersToAPI: async ({ filters }) => {
        return filtersToAPI(applicationFilters, filters);
    },
    application: crudGet({
        apiPath: ({ id }) => `/delegations/applications/${id}`,
        fields: [
            'id', 'org', 'status', 'statusTime', 'statusBy',
            'applicantNotes', 'internalNotes', 'time', 'subjects', 'cities',
            'codeholderId',
            'hosting',
            'tos.docDataProtectionUEA',
            'tos.docDelegatesUEA',
            'tos.docDelegatesDataProtectionUEA',
            'tos.paperAnnualBook',
        ],
        storePath: ({ id }) => [DELEGATION_APPLICATIONS, id],
    }),
    createApplication: crudCreate({
        apiPath: () => `/delegations/applications`,
        fields: [
            'org',
            'status',
            'statusTime',
            'applicantNotes',
            'internalNotes',
            'subjects',
            'cities',
            'hosting',
            'codeholderId',
            'tos',
        ],
        omitNulls: true,
        storePath: (_, id) => [DELEGATION_APPLICATIONS, id],
        signalPath: () => [DELEGATION_APPLICATIONS, SIG_APPLICATIONS],
    }),
    updateApplication: crudUpdate({
        apiPath: ({ id }) => `/delegations/applications/${id}`,
        storePath: ({ id }) => [DELEGATION_APPLICATIONS, id],
    }),
    deleteApplication: crudDelete({
        apiPath: ({ id }) => `/delegations/applications/${id}`,
        storePath: ({ id }) => [DELEGATION_APPLICATIONS, id],
        signalPath: () => [DELEGATION_APPLICATIONS, SIG_APPLICATIONS],
    }),

    approveApplication: async ({ id }, item) => {
        const client = await asyncClient;
        const delegation = {
            cities: item.cities,
            subjects: item.subjects,
            countries: item.countries || [],
            hosting: item.hosting,
            tos: item.tos,
        };
        await client.put(`/codeholders/${item.codeholderId}/delegations/${item.org}`, delegation);
        store.insert([CODEHOLDER_DELEGATIONS, item.codeholderId, item.org], delegation);
        store.signal([CODEHOLDER_DELEGATIONS, SIG_DELEGATIONS]);
        await tasks.updateApplication({ id }, { status: 'approved' });
        return { id: item.codeholderId, org: item.org };
    },
    denyApplication: async ({ id }) => {
        const item = await tasks.application({ id });
        if (item.status !== 'pending') {
            throw { code: 'bad-request', message: 'cannot deny: application is not pending' };
        }
        await tasks.updateApplication({ id }, { status: 'denied' });
    },
};

export const views = {
    subject: simpleDataView({
        storePath: ({ id }) => [DELEGATION_SUBJECTS, id],
        get: ({ id }) => tasks.subject({ id }),
        canBeLazy: true,
    }),
    sigSubjects: createStoreObserver([DELEGATION_SUBJECTS, SIG_SUBJECTS]),

    application: simpleDataView({
        storePath: ({ id }) => [DELEGATION_APPLICATIONS, id],
        get: ({ id }) => tasks.application({ id }),
    }),
    sigApplications: createStoreObserver([DELEGATION_APPLICATIONS, SIG_APPLICATIONS]),
};
