import { h } from 'preact';
import { Fragment, useState, useEffect, PureComponent } from 'preact/compat';
import { Button, Dialog, LinearProgress } from 'yamdl';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import { DeleteRedraftIcon } from '../../../../components/icons';
import DetailPage from '../../../../components/detail/detail-page';
import DetailShell from '../../../../components/detail/detail-shell';
import { country, currencyAmount } from '../../../../components/data';
import DiffAuthor from '../../../../components/diff-author';
import MembershipChip from '../../../../components/membership-chip';
import { intermediaryReports as locale, membershipEntries as entriesLocale } from '../../../../locale';
import MdField from '../../../../components/controls/md-field';
import TinyProgress from '../../../../components/controls/tiny-progress';
import DisplayError from '../../../../components/utils/error';
import { FIELDS as ENTRY_FIELDS } from '../../memberships/entries/fields';
import { IntentActions } from '../../payments/intents/detail';
import { connect } from '../../../../core/connection';
import { useDataView } from '../../../../core';
import { connectPerms } from '../../../../perms';
import { LinkButton } from '../../../../router';
import { base } from 'akso:config';
import './detail.less';

export default connectPerms(class IntermediaryReport extends DetailPage {
    state = {
        showEditPrompt: false,
        deleteRedrafting: null,
    };

    locale = locale;

    get id () {
        return this.props.match[1];
    }

    deleteAndRedraft () {
        this.setState({ deleteRedraftError: null, showEditPrompt: false });
        this.doDeleteAndRedraft().catch(error => {
            console.error(error); // eslint-disable-line no-console
            this.setState({ deleteRedraftError: error });
        });
    }

    async doDeleteAndRedraft () {
        this.setState({ deleteRedrafting: ['intent', 0, 1] });

        const intent = await this.context.createTask('payments/getIntent', { id: this.id }, {
            fields: [
                'org',
                'paymentOrg',
                'intermediary',
                'purposes',
                'method',
            ],
        }).runOnceAndDrop();

        this.setState({ deleteRedrafting: ['method', 0, 1] });
        const method = await this.context.createTask('payments/getMethod', {
            org: intent.paymentOrg,
            id: intent.method.id,
        }).runOnceAndDrop();

        const { country, year, number } = intent.intermediary;
        this.setState({ deleteRedrafting: ['regYear', 0, 1] });

        const yearAvailable = year >= new Date().getUTCFullYear();
        if (!yearAvailable) {
            const err = new Error('year is < current year');
            err.localizedDescription = locale.update.steps.yearUnavailable;
            throw year;
        }

        let needsMembershipYear = false;
        for (const purpose of intent.purposes) {
            if (purpose.type === 'trigger' && purpose.triggers === 'registration_entry') {
                needsMembershipYear = true;
            }
        }

        if (needsMembershipYear) {
            const membershipYear = await this.context.createTask('memberships/options', {
                id: year,
            }).runOnceAndDrop().catch(err => {
                if (err.code === 'not-found') {
                    const err = new Error('year could not be found');
                    err.localizedDescription = locale.update.steps.yearUnavailable;
                    throw err;
                }
                throw err;
            });
            if (!membershipYear.enabled) {
                const err = new Error('year is not enabled');
                err.localizedDescription = locale.update.steps.yearUnavailable;
                throw err;
            }
        }

        const entries = [];
        const addons = [];
        const expenses = [];
        for (const purpose of intent.purposes) {
            if (purpose.type === 'trigger') {
                if (purpose.triggers !== 'registration_entry') {
                    const err = new Error('unknown trigger type');
                    err.localizedDescription = locale.update.steps.unknownPurpose;
                    throw err;
                }
                entries.push({
                    id: purpose.dataId,
                    amount: purpose.amount,
                });
            } else if (purpose.type === 'addon') {
                addons.push(purpose);
            } else if (purpose.type === 'manual') {
                expenses.push(purpose);
            } else {
                const err = new Error('unknown purpose type');
                err.localizedDescription = locale.update.steps.unknownPurpose;
                throw err;
            }
        }

        const dataEntries = [];

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            this.setState({ deleteRedrafting: ['entries', i, entries.length] });

            const entryData = await this.context.createTask('memberships/entry', { id: entry.id }, {
                fields: ['offers', 'codeholderData', 'status'],
            }).runOnceAndDrop();

            if (!['submitted', 'canceled'].includes(entryData.status.status)) {
                const err = new Error('invalid entry status');
                err.localizedDescription = locale.update.steps.entryInvalidStatus;
                throw err;
            }

            for (const offer of entryData.offers.selected) {
                offer.id = offer.membershipCategory.id;
                delete offer.membershipCategory;
            }

            dataEntries.push({
                codeholderData: entryData.codeholderData,
                offers: entryData.offers,
            });
        }

        const dataAddons = [];
        for (let i = 0; i < addons.length; i++) {
            const addon = addons[i];
            this.setState({ deleteRedrafting: ['addons', i, addons.length] });

            // fail on 404
            await this.context.createTask('payments/getAddon', {
                org: intent.paymentOrg,
                id: addon.paymentAddonId,
            }).runOnceAndDrop();

            dataAddons.push({
                id: addon.paymentAddonId,
                description: addon.description,
                amount: addon.amount,
            });
        }

        const dataExpenses = [];
        for (let i = 0; i < expenses.length; i++) {
            const expense = expenses[i];
            if (expense.title.match(locale.update.steps.matchPaymentFee)) {
                // skip
                continue;
            }
            dataExpenses.push({
                title: expense.title,
                amount: expense.amount,
            });
        }

        // perform delete
        this.setState({ deleteRedrafting: ['delIntent', 0, 1] });
        await this.context.createTask('payments/cancelIntent', {
            id: intent.id,
        }).runOnceAndDrop();

        for (let i = 0; i < entries.length; i++) {
            this.setState({ deleteRedrafting: ['delEntries', i, entries.length] });
            try {
                await this.context.createTask('memberships/cancelEntry', {
                    id: entries[i].id,
                }).runOnceAndDrop();
            } catch (err) {
                console.log('Failed to cancel entry—ignoring', err); // eslint-disable-line no-console
            }
        }

        sessionStorage.spReportState = JSON.stringify({
            org: intent.paymentOrg,
            method: method.id,
            country,
            year,
            number,
            setupConfirmed: true,
            currency: intent.currency,
            entries: dataEntries,
            addons: dataAddons,
            expenses: dataExpenses,
        });
        this.props.onNavigate(`/perantoj/spezfolioj/krei`);
    }

    renderActions ({ perms }) {
        const actions = [];

        if (this.state.intentData
            && (this.state.intentData.status === 'pending')
            && perms.hasPerm(`pay.payment_intents.cancel.${this.state.intentData.org}`)
            && perms.hasPerm('pay.payment_intents.intermediary.'
                + this.state.intentData.org + '.'
                + this.state.intentData.intermediary?.country)) {
            actions.push({
                icon: <DeleteRedraftIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.setState({ showEditPrompt: true }),
            });
        } else if (this.state.intentData && this.state.intentData.status === 'succeeded') {
            actions.push({
                icon: <PictureAsPdfIcon style={{ verticalAlign: 'middle' }} />,
                action: () => {
                    const anchor = document.createElement('a');
                    const url = new URL(`aksopay/payment_intents/${this.id}/intermediary_pdf`, base).toString();
                    anchor.href = url;
                    anchor.target = '_blank';
                    anchor.click();
                },
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailShell
                    view="payments/intent"
                    options={{
                        fields: [
                            'id',
                            'org',
                            'paymentOrg',
                            'method',
                            'currency',
                            'intermediary',
                            'purposes',
                            'status',
                            'timeCreated',
                            'statusTime',
                            'totalAmount',
                            'createdBy',
                        ],
                    }}
                    id={this.id}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onData={data => this.setState({ intentData: data })}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete}>
                    {data => (
                        <ReportDetail item={data} />
                    )}
                </DetailShell>
                <Dialog
                    backdrop
                    open={this.state.showEditPrompt}
                    onClose={() => this.setState({ showEditPrompt: false })}
                    title={locale.update.title}
                    actions={[
                        {
                            label: locale.update.cancel,
                            action: () => this.setState({ showEditPrompt: false }),
                        },
                        {
                            label: locale.update.confirm,
                            action: () => this.deleteAndRedraft(),
                            danger: true,
                        },
                    ]}>
                    {locale.update.description}
                </Dialog>
                <Dialog
                    class="intermediary-report-delete-redraft-progress-dialog"
                    backdrop
                    open={this.state.deleteRedrafting}
                    title={locale.update.title}
                    onClose={() => this.state.deleteRedraftError && this.setState({ deleteRedrafting: null })}
                    actions={this.state.deleteRedraftError && [{
                        label: locale.update.errorClose,
                        action: () => this.setState({ deleteRedrafting: null }),
                    }]}>
                    {this.state.deleteRedrafting && (
                        <div>
                            <LinearProgress
                                class="inner-progress-bar"
                                progress={this.state.deleteRedrafting[1] / this.state.deleteRedrafting[2]} />
                            <div>
                                {locale.update.steps[this.state.deleteRedrafting[0]]}
                                {' '}({this.state.deleteRedrafting[1]}/{this.state.deleteRedrafting[2]})
                            </div>
                            {this.state.deleteRedraftError && <DisplayError error={this.state.deleteRedraftError} />}
                        </div>
                    )}
                </Dialog>
            </Fragment>
        );
    }
});

function ReportDetail ({ item }) {
    const [entriesNet, setEntriesNet] = useState(0);

    return (
        <div class="intermediary-report-detail">
            <div class="report-title">
                {locale.idFmt(item.intermediary?.year, item.intermediary?.number)}
                {' '}
                {locale.idCountryInfix}
                {' '}
                <country.renderer value={item.intermediary?.country} />
            </div>
            <div class="report-subtitle">
                {locale.createdBy}
                {' '}
                <DiffAuthor author={item.createdBy} interactive />
            </div>
            <div class="report-status">
                {locale.intentStatuses[item.status]}
            </div>
            <div class="report-actions">
                <IntentActions typeOnly intermediary item={item} />
            </div>
            <ReportEntries item={item} onNetTotalChange={nt => setEntriesNet(nt)} />
            <ReportAddons item={item} />
            <ReportExpenses item={item} />
            <div class="report-final-total">
                <Totals
                    isFinal
                    showCommission
                    showNet
                    items={[]}
                    currency={item.currency}
                    total={item.totalAmount}
                    netTotal={item.totalAmount - entriesNet?.difference}
                    incompleteNet={!entriesNet?.complete} />
            </div>
        </div>
    );
}

class ReportEntries extends PureComponent {
    entryData = {};

    setEntryData (key, value) {
        this.entryData[key] = value;
        this.updateEntries();
        this.forceUpdate();
    }

    componentDidMount () {
        this.updateEntries();
        this.forceUpdate();
    }

    totalAmount = 0;
    netTotalAmount = 0;
    memberships = {};
    magazines = {};

    updateEntries () {
        const { entryData } = this;
        const { item } = this.props;

        const entryPrices = (item.method?.prices || {})[item.intermediary.year]?.registrationEntries || {};
        const categoryPrices = {};
        const magazinePrices = {};
        for (const category of (entryPrices.membershipCategories || [])) {
            categoryPrices[category.id] = category;
        }
        for (const magazine of (entryPrices.magazines || [])) {
            magazinePrices[magazine.id] = magazine;
        }

        this.totalAmount = 0;
        this.netTotalAmount = 0;
        this.memberships = {};
        this.magazines = {};
        for (const k in entryData) {
            const entry = entryData[k];
            for (const offer of (entry?.offers?.selected || [])) {
                let commission = 0;

                if (offer.type === 'membership') {
                    const key = `${entry.year}-${offer.id}`;
                    if (!this.memberships[key]) {
                        this.memberships[key] = {
                            commission: categoryPrices[offer.id]?.commission || 0,
                            offers: [],
                        };
                    }
                    this.memberships[key].offers.push(offer);
                    commission = this.memberships[key].commission;
                } else if (offer.type === 'magazine') {
                    const key = `${entry.year}-${offer.id}`;
                    if (!this.magazines[key]) {
                        const paper = (magazinePrices[offer.id]?.prices || {}).paper?.commission || 0;
                        const access = (magazinePrices[offer.id]?.prices || {}).access?.commission || 0;
                        this.magazines[key] = {
                            commission: { paper, access },
                            offers: [],
                        };
                    }
                    this.magazines[key].offers.push(offer);
                    commission = this.magazines[key].commission[offer.paperVersion ? 'paper' : 'access'];
                }
                this.totalAmount += offer.amount;
                this.netTotalAmount += offer.amount * (1 - commission / 100);
            }
        }

        const entries = (item.purposes || []).filter(purpose => purpose.type === 'trigger'
            && purpose.triggers === 'registration_entry');
        const isComplete = (Object.keys(entryData).length === entries.length) || ('null' in entryData);

        this.props.onNetTotalChange({
            difference: this.totalAmount - this.netTotalAmount,
            complete: isComplete,
        });
    }

    render ({ item }) {
        if (!item.purposes) return <TinyProgress />;
        const entries = item.purposes.filter(purpose => purpose.type === 'trigger'
            && purpose.triggers === 'registration_entry');
        if (!entries.length) return null;

        const items = [];
        for (const k in this.memberships) {
            const { commission, offers } = this.memberships[k];
            const byAmount = new Map();
            for (const offer of offers) {
                if (!byAmount.has(offer.amount)) {
                    const item = {
                        title: <CategoryName id={offers[0].id} abbrev />,
                        perItem: offer.amount,
                        count: 0,
                        amount: 0,
                        commission,
                    };
                    byAmount.set(offer.amount, item);
                    items.push(item);
                }
                byAmount.get(offer.amount).count++;
                byAmount.get(offer.amount).amount += offer.amount;
            }
        }
        for (const k in this.magazines) {
            const { commission, offers } = this.magazines[k];
            const accessTypes = {};
            for (const item of offers) {
                const accessType = item.paperVersion ? 'paper' : 'access';
                if (!accessTypes[accessType]) accessTypes[accessType] = [];
                accessTypes[accessType].push(item);
            }
            for (const type in accessTypes) {
                const offers = accessTypes[type];
                const byAmount = new Map();

                for (const offer of offers) {
                    if (!byAmount.has(offer.amount)) {
                        const item = {
                            title: <MagazineName id={offers[0].id} />,
                            perItem: offer.amount,
                            count: 0,
                            amount: 0,
                            commission: commission[type],
                        };
                        byAmount.set(offer.amount, item);
                        items.push(item);
                    }
                    byAmount.get(offer.amount).count++;
                    byAmount.get(offer.amount).amount += offer.amount;
                }
            }
        }
        if (Object.keys(this.entryData).length < entries.length && !('null' in this.entryData)) {
            items.push({
                title: <TinyProgress />,
                count: ' ',
            });
        }

        return (
            <div class="report-entries">
                <div class="section-title">{locale.entries.title}</div>
                {entries.map((entry, i) => (
                    <ReportEntry
                        key={i}
                        entry={entry}
                        onData={data => {
                            this.setEntryData(entry.dataId, data);
                        }} />
                ))}
                <Totals
                    showCounts
                    showCommission
                    showPerItem
                    showNet
                    items={items}
                    currency={item.currency}
                    total={this.totalAmount}
                    netTotal={this.netTotalAmount} />
            </div>
        );
    }
}

function ReportEntry ({ entry, onData }) {
    return (
        <div class="report-entry">
            <ReportEntryData id={entry.dataId} onData={onData} />
        </div>
    );
}

const ReportEntryData = connect(({ id }) => [
    'memberships/entry', {
        id,
        fields: ['year', 'status', 'offers', 'codeholderData', 'issue'],
    },
])((data, _, error, loaded) => ({ data, error, loaded }))(function ReportEntryData ({
    id,
    data,
    loaded,
    error,
    onData,
}) {
    const [collapsed, setCollapsed] = useState(true);

    if (error) {
        if (error.code === 'not-found') {
            useEffect(() => {
                onData({
                    offers: [],
                });
            }, []);

            return (
                <div class="report-entry-data is-error">
                    {locale.entries.entryNotFound}
                </div>
            );
        }
        return <div class="report-entry-data is-error"><DisplayError error={error} /></div>;
    }

    if (!loaded) {
        return <div class="report-entry-data is-loading"><TinyProgress /></div>;
    }

    useEffect(() => {
        onData(data);
    }, [data]);

    let contents;
    if (!collapsed) {
        contents = (
            <div class="entry-expanded">
                <ENTRY_FIELDS.offers.component value={data.offers} item={data} />
                <div class="entry-actions-container">
                    <LinkButton outOfTree target={`/membreco/alighoj/${id}`}>
                        {locale.entries.openDetail}
                    </LinkButton>
                </div>
            </div>
        );
    } else {
        contents = (
            <div class="entry-collapsed">
                {data.offers ? data.offers.selected.map((offer, i) => (
                    <EntrySelectedOffer key={i} offer={offer} />
                )) : null}
            </div>
        );
    }
    return (
        <div class="report-entry-data">
            <div class="entry-header">
                <div class="entry-header-info">
                    <ENTRY_FIELDS.codeholderData.component value={data.codeholderData} item={data} />
                    <div class="header-info-status">
                        <ENTRY_FIELDS.status.component value={data.status} item={data} />
                    </div>
                    <div class="header-info-issue">
                        <ENTRY_FIELDS.issue.component value={data.issue} item={data} />
                    </div>
                </div>
                <Button icon small onClick={() => setCollapsed(!collapsed)}>
                    {!collapsed ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Button>
            </div>
            {contents}
        </div>
    );
});

function ReportAddons ({ item }) {
    if (!item.purposes) return null;
    const addons = item.purposes.filter(purpose => purpose.type === 'addon');
    if (!addons.length) return null;

    return (
        <div class="report-addons">
            <div class="section-title">{locale.addons.title}</div>
            {addons.map((addon, i) => (
                <div class="entry-addon" key={i}>
                    <div class="addon-header">
                        <div class="addon-name">
                            {addon.invalid && <ErrorOutlineIcon className="addon-invalid" />}
                            {addon.paymentAddon?.name || '???'}
                        </div>
                        <div class="addon-amount">
                            <currencyAmount.renderer value={addon.amount} currency={item.currency} />
                        </div>
                    </div>
                    <div class="addon-description">
                        {(addon.description || '').split('\n').map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReportExpenses ({ item }) {
    if (!item.purposes) return null;
    const expenses = item.purposes.filter(purpose => purpose.type === 'manual');
    if (!expenses.length) return null;

    return (
        <div class="report-expenses">
            <div class="section-title">{locale.expenses.title}</div>
            {expenses.map((expense, i) => (
                <div class="entry-expense" key={i}>
                    <div class="expense-header">
                        <div class="expense-title">
                            {expense.invalid && <div class="expense-invalid"><ErrorOutlineIcon /></div>}
                            {expense.title}
                        </div>
                        <currencyAmount.renderer value={expense.amount} currency={item.currency} />
                    </div>
                    <div class="expense-description">
                        <MdField
                            value={expense.description}
                            rules={['emphasis', 'strikethrough', 'link', 'list', 'table']} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function EntrySelectedOffer ({ offer }) {
    let contents;
    if (offer.type === 'membership') {
        contents = <EntrySelectedMembership id={offer.id} />;
    } else if (offer.type === 'magazine') {
        contents = <EntrySelectedMagazine id={offer.id} paperVersion={offer.paperVersion} />;
    }
    return (
        <span class="intermediary-report-entry-selected-offer">
            {contents}
        </span>
    );
}

export function CategoryName ({ id, abbrev }) {
    const [loading, error, data] = useDataView('memberships/category', { id });

    if (error) return '—';
    if (loading) return <TinyProgress />;
    if (!data) return null;

    return abbrev ? data.nameAbbrev : data.name;
}

export function MagazineName ({ id }) {
    const [loading, error, data] = useDataView('magazines/magazine', { id });

    if (error) return '—';
    if (loading) return <TinyProgress />;
    return data?.name;
}


export function EntrySelectedMembership ({ id }) {
    const [loading, error, data] = useDataView('memberships/category', { id });

    if (error) return '—';
    if (loading) return <TinyProgress />;
    if (!data) return null;
    return (
        <MembershipChip
            abbrev={data.nameAbbrev}
            name={data.name}
            givesMembership={data.givesMembership}
            lifetime={data.lifetime} />
    );
}

export function EntrySelectedMagazine ({ id, paperVersion }) {
    const [loading, error, data] = useDataView('magazines/magazine', { id });

    if (error) return '—';
    if (loading) return <TinyProgress />;
    if (!data) return null;
    return (
        <span class="intermediary-report-entry-selected-magazine">
            {locale.entries.magazinePrefix}
            {' '}
            {data.name}
            <span class="version-tag">
                {entriesLocale.offers.paperVersionLabels[(paperVersion || false).toString()]}
            </span>
        </span>
    );
}

export function Totals ({
    items, total, netTotal, currency, showCounts, showCommission, showPerItem, showNet, isFinal,
    incompleteNet,
}) {
    return (
        <div class="intermediary-report-totals">
            <div class="totals-item is-header">
                {showCommission && (
                    <div class="item-commission" title={locale.totals.headers.commissionTitle}>
                        {items.length ? locale.totals.headers.commission : null}
                    </div>
                )}
                <div class="item-title">
                    {items.length ? locale.totals.headers.desc : null}
                </div>
                {showCounts && (
                    <div class="item-count">
                        {locale.totals.headers.count}
                    </div>
                )}
                {showPerItem && (
                    <div class="item-price-per">
                        {locale.totals.headers.perItem}
                    </div>
                )}
                <div class={'item-price' + (showNet ? ' has-net' : '')}>
                    {showNet ? locale.totals.headers.gross : locale.totals.headers.price}
                </div>
                {showNet && (
                    <div class="item-net-price">
                        {locale.totals.headers.net}
                    </div>
                )}
            </div>

            {items.map((item, i) => (
                <div class="totals-item" key={i}>
                    {showCommission && (
                        <div class="item-commission">
                            {item.commission ? (
                                <span>
                                    {Math.round(item.commission)} %
                                </span>
                            ) : null}
                        </div>
                    )}
                    <div class="item-title">
                        {item.title}
                    </div>
                    {showCounts && (
                        <div class="item-count">
                            {item.count || 1}
                            {showPerItem && ' ×'}
                        </div>
                    )}
                    {showPerItem && (
                        <div class="item-price-per">
                            <currencyAmount.renderer value={item.perItem} currency={currency} />
                        </div>
                    )}
                    <div class={'item-price' + (showNet ? ' has-net' : '')}>
                        <currencyAmount.renderer value={item.amount} currency={currency} />
                    </div>
                    {showNet && (
                        <div class="item-net-price">
                            <currencyAmount.renderer
                                value={item.netAmount || (item.amount * (1 - item.commission / 100))}
                                currency={currency} />
                        </div>
                    )}
                </div>
            ))}
            <hr />
            <div class="totals-item">
                <div class={'item-title' + (isFinal ? ' is-final' : '')}>
                    {isFinal ? locale.totals.final : locale.totals.sum}
                </div>
                <div class={'item-price' + (showNet ? ' has-net' : '')}>
                    <currencyAmount.renderer value={total} currency={currency} />
                </div>
                {showNet && (
                    <div class="item-net-price">
                        {incompleteNet ? (
                            <TinyProgress />
                        ) : (
                            <currencyAmount.renderer value={netTotal} currency={currency} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
