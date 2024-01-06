import address from './address';
import apiKey from './apikey';
import country from './country';
import currencyAmount from './currency-amount';
import date from './date';
import email from './email';
import org from './org';
import phoneNumber from './phone-number';
import ueaCode from './uea-code';
import time from './time';
import timespan from './timespan';
import timestamp from './timestamp';

import Required from './required';
export { Required };

import './style.less';

let didDisplayDeprecationWarning = false;

/**
 * Data types.
 *
 * # Items
 * Each item in this object describes a data type as follows:
 *
 * ### Item Properties
 * - `renderer`: a component that renders the item.
 * - `inlineRenderer`: a component (possibly the same as `renderer`) that renders the item as an
 *   inline block and without any sort of interactivity.
 * - `editor`: Form (uppercase F!) field that provides an editor for this data type
 *
 * Renderers must have a `value` prop, and editors must have both `value` and `onChange`.
 *
 * Multi-field renderers may also accept `valuek` for k ∈ ℕ \ {0, 1}.
 */
export default new Proxy({
    address,
    country,
    date,
    email,
    phoneNumber,
    ueaCode,
    timestamp,
}, {
    get (target, prop, receiver) {
        if (!didDisplayDeprecationWarning) {
            console.warn('Deprecated usage of default components/data export; use named exports instead'); // eslint-disable-line no-console
            didDisplayDeprecationWarning = true;
        }
        return Reflect.get(target, prop, receiver);
    },
});

export {
    address,
    apiKey,
    country,
    currencyAmount,
    date,
    email,
    org,
    phoneNumber,
    ueaCode,
    time,
    timespan,
    timestamp,
};
