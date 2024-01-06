//! The AKSO perms solver.
//!
//! Permissions and member fields are treated as one to make the logic easier to write.
//! Member fields are referred to like `@.name.r` for `name: 'r'`.
//! Additionally, permissions will be treated like a Set instead of an array internally.
//! For simplicity, this representation is referred to as `xperms` in the code.

import {
    memberFields as fieldsSpec,
    reverseMap,
    reverseImplicationGraph,
    reverseFieldsImplicationGraph,
    reverseRequirementGraph, memberFields,
} from '../../../../permissions';

/** Pops an item from the permission path. */
export function pop (perm) {
    return perm.substr(0, perm.lastIndexOf('.'));
}

/** Pushes an item to the permission path. */
function push (perm, part) {
    if (!perm) return part;
    return perm + '.' + part;
}

/** Clones xperms. */
function clone (xperms) {
    return new Set([...xperms]);
}

/** Decodes an xperms-encoded field. Returns the field and the read or write flag. */
function xpDecodeField (id) {
    if (!id.startsWith('@.')) throw new Error('invalid argument to xpDecodeField: should start with @.');
    const parts = id.split('.');
    return [parts.slice(1, parts.length - 1).join('.'), parts[parts.length - 1]];
}
/** Encodes a field in the xperms format. */
function xpEncodeField (field, flag) {
    return `@.${field}.${flag}`;
}

/** Converts regular perms and member fields to xperms. */
function toXPerms (perms, fields) {
    const xperms = new Set();
    for (const p of perms) xperms.add(p);
    if (fields === null) {
        // wildcard
        xperms.add('@.*');
    } else {
        for (const field in fields) {
            const flag = fields[field];
            if (flag.includes('r')) xperms.add(xpEncodeField(field, 'r'));
            if (flag.includes('w')) xperms.add(xpEncodeField(field, 'w'));
        }
    }
    return xperms;
}
/** Converts xperms to regular perms and member fields. */
function fromXPerms (xperms) {
    const perms = [];
    const fields = xperms.has('@.*') ? null : {};
    for (const p of xperms) {
        if (p.startsWith('@.')) {
            if (fields) {
                const [field, flag] = xpDecodeField(p);
                const hadRead = (fields[field] || '').includes('r');
                const hadWrite = (fields[field] || '').includes('w');
                const hasRead = flag === 'r' || hadRead;
                const hasWrite = flag === 'w' || hadWrite;
                fields[field] = (hasRead ? 'r' : '') + (hasWrite ? 'w' : '');
            } else if (p !== '@.*') {
                throw new Error('internal inconsistency: field wildcard present but did not delete field perm ' + p);
            }
        } else {
            perms.push(p);
        }
    }
    return [perms, fields];
}

/** Returns true if the given permission is a wildcard. */
function isWildcard (id) {
    return id.split('.').pop() === '*';
}

/** Returns all wildcards that could affect the given perm. */
function wildcardCandidates (id) {
    const candidates = [];
    while (id) {
        id = pop(id);
        candidates.push(push(id, '*'));
    }
    return candidates;
}

/** Returns true if the given permission is currently active. */
function isActive (xperms, id) {
    if (xperms.has(id)) return true;
    if (id.startsWith('@.')) {
        // this is a field; there is only one possible wildcard here
        return xperms.has('@.*');
    } else if (id !== '*') {
        // this is a normal permission; might be implied by a wildcard
        const closestWildcardId = id.endsWith('.*')
            ? push(pop(pop(id)), '*')
            : push(pop(id), '*');
        // we don’t need to check the parents because this is a recursive call
        return isActive(xperms, closestWildcardId);
    } else {
        return false;
    }
}

/** Returns a set of permissions that are currently directly implying the given permission. */
function reverseImplications (xperms, id, includeWildcards = true) {
    const revImplies = new Set();
    if (id.startsWith('@.')) {
        // this is a field
        const [field, flag] = xpDecodeField(id);
        const fieldMap = reverseFieldsImplicationGraph.get(field);
        if (fieldMap) {
            const flagMaps = [];
            flagMaps.push(fieldMap.get(flag));
            // write always implies read, so we need to consider that too
            if (flag === 'r') flagMaps.push(fieldMap.get('w'));
            for (const flagMap of flagMaps) {
                if (!flagMap) continue;
                for (const perm of flagMap) {
                    if (isActive(xperms, perm)) {
                        revImplies.add(perm);
                    }
                }
            }
        }
    } else {
        // this is a regular permission
        const permSet = reverseImplicationGraph.get(id);
        if (permSet) {
            for (const perm of permSet) {
                if (isWildcard(perm) && !includeWildcards) continue;
                if (isActive(xperms, perm)) revImplies.add(perm);
            }
        }
    }
    return revImplies;
}

/**
 * Explodes a wildcard into its components, i.e. all permissions that would be granted
 * automatically by a wildcard are now granted manually. The wildcard is removed.
 * This action is a no-op if the wildcard permission isn’t present.
 * Sub-wildcards will remain sub-wildcards.
 */
function explodeWildcard (xperms, id) {
    if (!xperms.has(id)) return xperms; // skip everything if the wildcard isn’t present
    xperms = clone(xperms);
    xperms.delete(id); // delete wildcard
    // find all perms that would be matched
    const idWithoutWildcard = pop(id);
    const permsToConsider = permsByPrefix(idWithoutWildcard);
    // prefer wildcards by sorting them to come first
    permsToConsider.sort(a => a.includes('*') ? -1 : 1);
    for (const p of permsToConsider) {
        // do not match the wildcard itself
        if (p === id) continue;
        if (!isActive(xperms, p)) xperms.add(p);
    }
    return xperms;
}

/**
 * Returns all perms in the reverseMap that match the given prefix path.
 *
 * for a prefix `a.b`, this includes permissions like `a.b.*`, `a.b.c.d`, but not `a.b`.
 */
function permsByPrefix (prefix) {
    const perms = [];
    for (const k in reverseMap) {
        if (!prefix || (k.startsWith(prefix) && k.substr(prefix.length)[0] === '.')) {
            perms.push(k);
        }
    }
    return perms;
}

/** Deletes all perms that would match the given prefix. Also see permsByPrefix. */
function deleteByPrefix (xperms, prefix, ignoreFields) {
    xperms = clone(xperms);
    for (const p of [...xperms]) {
        if (ignoreFields && p.startsWith('@.')) continue;
        if (!prefix || p.startsWith(prefix) && p.substr(prefix.length)[0] === '.') {
            xperms.delete(p);
        }
    }
    return xperms;
}

/** Checks that all requirements for a node are met, and if not, removes it. */
function checkRequirements (xperms, id) {
    const mapItem = reverseMap[id];
    let broken = false;
    if (mapItem && mapItem.requires) {
        for (const p of mapItem.requires) {
            if (!isActive(xperms, p)) {
                broken = true;
                break;
            }
        }
    }
    if (broken) return remove(xperms, id);
    return xperms;
}

/** Adds a permission. */
function add (xperms, id) {
    xperms = clone(xperms);

    if (isWildcard(id)) {
        // delete all perms covered by this wildcard
        // but not fields! fields aren't implied automatically
        xperms = deleteByPrefix(xperms, pop(id), true);
    }

    // only add if it isn’t already active to prevent wildcards from being useless
    if (!isActive(xperms, id)) xperms.add(id);

    if (isWildcard(id)) {
        // propagate implications
        for (const p of permsByPrefix(pop(id))) {
            if (p === id) continue;
            xperms = add(xperms, p);
        }
    }

    // propagate manual implications
    const mapItem = reverseMap[id];
    if (mapItem && mapItem.node && mapItem.node.implies) {
        for (const impliedPerm of mapItem.node.implies) {
            xperms = add(xperms, impliedPerm);
        }
    }
    if (mapItem && mapItem.node && mapItem.node.impliesFields) {
        for (const field in mapItem.node.impliesFields) {
            const flags = mapItem.node.impliesFields[field].split('');
            for (const flag of flags) {
                xperms = add(xperms, xpEncodeField(field, flag));
            }
        }
    }
    if (id.startsWith('@.')) {
        // this is a field
        const [field, flag] = xpDecodeField(id);
        if (flag === 'w') {
            // also add r
            xperms = add(xperms, xpEncodeField(field, 'r'));
        }
        const fieldInfo = memberFields[field];
        if (fieldInfo && fieldInfo.impliesFields) {
            for (const field of fieldInfo.impliesFields) {
                xperms = add(xperms, xpEncodeField(field, flag));
            }
        }
    }

    return xperms;
}

/** Removes a permission. */
function remove (xperms, id) {
    xperms = clone(xperms);

    // do not remove if manually implied
    const revImplies = reverseImplications(xperms, id, false);
    for (const p of revImplies) {
        xperms = remove(xperms, p);
    }

    // explode the closest wildcard
    for (const candidate of wildcardCandidates(id).reverse()) {
        if (candidate !== id && xperms.has(candidate)) {
            xperms = explodeWildcard(xperms, candidate);
        }
    }

    xperms.delete(id);

    if (id.startsWith('@.')) {
        // this is a field
        const [field, flag] = xpDecodeField(id);
        if (flag === 'r') {
            // also remove w
            xperms = remove(xperms, xpEncodeField(field, 'w'));
        }
    }

    // also check perms that require this perm
    const revRequires = reverseRequirementGraph.get(id);
    if (revRequires) {
        for (const p of revRequires) {
            xperms = checkRequirements(xperms, p);
        }
    }

    return xperms;
}

/** Adds a permission. */
export function addPermission (permissions, memberFields, perm) {
    if (perm.startsWith('@.')) throw new Error('Malformed permission: cannot start with @.');
    let xperms = toXPerms(permissions, memberFields);
    xperms = add(xperms, perm);
    return fromXPerms(xperms);
}

/** Removes a permission. */
export function removePermission (permissions, memberFields, perm) {
    if (perm.startsWith('@.')) throw new Error('Malformed permission: cannot start with @.');
    let xperms = toXPerms(permissions, memberFields);
    xperms = remove(xperms, perm);
    return fromXPerms(xperms);
}

/** Returns whether or not a permission is active. */
export function hasPermission (permissions, memberFields, perm) {
    return isActive(toXPerms(permissions, memberFields), perm);
}

/** Returns true if the given permission is not known to the permissions tree. */
export function isPermissionUnknown (perm) {
    // check the reverse map
    // special case for perm.country: we will ignore all children, since they're proobably a country
    return !reverseMap[perm] && reverseMap[pop(perm) + '.*']?.node?.type !== 'perm.country';
}

/** Adds a member field. */
export function addMemberField (permissions, memberFields, field, flags) {
    let xperms = toXPerms(permissions, memberFields);
    const fieldSpec = fieldsSpec[field];
    for (const f of fieldSpec.fields) {
        for (const flag of flags.split('')) {
            xperms = add(xperms, xpEncodeField(f, flag));
        }
    }
    if (fieldSpec.impliesFields) {
        for (const field of fieldSpec.impliesFields) {
            for (const flag of flags.split('')) {
                xperms = add(xperms, xpEncodeField(field, flag));
            }
        }
    }
    return fromXPerms(xperms);
}

/** Removes a member field. */
export function removeMemberField (permissions, memberFields, field, flags) {
    let xperms = toXPerms(permissions, memberFields);
    const fieldSpec = fieldsSpec[field];
    for (const f of fieldSpec.fields) {
        for (const flag of flags.split('')) {
            xperms = remove(xperms, xpEncodeField(f, flag));
        }
    }
    return fromXPerms(xperms);
}

/** Returns whether the given member field permissions are fully fulfilled for the given flag. */
export function hasMemberField (permissions, memberFields, field, flags) {
    const xperms = toXPerms(permissions, memberFields);
    const fieldSpec = fieldsSpec[field];
    for (const f of fieldSpec.fields) {
        for (const flag of flags.split('')) {
            if (!isActive(xperms, xpEncodeField(f, flag))) return false;
        }
    }
    return true;
}
