//! Form editor model stuff.
import { evaluate } from '@tejo/akso-script';
import { formEditor as locale } from '../../locale';

// async import these (if it fails, oh well)
import('@tejo/akso-script/dist-esm/country_fmt');
import('@tejo/akso-script/dist-esm/phone_fmt');

/** Creates an input item of the given type. */
export function createInput (type) {
    let extra = {};
    if (type === 'number') extra = {
        variant: 'input',
        placeholder: null,
        step: null,
        min: null,
        max: null,
    };
    else if (type === 'text') extra = {
        placeholder: null,
        pattern: null,
        patternError: null,
        minLength: null,
        maxLength: null,
        variant: 'text',
        chAutofill: null,
    };
    else if (type === 'money') extra = {
        placeholder: null,
        step: null,
        min: null,
        max: null,
        currency: 'USD',
    };
    else if (type === 'enum') extra = {
        options: [{ name: '', value: '', disabled: false }],
        variant: 'select',
    };
    else if (type === 'country') extra = {
        exclude: [],
        chAutofill: null,
    };
    else if (type === 'date') extra = {
        min: null,
        max: null,
        chAutofill: null,
    };
    else if (type === 'time') extra = {
        min: null,
        max: null,
    };
    else if (type === 'datetime') extra = {
        tz: null,
        min: null,
        max: null,
    };
    else if (type === 'boolean_table') extra = {
        cols: 1,
        rows: 1,
        minSelect: null,
        maxSelect: null,
        headerTop: null,
        headerLeft: null,
        excludeCells: [],
    };

    return {
        el: 'input',
        type,
        name: '',
        label: '',
        description: null,
        default: type === 'boolean' ? false : null,
        hideIfDisabled: false,
        required: false,
        disabled: false,
        editable: true,
        ...extra,
    };
}

const MAX_EVAL_INVOCATIONS = 4096;
/**
 * Attempts to evaluate an AKSO Script expression.
 *
 * - previousNodes: array of { formVars: { [name]: { type, value } }, defs: script obj }
 */
export function evalExpr (expr, previousNodes) {
    if (!expr) return undefined;

    const defs = [];
    const formVars = {};
    if (previousNodes) {
        for (const item of previousNodes) {
            if (!item) continue;
            defs.push(item.defs);
            for (const fv of item.formVars) {
                formVars[fv.name] = fv.value;
            }
        }
    }
    const key = Symbol('eval result');
    defs.push({ [key]: expr });

    let invocations = 0;
    let result = undefined;
    try {
        result = evaluate(defs, key, id => (id in formVars) ? formVars[id] : null, {
            shouldHalt: () => {
                invocations++;
                return invocations > MAX_EVAL_INVOCATIONS;
            },
        });
    } catch (err) {
        console.debug(err); // eslint-disable-line no-console
    }

    return result;
}

/** Returns “global” definitions (e.g. @@-vars) */
export function getGlobalDefs (additionalVars) {
    return {
        defs: {},
        formVars: [
            {
                name: '@created_time',
                type: 'n',
                value: Math.round(new Date() / 1000),
            },
            {
                name: '@edited_time',
                type: 'n',
                value: Math.round(new Date() / 1000),
            },
            ...(additionalVars || []),
        ],
    };
}

/**
 * Returns all AKSO Script definitions in the given form item and its value (if applicable).
 *
 * Will return { defs: script defs, formVars: form vars object { [name]: { type, value } } }
 *
 * Form vars are in the same format as the ASC Editor
 */
export function getAscDefs (item, value) {
    if (item.el === 'script') {
        return { defs: item.script, formVars: [] };
    } else if (item.el === 'input') {
        let type = 'u';
        if (value === null || value === undefined) type = 'u';
        else if (item.type === 'boolean') {
            type = 'b';
        } else if (item.type === 'number') {
            type = 'n';
        } else if (item.type === 'text') {
            type = 's';
        } else if (item.type === 'money') {
            type = 'n';
        } else if (item.type === 'enum') {
            type = 's';
        } else if (item.type === 'country') {
            type = 's';
        } else if (item.type === 'date') {
            type = 's';
        } else if (item.type === 'time') {
            type = 's';
        } else if (item.type === 'datetime') {
            type = 'timestamp';
        } else if (item.type === 'boolean_table') {
            type = 'm';
        }

        return { defs: {}, formVars: [{ name: item.name, type, value }] };
    }
    return { defs: {}, formVars: [] };
}

/** Validates the form input value. Returns null if valid, or an error if not. */
export function validateFormInput (item, previousNodes, value) {
    const props = ['default', 'required', 'disabled'];
    const resolved = {};
    for (const prop of props) {
        if (item[prop] && typeof item[prop] === 'object') {
            // this is an AKSO Script expression (probably)
            resolved[prop] = evalExpr(item[prop], previousNodes);
        } else {
            resolved[prop] = item[prop];
        }
    }

    const hasValue = item.type === 'boolean'
        ? value
        : value !== null && value !== undefined;

    if (resolved.required && !hasValue) {
        return locale.errors.fieldIsRequired;
    }
    if (!hasValue) return null;

    if (item.type === 'number' || item.type === 'money') {
        if (item.step !== null && value % item.step !== 0) {
            return locale.errors.numericStep(item.step);
        }

        const rangeErr = (item.min !== null && value < item.min)
            || (item.max !== null && value > item.max);
        if (rangeErr) return locale.errors.numericRange(item.min, item.max);
    }

    if (item.type === 'text') {
        if (item.pattern !== null) {
            let valid = false;
            try {
                valid = new RegExp(item.pattern).test(value);
            } catch { /* nothing */ }
            if (!valid) return item.patternError || locale.errors.textPatternGeneric;
        }

        const rangeErr = (item.minLength !== null && value.length < item.minLength)
            || (item.maxLength !== null && value.length > item.maxLength);
        if (rangeErr) return locale.errors.textLenRange(item.minLength, item.maxLength);
    }

    if (item.type === 'enum') {
        let found = false;
        for (const option of item.options) {
            if (option.value === value) {
                found = true;
                break;
            }
        }
        if (!found) return locale.errors.enumNotInSet;
    }

    if (item.type === 'date') {
        const date = new Date(value);
        if (!date) return locale.errors.dateTimeInvalid;

        const rangeErr = (item.min !== null && date < new Date(item.min))
            || (item.max !== null && date > new Date(item.max));
        // TODO: format
        if (rangeErr) return locale.errors.dateTimeRange(item.min, item.max);
    }

    if (item.type === 'time' || item.type === 'datetime') {
        // might not need validation here at all?
    }

    if (item.type === 'boolean_table') {
        let selected = 0;
        for (let i = 0; i < item.rows; i++) {
            for (let j = 0; j < item.cols; j++) {
                if (value[i] && value[i][j]) selected++;
            }
        }

        const rangeErr = (item.minSelect !== null && selected < item.minSelect)
            || (item.maxSelect !== null && selected > item.maxSelect);
        if (rangeErr) return locale.errors.boolTableSelectRange(item.minSelect, item.maxSelect);
    }

    return null;
}

/**
 * Validates the form input value for basic requirements.
 * Returns null if valid, or an error if not.
 */
export function validateFormInputBaseRequirements (item, previousNodes, value) {
    if (value === null) return null;

    if (item.type === 'text') {
        if (item.variant === 'textarea') {
            if (!value || value.length > 8192) return locale.errors.textLenRange(1, 8192);
        } else {
            if (value.includes('\n')) return locale.errors.textPatternGeneric;
            if (!value || value.length > 2048) return locale.errors.textLenRange(1, 2048);
        }
    } else if (item.type === 'country') {
        if (item.exclude.includes(value)) return locale.errors.enumNotInSet;
    }

    return null;
}
