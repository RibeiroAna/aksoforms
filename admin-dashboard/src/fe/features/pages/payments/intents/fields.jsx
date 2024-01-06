import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import moment from 'moment';
import { TextField } from 'yamdl';
import { country, currencyAmount, email, org, timestamp } from '../../../../components/data';
import DiffAuthor from '../../../../components/diff-author';
import TinyProgress from '../../../../components/controls/tiny-progress';
import { paymentIntents as locale, timestampFormat } from '../../../../locale';
import { PaymentMethodType } from '../orgs/methods/fields';
import { coreContext } from '../../../../core/connection';
import './fields.less';

export const FIELDS = {
    customer: {
        sortable: true,
        component ({ value, inline }) {
            if (!value) return null;
            return (
                <span class="intent-customer">
                    <span class="customer-name">
                        {value.name}
                    </span>
                    {' <'}
                    {inline ? (
                        <email.inlineRenderer value={value.email} />
                    ) : (
                        <email.renderer value={value.email} />
                    )}
                    {'>'}
                </span>
            );
        },
        stringify (value) {
            if (!value) return '';
            return `${value.name} <${value.email}>`;
        },
    },
    createdBy: {
        component ({ value, slot }) {
            if (!value) return;
            return <DiffAuthor author={value} interactive={slot === 'detail'} />;
        },
    },
    intermediary: {
        sortable: true,
        weight: 2,
        component ({ value, editing, onChange }) {
            return <IntermediaryEditor value={value} editing={editing} onChange={onChange} />;
        },
    },
    method: {
        sortable: true,
        component ({ value }) {
            if (!value) return;
            return <PaymentMethodType value={value.type} />;
        },
        stringify (value) {
            return value;
        },
    },
    org: {
        weight: 0.5,
        component ({ value }) {
            return <org.renderer value={value} />;
        },
        stringify (value) {
            return value;
        },
    },
    currency: {
        sortable: true,
        component ({ value }) {
            return value;
        },
        stringify (value) {
            return value;
        },
    },
    status: {
        sortable: true,
        component ({ value }) {
            return (
                <span class="payment-intent-status" data-status={value}>
                    {locale.fields.statuses[value]}
                </span>
            );
        },
        stringify (value) {
            return locale.fields.statuses[value];
        },
    },
    timeCreated: {
        sortable: true,
        component ({ value }) {
            if (!value) return null;
            return <timestamp.renderer value={value} maybeRelative />;
        },
        stringify (value) {
            if (!value) return '';
            return moment(value * 1000).format(timestampFormat);
        },
    },
    statusTime: {
        sortable: true,
        component ({ value }) {
            if (!value) return null;
            return <timestamp.renderer value={value} maybeRelative />;
        },
        stringify (value) {
            if (!value) return '';
            return moment(value * 1000).format(timestampFormat);
        },
    },
    internalNotes: {
        component ({ value }) {
            return value;
        },
        stringify (value) {
            return value;
        },
    },
    customerNotes: {
        component ({ value }) {
            return value;
        },
        stringify (value) {
            return value;
        },
    },
    foreignId: {
        component ({ value }) {
            return <code class="payment-intent-foreign-id">{value}</code>;
        },
        stringify (value) {
            return value;
        },
    },
    totalAmount: {
        sortable: true,
        component ({ value, item }) {
            return <currencyAmount.renderer value={value} currency={item.currency} />;
        },
        stringify (value) {
            return '' + value;
        },
    },
    amountRefunded: {
        sortable: true,
        component ({ value, item }) {
            return <currencyAmount.renderer value={value} currency={item.currency} />;
        },
        stringify (value) {
            return '' + value;
        },
    },
};

export function IntermediaryEditor ({ value, editing, onChange, slot }) {
    if (!editing) {
        if (!value) return;

        return (
            <div class="payment-intent-intermediary">
                {locale.fields.intermediaryIdFmt(value.year, value.number)}
                {' '}
                {locale.fields.intermediaryIdCountryInfix}
                {' '}
                <country.renderer value={value.country} />
            </div>
        );
    }

    value = value || {};

    return (
        <div class="payment-intent-intermediary">
            <div class="inner-country">
                <label>{locale.fields.intermediaryCountry}</label>
                <country.editor
                    value={value.country}
                    onChange={country => onChange({ ...value, country })} />
            </div>
            <div class="inner-identifier">
                <TextField
                    outline
                    label={locale.fields.intermediaryYear}
                    type="number"
                    value={value.year}
                    onChange={v => {
                        if (+v || !v) {
                            onChange({ ...value, year: +v || null });
                        }
                    }} />
                {slot === 'create' ? (
                    <AutoincrementingIntermediaryIntentNumber
                        country={value.country}
                        year={value.year}
                        value={value.number}
                        onChange={number => onChange({ ...value, number })} />
                ) : (
                    <TextField
                        outline
                        label={locale.fields.intermediaryNumber}
                        value={value.number}
                        onChange={v => {
                            if (+v || !v) {
                                onChange({ ...value, number: v ? +v : null });
                            }
                        }} />
                )}
            </div>
        </div>
    );
}

class AutoincrementingIntermediaryIntentNumber extends PureComponent {
    state = {
        loading: false,
        loadedCountryYear: null,
    };

    static contextType = coreContext;

    loadId = 0;
    load () {
        if (!this.props.country || !this.props.year) return;

        const countryYear = [this.props.country, this.props.year].join('/');
        if (this.loadingCountryYear === countryYear || this.state.loadedCountryYear === countryYear) return;
        this.loadingCountryYear = countryYear;

        const loadId = ++this.loadId;
        this.setState({ loading: true });
        this.context.createTask('payments/listIntents', {}, {
            jsonFilter: {
                filter: {
                    intermediaryCountryCode: this.props.country,
                    'intermediaryIdentifier.year': this.props.year,
                },
            },
            fields: [
                { id: 'timeCreated', sorting: 'desc' },
                { id: 'intermediary', sorting: 'none' },
            ],
            limit: 10,
        }).runOnceAndDrop().then(async result => {
            if (this.loadId !== loadId) return;
            this.loadingCountryYear = null;
            this.setState({ loading: false });

            const topItemId = result.items[0];
            if (!topItemId) {
                this.setState({ loadedCountryYear: countryYear });
                this.props.onChange(1);
                return;
            }
            const view = this.context.createDataView('payments/intent', {
                id: topItemId,
                fields: ['intermediary'],
                noFetch: true,
            });
            view.on('update', data => {
                view.drop();
                if (this.loadId !== loadId) return;
                this.setState({ loadedCountryYear: countryYear });
                this.props.onChange((data.intermediary?.number | 0) + 1);
            });
            view.on('error', () => {
                // ???
                view.drop();
            });
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            if (this.loadId !== loadId) return;
            this.setState({ loading: false });
            this.loadingCountryYear = null;
        });
    }

    componentDidMount () {
        this.load();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.year !== this.props.year || prevProps.country !== this.props.country) {
            this.load();
        }
    }

    render () {
        if (!this.props.country || !this.props.year) return null;
        return (
            <div>
                {locale.fields.intermediaryNumber}
                {': '}
                {this.state.loading
                    ? <TinyProgress />
                    : locale.fields.intermediaryIdFmt(this.props.year, this.props.value)}
            </div>
        );
    }
}
