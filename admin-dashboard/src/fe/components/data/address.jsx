import { h, Component } from 'preact';
import { getValidationRules } from '@cpsdqs/google-i18n-address';
import { CircularProgress } from 'yamdl';
import Select from '../controls/select';
import { data as locale } from '../../locale';
import { Field, ValidatedTextField } from '../form';
import countryField, { WithCountries } from './country';
import Required from './required';
import './style.less';

/** Max char lengths for each of the fields. */
const maxLengthMap = {
    countryArea: 50,
    city: 50,
    streetAddress: 100,
    postalCode: 20,
    sortingCode: 20,
};

/** Renders an address without regarding a specific locale’s format. */
function BasicAddressRenderer ({ value }) {
    if (!value) return null;

    const streetAddress = (value.streetAddress || '').split('\n');
    const city = value.city;
    const countryArea = value.countryArea;
    const country = value.country
        ? <WithCountries>{countries => countries[value.country.toLowerCase()]?.name_eo}</WithCountries>
        : null;

    const addressPseudolines = [
        ...streetAddress,
        [
            [value.postalCode, value.cityArea].filter(x => x).join(' '),
            city,
        ].filter(x => x).join(', '),
        countryArea,
        country,
    ].filter(x => x).map((x, i) =>
        (<span class="address-pseudoline" key={i}>{x}</span>));

    return (
        <div class="basic-address">
            {addressPseudolines}
        </div>
    );
}

/**
 * Edits an address. Also handles locale-based validation.
 *
 * - readableMask/editableMask: array - if set, only allows viewing/editing the given fields
 */
class AddressEditor extends Component {
    state = {
        validating: false,
        validationRules: null,
    };

    cityChoicesId = 'cities-' + Math.random().toString(36);
    cityAreaChoicesId = 'city-areas-' + Math.random().toString(36);
    countryAreaChoicesId = 'country-areas-' + Math.random().toString(36);

    /** Validates current input. */
    validate () {
        if (!this.props.value) return;
        this.setState({ validating: true });
        getValidationRules({
            ...this.props.value,
            countryCode: this.props.value.country,
        }).then(rules => {
            this.setState({
                validationRules: rules,
                validating: false,
            });
        }).catch(err => {
            // oh well
            console.error(err); // eslint-disable-line no-console
            this.setState({ validationRules: null, validating: false });
        });
    }

    componentDidMount () {
        this.validate();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value || prevProps.value.country !== this.props.value.country) {
            this.validate();
        }
    }

    render ({ value, onChange, readableMask, editableMask }) {
        if (!value) return null;
        const rmask = field => readableMask ? readableMask.includes(field) : true;
        const wmask = field => editableMask ? editableMask.includes(field) : true;
        const country = value.country;

        const onChangeField = (key, map = (x => x)) => v => onChange({ ...value, [key]: map(v) });

        const items = [];

        if (rmask('country')) {
            items.push(
                <Field>
                    <countryField.editor
                        key="country"
                        emptyLabel={locale.address.countryEmpty}
                        value={country && country.toLowerCase()}
                        onChange={onChangeField('country')}
                        disabled={!wmask('country')} />
                </Field>
            );
        }

        const rules = this.state.validationRules || {};
        const requiredFields = rules.requiredFields || [];
        const allowedFields = rules.allowedFields || [];
        const upperFields = rules.upperFields || [];
        const postalCodeMatchers = rules.postalCodeMatchers || [];
        const postalCodeExamples = rules.postalCodeExamples || [];

        const isInChoices = (q, choices, field) => {
            if (!q) return null;
            q = q.toLowerCase();
            if (!choices.length) return null;
            let found = false;
            for (const [name, label] of choices) {
                if (q === name.toLowerCase() || q === label.toLowerCase()) {
                    found = true;
                    break;
                }
            }
            if (!found) return locale.address.invalidField(field.toLowerCase());
        };

        const validators = {
            countryArea: () => {
                const err = isInChoices(value.countryArea, rules.countryAreaChoices, locale.addressFields.countryArea);
                if (err) return err;
            },
            cityArea: () => {
                const err = isInChoices(value.cityArea, rules.cityAreaChoices, locale.addressFields.cityArea);
                if (err) return err;
            },
            city: () => {
                const err = isInChoices(value.city, rules.cityChoices, locale.addressFields.city);
                if (err) return err;
            },
            postalCode: () => {
                if (postalCodeMatchers.length) {
                    for (const matcher of postalCodeMatchers) {
                        if (!value.postalCode.match(matcher)) {
                            return locale.address.invalidField(locale.addressFields.postalCode.toLowerCase());
                        }
                    }
                }
            },
        };

        const lists = {
            city: this.cityChoicesId,
            cityArea: this.cityAreaChoicesId,
            countryArea: this.countryAreaChoicesId,
        };
        for (const k in lists) {
            const options = new Set();
            for (const item of (rules[k + 'Choices'] || [])) {
                options.add(item[0]);
                options.add(item[1]);
            }

            items.push(
                <datalist id={lists[k]}>
                    {[...options].map((option, i) => (
                        <option key={i} value={option} />
                    ))}
                </datalist>
            );
        }

        const placeholders = {
            postalCode: postalCodeExamples.length
                ? locale.address.postalExample(postalCodeExamples[0])
                : '',
        };

        for (const k of ['countryArea', 'city', 'cityArea', 'streetAddress', 'postalCode', 'sortingCode']) {
            if (!allowedFields.includes(k) || !rmask(k)) continue;
            const isRequired = requiredFields.includes(k);
            const isUpper = upperFields.includes(k);
            let asSelect = !!(rules[k + 'Choices'] || []).length;

            let selectValue = value[k];
            if (asSelect) {
                const lowerValue = (value[k] || '').toLowerCase();
                let found = false;
                for (const choice of rules[k + 'Choices']) {
                    const choiceValues = choice.map(x => x.toLowerCase());
                    if (choiceValues.includes(lowerValue)) {
                        selectValue = choice[0];
                        found = true;
                        break;
                    }
                }

                if (!found && value[k]) {
                    asSelect = false;
                }
            }

            if (asSelect) {
                items.push(
                    <Field validate={() => {
                        if (country && !value[k] && isRequired) return locale.requiredField;
                        if (validators[k]) return validators[k]();
                    }}>
                        <Select
                            value={selectValue}
                            onChange={onChangeField(k, value =>
                                (isUpper && value) ? value.toUpperCase() : (value || null))}
                            items={[{
                                value: '',
                                label: locale.address[k + 'Empty'],
                            }].concat(rules[k + 'Choices'].map(item => ({
                                value: item[0],
                                label: (item[1] !== item[0]) ? `${item[0]} - ${item[1]}` : item[0],
                            })))} />
                    </Field>
                );
            } else {
                items.push(
                    <Field>
                        <ValidatedTextField
                            validate={value => {
                                if (country && !value && isRequired) return locale.requiredField;
                                if (validators[k]) return validators[k]();
                            }}
                            placeholder={placeholders[k]}
                            disabled={!wmask(k)}
                            class="address-editor-line"
                            key={k}
                            value={value[k]}
                            list={lists[k]}
                            maxLength={maxLengthMap[k]}
                            label={isRequired
                                ? <Required>{locale.addressFields[k]}</Required>
                                : locale.addressFields[k]}
                            onChange={onChangeField(k, v => {
                                v = v || null;
                                if (isUpper) return v ? v.toUpperCase() : v;
                                else return v;
                            })} />
                    </Field>
                );
            }
        }

        return (
            <div class="data address-editor">
                <div class="inner-items">{items}</div>
                {this.state.validating && (
                    <div class="loading-overlay">
                        <CircularProgress indeterminate />
                    </div>
                )}
            </div>
        );
    }
}

export default {
    renderer: BasicAddressRenderer,
    inlineRenderer: BasicAddressRenderer,
    editor: AddressEditor,
};
