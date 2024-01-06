import { h, render } from 'preact';
import { PureComponent } from 'preact/compat';
import moment from 'moment';
import { CircularProgress } from 'yamdl';
import PrintIcon from '@material-ui/icons/Print';
import Page from '../../../../components/page';
import Select from '../../../../components/controls/select';
import DisplayError from '../../../../components/utils/error';
import TinyProgress from '../../../../components/controls/tiny-progress';
import { currencyAmount, date } from '../../../../components/data';
import Meta from '../../../meta';
import { paymentIntents as locale, currencies } from '../../../../locale';
import { Link } from '../../../../router';
import { coreContext } from '../../../../core/connection';
import './report.less';
import reportPrintStyles from './report-print.noextract.css';

export default class Report extends Page {
    state = {
        rangeStart: moment().subtract(1, 'month').add(1, 'day').format('YYYY-MM-DD'),
        rangeEnd: moment().format('YYYY-MM-DD'),
        loading: false,
        data: null,
        error: null,
        currency: Object.keys(currencies)[0],
        useFilter: false,
    };

    static contextType = coreContext;

    constructor (props) {
        super(props);
    }

    loadLock = 0;

    load () {
        const lock = ++this.loadLock;

        this.setState({ loading: true, error: null, data: null });

        const lowerTimeBound = +new Date(this.state.rangeStart) / 1000;
        const upperTimeBound = +new Date(this.state.rangeEnd) / 1000 + 86400;

        this.context.createTask('payments/report', {}, {
            time: [lowerTimeBound, upperTimeBound],
            currency: this.state.currency,
        }).runOnceAndDrop().then(data => {
            if (this.loadLock !== lock) return;
            this.setState({ loading: false, error: null, data });
        }).catch(error => {
            if (this.loadLock !== lock) return;
            this.setState({ loading: false, error, data: null });
        });
    }

    componentDidMount () {
        this.load();
    }

    componentDidUpdate (prevProps, prevState) {
        if (this.state.rangeStart !== prevState.rangeStart
            || this.state.rangeEnd !== prevState.rangeEnd
            || this.state.currency !== prevState.currency) {
            this.load();
        }
    }

    print = () => {
        const printWindow = window.open('', 'paymentBalanceReportPopout');
        if (!printWindow) {
            this.context.createTask('info', {
                message: locale.report.failedToOpenPrintWindow,
            });
            return;
        }
        render(
            <coreContext.Provider value={this.context}>
                <PrintAction window={printWindow} />
                <ReportRender
                    data={this.state.data}
                    currency={this.state.currency}
                    print />
                <style>{reportPrintStyles}</style>
            </coreContext.Provider>,
            printWindow.document.body,
        );
    };

    render (_, { rangeStart, rangeEnd, currency, loading, data, error }) {
        const actions = [];

        if (!error && data) {
            actions.push({
                icon: <PrintIcon />,
                action: this.print,
            });
        }

        let contents = null;

        if (loading) {
            contents = (
                <div class="report-loading">
                    <CircularProgress indeterminate />
                </div>
            );
        } else if (error) {
            contents = <DisplayError error={error} />;
        } else if (data) {
            contents = <ReportRender data={data} currency={currency} />;
        }

        return (
            <div class="payments-balance-report-page">
                <Meta
                    title={locale.report.title}
                    actions={actions} />
                <TimeRangePicker
                    start={rangeStart}
                    end={rangeEnd}
                    onStartChange={rangeStart => this.setState({ rangeStart })}
                    onEndChange={rangeEnd => this.setState({ rangeEnd })} />

                <div class="report-total-currency">
                    <Select
                        value={currency}
                        onChange={currency => this.setState({ currency })}
                        outline
                        items={Object.keys(currencies).map(c => ({
                            value: c,
                            label: currencies[c],
                        }))} />
                </div>

                {contents}
            </div>
        );
    }
}

function TimeRangePicker ({ start, end, onStartChange, onEndChange }) {
    return (
        <div class="report-time-range">
            <div class="range-field">
                <date.editor
                    label={locale.report.startTime}
                    outline
                    value={start}
                    onChange={onStartChange} />
            </div>
            <div class="range-field">
                <date.editor
                    label={locale.report.endTime}
                    outline
                    value={end}
                    onChange={onEndChange} />
            </div>
        </div>
    );
}

class PrintAction extends PureComponent {
    componentDidMount () {
        this.props.window.print();
    }

    render ({ window }) {
        return (
            <div class="print-action-container">
                <button onClick={() => window.print()}>{locale.report.print}</button>
            </div>
        );
    }
}

/** This function should be pure because we're also using it to render the printed version */
function ReportRender ({ data, currency, print }) {
    return (
        <div class="payments-report">
            <div class="report-section">
                <div class="section-contents">
                    {locale.report.addonsNote}
                </div>
            </div>
            <div class="report-section">
                <div class="section-title">{locale.report.total}</div>
                <div class="section-contents">
                    <Totals data={data} currency={currency} print={print} />
                </div>
            </div>
            <PaymentOrgs data={data} currency={currency} print={print} />
        </div>
    );
}

function ConvertedTotals ({ converted, currency }) {
    return (
        <div class="converted-totals">
            <div class="converted-total-total">
                <currencyAmount.renderer
                    value={converted.total}
                    currency={currency} />
            </div>
            <div class="converted-total-sub">
                <div class="converted-total-subfield converted-total-earned">
                    <currencyAmount.renderer
                        value={converted.earned}
                        currency={currency} />
                    {' '}
                    {locale.report.totalEarned}
                </div>
                <div class="converted-total-subfield converted-total-refunded">
                    <currencyAmount.renderer
                        value={converted.refunded}
                        currency={currency} />
                    {' '}
                    {locale.report.totalRefunded}
                </div>
            </div>
        </div>
    );
}

function CurrencyTable ({ byCurrency }) {
    const currencyKeys = Object.keys(byCurrency);

    return (
        <table class="currency-table">
            <thead>
                <tr>
                    <th>{locale.report.currencyHeader}</th>
                    <th>{locale.report.totalHeader}</th>
                </tr>
            </thead>
            <tbody>
                {currencyKeys.map(c => (
                    <tr key={c}>
                        <th>{currencies[c]}</th>
                        <td><ReportCell value={byCurrency[c]} currency={c} /></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Totals ({ data, currency, print }) {
    return (
        <div class="report-item-totals">
            <ConvertedTotals converted={data.converted} currency={currency} print={print} />
            <div class="report-section">
                <div class="section-title">{locale.report.byCurrency}</div>
                <div class="section-contents">
                    <CurrencyTable byCurrency={data.byCurrency} print={print} />
                </div>
            </div>
        </div>
    );
}


function PaymentOrgs ({ data, currency, print }) {
    const items = [];
    for (const org in data.byPaymentOrg) {
        const orgItems = [];
        for (const method in data.byPaymentOrg[org].byPaymentMethod) {
            orgItems.push(
                <PaymentMethod
                    org={org}
                    method={method}
                    data={data.byPaymentOrg[org].byPaymentMethod[method]}
                    currency={currency}
                    print={print} />
            );
        }
        for (const addon in data.byPaymentOrg[org].byPaymentAddon) {
            orgItems.push(
                <PaymentAddon
                    org={org}
                    addon={addon}
                    data={data.byPaymentOrg[org].byPaymentAddon[addon]}
                    currency={currency}
                    print={print} />
            );
        }
        items.push(
            <div class="report-section">
                <div class="section-title">
                    {locale.report.paymentOrg}
                    {' '}
                    <PaymentOrgName org={org} useCache={print} />
                </div>
                <div class="section-contents">
                    <Totals data={data.byPaymentOrg[org]} currency={currency} print={print} />
                    {orgItems}
                </div>
            </div>
        );
    }
    return (
        <div>
            {items}
        </div>
    );
}

function PaymentMethod ({ org, method, data, currency }) {
    return (
        <div class="report-section">
            <div class="section-title">
                {locale.report.paymentMethod}
                {' '}
                <PaymentMethodName org={org} method={method} useCache={print} />
            </div>
            <div class="section-contents">
                <Totals data={data} currency={currency} print={print} />
            </div>
        </div>
    );
}

function PaymentAddon ({ org, addon, data, currency }) {
    return (
        <div class="report-section">
            <div class="section-title">
                {locale.report.paymentAddon}
                {' '}
                <PaymentAddonName org={org} addon={addon} useCache={print} />
            </div>
            <div class="section-contents">
                <Totals data={data} currency={currency} print={print} />
            </div>
        </div>
    );
}

function ReportCell ({ value, currency }) {
    if (!value) return null;
    const c = currency;
    return (
        <div class="totals-set">
            <currencyAmount.renderer value={value.total} currency={c} />
            <div class="totals-sub">
                <span class="totals-subfield">
                    {locale.report.totals.earned} <currencyAmount.renderer value={value.earned} currency={c} />
                </span>
                <span class="totals-subfield">
                    {locale.report.totals.refunded} <currencyAmount.renderer value={value.refunded} currency={c} />
                </span>
            </div>
            <div class="totals-sub">
                <span class="totals-subfield">
                    {locale.report.totals.count(value.count)}
                </span>
                <span class="totals-subfield">
                    {locale.report.totals.refunds(value.refunds)}
                </span>
            </div>
        </div>
    );
}

let batchLoadCore = null;

const batchLoadOrgs = new Map();
function batchFlushOrgs () {
    if (!batchLoadOrgs.size) return;
    const orgs = [...batchLoadOrgs.keys()];
    const blOrgs = [...batchLoadOrgs.entries()];
    batchLoadOrgs.clear();
    batchLoadCore.createTask('payments/listOrgs', {}, {
        offset: 0,
        limit: orgs.length,
        fields: [{ id: 'id', sorting: 'none' }, { id: 'name', sorting: 'none' }],
        jsonFilter: { filter: { id: { $in: orgs } } },
        _unmapped: true,
    }).runOnceAndDrop().then(res => {
        const namesById = {};
        for (const item of res.items) namesById[item.id] = item.name;
        for (const [org, listeners] of blOrgs) {
            for (const listener of listeners) {
                listener(null, namesById[org]);
            }
        }
    }).catch(err => {
        for (const [, l] of blOrgs) for (const li of l) li(err);
    });
}
function batchLoadOrgName (org) {
    return new Promise((resolve, reject) => {
        if (!batchLoadOrgs.has(org)) batchLoadOrgs.set(org, new Set());
        batchLoadOrgs.get(org).add((error, data) => error ? reject(error) : resolve(data));
        if (batchLoadOrgs.size > 50) batchFlushOrgs();
        else setTimeout(() => batchFlushOrgs(), 100);
    });
}

const batchLoadMethodOrgs = new Map();
function batchFlushMethodOrg (org) {
    if (!batchLoadMethodOrgs.has(org)) return;
    const methods = [...batchLoadMethodOrgs.get(org)];
    batchLoadMethodOrgs.delete(org);

    batchLoadCore.createTask('payments/listMethods', { org }, {
        offset: 0,
        limit: methods.length,
        jsonFilter: { filter: { id: { $in: methods.map(x => x.method) } } },
        _unmapped: true,
    }).runOnceAndDrop().then(res => {
        const namesById = {};
        for (const item of res.items) namesById[item.id] = item.name;
        for (const { method, listener } of methods) {
            listener(null, namesById[method]);
        }
    }).catch(err => {
        for (const { listener } of methods) listener(err);
    });
}
function batchLoadMethodName (org, method) {
    return new Promise((resolve, reject) => {
        let schedule = false;
        if (batchLoadMethodOrgs.has(org)) {
            if (batchLoadMethodOrgs.get(org).size > 50) {
                batchFlushMethodOrg(org);
                batchLoadMethodOrgs.set(org, new Set());
                schedule = true;
            }
        } else {
            batchLoadMethodOrgs.set(org, new Set());
            schedule = true;
        }

        batchLoadMethodOrgs.get(org).add({
            method,
            listener: (error, data) => {
                if (error) reject(error);
                else resolve(data);
            },
        });
        if (schedule) setTimeout(() => batchFlushMethodOrg(org), 100);
    });
}

const batchLoadAddonOrgs = new Map();
function batchFlushAddonOrg (org) {
    if (!batchLoadAddonOrgs.has(org)) return;
    const addons = [...batchLoadAddonOrgs.get(org)];
    batchLoadAddonOrgs.delete(org);

    batchLoadCore.createTask('payments/listAddons', { org }, {
        offset: 0,
        limit: addons.length,
        jsonFilter: { filter: { id: { $in: addons.map(x => x.addon) } } },
        _unmapped: true,
    }).runOnceAndDrop().then(res => {
        const namesById = {};
        for (const item of res.items) namesById[item.id] = item.name;
        for (const { addon, listener } of addons) {
            listener(null, namesById[addon]);
        }
    }).catch(err => {
        for (const { listener } of addons) listener(err);
    });
}
function batchLoadAddonName (org, addon) {
    return new Promise((resolve, reject) => {
        let schedule = false;
        if (batchLoadAddonOrgs.has(org)) {
            if (batchLoadAddonOrgs.get(org).size > 50) {
                batchFlushAddonOrg(org);
                batchLoadAddonOrgs.set(org, new Set());
                schedule = true;
            }
        } else {
            batchLoadAddonOrgs.set(org, new Set());
            schedule = true;
        }

        batchLoadAddonOrgs.get(org).add({
            addon,
            listener: (error, data) => {
                if (error) reject(error);
                else resolve(data);
            },
        });
        if (schedule) setTimeout(() => batchFlushAddonOrg(org), 100);
    });
}

// used to instantly determine names in printing dialog
const globalObjectNameCache = {};

function PaymentOrgName ({ org, useCache }) {
    return (
        <ObjectName
            id={`org-${org}`}
            load={() => batchLoadOrgName(org)}
            useCache={useCache}
            link={`/aksopago/organizoj/${org}`} />
    );
}

function PaymentMethodName ({ org, method, useCache }) {
    return (
        <ObjectName
            id={`method-${org}-${method}`}
            load={() => batchLoadMethodName(org, method)}
            useCache={useCache}
            link={`/aksopago/organizoj/${org}/metodoj/${method}`} />
    );
}

function PaymentAddonName ({ org, addon, useCache }) {
    return (
        <ObjectName
            id={`addon-${org}-${addon}`}
            load={() => batchLoadAddonName(org, addon)}
            useCache={useCache}
            link={`/aksopago/organizoj/${org}/aldonebloj/${addon}`} />
    );
}

class ObjectName extends PureComponent {
    state = {
        name: null,
        error: null,
    };

    static contextType = coreContext;

    loadLock = 0;
    load () {
        const lock = ++this.loadLock;
        this.setState({ name: null });

        batchLoadCore = this.context;
        this.props.load().then(name => {
            if (this.loadLock !== lock) return;
            this.setState({ name, error: null });

            globalObjectNameCache[this.props.id] = name;
        }).catch(error => {
            if (this.loadLock !== lock) return;
            this.setState({ name: null, error });
        });
    }

    componentDidMount () {
        this.load();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.id !== this.props.id) this.load();
    }

    render ({ id, link, useCache }, { name, error }) {
        if (useCache) name = globalObjectNameCache[id];

        let contents = null;
        if (error) contents = '?';
        else if (!name) contents = <TinyProgress />;
        else contents = name;

        return (
            <Link class="object-id" target={link}>
                {contents}
            </Link>
        );
    }
}
