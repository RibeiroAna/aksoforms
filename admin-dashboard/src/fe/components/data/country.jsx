//! Country utilities.

import { h } from 'preact';
import Select from '../controls/select';
import TinyProgress from '../controls/tiny-progress';
import { connect } from '../../core/connection';
import './style.less';

/** Converts a letter to a regional indicator. */
const toRI = v => String.fromCodePoint(v.toLowerCase().charCodeAt(0) - 0x60 + 0x1f1e5);
/** Converts a two-letter country code to its corresponding emoji. */
const countryCodeToEmoji = code => toRI(code[0]) + toRI(code[1]);

/** Renders a country, flag given a country code. Use prop `country`. */
export function CountryFlag ({ country }) {
    // TODO: use twemoji
    if (!country) return null;
    return <span class="data country-flag">{countryCodeToEmoji(country)}</span>;
}

/** Renders its inner function (children) with countries and country groups as parameters. */
export const WithCountries = connect('countries/countryGroups')(data => ({
    countryGroups: data,
}))(connect('countries/countries')(data => ({
    countries: data,
}))(function WithCountries ({ countries, countryGroups, children, fallback }) {
    if (countries && countryGroups) return children(countries, countryGroups);
    return fallback || null;
}));

/** Renders a country flag and the name beside it. */
function CountryRenderer ({ value }) {
    if (!value) return null;
    return (
        <WithCountries fallback={<TinyProgress />}>{countries => countries[value] ? (
            <span class="data country"><CountryFlag country={value} /> {countries[value].name_eo}</span>
        ) : null}</WithCountries>
    );
}

/** Renders a countries dropdown. */
export function CountryEditor ({ value, onChange, disabled, emptyLabel }) {
    return (
        <div class="data country-editor">
            <WithCountries fallback={<TinyProgress />}>
                {countries => (
                    <Select
                        disabled={disabled}
                        value={value}
                        onChange={value => onChange(value || null)}
                        items={[{ value: '', label: emptyLabel || '—' }].concat(Object.entries(countries)
                            .map(([id, names]) => ({
                                value: id,
                                label: names.name_eo,
                            })))} />
                )}
            </WithCountries>
        </div>
    );
}

export default {
    renderer: CountryRenderer,
    inlineRenderer: CountryRenderer,
    editor: CountryEditor,
};
