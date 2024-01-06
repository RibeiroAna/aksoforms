import { h } from 'preact';
import { useState, useEffect } from 'preact/compat';
import { Button, CircularProgress, Dialog, LinearProgress, TextField } from 'yamdl';
import EditIcon from '@material-ui/icons/Edit';
import RemoveIcon from '@material-ui/icons/Remove';
import Page from '../../../../components/page';
import Select from '../../../../components/controls/select';
import { country, currencyAmount } from '../../../../components/data';
import DialogSheet from '../../../../components/tasks/dialog-sheet';
import DetailFields from '../../../../components/detail/detail-fields';
import TinyProgress from '../../../../components/controls/tiny-progress';
import TextArea from '../../../../components/controls/text-area';
import ItemPicker from '../../../../components/pickers/item-picker-dialog';
import DisplayError from '../../../../components/utils/error';
import PaymentMethodPicker from '../../payments/method-picker';
import { EntrySelectedOffer, Totals, CategoryName, MagazineName } from './detail';
import Meta from '../../../meta';
import {
    intermediaryReports as locale,
    membershipEntries as entriesLocale,
    paymentAddons as addonsLocale,
    currencies, countryCurrencies,
} from '../../../../locale';
import { FIELDS as ENTRY_FIELDS } from '../../memberships/entries/fields';
import { FIELDS as ADDON_FIELDS } from '../../payments/orgs/addons/fields';
import { connect, coreContext } from '../../../../core/connection';
import { connectPerms } from '../../../../perms';
import './create.less';
import { useDataView } from '../../../../core';

const REDUCED_ENTRY_FIELDS = Object.fromEntries(['codeholderData', 'offers'].map(id => [id, ENTRY_FIELDS[id]]));
const NEW_ENTRY = {
    codeholderData: null,
    offers: null,
};

const EMPTY_STATE = {
    org: null,
    method: null,
    aksoOrg: null,
    methodData: null,
    country: null,
    year: null,
    setupConfirmed: false,
    number: null,
    currency: null,
    entries: [],
    addons: [],
    expenses: [],
};

export default class CreateReport extends Page {
    state = {
        loading: false,
        ...EMPTY_STATE,
    };

    reset () {
        this.setState(EMPTY_STATE, () => {
            this.autoPickMethod();
        });
    }

    askReset () {
        if (confirm(locale.create.resetConfirm)) {
            this.reset();
        }
    }

    componentDidMount () {
        try {
            const reportState = JSON.parse(sessionStorage.spReportState);
            this.setState(reportState, () => {
                if (this.state.method) this.loadMethod();
                else this.autoPickMethod();
            });
        } catch {
            /* doesnt matter */

            this.autoPickMethod();
        }
    }

    componentDidUpdate () {
        try {
            sessionStorage.spReportState = JSON.stringify({
                org: this.state.org,
                method: this.state.method,
                country: this.state.country,
                year: this.state.year,
                setupConfirmed: this.state.setupConfirmed,
                number: this.state.number,
                currency: this.state.currency,
                entries: this.state.entries,
                addons: this.state.addons,
                expenses: this.state.expenses,
            });
        } catch {
            /* doesnt matter */
        }
    }

    static contextType = coreContext;

    /**
     * Automatically selects a payment method if there's only one choice.
     * This is for users who do not have sufficient permissions to choose.
     */
    autoPickMethod () {
        if (this.state.method) return;
        this.setState({ loading: true });
        this.context.createTask('payments/listOrgs', {}, {
            limit: 10,
        }).runOnceAndDrop().then(result => {
            if (result.items.length === 1) {
                const org = result.items[0];
                return this.context.createTask('payments/listMethods', {
                    org,
                }, {
                    jsonFilter: {
                        filter: {
                            type: 'intermediary',
                        },
                    },
                    limit: 10,
                }).runOnceAndDrop().then(res => [org, res]);
            } else {
                return null;
            }
        }).then(_result => {
            if (!_result) return null;
            const [org, result] = _result;

            if (result.items.length === 1) {
                this.setState({ org, method: result.items[0] }, () => {
                    this.loadMethod();
                });
            }
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            // oh well
        }).finally(() => {
            this.setState({ loading: false });
        });
    }

    loadMethod () {
        const { org, method: id } = this.state;
        if (!id) return;
        this.setState({ loading: true });

        this.context.createTask('payments/getOrg', { id: org }).runOnceAndDrop().then(result => {
            this.setState({ aksoOrg: result.org });

            return this.context.createTask('payments/getMethod', { org, id }).runOnceAndDrop();
        }).then(result => {
            this.setState({ methodData: result, loading: false }, () => {
                const currentYear = new Date().getFullYear();
                if (!this.state.year && (result.prices || {})[currentYear]) {
                    this.setState({ year: currentYear }, () => {
                        this.loadYear();
                    });
                } else if (this.state.year) {
                    this.loadYear();
                }
            });
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            this.context.createTask('info', {
                message: locale.failedToLoadMethod,
            });
            this.setState({ loading: false });
        });
    }

    loadYear () {
        if (!this.state.country || !this.state.year) return;
        this.setState({ loading: true });
        this.context.createTask('payments/listIntermediaryIntents', {}, {
            jsonFilter: {
                filter: {
                    intermediaryCountryCode: this.state.country,
                    'intermediaryIdentifier.year': this.state.year,
                },
            },
            fields: [{ id: 'intermediary', sorting: 'none' }, { id: 'timeCreated', sorting: 'desc' }],
            limit: 1,
        }).runOnceAndDrop().then(result => {
            const first = result.items[0];
            if (!first) {
                this.setState({ number: 1, loading: false });
                return;
            }

            return new Promise((resolve, reject) => {
                const view = this.context.createDataView('payments/intent', {
                    id: first,
                    fields: ['intermediary'],
                    noFetch: true,
                });
                view.on('update', data => {
                    if (!data.intermediary) return; // try again...
                    this.setState({ number: (data.intermediary?.number | 0) + 1, loading: false });
                    resolve();
                    view.drop();
                });
                view.on('error', err => {
                    reject(err);
                    view.drop();
                });
            });
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            this.context.createTask('info', {
                message: locale.failedToLoadYear,
            });
            this.setState({ loading: false });
        });
    }

    async doSubmit () {
        this.setState({ submissionState: ['countries', 0, 1] });
        const countries = await new Promise((resolve, reject) => {
            const view = this.context.createDataView('countries/countries', {});
            view.on('update', data => {
                resolve(data);
                view.drop();
            });
            view.on('error', err => {
                reject(err);
                view.drop();
            });
        });
        const countryName = countries[this.state.country].name_eo;

        this.setState({ submissionState: ['entries', 0, this.state.entries.length] });
        const entryData = [];
        for (let i = 0; i < this.state.entries.length; i++) {
            const entry = this.state.entries[i];
            if (!entry.offers.selected.length) continue;

            const entryId = await this.context.createTask('memberships/createEntry', {
                _noGUI: true,
            }, {
                year: this.state.year,
                codeholderData: entry.codeholderData,
                offers: {
                    currency: this.state.currency,
                    selected: entry.offers.selected,
                },
                internalNotes: locale.entries.autoInternalNotes(this.state.year, this.state.number, countryName),
            }).runOnceAndDrop();

            entryData.push({
                entryId,
            });

            this.setState({ submissionState: ['entries', i + 1, this.state.entries.length] });
        }

        this.setState({ submissionState: ['intent', 0, 1] });

        const purposes = [];
        for (let i = 0; i < this.state.entries.length; i++) {
            const entry = this.state.entries[i];
            const { entryId } = entryData[i];

            purposes.push({
                type: 'trigger',
                triggers: 'registration_entry',
                dataId: entryId,
                amount: (entry.offers?.selected || [])
                    .map(s => s.amount)
                    .reduce((a, b) => a + b, 0),
                title: locale.entries.purposeTitle,
            });
        }
        for (const addon of this.state.addons) {
            purposes.push({
                type: 'addon',
                paymentAddonId: addon.id,
                description: addon.description,
                amount: addon.amount,
            });
        }
        for (const expense of this.state.expenses) {
            purposes.push({
                type: 'manual',
                title: expense.title,
                amount: expense.amount,
            });
        }

        const id = await this.context.createTask('payments/createIntent', {
            _noGUI: true,
        }, {
            customer: null,
            intermediary: {
                country: this.state.country,
                year: this.state.year,
                number: this.state.number,
            },
            paymentOrg: this.state.org,
            method: { id: this.state.method },
            currency: this.state.currency,
            purposes,
        }).runOnceAndDrop();

        this.setState({ submissionState: ['intent', 1, 1], submitCheck: true });
        return id;
    }

    confirmSetup () {
        this.loadYear();
        this.setState({ setupConfirmed: true });
        if (this.state.methodData) {
            const countryCurrency = countryCurrencies[this.state.country];
            const currencies = this.state.methodData.currencies;
            if (currencies.length === 1) {
                this.setState({ currency: currencies[0] });
            } else if (currencies.includes(countryCurrency)) {
                this.setState({ currency: countryCurrency });
            }
        }
    }

    submit () {
        this.setState({ submitting: true });
        this.doSubmit().then(id => {
            this.setState({ submitting: false });
            this.reset();
            this.props.onNavigate(`/perantoj/spezfolioj/${id}`);
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            this.setState({
                submitting: false,
                submitCheck: true,
                submitError: err,
            });
        });
    }

    render () {
        let contents;
        if (this.state.loading) {
            contents = (
                <div class="loading-container">
                    <CircularProgress indeterminate />
                </div>
            );
        } else if (!this.state.country || !this.state.year || !this.state.setupConfirmed) {
            contents = (
                <div class="report-setup">
                    <div class="setup-field is-stack">
                        <div class="setup-field-label">{locale.create.setup.method}</div>
                        <PaymentMethodPicker
                            item={{}}
                            org={this.state.org}
                            onOrgChange={org => this.setState({ org })}
                            value={this.state.method}
                            onChange={method => {
                                this.setState({ method }, () => this.loadMethod());
                                if (!method) this.setState({ country: null, year: null });
                            }}
                            type="intermediary" />
                    </div>
                    {this.state.method && (
                        <div class="setup-field">
                            <div class="setup-field-label">{locale.create.setup.country}</div>
                            <CountryPicker
                                org={this.state.aksoOrg}
                                value={this.state.country}
                                onChange={country => this.setState({ country })} />
                        </div>
                    )}
                    {this.state.method && (
                        <div class="setup-field">
                            <div class="setup-field-label">{locale.create.setup.year}</div>
                            <Select
                                value={this.state.year}
                                onChange={year => this.setState({ year: +year || null })}
                                items={[{
                                    value: null,
                                    label: '—',
                                }].concat(Object.keys(this.state.methodData?.prices || []).map(year => ({
                                    value: +year,
                                    label: year,
                                })))} />
                        </div>
                    )}
                    {this.state.country && this.state.year && (
                        <div class="setup-confirm-container">
                            <Button onClick={() => this.confirmSetup()}>
                                {locale.create.setup.confirm}
                            </Button>
                        </div>
                    )}
                </div>
            );
        } else {
            const header = (
                <div class="report-header">
                    <Button class="reset-button" onClick={() => this.askReset()}>
                        {locale.create.reset}
                    </Button>
                    <div class="report-title">
                        {locale.idFmt(this.state.year, this.state.number)}
                        {' '}
                        {locale.idCountryInfix}
                        {' '}
                        <country.renderer value={this.state.country} />
                    </div>
                    <div class="report-subtitle">
                        <PaymentMethodName org={this.state.org} id={this.state.method} />
                    </div>
                    <div class="report-currency-select">
                        <label>{locale.create.currency}</label>
                        <Select
                            outline
                            value={this.state.currency}
                            onChange={currency => this.setState({ currency })}
                            items={(!this.state.currency ? [{ value: null, label: '—' }] : [])
                                .concat((this.state.methodData?.currencies || []).map(currency => ({
                                    value: currency,
                                    label: currencies[currency],
                                })))} />
                    </div>
                </div>
            );

            let entries = null;
            if (this.state.currency) {
                let totalAmount = 0;
                for (const entry of this.state.entries) {
                    totalAmount += (entry.offers?.selected || [])
                        .map(s => s.amount)
                        .reduce((a, b) => a + b, 0);
                }
                for (const addon of this.state.addons) totalAmount += addon.amount;
                for (const expense of this.state.expenses) totalAmount += expense.amount;

                entries = (
                    <div>
                        <EntriesEditor
                            year={this.state.year}
                            org={this.state.org}
                            method={this.state.method}
                            methodData={this.state.methodData}
                            currency={this.state.currency}
                            value={this.state.entries}
                            onChange={entries => this.setState({ entries })} />
                        <AddonsEditor
                            org={this.state.org}
                            currency={this.state.currency}
                            value={this.state.addons}
                            onChange={addons => this.setState({ addons })} />
                        <ExpensesEditor
                            currency={this.state.currency}
                            value={this.state.expenses}
                            onChange={expenses => this.setState({ expenses })} />
                        <div class="report-final-totals">
                            <Totals items={[]} currency={this.state.currency} isFinal total={totalAmount} />
                        </div>
                        <div class="report-submit-container">
                            <Button class="report-submit-button" onClick={() => this.setState({ submitCheck: true })}>
                                {locale.create.submit.button}
                            </Button>
                        </div>
                    </div>
                );
            }

            contents = (
                <div>
                    {header}
                    {entries}
                </div>
            );
        }

        return (
            <div class="intermediary-report-create">
                <Meta title={locale.create.title} />
                {contents}
                <Dialog
                    class="intermediary-report-create-submit-dialog"
                    open={this.state.submitting || this.state.submitCheck}
                    onClose={() => this.setState({ submitCheck: false })}
                    actions={this.state.submitting ? [] : [
                        {
                            label: locale.create.submit.cancel,
                            action: () => this.setState({ submitCheck: false }),
                        },
                        {
                            label: locale.create.submit.commit,
                            action: () => this.submit(),
                        },
                    ]}>
                    {this.state.submitting && (
                        <LinearProgress
                            class="inner-progress"
                            progress={this.state.submissionState[1] / Math.max(1, this.state.submissionState[2])} />
                    )}
                    <div>
                        {this.state.submitting
                            ? locale.create.submit[this.state.submissionState[0]]
                            : this.state.submitError
                                ? <DisplayError error={this.state.submitError} />
                                : locale.create.submit.description}
                    </div>
                </Dialog>
            </div>
        );
    }
}

const CountryPicker = connect('countries/countries')(countries => ({
    countries,
}))(connectPerms(function CountryPicker ({ value, onChange, org, countries, perms }) {
    if (!org || !countries) return <TinyProgress />;
    if (this.state.error) return <DisplayError error={this.state.error} />;

    let items = [];
    const countryItems = items;

    for (const code in countries) {
        if (!perms.hasPerm(`pay.payment_intents.intermediary.${org}.${code}`)) {
            continue;
        }

        items.push({
            value: code,
            label: countries[code].name_eo,
        });
    }

    if (!value) items = [{ label: '—', value: null }].concat(items);

    useEffect(() => {
        if (!value && countryItems.length === 1) {
            onChange(countryItems[0].value);
        }
    });

    return (
        <Select
            items={items}
            value={value}
            onChange={onChange} />
    );
}));

const PaymentMethodName = connect(({ org, id }) => ['payments/method', { org, id }])(data => ({
    data,
}))(function PaymentMethodName ({ data }) {
    if (!data) return <TinyProgress />;
    return data.name;
});

function CollapsingSection ({ title, children, count }) {
    return (
        <details class="collapsing-section" open>
            <summary>
                <span class="inner-title">{title}</span>
                <span class="inner-count">{count}</span>
            </summary>
            {children}
        </details>
    );
}

function EntriesEditor ({ value, onChange, year, org, method, methodData, currency }) {
    const [editing, setEditing] = useState(null);

    let disabled = true;
    let loading;
    let cannotUse = null;
    {
        const [regOptionsLoading, regOptionsError, regOptionsData] = useDataView('memberships/options', {
            id: year,
        });
        loading = regOptionsLoading;
        if (regOptionsError?.code === 'not-found') {
            cannotUse = 'notFound';
        } else if (!regOptionsData?.enabled) {
            cannotUse = 'disabled';
        } else if (regOptionsData?.enabled) {
            disabled = false;
        }
    }

    const entryPrices = (methodData?.prices || {})[year]?.registrationEntries || {};
    const categoryPrices = {};
    const magazinePrices = {};
    for (const category of (entryPrices.membershipCategories || [])) {
        categoryPrices[category.id] = category;
    }
    for (const magazine of (entryPrices.magazines || [])) {
        magazinePrices[magazine.id] = magazine;
    }

    const totalsItems = [];
    let totalAmount = 0;

    const categories = {};
    const magazines = {};
    for (const entry of value) {
        for (const offer of (entry.offers?.selected || [])) {
            let acc, id, commission;
            if (offer.type === 'membership') {
                acc = categories;
                id = offer.id;
                commission = categoryPrices[offer.id]?.commission;
            } else if (offer.type === 'magazine') {
                acc = magazines;
                id = `${offer.id}-${offer.paperVersion}`;
                const type = offer.paperVersion ? 'paper' : 'access';
                commission = (magazinePrices[offer.id]?.prices || {})[type]?.commission;
            } else continue; // oh no we don't know what this is

            if (!acc[id]) {
                acc[id] = {
                    id: offer.id,
                    count: 0,
                    amount: 0,
                    commission,
                };
            }
            acc[id].count++;
            acc[id].amount += offer.amount;
            totalAmount += offer.amount;
        }
    }
    for (const k in categories) {
        const category = categories[k];
        totalsItems.push({
            title: <CategoryName id={category.id} abbrev />,
            count: category.count,
            amount: category.amount,
            commission: category.commission,
        });
    }
    for (const k in magazines) {
        const magazine = magazines[k];
        totalsItems.push({
            title: <MagazineName id={magazine.id} />,
            count: magazine.count,
            amount: magazine.amount,
            commission: magazine.commission,
        });
    }

    return (
        <div class="report-section-container">
            {loading ? (
                <div class="report-section-floating-loading">
                    <CircularProgress indeterminate />
                </div>
            ) : null}
            <CollapsingSection title={locale.entries.title} count={value.length}>
                {cannotUse ? (
                    <div class="report-warning-box">
                        <div class="inner-title">{locale.entries.yearUnavailable.title}</div>
                        <div class="inner-description">
                            {locale.entries.yearUnavailable.description[cannotUse]}
                        </div>
                        {value.length ? (
                            <div class="inner-action">
                                <div class="inner-description">
                                    {locale.entries.yearUnavailable.mustRemoveEntries}
                                </div>
                                <div class="inner-buttons">
                                    <Button onClick={() => {
                                        onChange([]);
                                        setEditing(null);
                                    }}>
                                        {locale.entries.yearUnavailable.removeEntries}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {value.map((entry, i) => (
                    <EntryItem
                        key={i}
                        entry={entry}
                        editing={editing === i}
                        disabled={disabled}
                        onEdit={() => setEditing(i)}
                        onRemove={() => {
                            const newEntries = value.slice();
                            newEntries.splice(i, 1);
                            setEditing(null);
                            onChange(newEntries);
                        }} />
                ))}
                <div>
                    <Button disabled={disabled} onClick={() => {
                        setEditing(value.length);
                        onChange(value.concat([NEW_ENTRY]));
                    }}>
                        {locale.entries.add.button}
                    </Button>
                </div>
                <EntryEditor
                    year={year}
                    org={org}
                    method={method}
                    currency={currency}
                    entry={editing !== null ? value[editing] : null}
                    onCancel={() => {
                        if (value[editing].codeholderData === null) {
                            // user canceled creation
                            const newEntries = value.slice();
                            newEntries.splice(editing, 1);
                            onChange(newEntries);
                        }
                        setEditing(null);
                    }}
                    onConfirm={entry => {
                        const newEntries = value.slice();
                        newEntries[editing] = entry;
                        onChange(newEntries);
                        setEditing(null);
                    }} />
            </CollapsingSection>
            <Totals
                showCommission
                showCounts
                currency={currency}
                items={totalsItems}
                total={totalAmount} />
        </div>
    );
}

function EntryItem ({ entry, onEdit, onRemove, disabled }) {
    if (!entry) {
        useEffect(() => onRemove());
        return '???';
    }

    return (
        <div class="report-entry">
            <div class="entry-header">
                <Button icon small class="remove-button" disabled={disabled} onClick={onRemove}>
                    <RemoveIcon />
                </Button>
                <RegistrationEntryName entry={entry} />
                <Button icon small class="edit-button" disabled={disabled} onClick={onEdit}>
                    <EditIcon />
                </Button>
            </div>
            <div class="entry-items">
                {(entry.offers?.selected || []).map((offer, i) => <EntrySelectedOffer key={i} offer={offer} />)}
            </div>
        </div>
    );
}

function RegistrationEntryName ({ entry }) {
    if (typeof entry.codeholderData === 'number') {
        return (
            <div class="entry-name">
                <CodeholderName id={entry.codeholderData} />
            </div>
        );
    } else {
        return (
            <div class="entry-name">
                <CodeholderNameLabel name={entry.codeholderData?.name} />
            </div>
        );
    }
}

const CodeholderName = connect(({ id }) => [
    'codeholders/codeholder', { id, fields: ['name'] },
])()(function CodeholderName ({ name }) {
    if (!name) return <TinyProgress />;
    return <CodeholderNameLabel name={name} />;
});

function CodeholderNameLabel ({ name }) {
    if (!name) return;
    if (name.full) return name.full;
    return [
        name.honorific,
        name.first || name.firstLegal,
        name.last || name.lastLegal,
    ].filter(x => x).join(' ');
}

function EntryEditor ({ entry, onCancel, onConfirm, year, org, method, currency }) {
    const [edit, onEditChange] = useState(null);
    const [missingFields, setMissingFields] = useState(null);

    return (
        <DialogSheet
            class="intermediary-report-entry-dialog"
            title={locale.entries.edit.title}
            open={entry !== null}
            onClose={onCancel}
            actions={[
                {
                    label: locale.entries.edit.confirm,
                    action: () => {
                        if (!edit) {
                            onCancel();
                            return;
                        }

                        // we'll just do a little manual checking i suppose...
                        const missing = [];
                        if (!edit.codeholderData) {
                            missing.push('codeholderData');
                        } else if (typeof edit.codeholderData === 'object') {
                            const ch = edit.codeholderData;
                            if (!ch.name?.firstLegal) missing.push('codeholderData.name');
                            if (!ch.address?.country || !ch.address?.streetAddress) missing.push('codeholderData.address');
                            if (!ch.feeCountry) missing.push('codeholderData.feeCountry');
                            if (!ch.email) missing.push('codeholderData.email');
                            if (!ch.birthdate) missing.push('codeholderData.birthdate');
                        }

                        if (missing.length) {
                            setMissingFields(missing);
                        } else {
                            onConfirm(edit);
                        }
                    },
                },
            ]}>
            <InnerEntryEditor
                entry={entry}
                onEditChange={onEditChange}
                year={year}
                org={org}
                method={method}
                currency={currency} />
            <Dialog
                backdrop
                open={!!missingFields}
                onClose={() => setMissingFields(null)}
                actions={[
                    {
                        label: locale.entries.missingFieldsClose,
                        action: () => setMissingFields(null),
                    },
                ]}
                title={locale.entries.missingFields}>
                <p>
                    {locale.entries.missingFieldsDesc}
                </p>
                <ul>
                    {(missingFields || []).map(field => (
                        <li key={field}>{locale.entries.fields[field]}</li>
                    ))}
                </ul>
            </Dialog>
        </DialogSheet>
    );
}

function InnerEntryEditor ({ entry, onEditChange, year, org, method, currency }) {
    const [edit, onLocalEditChange] = useState(entry);

    return (
        <DetailFields
            compact
            editing
            data={entry}
            edit={edit}
            onEditChange={edit => {
                onLocalEditChange(edit);
                onEditChange(edit);
            }}
            fields={REDUCED_ENTRY_FIELDS}
            locale={entriesLocale}
            userData={{
                fixedYear: year,
                intermediary: { org, method },
                currency,
            }} />
    );
}
function AddonsEditor ({ org, value, onChange, currency }) {
    const [adding, setAdding] = useState(false);
    const totalAmount = value.map(item => item.amount).reduce((a, b) => a + b, 0);

    return (
        <div class="report-section-container">
            <CollapsingSection title={locale.addons.title} count={value.length}>
                {value.map((addon, i) => (
                    <AddonItem
                        key={addon.id}
                        org={org}
                        addon={addon}
                        currency={currency}
                        onChange={addon => {
                            const newAddons = value.slice();
                            newAddons[i] = addon;
                            onChange(newAddons);
                        }}
                        onRemove={() => {
                            const newAddons = value.slice();
                            newAddons.splice(i, 1);
                            onChange(newAddons);
                        }} />
                ))}
                <div>
                    <Button onClick={() => setAdding(true)}>
                        {locale.addons.add.button}
                    </Button>
                    <AddAddon
                        open={adding}
                        onClose={() => setAdding(false)}
                        onAdd={item => onChange(value.concat(item))}
                        org={org}
                        selectedIds={value.map(item => item.id)} />
                </div>
            </CollapsingSection>
            <Totals
                currency={currency}
                items={[]}
                total={totalAmount} />
        </div>
    );
}

function AddonItem ({ org, addon, onChange, onRemove, currency }) {
    if (!addon) return '???';

    return (
        <div class="report-addon">
            <div class="addon-header">
                <Button icon small class="remove-button" onClick={onRemove}>
                    <RemoveIcon />
                </Button>
                <div class="addon-name-container">
                    <AddonName org={org} id={addon.id} />
                </div>
                <currencyAmount.editor
                    outline
                    value={addon.amount}
                    onChange={amount => onChange({ ...addon, amount })}
                    currency={currency} />
            </div>
            <div class="desc-label">
                {locale.addons.edit.description}
            </div>
            <TextArea
                value={addon.description || ''}
                onChange={value => onChange({ ...addon, description: value || null })}
                maxLength={255}
                placeholder={locale.addons.edit.descriptionPlaceholder} />
        </div>
    );
}

const AddonName = connect(({ org, id }) => ['payments/addon', { org, id }])()(function AddonName ({ name }) {
    if (!name) return <TinyProgress />;
    return name;
});

function AddAddon ({ open, onClose, onAdd, org, selectedIds }) {
    return (
        <ItemPicker
            open={open}
            onClose={onClose}
            limit={1}
            value={[]}
            onChange={items => {
                if (items.length) {
                    onAdd({ id: items[0], amount: 0 });
                    onClose();
                }
            }}
            task="payments/listAddons"
            view="payments/addon"
            options={{ org }}
            viewOptions={{ org }}
            filter={{
                id: { $nin: selectedIds },
            }}
            fields={ADDON_FIELDS}
            locale={addonsLocale.fields}
            emptyLabel={locale.addons.add.empty} />
    );
}

function ExpensesEditor ({ value, onChange, currency }) {
    const totalsItems = [];
    const totalAmount = value.map(item => item.amount).reduce((a, b) => a + b, 0);

    return (
        <div class="report-section-container">
            <CollapsingSection title={locale.expenses.title} count={value.length}>
                {value.map((item, i) => (
                    <ExpenseItem
                        key={i}
                        expense={item}
                        onChange={item => {
                            const newItems = value.slice();
                            newItems[i] = item;
                            onChange(newItems);
                        }}
                        onRemove={() => {
                            const newItems = value.slice();
                            newItems.splice(i, 1);
                            onChange(newItems);
                        }}
                        currency={currency} />
                ))}
                <div>
                    <Button onClick={() => onChange(value.concat({
                        title: '',
                        amount: 0,
                    }))}>
                        {locale.expenses.add.button}
                    </Button>
                </div>
            </CollapsingSection>
            <Totals
                currency={currency}
                items={totalsItems}
                total={totalAmount} />
        </div>
    );
}

function ExpenseItem ({ expense, onChange, onRemove, currency }) {
    return (
        <div class="report-expense">
            <div class="expense-header">
                <Button icon small class="remove-button" onClick={onRemove}>
                    <RemoveIcon />
                </Button>
                <TextField
                    outline
                    class="title-field"
                    label={locale.expenses.item.title}
                    value={expense.title}
                    onChange={title => onChange({ ...expense, title })} />
            </div>
            <div class="amount-container">
                <currencyAmount.editor
                    outline
                    value={expense.amount}
                    onChange={amount => onChange({ ...expense, amount })}
                    currency={currency} />
            </div>
        </div>
    );
}
