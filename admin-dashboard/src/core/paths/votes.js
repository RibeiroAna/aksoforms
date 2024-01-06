import JSON5 from 'json5';
import { util } from '@tejo/akso-client';
import asyncClient from '../client';
import { AbstractDataView, createStoreObserver } from '../view';
import { makeParametersToRequestData, makeClientFromAPI, makeClientToAPI, filtersToAPI } from '../list';
import { simpleDataView } from '../templates';
import * as store from '../store';
import { deepMerge, deepEq } from '../../util';

/** Returns the value type-casted to be a float or fraction. */
function enforceRational (value) {
    if (Array.isArray(value)) return value.map(x => +x);
    return +value;
}

const clientFields = {
    id: 'id',
    org: 'org',
    name: 'name',
    type: 'type',
    state: {
        apiFields: ['hasResults', 'usedTieBreaker', 'hasStarted', 'hasEnded', 'isActive'],
        fromAPI: vote => ({
            hasResults: vote.hasResults,
            usedTieBreaker: vote.usedTieBreaker,
            hasStarted: vote.hasStarted,
            hasEnded: vote.hasEnded,
            isActive: vote.isActive,
        }),
        toAPI: () => ({}),
    },
    description: 'description',
    voterCodeholders: {
        apiFields: ['voterCodeholders'],
        fromAPI: vote => JSON5.stringify(vote.voterCodeholders, undefined, 4),
        toAPI: value => ({ voterCodeholders: JSON5.parse(value) }),
    },
    voterCodeholdersMemberFilter: {
        apiFields: ['voterCodeholdersMemberFilter'],
        fromAPI: vote => JSON5.stringify(vote.voterCodeholdersMemberFilter, undefined, 4),
        toAPI: () => ({}),
    },
    viewerCodeholders: {
        apiFields: ['viewerCodeholders'],
        fromAPI: vote => JSON5.stringify(vote.viewerCodeholders, undefined, 4),
        toAPI: value => ({ viewerCodeholders: JSON5.parse(value) }),
    },
    viewerCodeholdersMemberFilter: {
        apiFields: ['viewerCodeholdersMemberFilter'],
        fromAPI: vote => JSON5.stringify(vote.viewerCodeholdersMemberFilter, undefined, 4),
        toAPI: () => ({}),
    },
    timespan: {
        apiFields: ['timeStart', 'timeEnd'],
        fromAPI: vote => ({
            start: vote.timeStart,
            end: vote.timeEnd,
        }),
        toAPI: value => ({
            timeStart: value.start,
            timeEnd: value.end,
        }),
    },
    config: {
        apiFields: [
            'type',
            'ballotsSecret',
            'blankBallotsLimit',
            'blankBallotsLimitInclusive',
            'quorum',
            'quorumInclusive',
            'majorityBallots',
            'majorityBallotsInclusive',
            'majorityVoters',
            'majorityVotersInclusive',
            'majorityMustReachBoth',
            'numChosenOptions',
            'mentionThreshold',
            'mentionThresholdInclusive',
            'maxOptionsPerBallot',
            'tieBreakerCodeholder',
            'publishVoters',
            'publishVotersPercentage',
            'publishResults',
            'options',
        ],
        fromAPI: vote => {
            const value = {
                ballotsSecret: vote.ballotsSecret,
                quorum: vote.quorum,
                quorumInclusive: vote.quorumInclusive,
                publishVoters: vote.publishVoters,
                publishVotersPercentage: vote.publishVotersPercentage,
                publishResults: vote.publishResults,
            };

            if (vote.type === 'yn' || vote.type === 'ynb') {
                value.majorityBallots = vote.majorityBallots;
                value.majorityBallotsInclusive = vote.majorityBallotsInclusive;
                value.majorityVoters = vote.majorityVoters;
                value.majorityVotersInclusive = vote.majorityVotersInclusive;
                value.majorityMustReachBoth = vote.majorityMustReachBoth;
            }
            if (vote.type === 'ynb' || vote.type === 'rp' || vote.type === 'stv' || vote.type === 'tm') {
                value.blankBallotsLimit = vote.blankBallotsLimit;
                value.blankBallotsLimitInclusive = vote.blankBallotsLimitInclusive;
            }
            if (vote.type === 'rp' || vote.type === 'stv' || vote.type === 'tm') {
                value.numChosenOptions = vote.numChosenOptions;
                value.options = vote.options;
            }
            if (vote.type === 'rp' || vote.type === 'tm') {
                value.mentionThreshold = vote.mentionThreshold;
                value.mentionThresholdInclusive = vote.mentionThresholdInclusive;
            }
            if (vote.type === 'tm') {
                value.maxOptionsPerBallot = vote.maxOptionsPerBallot;
            }
            if (vote.type === 'rp' || vote.type === 'stv') {
                value.tieBreakerCodeholder = vote.tieBreakerCodeholder;
            }

            return value;
        },
        toAPI: (value, item) => {
            const vote = {
                ballotsSecret: !!value.ballotsSecret,
                quorum: enforceRational(value.quorum),
                quorumInclusive: !!value.quorumInclusive,
                publishVoters: !!value.publishVoters,
                publishVotersPercentage: !!value.publishVotersPercentage,
                publishResults: !!value.publishResults,
            };

            if (item.type === 'yn' || item.type === 'ynb') {
                vote.majorityBallots = enforceRational(value.majorityBallots);
                vote.majorityBallotsInclusive = !!value.majorityBallotsInclusive;
                vote.majorityVoters = enforceRational(value.majorityVoters);
                vote.majorityVotersInclusive = !!value.majorityVotersInclusive;
                vote.majorityMustReachBoth = !!value.majorityMustReachBoth;
            }
            if (item.type === 'ynb' || item.type === 'rp' || item.type === 'stv' || item.type === 'tm') {
                vote.blankBallotsLimit = enforceRational(value.blankBallotsLimit);
                vote.blankBallotsLimitInclusive = !!value.blankBallotsLimitInclusive;
            }
            if (item.type === 'rp' || item.type === 'stv' || item.type === 'tm') {
                vote.numChosenOptions = +value.numChosenOptions;
                vote.options = value.options.map(item => {
                    if (item.type === 'codeholder') {
                        return {
                            type: item.type,
                            codeholderId: item.codeholderId,
                            description: item.description || null,
                        };
                    } else {
                        return {
                            type: item.type,
                            name: item.name,
                            description: item.description || null,
                        };
                    }
                });
            }
            if (item.type === 'rp' || item.type === 'tm') {
                vote.mentionThreshold = enforceRational(value.mentionThreshold);
                vote.mentionThresholdInclusive = !!value.mentionThresholdInclusive;
            }
            if (item.type === 'tm') {
                vote.maxOptionsPerBallot = value.maxOptionsPerBallot || null;
            }
            if (item.type === 'rp' || item.type === 'stv') {
                vote.tieBreakerCodeholder = value.tieBreakerCodeholder;
            }

            return vote;
        },
    },
};

function dateToTimestamp (date, atEndOfDay) {
    date = new Date(date + (atEndOfDay ? 'T23:59:59Z' : 'T00:00:00Z'));
    return +date / 1000;
}

const clientFilters = {
    org: {
        toAPI: value => ({ org: value }),
        hasPerm: client => client.hasPerm('votes.read.tejo') && client.hasPerm('votes.read.uea'),
    },
    timeStart: {
        toAPI: value => ({ timeStart: { $range: value.map(dateToTimestamp) } }),
    },
    timeEnd: {
        toAPI: value => ({ timeEnd: { $range: value.map(dateToTimestamp) } }),
    },
    state: {
        toAPI: value => {
            if (value === 'pending') return {
                $not: {
                    $or: [{ hasStarted: true }, { isActive: true }, { hasEnded: true }],
                },
            };
            else if (value === 'started') return { hasStarted: true };
            else if (value === 'active') return { isActive: true };
            else if (value === 'ended') return { hasEnded: true };
            return {};
        },
    },
    type: {
        toAPI: type => ({ type }),
    },
};

const parametersToRequestData = makeParametersToRequestData({ clientFields, clientFilters });
const clientFromAPI = makeClientFromAPI(clientFields);
const clientToAPI = makeClientToAPI(clientFields);

export const VOTES = 'votes';
export const VOTE_TEMPLATES = 'voteTemplates';
export const VOTE_RESULTS = 'voteResults';
export const VOTE_STATS = 'voteStats';
export const SIG_VOTES = '!votes';

export const tasks = {
    /** votes/filters: lists all filters the user has permission to use */
    filters: async () => {
        const client = await asyncClient;
        const filters = [];
        for (const filter in clientFilters) {
            if (!clientFilters[filter].hasPerm || (await clientFilters[filter].hasPerm(client))) {
                filters.push(filter);
            }
        }
        return filters;
    },
    /** votes/list: lists votes */
    list: async (_, parameters) => {
        const client = await asyncClient;

        const { options, usedFilters, transientFields } = parametersToRequestData(parameters);

        const result = await client.get('/votes', options);
        let list = result.body;
        const totalItems = +result.res.headers.get('x-total-items');

        for (const item of list) {
            const existing = store.get([VOTES, item.id]);
            store.insert([VOTES, item.id], deepMerge(existing, clientFromAPI(item)));
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
    /** votes/vote: fetches a single vote */
    vote: async (_, { id, fields }) => {
        const client = await asyncClient;
        const res = await client.get(`/votes/${+id}`, {
            fields: ['id'].concat(fields.flatMap(id => typeof clientFields[id] === 'string'
                ? [clientFields[id]]
                : clientFields[id].apiFields)),
        });

        const existing = store.get([VOTES, +id]);
        store.insert([VOTES, +id], deepMerge(existing, clientFromAPI(res.body)));

        return +id;
    },
    /** votes/voteResults: fetches the results of a vote */
    voteResults: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/votes/${+id}/result`);
        const existing = store.get([VOTE_RESULTS, +id]);
        store.insert([VOTE_RESULTS, +id], deepMerge(existing, res.body));
        return +id;
    },

    /** votes/create: creates a vote */
    create: async (_, data) => {
        const client = await asyncClient;
        const res = await client.post('/votes', clientToAPI(data));
        const id = +res.res.headers.get('x-identifier');
        store.insert([VOTES, +id], data);
        store.signal([VOTES, SIG_VOTES]);

        // give API some time to actually initialize it; otherwise we'll be reading 404s everywhere
        await new Promise(resolve => setTimeout(resolve, 2000));

        return id;
    },

    /** votes/update: updates a vote */
    update: async ({ id }, data) => {
        const client = await asyncClient;
        const existing = store.get([VOTES, +id]);
        const currentData = clientToAPI(existing);
        const newData = clientToAPI(data);
        const diff = {};

        for (const k in newData) {
            if (!deepEq(currentData[k], newData[k])) {
                diff[k] = newData[k];
            }
        }
        await client.patch(`/votes/${id}`, diff);
        store.insert([VOTES, +id], deepMerge(existing, data));
    },

    /** votes/delete: deletes a vote */
    delete: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/votes/${id}`);
        store.remove([VOTES, +id]);
        store.signal([VOTES, SIG_VOTES]);
    },

    /** votes/stats: staistics for a vote */
    stats: async ({ id }) => {
        const client = await asyncClient;
        const res = await client.get(`/votes/${id}/stats`);
        store.insert([VOTE_STATS, +id], res.body);
    },

    sendCastBallotNotif: async ({ id }, { template, deleteOnComplete }) => {
        const client = await asyncClient;
        await client.post(`/votes/${id}/!send_cast_ballot_notif`, {
            notifTemplateId: template,
            deleteTemplateOnComplete: !!deleteOnComplete,
        });
    },

    /** votes/listTemplates: lists vote templates */
    listTemplates: async (_, { search, offset, limit }) => {
        const client = await asyncClient;

        const opts = { offset, limit };
        if (search && search.query) {
            const transformedQuery = util.transformSearch(search.query);
            if (transformedQuery.length < 3) {
                throw { code: 'search-query-too-short', message: 'search query too short' };
            }
            if (!util.isValidSearch(transformedQuery)) {
                throw { code: 'invalid-search-query', message: 'invalid search query' };
            }
            opts.search = { cols: [search.field], str: transformedQuery };
        }

        const res = await client.get('/vote_templates', {
            fields: ['id', 'org', 'name', 'description'],
            ...opts,
        });

        let list = res.body;
        const totalItems = +res.res.headers.get('x-total-items');

        for (const item of list) {
            const existing = store.get([VOTE_TEMPLATES, item.id]);
            store.insert([VOTE_TEMPLATES, item.id], deepMerge(existing, item));
        }

        list = list.map(item => item.id);

        return {
            items: list,
            total: totalItems,
            stats: {
                time: res.resTime,
                filtered: false,
            },
        };
    },
    createTemplate: async (_, { org, name, description, vote }) => {
        const client = await asyncClient;

        const apiVote = clientToAPI(vote);
        delete apiVote.org;
        delete apiVote.timeStart;
        delete apiVote.timeEnd;

        const res = await client.post('/vote_templates', {
            org,
            name,
            description: description || null,
            vote: apiVote,
        });
        const id = +res.res.headers.get('x-identifier');
        store.insert([VOTE_TEMPLATES, +id], { org, name, description, vote });
        store.signal([VOTE_TEMPLATES, SIG_VOTES]);
        return id;
    },

    /** votes/voteTemplate: fetches a single vote template */
    voteTemplate: async (_, { id }) => {
        const client = await asyncClient;
        const res = await client.get(`/vote_templates/${+id}`, {
            fields: [
                'id',
                'org',
                'name',
                'description',
                'vote',
            ],
        });

        const existing = store.get([VOTE_TEMPLATES, +id]);
        store.insert([VOTE_TEMPLATES, +id], deepMerge(existing, {
            id: res.body.id,
            org: res.body.org,
            name: res.body.name,
            description: res.body.description,
            vote: clientFromAPI(res.body.vote),
        }));

        return +id;
    },
    updateTemplate: async ({ id }, data) => {
        const client = await asyncClient;

        const apiData = {
            ...data,
            vote: clientToAPI(data.vote),
        };
        delete apiData.id;
        delete apiData.org;
        delete apiData.vote.timeStart;
        delete apiData.vote.timeEnd;

        await client.patch(`/vote_templates/${id}`, apiData);
        const existing = store.get([VOTE_TEMPLATES, +id]);
        store.insert([VOTE_TEMPLATES, +id], deepMerge(existing, data));
    },
    deleteTemplate: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/vote_templates/${id}`);
        store.remove([VOTE_TEMPLATES, +id]);
        store.signal([VOTE_TEMPLATES, SIG_VOTES]);
    },

    /** votes/filtersToAPI: converts client filters to API filters */
    filtersToAPI: async ({ filters }) => {
        return filtersToAPI(clientFilters, filters);
    },
};

export const views = {
    /** votes/filters: data view of client filters the user has permissions to use */
    filters: class Filters extends AbstractDataView {
        constructor () {
            super();
            tasks.filters()
                .then(fields => this.emit('update', fields))
                .catch(err => this.emit('error', err));
        }
    },

    /** votes/vote: data view of a single vote */
    vote: class Vote extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([VOTES, this.id], this.#onUpdate);
            const current = store.get([VOTES, this.id]);
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
                tasks.vote({}, { id, fields }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([VOTES, this.id]), 'delete');
            } else {
                this.emit('update', store.get([VOTES, this.id]));
            }
        };

        drop () {
            store.unsubscribe([VOTES, this.id], this.#onUpdate);
        }
    },
    /** votes/voteResults: data view of a single set of vote results */
    voteResults: class VoteResults extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([VOTE_RESULTS, this.id], this.#onUpdate);
            const current = store.get([VOTE_RESULTS, this.id]);
            if (current) setImmediate(this.#onUpdate);

            if (!options.noFetch) {
                tasks.voteResults({ id }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([VOTE_RESULTS, this.id]), 'delete');
            } else {
                this.emit('update', store.get([VOTE_RESULTS, this.id]));
            }
        };

        drop () {
            store.unsubscribe([VOTE_RESULTS, this.id], this.#onUpdate);
        }
    },
    stats: simpleDataView({
        storePath: ({ id }) => [VOTE_STATS, id],
        get: ({ id }) => tasks.stats({ id }),
    }),

    /** votes/voteTemplate: data view of a single vote template */
    voteTemplate: class VoteTemplate extends AbstractDataView {
        constructor (options) {
            super();
            const { id, fields } = options;
            this.id = id;
            this.fields = fields;

            store.subscribe([VOTE_TEMPLATES, this.id], this.#onUpdate);
            const current = store.get([VOTE_TEMPLATES, this.id]);
            if (current) setImmediate(this.#onUpdate);

            if (!options.noFetch) {
                tasks.voteTemplate({}, { id, fields }).catch(err => this.emit('error', err));
            }
        }

        #onUpdate = (type) => {
            if (type === store.UpdateType.DELETE) {
                this.emit('update', store.get([VOTE_TEMPLATES, this.id]), 'delete');
            } else {
                this.emit('update', store.get([VOTE_TEMPLATES, this.id]));
            }
        };

        drop () {
            store.unsubscribe([VOTE_TEMPLATES, this.id], this.#onUpdate);
        }
    },

    /** votes/sigVotes: emits a signal when the list of votes may have changed */
    sigVotes: createStoreObserver([VOTES, SIG_VOTES]),
    /** votes/sigVoteTemplates: emits a signal when the list of vote templates may have changed */
    sigVoteTemplates: createStoreObserver([VOTE_TEMPLATES, SIG_VOTES]),
};
