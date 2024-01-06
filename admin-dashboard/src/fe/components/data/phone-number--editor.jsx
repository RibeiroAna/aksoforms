import { h } from 'preact';
import { TextField } from 'yamdl';
import { CountryFlag } from './country';
import { parsePhoneNumber, AsYouType as AsYouTypePhoneFmt } from 'libphonenumber-js';

/** Editor that uses libphonenumber (this is a separate module to allow lazy-loading). */
export default function PhoneNumberEditor ({ value, onChange, outline }) {
    if (!value || value.value === undefined) return null;
    const wholeValue = value;
    value = value.value;

    let trailing = '';
    try {
        const num = parsePhoneNumber(value);
        if (num.country) {
            trailing = <CountryFlag country={num.country.toLowerCase()} />;
        }
    } catch {
        // this comment exists because eslint
    }

    if (value && !value.startsWith('+')) value = '+' + value;
    if (value) value = value.replace(/^[+]+/g, '+');
    value = new AsYouTypePhoneFmt().input(value || '');

    return <TextField
        class="data phone-number-editor"
        value={value}
        outline={outline}
        onChange={value => onChange({ ...wholeValue, value: value.replace(/[^+\d]/g, '') || null })}
        type="tel"
        placeholder="+"
        maxLength="50"
        trailing={trailing}
        onFocus={() => (!value && onChange({ ...wholeValue, value: '+' }))}
        onBlur={() => (value.trim() === '+' && onChange({ ...wholeValue, value: null }))} />;
}
