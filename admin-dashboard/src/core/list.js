import { util } from '@tejo/akso-client';
import { deepEq } from '../util';

export function transformError (err) {
    if (!err) return { code: '?', message: '??' };
    let code;
    if (err.statusCode === 400) {
        code = 'bad-request';
        if (!err.extra) err.extra = {};
        err.extra.parsedSchemaError = tryParseSchemaError(err.message);
    } else if (err.statusCode === 401) code = 'unauthorized';
    else if (err.statusCode === 403) code = 'forbidden';
    else if (err.statusCode === 404) code = 'not-found';
    else if (err.statusCode === 409) code = 'conflict';
    else if (err.statusCode === 413) code = 'payload-too-large';
    else if (err.statusCode === 415) code = 'unsupported-media-type';
    else if (err.statusCode === 500) code = 'internal-server-error';
    else if (err.statusCode === 502) code = 'service-unavailable';
    else if (err.statusCode === 503) code = 'service-unavailable';
    else if (err.message.includes('NetworkError') || err.message.includes('Load failed')) code = 'network';

    return {
        code: code || err.code || '?',
        message: (err.message || err.toString()) + (err.stack ? '\n' + err.stack : ''),
        extra: err.extra || {},
    };
}

function tryParseSchemaError (errorMessage) {
    try {
        // find the schema part
        const schemaErrorJson = errorMessage.replace(/^.+\n/, ''); // comes after the first line
        if (!schemaErrorJson) return null;
        const schemaError = JSON.parse(schemaErrorJson);
        return schemaError;
    } catch (err) {
        console.warn('Could not parse schema error', errorMessage, err); // eslint-disable-line no-console
        return null;
    }
}

export function fieldsToOrder (fields) {
    if (!Array.isArray(fields)) return [];
    return fields
        .filter(({ sorting }) => sorting !== 'none')
        .map(({ id, sorting }) => [id, sorting]);
}

export function fieldDiff (existing, changed) {
    const delta = {};
    if (!existing || typeof existing !== 'object') throw new Error('fieldDiff failed: no existing object loaded');
    const keySet = new Set(Object.keys(existing));
    if (!changed || typeof changed !== 'object') throw new Error('fieldDiff failed: changed object is not an object');
    for (const k in changed) keySet.add(k);
    for (const k of keySet) {
        if (!(k in changed)) continue; // field is not in the PATCH data so don't touch it
        if (!deepEq(existing[k], changed[k])) delta[k] = changed[k];
    }
    return delta;
}

/**
 * Converts client filters to an API JSON filter object.
 * @returns {null|Object}
 */
export function filtersToAPI (clientFilters, pfilters) {
    const filters = [];
    if (pfilters && !pfilters._disabled) {
        for (const filter in pfilters) {
            if (filter === '_disabled') continue;
            if (!(filter in clientFilters)) {
                throw { code: 'unknown-filter', message: `unknown filter ${filter}`, extra: { filter } };
            }
            if (pfilters[filter].enabled) {
                filters.push(clientFilters[filter].toAPI(pfilters[filter].value));
            }
        }
    }
    if (filters.length) {
        // merge filters with no common keys
        let accum = {};
        let items = [accum];
        const split = () => items.push(accum = {});
        const queue = [...filters];
        while (queue.length) {
            const filter = queue.pop();
            for (const k in filter) {
                if (k === '$and') {
                    // also spill $and into the parent scope
                    queue.push(...filter[k]);
                } else {
                    if (accum[k]) split();
                    accum[k] = filter[k];
                }
            }
        }
        items = items.filter(f => Object.keys(f).length);

        return items.length === 1 ? items[0] : { $and: items };
    }
    return null;
}

/** Returns the given JSON filter added to the given filter parameter. */
export function addJSONFilter (filter, jsonFilter) {
    if (jsonFilter && !jsonFilter._disabled) {
        if (jsonFilter.error) throw jsonFilter.error;
        if (filter) {
            if (filter.$and) return { $and: [...filter.$and, jsonFilter.filter] };
            else return { $and: [filter, jsonFilter.filter] };
        } else return jsonFilter.filter;
    }
    return filter;
}

/** Converts params to request options. See e.g. task codeholders/list for details. */
export const makeParametersToRequestData = ({
    searchFieldToTransientFields,
    mapSearchField,
    handleSearchFields,
    clientFields,
    clientFilters,
    idFieldName,
    doesExtraFieldExist,
}) => params => {
    const options = {};
    const transientFields = [];

    const additionalData = {};

    if (params.search && params.search.query) {
        const searchField = params.search.field;

        // select search fields as temporary fields
        if (searchFieldToTransientFields) {
            transientFields.push(...(searchFieldToTransientFields[searchField] || [searchField]));
        } else {
            transientFields.push(searchField);
        }

        if (handleSearchFields) {
            const { search, data } = handleSearchFields(params.search);
            if (data) Object.assign(additionalData, data);
            options.search = search;
        } else {
            const transformedQuery = util.transformSearch(params.search.query);
            if (transformedQuery.length < 3) {
                throw { code: 'search-query-too-short', message: 'search query too short' };
            }
            if (!util.isValidSearch(transformedQuery)) {
                throw { code: 'invalid-search-query', message: 'invalid search query' };
            }
            const mappedSearchField = mapSearchField ? mapSearchField(searchField) : searchField;
            options.search = { str: transformedQuery, cols: [mappedSearchField] };
        }
    }

    // list of all fields that have been selected
    const fields = (params.fields || []).concat(transientFields.map(id => ({ id, sorting: 'none' })));

    for (const field of fields) {
        if (!(field.id in clientFields) && (doesExtraFieldExist ? !doesExtraFieldExist(field.id) : true)) {
            throw { code: 'unknown-field', message: `unknown field ${field.id}`, extra: { field: field.id } };
        }
        for (const required of (clientFields[field.id]?.requires || [])) {
            fields.push({ id: required, sorting: 'none' });
        }
    }

    options.order = fields
        .filter(({ sorting }) => sorting !== 'none')
        // some fields have multiple sub-fields that must be sorted individually
        .flatMap(({ id, sorting }) => typeof clientFields[id] === 'object'
            ? (clientFields[id].sort || clientFields[id].apiFields).map(id => [id, sorting])
            : [[clientFields[id], sorting]]);

    // order by relevance first if search is active
    if (options.search) {
        options.order.unshift(['_relevance', 'desc']);
    }

    options.fields = fields.flatMap(({ id }) => typeof clientFields[id] === 'object'
        ? clientFields[id].apiFields
        : clientFields[id] || id);

    options.fields.push(idFieldName || 'id'); // also select the ID field

    options.offset = params.offset | 0;
    options.limit = params.limit | 0;

    const apiFilter = filtersToAPI(clientFilters, params.filters);
    if (apiFilter) options.filter = apiFilter;

    options.filter = addJSONFilter(options.filter, params.jsonFilter);

    const usedFilters = options.filter && !!Object.keys(options.filter).length;

    return {
        options,
        usedFilters,
        transientFields,
        ...additionalData,
    };
};

/** converts from API repr to client repr */
export const makeClientFromAPI = (clientFields, strict) => (apiRepr, userData) => {
    const clientRepr = {};
    outer:
    for (const field in clientFields) {
        const spec = clientFields[field];

        if (strict) {
            const apiFields = typeof spec === 'string' ? [spec] : typeof spec.apiFields === 'string' ? [spec.apiFields] : spec.apiFields;
            for (const f of apiFields) {
                const field = f.split('.')[0];
                // check for missing api field
                if (!(field in apiRepr)) continue outer;
            }
        }

        clientRepr[field] = typeof spec === 'string' ? apiRepr[spec]
            : typeof spec.apiFields === 'string'
                ? apiRepr[spec.apiFields]
                : spec.fromAPI(apiRepr, userData);
    }
    return clientRepr;
};

export function coerceToNull (value) {
    if (value === null || value === undefined || value === '') return null;
    return value;
}

/** converts from client repr to api repr */
export const makeClientToAPI = clientFields => (clientRepr) => {
    const apiRepr = {};
    if (!clientRepr) return apiRepr;
    for (const field in clientFields) {
        const spec = clientFields[field];
        if (clientRepr[field] === undefined) {
            // do not have this field
            continue;
        }
        if (typeof spec === 'string') apiRepr[spec] = coerceToNull(clientRepr[field]);
        else if (typeof spec.apiFields === 'string') apiRepr[spec.apiFields] = coerceToNull(clientRepr[field]);
        else Object.assign(apiRepr, spec.toAPI(clientRepr[field], clientRepr));
    }
    return apiRepr;
};
