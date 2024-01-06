import { h } from 'preact';
import { PureComponent, Fragment, useRef } from 'preact/compat';
import { Button, CircularProgress, LinearProgress } from 'yamdl';
import PaymentIcon from '@material-ui/icons/Payment';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Page from '../../../components/page';
import DisplayError from '../../../components/utils/error';
import MdField from '../../../components/controls/md-field';
import { IdUEACode } from '../../../components/data/uea-code';
import Select from '../../../components/controls/select';
import {
    index as locale,
    paymentIntents as intentLocale,
    intermediaryReports as reportsLocale,
    membershipEntries as registrationLocale,
    codeholderChgReqs as chgReqLocale,
    adminStatus as statusLocale,
} from '../../../locale';
import { country, currencyAmount } from '../../../components/data';
import { connect, coreContext } from '../../../core/connection';
import { LinkButton } from '../../../router';
import Notices from './notices';
import { WorkerQueueStatus } from '../administration/status/queue';
import { base as aksoBase, buildTime as aksoBuildTime, version as aksoVersion } from 'akso:config';
import './index.less';
import { usePerms } from '../../../perms';

export default class HomePage extends Page {
    render () {
        return <HomePageContents />;
    }
}

function HomePageContents () {
    const perms = usePerms();
    return (
        <div class="home-page">
            <div class="inner-grid">
                <HomeTasks />
                <Notices />
                {perms.hasPerm('status.worker_queues') && (
                    <div class="home-card">
                        <div class="hc-title">
                            {statusLocale.workerQueues.title}
                        </div>
                        <WorkerQueueStatus />
                    </div>
                )}
                <div class="home-card">
                    <div class="hc-title">
                        {locale.admin.title}
                    </div>
                    <div class="hc-content-box">
                        <MdField
                            value={locale.admin.description}
                            rules={['emphasis', 'strikethrough', 'link', 'list', 'table', 'image']} />
                    </div>
                    <details class="hc-system-info">
                        <summary>{locale.admin.systemInfo.title}</summary>
                        <SystemInfo />
                    </details>
                </div>
            </div>
        </div>
    );
}

class SystemInfo extends PureComponent {
    state = {
        apiVersion: null,
    };

    static contextType = coreContext;

    componentDidMount () {
        this.context.createTask('login/apiVersion').runOnceAndDrop().then(version => {
            this.setState({ apiVersion: version });
        }).catch(err => {
            console.error('Could not fetch API version', err); // eslint-disable-line no-console
        });
    }

    render () {
        const info = [
            navigator.userAgent,
            `AKSO ${aksoVersion} @ ${aksoBuildTime}`,
            `API ${this.state.apiVersion || '?version?'} @ ${aksoBase}`,
        ];

        const textarea = useRef();
        return (
            <div>
                <Button onClick={() => {
                    navigator.clipboard.writeText(info.join('\n')).catch(console.error); // eslint-disable-line no-console
                }}>
                    {locale.admin.systemInfo.copy}
                </Button>
                <textarea readOnly ref={textarea} onClick={() => textarea.current.select()}>
                    {info.join('\n')}
                </textarea>
            </div>
        );
    }
}

class HomeTasks extends PureComponent {
    static contextType = coreContext;

    state = {
        loading: false,
        items: null,
        tasks: null,
        error: null,
        tab: Object.keys(locale.tasks.tabs)[0],
    };

    load () {
        this.setState({ loading: true });
        this.context.createTask('tasks/list', {}).runOnceAndDrop().then(tasks => {
            const loaders = {};

            const loader = (fn) => fn;

            // we check for existence of fields since they'll be filtered depending on perms
            if (tasks?.aksopay) {
                const params = {
                    fields: [
                        { id: 'customer', sorting: 'none' },
                        { id: 'statusTime', sorting: 'asc' },
                        { id: 'status', sorting: 'none' },
                        { id: 'totalAmount', sorting: 'none' },
                        { id: 'amountRefunded', sorting: 'none' },
                        { id: 'currency', sorting: 'none' },
                        { id: 'intermediary', sorting: 'none' },
                    ],
                    offset: 0,
                    limit: 10,
                };
                loaders.aksopay = loader(() => this.context.createTask('payments/listIntents', {}, {
                    ...params,
                    jsonFilter: {
                        filter: {
                            intermediaryCountryCode: null,
                            status: { $in: ['disputed', 'submitted'] },
                        },
                    },
                }).runOnceAndDrop().then(data => data.items));

                loaders.intermediary = loader(() => this.context.createTask('payments/listIntents', {}, {
                    ...params,
                    jsonFilter: {
                        filter: {
                            $not: { intermediaryCountryCode: null },
                            status: { $in: ['disputed', 'submitted'] },
                        },
                    },
                }).runOnceAndDrop().then(data => data.items));
            }
            if (tasks?.registration) {
                loaders.registration = loader(() => this.context.createTask('memberships/listEntries', {}, {
                    fields: [
                        { id: 'codeholderData', sorting: 'none' },
                        { id: 'year', sorting: 'none' },
                        { id: 'timeSubmitted', sorting: 'asc' },
                        { id: 'status', sorting: 'none' },
                    ],
                    jsonFilter: {
                        filter: {
                            status: 'pending',
                        },
                    },
                    offset: 0,
                    limit: 10,
                }).runOnceAndDrop().then(data => data.items));
            }
            if (tasks?.codeholderChangeRequests) {
                loaders.changeRequests = loader(() => this.context.createTask('codeholders/changeRequests', {}, {
                    fields: [
                        { id: 'time', sorting: 'asc' },
                    ],
                    jsonFilter: {
                        filter: {
                            status: 'pending',
                        },
                    },
                    offset: 0,
                    limit: 10,
                }).runOnceAndDrop().then(data => data.items));
            }
            if (tasks?.delegates) {
                loaders.delegateApplications = loader(() => this.context.createTask('delegations/listApplications', {}, {
                    jsonFilter: {
                        filter: {
                            status: 'pending',
                        },
                    },
                    offset: 0,
                    limit: 10,
                }).runOnceAndDrop().then(data => data.items));
            }

            if (tasks?.delegates?.missingGeodbCities) {
                loaders.delegateMissingCities = loader(() => this.context.createTask('delegations/listDelegates', {}, {
                    jsonFilter: {
                        filter: {
                            cities: {
                                $hasAny: tasks.delegates.missingGeodbCities.map(id => +id.substr(1)),
                            },
                        },
                    },
                    offset: 0,
                    limit: 10,
                }).runOnceAndDrop().then(data => data.items));
            }

            if (tasks?.magazines?.paperNoAddress) {
                loaders.magPaperNoAddress = loader(() => this.context.createTask('codeholders/list', {}, {
                    fields: [
                        { id: 'name', sorting: 'none' },
                    ],
                    jsonFilter: {
                        filter: {
                            $magazineSubscriptions: {
                                paperVersion: true,
                            },
                        },
                    },
                    offset: 0,
                    limit: 10,
                }).runOnceAndDrop().then(data => data.items));
            }

            this.setState({
                loading: false,
                tasks,
                itemLoaders: loaders,
                error: null,
            });
        });
    }

    componentDidMount () {
        this.load();
    }

    render (_, { loading, tasks, itemLoaders, error }) {
        if (itemLoaders && !Object.keys(itemLoaders).length) {
            // no tabs visible
            return null;
        }

        let contents = <div class="loading-placeholder-padding" />;
        if (error) {
            contents = <DisplayError error={error} />;
        } else if (itemLoaders) {
            const renderTabItems = (key, Component) => {
                if (!(key in itemLoaders)) {
                    // no permission
                    return null;
                }
                return (
                    <HomeTabLazyItems
                        key={key}
                        loader={itemLoaders[key]}
                        component={Component} />
                );
            };

            const tabs = {
                aksopay: renderTabItems('aksopay', PaymentTaskItem),
                intermediary: renderTabItems('intermediary', IntermediaryTaskItem),
                registration: renderTabItems('registration', RegistrationTaskItem),
                changeRequests: renderTabItems('changeRequests', ChangeRequestTaskItem),
                delegateApplications: renderTabItems('delegateApplications', DelegateApplicationTaskItem),
                delegateMissingCities: renderTabItems('delegateMissingCities', DelegateMissingCityItem),
                magPaperNoAddress: renderTabItems('magPaperNoAddress', MagPaperNoAddressItem),
            };

            let currentTab = this.state.tab;
            if (!tabs[currentTab]) {
                currentTab = Object.keys(tabs).filter(tab => !!tabs[tab])[0];
            }

            const countTaskItems = k => {
                if (!tasks || !tasks[k]) return 0;
                return Object.values(tasks[k]).reduce((a, b) => a + b, 0);
            };

            const tabItemCounts = {
                aksopay: tasks?.aksopay?.submitted + tasks?.aksopay?.disputed,
                intermediary: tasks?.aksopay?.intermediary,
                registration: countTaskItems('registration'),
                changeRequests: countTaskItems('codeholderChangeRequests'),
                delegateApplications: tasks?.delegates?.pendingApplications,
                delegateMissingCities: tasks?.delegates?.missingGeodbCities?.length,
                magPaperNoAddress: tasks?.magazines?.paperNoAddress,
            };

            const otherTabsCount = Object.keys(tabItemCounts)
                .filter(k => k !== currentTab)
                .map(k => tabItemCounts[k] | 0)
                .reduce((a, b) => a + b, 0);

            contents = (
                <Fragment>
                    <div class="home-tasks-header">
                        <Select
                            value={currentTab}
                            onChange={tab => this.setState({ tab })}
                            rendered
                            items={Object.keys(locale.tasks.tabs).filter(k => k in itemLoaders).map(k => ({
                                value: k,
                                label: (
                                    <span class="home-task-tab-label" key={k}>
                                        <span class="task-badge" data-n={tabItemCounts[k]}>{tabItemCounts[k]}</span>
                                        <span class="inner-label">{locale.tasks.tabs[k]}</span>
                                    </span>
                                ),
                            }))} />
                        <div class="additional-count">
                            <span class="task-badge" data-n={otherTabsCount}>{otherTabsCount}</span>
                            {locale.tasks.otherTabs(otherTabsCount)}
                        </div>
                    </div>
                    {tabs[currentTab]}
                </Fragment>
            );
        }

        return (
            <div class="home-card">
                <div class="hc-title">
                    {locale.tasks.title}
                </div>
                <div class="home-tasks">
                    <LinearProgress class="tasks-loading" indeterminate={loading} hideIfNone />
                    {contents}
                </div>
            </div>
        );
    }
}

class HomeTabLazyItems extends PureComponent {
    state = {
        loading: false,
        items: [],
        error: null,
    };

    componentDidMount () {
        this.load();
    }

    load () {
        this.setState({ loading: true, error: null });
        this.props.loader().then(items => {
            this.setState({ loading: false, items });
        }).catch(error => {
            this.setState({ loading: false, error });
        });
    }

    render () {
        const { loading, error, items } = this.state;

        if (loading) {
            return (
                <div class="tasks-list-loading">
                    <CircularProgress indeterminate />
                </div>
            );
        } else if (error) {
            return <DisplayError error={error} />;
        }

        const tabItems = [];
        for (const id of (items || [])) {
            tabItems.push(<this.props.component key={id} id={id} />);
        }
        if (!tabItems.length) tabItems.push(
            <div class="tasks-empty">
                {locale.tasks.empty}
            </div>
        );
        return tabItems;
    }
}

const PaymentTaskItem = connect(({ id }) => ['payments/intent', {
    id,
    fields: ['customer', 'status', 'totalAmount', 'amountRefunded', 'currency', 'intermediary'],
    lazyFetch: true,
}])(data => ({ data }))(function PaymentTaskItem ({ id, data, intermediary }) {
    if (!data) return null;
    const target = intermediary
        ? `/perantoj/spezfolioj/${id}`
        : `/aksopago/pagoj/${id}`;
    return (
        <LinkButton class="home-task" target={target}>
            <div class="task-icon">
                <PaymentIcon />
            </div>
            <div class="task-details">
                <div class="task-title">
                    {intermediary ? (
                        <span>
                            {intentLocale.fields.intermediaryIdFmt(
                                data.intermediary?.year,
                                data.intermediary?.number,
                            )}
                            {' '}
                            {intentLocale.fields.intermediaryIdCountryInfix}
                            {' '}
                            <country.renderer value={data.intermediary?.country} />
                        </span>
                    ) : (
                        data.customer.name
                    )}
                    {': '}
                    <currencyAmount.renderer value={data.totalAmount - data.amountRefunded} currency={data.currency} />
                </div>
                <span class="task-badge">
                    {intermediary ? (
                        reportsLocale.intentStatuses[data.status]
                    ) : (
                        intentLocale.fields.statuses[data.status]
                    )}
                </span>
            </div>
            <div class="task-alt-icon">
                <ChevronRightIcon />
            </div>
        </LinkButton>
    );
});

const IntermediaryTaskItem = (props) => <PaymentTaskItem {...props} intermediary />;

const RegistrationTaskItem = connect(({ id }) => ['memberships/entry', {
    id,
    fields: ['timeSubmitted', 'codeholderData', 'year', 'status'],
    lazyFetch: true,
}])(data => ({ data }))(function RegistrationTaskItem ({ id, data }) {
    if (!data) return null;

    let codeholderName;
    if (typeof data.codeholderData !== 'object') {
        codeholderName = <IdUEACode id={data.codeholderData} />;
    } else {
        const name = data.codeholderData.name;
        codeholderName = [
            name.honorific,
            name.first || name.firstLegal,
            name.last || name.lastLegal,
        ].filter(x => x).join(' ');
    }

    return (
        <LinkButton class="home-task" target={`/membreco/alighoj/${id}`}>
            <div class="task-details">
                <div class="task-title">
                    <span class="task-title-item">{data.year}</span> {codeholderName}
                </div>
                <span class="task-badge">
                    {registrationLocale.fields.statusTypes[data.status.status]}
                </span>
            </div>
            <div class="task-alt-icon">
                <ChevronRightIcon />
            </div>
        </LinkButton>
    );
});

const ChangeRequestTaskItem = connect(({ id }) => ['codeholders/changeRequest', {
    id,
    lazyFetch: true,
}])(data => ({ data }))(function ChangeRequestTaskItem ({ id, data }) {
    if (!data) return null;

    return (
        <LinkButton class="home-task" target={`/shanghopetoj/${id}`}>
            <div class="task-details">
                <div class="task-title">
                    <IdUEACode id={data.codeholderId} />
                </div>
                <span class="task-badge">
                    {chgReqLocale.fields.statuses[data.status]}
                </span>
            </div>
            <div class="task-alt-icon">
                <ChevronRightIcon />
            </div>
        </LinkButton>
    );
});

const DelegateApplicationTaskItem = connect(({ id }) => ['delegations/application', {
    id,
    lazyFetch: true,
}])(data => ({ data }))(function DelegateApplicationTaskItem ({ id, data }) {
    if (!data) return null;

    // TODO: show more info

    return (
        <LinkButton class="home-task" target={`/delegitoj/kandidatighoj/${id}`}>
            <div class="task-details">
                <div class="task-title">
                    <IdUEACode id={data.codeholderId} />
                </div>
            </div>
            <div class="task-alt-icon">
                <ChevronRightIcon />
            </div>
        </LinkButton>
    );
});

const DelegateMissingCityItem = connect(({ id }) => ['delegations/delegate', {
    id,
    lazyFetch: true,
}])(data => ({ data }))(function DelegateMissingCityItem ({ id, data }) {
    if (!data) return null;

    // TODO: show more info

    return (
        <LinkButton class="home-task" target={`/delegitoj/${id}`}>
            <div class="task-details">
                <div class="task-title">
                    <IdUEACode id={data.codeholderId} />
                </div>
            </div>
            <div class="task-alt-icon">
                <ChevronRightIcon />
            </div>
        </LinkButton>
    );
});

const MagPaperNoAddressItem = connect(({ id }) => ['codeholders/codeholder', {
    id,
    lazyFetch: true,
    fields: [],
}])(data => ({ data }))(function MagPaperNoAddressItem ({ id, data }) {
    if (!data) return null;

    // TODO: show more info

    return (
        <LinkButton class="home-task" target={`/membroj/${id}`}>
            <div class="task-details">
                <div class="task-title">
                    <IdUEACode id={data.id} />
                </div>
            </div>
            <div class="task-alt-icon">
                <ChevronRightIcon />
            </div>
        </LinkButton>
    );
});
