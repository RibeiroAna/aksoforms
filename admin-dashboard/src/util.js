//! Random utilities.

/**
 * merges like object.assign, but deep
 * may or may not mutate a
 */
export function deepMerge (a, b) {
    if (b === undefined) return a;
    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
        if (a instanceof Buffer || b instanceof Buffer) return b;
        if (Array.isArray(a) || Array.isArray(b)) return b;
        for (const k in b) a[k] = deepMerge(a[k], b[k]);
        return a;
    } else return b;
}

function isArrayLike (x) {
    return Array.isArray(x) || x instanceof Uint8Array;
}

export function deepEq (a, b) {
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
        if (a === b) return true; // we can skip all of this if it’s identical

        if (a instanceof Date && b instanceof Date) {
            return +a === +b;
        } else if (isArrayLike(a) && isArrayLike(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!deepEq(a[i], b[i])) return false;
            }
        } else {
            for (const k in a) {
                if (!(k in b)) return false;
            }
            for (const k in b) {
                if (!(k in a)) return false;
                if (!deepEq(a[k], b[k])) return false;
            }
        }
        return true;
    } else if (Number.isNaN(a) && Number.isNaN(b)) return true;
    else return a === b;
}
