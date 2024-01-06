import { h } from 'preact';
import { CountryFlag } from './country';
import { parsePhoneNumber } from 'libphonenumber-js';

/** Renderer that uses libphonenumber (this is a separate module to allow lazy-loading). */
export default function PhoneNumber ({ value, allowInteractive }) {
    let number, trailing;
    try {
        const parsed = parsePhoneNumber(value.value);

        if (value.formatted) number = value.formatted;
        else number = parsed.format('INTERNATIONAL');

        if (parsed.country) {
            trailing = <CountryFlag country={parsed.country.toLowerCase()} />;
        }
    } catch {
        if (!value?.value) {
            number = '—';
            allowInteractive = false;
        } else number = (value?.value || value).toString(); // close enough, probably
    }

    return allowInteractive
        ? <a class="data phone-number" href={`tel:${value.value}`}>{number} {trailing}</a>
        : <span class="data phone-number not-interactive">{number}</span>;
}

