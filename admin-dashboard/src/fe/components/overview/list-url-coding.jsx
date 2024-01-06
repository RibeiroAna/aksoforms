// PARENTHESIS ENCODING
//
// Simple human-readable url-safe context-free string delimiter that puts as many parentheses on
// either side as necessary until the entire string is wrapped.
//
// Encoding begins with a variable number of ( and is closed with the same number of ) in a row.
// If the string begins with a ( itself, then a * is prepended. The first * after the opening
// parentheses is always ignored.
//
// The inner string will be URL-encoded.
//
// # Examples
// ```
// cats -> (cats)
// cats() -> ((cats()))
// cats(()) -> (((cats(()))))
// (cats) -> ((*(cats)))
// *cats -> (**cats)
// cats#% -> (cats%23%25)
// ```
export function encodeParens (str) {
    let parens = 1;

    if (str.startsWith('*') || str.startsWith('(')) {
        str = '*' + str;
    }

    str = encodeURIComponent(str);

    let streak = 0;
    for (const c of str) {
        if (c === ')') streak++;
        else streak = 0;
        parens = Math.max(parens, streak + 1);
    }

    return '('.repeat(parens) + str + ')'.repeat(parens);
}

// Returns an array: [string, length of parentheses encoding]. Ignores the rest
export function decodeParens (str) {
    let cursor = 0;
    let parens = 0;
    while (str[cursor] === '(') {
        cursor++;
        parens++;
    }
    if (str[cursor] === '*') cursor++;
    const headerSize = cursor;

    let streak = 0;
    let match = 0;
    while (cursor < str.length) {
        if (str[cursor] === '(') match++;
        else if (str[cursor] === ')' && match) match--;
        else if (str[cursor] === ')') streak++;
        else streak = 0;
        cursor++;
        if (streak === parens) {
            break;
        }
    }
    const decoded = decodeURIComponent(str.substring(headerSize, cursor - parens));
    return [decoded, cursor];
}

// Will only use parenthesis encoding if the string is deemed unsafe, i.e. if it may be ambiguous
// where the string ends in a given context
export function maybeEncodeParens (str, unsafeChars) {
    if (str.startsWith('(')) return encodeParens(str);
    for (const c of unsafeChars) if (str.includes(c)) return encodeParens(str);
    return encodeURIComponent(str);
}
export function maybeDecodeParens (str, unsafeChars) {
    if (str.startsWith('(')) {
        return decodeParens(str);
    } else {
        let s = '';
        for (const c of str) {
            if (unsafeChars.includes(c)) {
                break;
            }
            s += c;
        }
        return [decodeURIComponent(s), s.length];
    }
}

function serializeFilterValue (value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean' || typeof value === 'number') return value.toString();
    if (typeof value === 'undefined' || value === null) return '';
    throw new Error(`can’t serialize value of type ${typeof value} automatically`);
}
function deserializeFilterValue (value) {
    if (value === '') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    if ((+value).toString() === value) return +value;
    return value;
}

/** Returns an encoded string. */
export function encodeURLQuery (state, filters) {
    let data = '';
    if (state.search?.query) {
        // search(field, query)
        data += 'search(';
        data += maybeEncodeParens(state.search.field, ',)');
        data += ',';
        data += maybeEncodeParens(state.search.query, ')');
        data += ')';
    }
    if (state.jsonFilter && !state.jsonFilter._disabled) {
        // jsonFilter(data)
        // TODO: proper encoding
        // data += 'jsonFilter(';
        // data += encodeParens(state.jsonFilter.filter);
        // data += ')';
    }
    if (state.filters && !state.filters._disabled) {
        // filter(id:serialized, ...)
        data += 'filter(';
        let count = 0;
        for (const id in state.filters) {
            if (!state.filters[id].enabled) continue;
            if (count) data += ',';
            count++;
            data += maybeEncodeParens(id, ':),');
            data += ':';
            const serialized = filters[id].serialize
                ? filters[id].serialize(state.filters[id])
                : serializeFilterValue(state.filters[id].value);
            data += maybeEncodeParens(serialized, ':),');
        }
        // undo filter( if no filters are enabled
        if (!count) data = data.substr(0, data.length - 'filter('.length);
        else data += ')';
    }
    if (state.fields && state.fields.filter(x => !x.fixed || x.sorting !== 'none').length) {
        // fields(field:sorting, ...)
        data += 'fields(';
        let count = 0;
        for (const field of state.fields) {
            if (field.fixed && field.sorting === 'none') continue; // don’t need to encode fixed fields
            if (count) data += ',';
            count++;
            data += maybeEncodeParens(field.id, ':),');
            if (field.sorting !== 'none') {
                data += ':';
                data += maybeEncodeParens(field.sorting, ':),');
            }
        }
        data += ')';
    }
    if ('offset' in state) {
        // pos(offset, limit)
        data += 'pos(' + state.offset + ',' + state.limit + ')';
    }
    return data;
}

/** Decodes and returns a (partial, and possibly invalid) parameters object. */
export function decodeURLQuery (data, filters) {
    const parameters = {};
    while (data.length) {
        const section = data.match(/^(\w+)\(/);
        if (!section) throw new Error('invalid section header');
        data = data.substr(section[0].length);
        if (section[1] === 'search') {
            const [field, fieldLen] = maybeDecodeParens(data, ',)');
            data = data.substr(fieldLen + 1); // ,
            const [query, queryLen] = maybeDecodeParens(data, ')');
            data = data.substr(queryLen);
            parameters.search = { field, query };
        } else if (section[1] === 'jsonFilter') {
            const [filter, len] = decodeParens(data);
            data = data.substr(len);
            // TODO: decode this
            void filter;
            console.error('did not decode json filter because i didnt implement that yet'); // eslint-disable-line no-console
        } else if (section[1] === 'filter') {
            if (!parameters.filters) parameters.filters = {};
            while (data.length) {
                const [id, idLen] = maybeDecodeParens(data, ':),');
                data = data.substr(idLen + 1); // :
                const [serialized, serLen] = maybeDecodeParens(data, ':),');
                data = data.substr(serLen);

                const filter = filters[id] && filters[id].deserialize
                    ? filters[id].deserialize(serialized)
                    : { enabled: true, value: deserializeFilterValue(serialized) };

                parameters.filters[id] = filter;

                if (data[0] !== ',') break;
                else data = data.substr(1);
            }
        } else if (section[1] === 'fields') {
            if (!parameters.fields) parameters.fields = [];
            while (data.length) {
                const [id, idLen] = maybeDecodeParens(data, ':),');
                data = data.substr(idLen);

                if (data[0] === ':') {
                    data = data.substr(1);
                    const [sorting, sortingLen] = maybeDecodeParens(data, ':),');
                    data = data.substr(sortingLen);

                    if (id) parameters.fields.push({ id, sorting });
                } else if (id) {
                    parameters.fields.push({ id, sorting: 'none' });
                }

                if (data[0] !== ',') break;
                else data = data.substr(1);
            }
        } else if (section[1] === 'pos') {
            const match = data.match(/^(\d+),(\d+)/);
            if (!match) throw new Error('bad page section');
            data = data.substr(match[0].length);

            parameters.offset = +match[1];
            parameters.limit = +match[2];
        } else {
            throw new Error(`unknown section ${section[1]}`);
        }
        if (data[0] !== ')') throw new Error('section did not end with )');
        data = data.substr(1); // )
    }
    return parameters;
}

/** Applies the decoded partial parameters to a parameters object. */
export function applyDecoded (decoded, parameters, softInitial) {
    parameters = { ...parameters };
    if (decoded.search) parameters.search = decoded.search;
    else if (parameters.search) parameters.search.query = '';
    parameters.filters = { ...parameters.filters };
    if (decoded.filters) {
        parameters.filters._disabled = false;
        for (const id in decoded.filters) {
            parameters.filters[id] = decoded.filters[id];
        }
        for (const id in parameters.filters) {
            if (id === '_disabled') continue;
            if (!(id in decoded.filters)) parameters.filters[id].enabled = false;
        }
    } else if (!softInitial) {
        for (const id in parameters.filters) {
            if (id === '_disabled') continue;
            parameters.filters[id].enabled = false;
        }
    }
    if (decoded.jsonFilter) {
        // TODO
    }
    if (decoded.fields) {
        parameters.fields = parameters.fields.filter(x => x.fixed);
        const currentFieldIds = parameters.fields.map(x => x.id);
        for (const item of decoded.fields) {
            if (currentFieldIds.includes(item.id)) {
                const i = parameters.fields.findIndex(x => x.id === item.id);
                parameters.fields[i].sorting = item.sorting;
                continue;
            }
            currentFieldIds.push(item.id);
            parameters.fields.push(item);
        }
    }
    if ('offset' in decoded) parameters.offset = decoded.offset;
    if ('limit' in decoded) parameters.limit = decoded.limit;
    return parameters;
}
