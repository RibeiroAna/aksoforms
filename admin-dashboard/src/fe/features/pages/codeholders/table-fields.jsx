import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import ResizeObserver from 'resize-observer-polyfill';
import PersonIcon from '@material-ui/icons/Person';
import BusinessIcon from '@material-ui/icons/Business';
import { CodeholderDisabledIcon } from '../../../components/icons';
import MembershipChip from '../../../components/membership-chip';
import DomainDisabledIcon from '@material-ui/icons/DomainDisabled';
import { UEACode as AKSOUEACode } from '@tejo/akso-client';
import moment from 'moment';
import { codeholders as locale, timestampFormat } from '../../../locale';
import { ueaCode, date, email, timestamp, phoneNumber } from '../../../components/data';
import { WithCountries, CountryFlag } from '../../../components/data/country';
import './table-fields.less';

function getCountries (core, locale = 'eo') {
    return new Promise((resolve, reject) => {
        const dv = core.createDataView('countries/countries', { locales: [locale] });
        dv.on('update', data => {
            if (data !== null) {
                for (const k in data) {
                    if (!(`name_${locale}` in data[k])) {
                        return; // not ready yet
                    }
                    break;
                }
                dv.drop();
                resolve(data);
            }
        });
        dv.on('error', () => {
            dv.drop();
            reject();
        });
    });
}

// TODO: order fields in some sensible order
// TODO: update these for the new API

/** List of all member fields. */
export default {
    type: {
        sortable: true,
        weight: 0.5,
        slot: 'title',
        component ({ value, item, slot }) {
            let icon;
            if (!value) return <span class="codeholder-type-placeholder" />;
            const { enabled, isDead } = item;
            if (value === 'human' && enabled !== false) icon = <PersonIcon />;
            else if (enabled !== false) icon = <BusinessIcon />;
            else if (value === 'human') icon = <CodeholderDisabledIcon />;
            else icon = <DomainDisabledIcon />;

            let title = locale.fields.types[value];
            if (enabled === false && isDead === false) title += ` (${locale.fields.disabledTitle})`;
            else if (enabled === false) title += ` (${locale.fields.deadTitle})`;

            const withLabel = slot !== 'title' && slot !== 'table';

            return (
                <span
                    class={'codeholder-type' + (enabled === false ? ' disabled' : '') + (withLabel ? ' with-label' : '')}
                    title={title}>
                    <span class="codeholder-type-icon">{icon}</span>
                    <span class="codeholder-type-label">{title}</span>
                </span>
            );
        },
        stringify (value, item) {
            const { enabled, isDead } = item;

            let title = locale.fields.types[value];
            if (!enabled && !isDead) title += ` (${locale.fields.disabledTitle})`;
            else if (!enabled) title += ` (${locale.fields.deadTitle})`;

            return title;
        },
    },
    code: {
        sortable: true,
        slot: 'title',
        component ({ value, slot }) {
            if (!value) return null;
            const { old: oldCode, new: newCode } = value;
            if (slot === 'title' || oldCode === newCode) {
                return <ueaCode.inlineRenderer value={newCode} />;
            }
            return <ueaCode.inlineRenderer value={newCode} value2={oldCode} />;
        },
        stringify (value) {
            if (!value) return null;
            const { old: oldCode, new: newCode } = value;
            if (oldCode && oldCode !== newCode) {
                const oldCodeCheckLetter = new AKSOUEACode(oldCode).getCheckLetter();
                return `${newCode} (${oldCode}-${oldCodeCheckLetter})`;
            } else return newCode;
        },
    },
    name: {
        sortable: true,
        weight: 2,
        slot: 'title',
        component: class Name extends PureComponent {
            state = {
                truncatingMaxWidth: 999,
            };

            node = null;
            prefixName = null;
            fixedName = null;

            resizeObserver = new ResizeObserver(() => {
                if (!this.node) return;
                const containerWidth = this.node.offsetWidth;
                const prefixWidth = this.prefixName ? this.prefixName.offsetWidth : 0;
                const fixedWidth = this.fixedName.offsetWidth;
                this.setState({
                    truncatingMaxWidth: containerWidth - fixedWidth - prefixWidth,
                });
            });

            render ({ value, item }) {
                if (!value) return null;
                const { type, isDead } = item;

                const guessedType = type ? type
                    : (typeof value !== 'object') ? null
                        : ('firstLegal' in value) ? 'human'
                            : ('full' in value) ? 'org' : null;

                if (guessedType === 'human') {
                    const { honorific, first: f, firstLegal, last: l, lastLegal } = value;
                    const first = f || firstLegal;
                    const last = l || lastLegal;
                    return (
                        <span
                            class={'codeholder-name' + (isDead ? ' is-dead' : '')}
                            title={`${honorific ? honorific + ' ' : ''}${first} ${last}`}
                            ref={node => {
                                this.node = node;
                                if (node) this.resizeObserver.observe(node);
                            }}>
                            <span class="honorific" ref={node => {
                                this.prefixName = node;
                                if (node) this.resizeObserver.observe(node);
                            }}>
                                {honorific ? honorific + '\u00a0' : ''}
                            </span>
                            <span class="first-name" style={{
                                maxWidth: Math.max(8, this.state.truncatingMaxWidth),
                            }}>
                                {first}
                            </span> <span class="last-name" ref={node => {
                                this.fixedName = node;
                                if (node) this.resizeObserver.observe(node);
                            }}>
                                {last}
                            </span>
                        </span>
                    );
                } else if (guessedType === 'org') {
                    const { full, abbrev } = value;

                    return (
                        <span
                            class={'codeholder-name' + (isDead ? ' is-dead' : '')}
                            title={`${full} ${abbrev}`}
                            ref={node => {
                                this.node = node;
                                if (node) this.resizeObserver.observe(node);
                            }}>
                            <span
                                class="org-full-name"
                                ref={node => this.truncatingName = node}>
                                {full}
                            </span> <span className="org-abbrev" ref={node => {
                                this.fixedName = node;
                                if (node) this.resizeObserver.observe(node);
                            }}>
                                {abbrev ? `(${abbrev})` : ''}
                            </span>
                        </span>
                    );
                } else {
                    return <span class="codeholder-name"></span>;
                }
            }
        },
        stringify (value, item) {
            const { type } = item;
            if (type === 'human') {
                const { first, firstLegal, last, lastLegal, honorific } = value;
                const f = first || firstLegal || '';
                const l = last || lastLegal || '';
                return `${(honorific ? (honorific + ' ') : '')}${f} ${l}`;
            } else if (type === 'org') {
                return value.full + (value.abbrev ? ` (${value.abbrev})` : '');
            } else {
                throw new Error('unknown codeholder type');
            }
        },
    },
    age: {
        sortable: true,
        component ({ value, item }) {
            if (!value) return null;
            const { now, atStartOfYear } = value;
            if (typeof now !== 'number') return null;
            const label = locale.fields.ageFormat(now, atStartOfYear, item.isDead);
            return <span class="codeholder-age">{label}</span>;
        },
        stringify (value, item) {
            if (!value) return '';
            const { now, atStartOfYear } = value;
            if (!now) return null;
            return locale.fields.ageFormat(now, atStartOfYear, item.isDead);
        },
    },
    membership: {
        weight: 2,
        component ({ value }) {
            if (!value) return null;
            return (
                <span class="codeholder-memberships">
                    {value.map(item => (
                        <MembershipChip
                            class="membership-item"
                            key={`${item.categoryId}-${item.year}`}
                            abbrev={item.nameAbbrev}
                            name={item.name}
                            year={item.year}
                            givesMembership={item.givesMembership}
                            lifetime={item.lifetime} />
                    ))}
                </span>
            );
        },
        stringify (value) {
            if (!value) return '';
            return value.map(item => `${item.nameAbbrev}${item.year}`).join(', ');
        },
    },
    country: {
        weight: 1.5,
        sortable: true,
        slot: 'titleAlt',
        component ({ item, slot }) {
            const { feeCountry, address } = item;
            const addressCountry = address ? address.countryLatin : null;

            const showName = slot !== 'titleAlt';

            if (!feeCountry || !addressCountry || feeCountry === addressCountry) {
                const country = addressCountry || feeCountry;
                if (!country) return '';

                if (!showName) return <CountryFlag country={country} />;

                return (
                    <WithCountries>
                        {countries => {
                            const name = countries[country].name_eo;
                            return <span><CountryFlag country={country} /> {name}</span>;
                        }}
                    </WithCountries>
                );
            } else {
                if (!showName) return (
                    <span>
                        <CountryFlag country={addressCountry} />
                        <CountryFlag country={feeCountry} />
                    </span>
                );

                return (
                    <WithCountries>
                        {countries => {
                            const feeCountryName = countries[feeCountry].name_eo;
                            const countryName = countries[addressCountry].name_eo;
                            return (
                                <span>
                                    {locale.fields
                                        .disjunctCountry(feeCountryName, countryName)}
                                </span>
                            );
                        }}
                    </WithCountries>
                );
            }
        },
        stringify: async (value, item, fields, options, core) => {
            const { feeCountry, address } = item;
            const addressCountry = address ? address.countryLatin : null;
            const countries = await getCountries(core);

            const cl = 'name_' + options.countryLocale;

            if (!feeCountry || !addressCountry || feeCountry === addressCountry) {
                const country = addressCountry || feeCountry;
                if (!country) return '';
                return country.toUpperCase() + ' ' + countries[country][cl];
            } else {
                const feeCountryName = feeCountry.toUpperCase() + ' ' + countries[feeCountry][cl];
                const countryName = addressCountry.toUpperCase() + ' ' + countries[addressCountry][cl];
                return locale.fields.disjunctCountryCSV(feeCountryName, countryName);
            }
        },
    },
    birthdate: {
        sortable: true,
        component: date.inlineRenderer,
        stringify (value) {
            return value ? moment(value).format('YYYY-MM-DD') : '';
        },
    },
    deathdate: {
        sortable: true,
        component: date.inlineRenderer,
        stringify (value) {
            return value ? moment(value).format('YYYY-MM-DD') : '';
        },
    },
    email: {
        weight: 2,
        component: email.inlineRenderer,
        stringify (value) {
            return value;
        },
    },
    address: {
        weight: 2,
        sortable: true,
        component ({ value, fields: selectedFields }) {
            if (!value) value = {};

            const streetAddress = (value.streetAddressLatin || '').split('\n');
            const showCity = !selectedFields.includes('addressCity');
            const showCountryArea = !selectedFields.includes('addressCountryArea');
            const city = showCity ? value.cityLatin : '';
            const countryArea = showCountryArea ? value.countryAreaLatin : '';
            const showCountry = !selectedFields.includes('country');
            const country = showCountry
                ? (<WithCountries>{countries => countries[value.country]?.name_eo}</WithCountries>)
                : '';

            const addressPseudolines = [
                ...streetAddress,
                [
                    [value.postalCodeLatin, value.cityAreaLatin].filter(x => x).join(' '),
                    city,
                ].filter(x => x).join(', '),
                countryArea,
                country,
            ].filter(x => x).map((x, i) =>
                (<span class="address-pseudoline" key={i}>{x}</span>));

            return (
                <div class="codeholder-address">
                    {addressPseudolines}
                </div>
            );
        },
        stringify: async (value = {}, item, fields, options, core) => {
            let addr = {};
            if (options.useNative) {
                for (const k in value) {
                    if (k.endsWith('Latin')) {
                        addr[k.substr(0, k.length - 5)] = value[k];
                    }
                }
            } else {
                addr = value;
            }

            const countryLocale = options.countryLocale || 'eo';

            const streetAddress = (addr.streetAddress || '').split('\n');
            const showCity = !fields.includes('addressCity');
            const showCountryArea = !fields.includes('addressCountryArea');
            const city = showCity ? value.city : '';
            const countryArea = showCountryArea ? value.countryArea : '';
            const showCountry = !fields.includes('country');
            const countries = await getCountries(core, countryLocale);
            const country = (showCountry && countries[value.country]) ? countries[value.country]['name_' + countryLocale] : '';

            const addressPseudolines = [
                ...streetAddress,
                [
                    [value.postalCode, value.cityArea].filter(x => x).join(' '),
                    city,
                ].filter(x => x).join(', '),
                countryArea,
                country,
            ].filter(x => x);

            return addressPseudolines.join(', ');
        },
    },
    addressCity: {
        sortable: true,
        component ({ item }) {
            return <span class="codeholder-address-city">{item.address.cityLatin}</span>;
        },
        stringify (value, item) {
            return item.address.cityLatin;
        },
    },
    addressCountryArea: {
        sortable: true,
        component ({ item }) {
            return <span class="codeholder-address-country-area">{item.address.countryAreaLAtin}</span>;
        },
        stringify (value, item) {
            return item.address.countryAreaLatin;
        },
    },
    officePhone: {
        component: phoneNumber.inlineRenderer,
        stringify (value) {
            if (!value) return '';
            return value.formatted;
        },
    },
    cellphone: {
        component: phoneNumber.inlineRenderer,
        stringify (value) {
            if (!value) return '';
            return value.formatted;
        },
    },
    landlinePhone: {
        component: phoneNumber.inlineRenderer,
        stringify (value) {
            if (!value) return '';
            return value.formatted;
        },
    },
    profession: {
        component ({ value }) {
            return <span class="codeholder-profession">{value}</span>;
        },
        stringify (value) {
            return value;
        },
    },
    creationTime: {
        weight: 2,
        sortable: true,
        component ({ value }) {
            if (!value) return null;
            return <timestamp.renderer value={value} />;
        },
        stringify (value) {
            return moment(value * 1000).utc().format(timestampFormat);
        },
    },
    notes: {
        hide: true,
    },
};
