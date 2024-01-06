import { lazy } from 'preact/compat';
import HomeIcon from '@material-ui/icons/Home';
import AssignmentIndIcon from '@material-ui/icons/AssignmentInd';
import AssessmentIcon from '@material-ui/icons/Assessment';
import BusinessIcon from '@material-ui/icons/Business';
import PaymentIcon from '@material-ui/icons/Payment';
import HowToVoteIcon from '@material-ui/icons/HowToVote';
import CardMembershipIcon from '@material-ui/icons/CardMembership';
import EmailIcon from '@material-ui/icons/Email';
import MarkunreadMailboxIcon from '@material-ui/icons/MarkunreadMailbox';
import SupervisorAccountIcon from '@material-ui/icons/SupervisorAccount';
import HttpIcon from '@material-ui/icons/Http';
import DeveloperModeIcon from '@material-ui/icons/DeveloperMode';
import PublicIcon from '@material-ui/icons/Public';
import LanguageIcon from '@material-ui/icons/Language';
import MoveToInboxIcon from '@material-ui/icons/MoveToInbox';
import DescriptionIcon from '@material-ui/icons/Description';
import {
    BadgeIcon,
    ChangeRequestIcon,
    ChangeRequestNewIcon,
    ConfigMembershipIcon,
    AddMembershipIcon,
    NewspaperIcon,
    ListsIcon,
    PaymentOrgsIcon,
} from '../../components/icons';
// import AssignmentIcon from '@material-ui/icons/Assignment';
// import FileIcon from '@material-ui/icons/InsertDriveFile';
import WorkOutlineIcon from '@material-ui/icons/WorkOutline';
import DataUsageIcon from '@material-ui/icons/DataUsage';

/** Lazily load a page and also have some basic error handling. */
const elazy = (inner, map) => lazy(() => inner().then(e => {
    if (map) return { default: map(e) };
    return e;
}).catch(err => {
    console.error('Failed to load app page', err); // eslint-disable-line no-console
    return {
        __esModule: true,
        default: () => {
            throw err;
        },
    };
}));

/**
 * Navigation hierarchy.
 * IDs are `locale->pages[id]` keys and are also used to identify pages elsewhere.
 */
export default [
    {
        id: 'undefined',
        contents: [
            {
                id: 'debug',
                component: elazy(() =>
                    import(/* webpackChunkName: "debug-tools" */ './debug')),
                icon: () => null,
                path: 'debug',
                hasPerm: () => true,
                hidden: true,
                paths: [
                    {
                        type: 'stack',
                        path: 'components',
                        component: elazy(() =>
                            import(/* webpackChunkName: "debug-tools" */ './debug/components')),
                    },
                    {
                        type: 'stack',
                        path: 'launchpad_mcquack.jpg',
                        component: elazy(() =>
                            import(/* webpackChunkName: "debug-tools" */ './debug/crash')),
                    },
                ],
            },
            {
                id: 'home',
                icon: HomeIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "home" */ './home')),
                path: '',
                hasPerm: () => true,
            },
            {
                id: 'email',
                icon: EmailIcon,
                path: 'amasmesaghoj',
                component: elazy(() =>
                    import(/* webpackChunkName: "notif-templates" */ './notif-templates')),
                hasPerm: perms => perms.hasPerm('notif_templates.read.uea') || perms.hasPerm('notif_templates.read.tejo'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'template',
                        component: elazy(() =>
                            import(/* webpackChunkName: "notif-templates" */ './notif-templates/detail')),
                        type: 'stack',
                        paths: [
                            {

                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'antauhvido',
                                type: 'stack',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "notif-templates" */ './notif-templates/preview')),
                            },
                        ],
                    },
                ],
            },
            {
                id: 'magazines',
                icon: NewspaperIcon,
                path: 'revuoj',
                component: elazy(() =>
                    import(/* webpackChunkName: "magazines" */ './magazines')),
                hasPerm: perms => perms.hasPerm('magazines.read.tejo') || perms.hasPerm('magazines.read.uea'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'magazine',
                        component: elazy(() =>
                            import(/* webpackChunkName: "magazines" */ './magazines/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'numero',
                                type: 'state',
                                state: '_dummy',
                                paths: [
                                    {
                                        match: /^(\d+)$/,
                                        matchKey: 'edition',
                                        type: 'stack',
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "magazines-editions" */ './magazines/editions/detail')),
                                        paths: [
                                            {
                                                path: 'redakti',
                                                type: 'state',
                                                state: 'editing',
                                            },
                                            {
                                                path: 'enhavo',
                                                type: 'state',
                                                state: '_dummy',
                                                paths: [
                                                    {
                                                        match: /^(\d+)$/,
                                                        matchKey: 'toc',
                                                        type: 'stack',
                                                        component: elazy(() =>
                                                            import(/* webpackChunkName: "magazines-toc" */ './magazines/editions/toc/detail')),
                                                        paths: [
                                                            {
                                                                path: 'redakti',
                                                                type: 'state',
                                                                state: 'editing',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                path: 'momentaj-abonantoj',
                                                type: 'stack',
                                                component: elazy(() =>
                                                    import(/* webpackChunkName: "magazines-snapshots" */ './magazines/editions/snapshots/index')),
                                                paths: [
                                                    {
                                                        match: /^(\w+)$/,
                                                        matchKey: 'snapshot',
                                                        type: 'stack',
                                                        component: elazy(() =>
                                                            import(/* webpackChunkName: "magazines-snapshots" */ './magazines/editions/snapshots/detail')),
                                                        paths: [
                                                            {
                                                                path: 'redakti',
                                                                type: 'state',
                                                                state: 'editing',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                path: 'simplaj-abonoj',
                                type: 'stack',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "magazines-subscriptions" */ './magazines/subscriptions/index')),
                                paths: [
                                    {
                                        match: /^(\w+)$/,
                                        matchKey: 'subscription',
                                        type: 'stack',
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "magazines-subscriptions" */ './magazines/subscriptions/detail')),
                                        paths: [
                                            {
                                                path: 'redakti',
                                                type: 'state',
                                                state: 'editing',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'congresses',
                icon: BusinessIcon,
                path: 'kongresoj',
                component: elazy(() =>
                    import(/* webpackChunkName: "congresses", webpackPrefetch: true */ './congresses')),
                hasPerm: perms => perms.hasPerm('congresses.read.uea') || perms.hasPerm('congresses.read.tejo'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'congress',
                        component: elazy(() =>
                            import(/* webpackChunkName: "congresses" */ './congresses/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'okazigoj',
                                type: 'state',
                                state: '_dummy',
                                paths: [
                                    {
                                        match: /^(\d+)$/,
                                        matchKey: 'instance',
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "congresses-instances" */ './congresses/instances/detail')),
                                        type: 'stack',
                                        requestWide: true,
                                        paths: [
                                            {
                                                path: 'redakti',
                                                type: 'state',
                                                state: 'editing',
                                            },
                                            {
                                                path: 'lokoj',
                                                type: 'state',
                                                state: 'locations',
                                                paths: [
                                                    {
                                                        match: /^(\d+)$/,
                                                        matchKey: 'location',
                                                        type: 'stack',
                                                        component: elazy(() => import(/* webpackChunkName: "congresses-locations" */ './congresses/instances/locations/detail')),
                                                        paths: [
                                                            {
                                                                path: 'redakti',
                                                                type: 'state',
                                                                state: 'editing',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                path: 'programeroj',
                                                type: 'state',
                                                state: 'programs',
                                                paths: [
                                                    {
                                                        match: /^(\d+)$/,
                                                        matchKey: 'program',
                                                        type: 'stack',
                                                        component: elazy(() => import(/* webpackChunkName: "congresses-programs" */ './congresses/instances/programs/detail')),
                                                        paths: [
                                                            {
                                                                path: 'redakti',
                                                                type: 'state',
                                                                state: 'editing',
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                path: 'alighintoj',
                                                type: 'state',
                                                state: 'participants',
                                                paths: [
                                                    {
                                                        match: /^([\da-fA-F]+)$/,
                                                        matchKey: 'participant',
                                                        type: 'stack',
                                                        component: elazy(() => import(/* webpackChunkName: "congresses-participants" */ './congresses/instances/participants/detail')),
                                                        paths: [
                                                            {
                                                                path: 'redakti',
                                                                type: 'state',
                                                                state: 'editing',
                                                            },
                                                        ],
                                                    },
                                                    {
                                                        match: 'tabelo',
                                                        type: 'state',
                                                        state: 'spreadsheetOpen',
                                                    },
                                                ],
                                            },
                                            {
                                                path: 'alighilo',
                                                type: 'stack',
                                                component: elazy(() => import(/* webpackChunkName: "congresses-registration" */ './congresses/instances/registration-form')),
                                                paths: [
                                                    {
                                                        path: 'redakti',
                                                        type: 'state',
                                                        state: 'editing',
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'votes',
                icon: HowToVoteIcon,
                path: 'vochdonoj',
                component: elazy(() =>
                    import(/* webpackChunkName: "votes", webpackPrefetch: true */ './votes')),
                hasPerm: perms => perms.hasPerm('votes.read.uea') || perms.hasPerm('votes.read.tejo'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'vote',
                        component: elazy(() =>
                            import(/* webpackChunkName: "votes", webpackPrefetch: true */ './votes/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'rezultoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "votes-results", webpackPrefetch: true */ './votes/results')),
                                type: 'stack',
                            },
                        ],
                    },
                    {
                        path: 'shablonoj',
                        component: elazy(() =>
                            import(/* webpackChunkName: "votes", webpackPrefetch: true */ './votes/templates')),
                        type: 'stack',
                        paths: [
                            {
                                match: /^(\d+)$/,
                                matchKey: 'template',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "votes", webpackPrefetch: true */ './votes/template')),
                                type: 'stack',
                                paths: [
                                    {
                                        path: 'redakti',
                                        type: 'state',
                                        state: 'editing',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'newsletters',
                icon: MarkunreadMailboxIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "newsletters" */ './newsletters')),
                path: 'bultenoj',
                hasPerm: perms => perms.hasPerm('newsletters.uea.read') || perms.hasPerm('newsletters.tejo.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'newsletter',
                        component: elazy(() =>
                            import(/* webpackChunkName: "newsletters" */ './newsletters/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'malabonoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "newsletters" */ './newsletters/unsubscriptions')),
                                type: 'stack',
                                paths: [
                                    {
                                        match: /^(\d+)$/,
                                        matchKey: 'unsubscription',
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "newsletters" */ './newsletters/unsubscriptions/detail')),
                                        type: 'stack',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            /* { // future features
                id: 'reports',
                icon: AssignmentIcon,
                path: 'raportoj',
                hasPerm: () => true,
            },
            {
                id: 'documents',
                icon: FileIcon,
                path: 'dokumentoj',
                hasPerm: () => true,
            }, */
        ],
    },
    {
        id: 'ch',
        contents: [
            {
                id: 'codeholders',
                component: elazy(() =>
                    import(/* webpackChunkName: "codeholders", webpackPrefetch: true */ './codeholders')),
                icon: AssignmentIndIcon,
                path: 'membroj',
                paths: [
                    {
                        match: /^(\d+|self)$/,
                        matchKey: 'codeholder',
                        component: elazy(() =>
                            import(/* webpackChunkName: "codeholder-detail", webpackPrefetch: true */ './codeholders/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'membrecoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "codeholder-memberships" */ './codeholders/memberships-roles'), e => e.MembershipPage),
                                type: 'stack',
                                hasPerm: perms => perms.hasCodeholderField('membership', 'r'),
                            },
                            {
                                path: 'roloj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "codeholder-roles" */ './codeholders/memberships-roles'), e => e.RolesPage),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('codeholder_roles.read'),
                            },
                            {
                                path: 'historio',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "codeholder-history" */ './codeholders/field-history')),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('codeholders.hist.read'),
                            },
                            {
                                path: 'ensalutoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "codeholder-logins" */ './codeholders/logins')),
                                type: 'stack',
                                hasPerm: perms => perms.hasCodeholderField('logins', 'r'),
                            },
                            {
                                path: 'permesoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "codeholder-perms" */ './codeholders/perms')),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('codeholders.perms.read'),
                            },
                            {
                                path: 'dosieroj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "codeholder-files" */ './codeholders/files/files-page')),
                                type: 'stack',
                                hasPerm: perms => perms.hasCodeholderField('files', 'r'),
                                paths: [
                                    {
                                        match: /^(\d+)$/,
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "codeholder-files" */ './codeholders/files/file-detail')),
                                        type: 'stack',
                                    },
                                ],
                            },
                            {
                                path: 'shanghopetoj',
                                component: elazy(() => import(/* webpackChunkName: "chgreqs" */ './change-requests')),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('codeholders.change_requests.read'),
                            },
                            {
                                path: 'delegitoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "delegates" */ './delegations/delegates')),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('codeholders.delegations.read.uea'),
                            },
                            {
                                path: 'simplaj-abonoj',
                                component: elazy(() => import(/* webpackChunkName: "magazine-subscriptions" */ './magazines/subscriptions')),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('magazines.subscriptions.read.uea') || perms.hasPerm('magazines.subscriptions.read.tejo'),
                            },
                            {
                                path: 'kongresoj',
                                component: elazy(() => import(/* webpackChunkName: "congress-participations" */ './congresses/participations')),
                                type: 'stack',
                                hasPerm: perms => perms.hasPerm('congress_instances.participants.read.uea') || perms.hasPerm('congress_instances.participants.read.tejo'),
                            },
                        ],
                    },
                    {
                        path: 'etikedoj',
                        type: 'state',
                        state: 'addrLabelGen',
                    },
                    {
                        path: 'amasmesaghoj',
                        type: 'state',
                        state: 'sendNotifTemplates',
                    },
                ],
                hasPerm: perms => perms.hasPerm('codeholders.read'),
            },
            {
                id: 'change-requests',
                icon: { resolve: tasks => tasks?.codeholderChangeRequests?.pending ? ChangeRequestNewIcon : ChangeRequestIcon },
                badge: tasks => tasks?.codeholderChangeRequests?.pending || null,
                path: 'shanghopetoj',
                component: elazy(() => import(/* webpackChunkName: "chgreqs" */ './change-requests')),
                type: 'stack',
                hasPerm: perms => perms.hasPerm('codeholders.read') && perms.hasPerm('codeholders.change_requests.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        component: elazy(() => import(/* webpackChunkName: "chgreqs" */ './change-requests/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'roles',
                icon: WorkOutlineIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "roles" */ './roles')),
                path: 'roloj',
                hasPerm: perms => perms.hasPerm('codeholder_roles.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'role',
                        component: elazy(() =>
                            import(/* webpackChunkName: "roles" */ './roles/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'lists',
                icon: ListsIcon,
                path: 'listoj',
                component: elazy(() =>
                    import(/* webpackChunkName: "lists" */ './lists')),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'list',
                        component: elazy(() =>
                            import(/* webpackChunkName: "lists" */ './lists/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
                hasPerm: perms => perms.hasPerm('lists.read'),
            },
            {
                id: 'delegations',
                icon: BadgeIcon,
                path: 'delegitoj',
                badge: tasks => (tasks?.delegates?.pendingApplications | 0) + (tasks?.delegates?.missingGeodbCities | 0),
                component: elazy(() =>
                    import(/* webpackChunkName: "delegates" */ './delegations/delegates')),
                hasPerm: perms => perms.hasPerm('codeholders.read') && perms.hasPerm('codeholders.delegations.read.uea'),
                paths: [
                    {
                        path: 'fakoj',
                        type: 'stack',
                        component: elazy(() =>
                            import(/* webpackChunkName: "delegates" */ './delegations/subjects')),
                        paths: [
                            {
                                match: /^(\d+)$/,
                                matchKey: 'subject',
                                type: 'stack',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "delegates" */ './delegations/subjects/detail')),
                                paths: [
                                    {
                                        path: 'redakti',
                                        type: 'state',
                                        state: 'editing',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        match: /^(\d+)$/,
                        matchKey: 'codeholder',
                        type: 'state',
                        state: 'codeholder',
                        paths: [
                            {
                                match: /^(\w+)$/,
                                matchKey: 'org',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "delegates" */ './delegations/delegates/detail')),
                                type: 'stack',
                                paths: [
                                    {
                                        path: 'redakti',
                                        type: 'state',
                                        state: 'editing',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        path: 'kandidatighoj',
                        type: 'stack',
                        component: elazy(() =>
                            import(/* webpackChunkName: "delegates" */ './delegations/applications')),
                        paths: [
                            {
                                match: /^(\d+)$/,
                                matchKey: 'application',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "delegates" */ './delegations/applications/detail')),
                                type: 'stack',
                                paths: [
                                    {
                                        path: 'redakti',
                                        type: 'state',
                                        state: 'editing',
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'statistics',
                icon: AssessmentIcon,
                path: 'statistiko',
                component: elazy(() =>
                    import(/* webpackChunkName: "statistics" */ './statistics')),
                hasPerm: perms => perms.hasPerm('statistics.read'),
            },
        ],
    },
    {
        id: 'membership',
        path: 'membreco',
        contents: [
            {
                id: 'membership-categories',
                path: 'kategorioj',
                icon: CardMembershipIcon,
                type: 'bottom',
                component: elazy(() =>
                    import(/* webpackChunkName: "membership-categories" */ './memberships/categories')),
                hasPerm: perms => perms.hasPerm('membership_categories.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'category',
                        component: elazy(() =>
                            import(/* webpackChunkName: "membership-categories" */ './memberships/categories/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'membership-registration',
                path: 'alighiloj',
                icon: ConfigMembershipIcon,
                type: 'bottom',
                component: elazy(() =>
                    import(/* webpackChunkName: "membership-options" */ './memberships/options')),
                hasPerm: perms => perms.hasPerm('registration.options.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'year',
                        component: elazy(() =>
                            import(/* webpackChunkName: "membership-options" */ './memberships/options/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'membership-entries',
                path: 'alighoj',
                icon: AddMembershipIcon,
                badge: tasks => tasks.registration ? tasks.registration.pending : null,
                type: 'bottom',
                component: elazy(() =>
                    import(/* webpackChunkName: "membership-entries" */ './memberships/entries')),
                hasPerm: perms => perms.hasPerm('registration.entries.read'),
                paths: [
                    {
                        match: /^(\w+)$/,
                        matchKey: 'entry',
                        component: elazy(() =>
                            import(/* webpackChunkName: "membership-entries" */ './memberships/entries/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'payments',
        path: 'aksopago',
        contents: [
            {
                id: 'payment-intents',
                icon: PaymentIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "payment-intents" */ './payments/intents')),
                type: 'bottom',
                path: 'pagoj',
                badge: tasks => tasks.aksopay
                    ? tasks.aksopay.submitted + tasks.aksopay.disputed
                    : null,
                hasPerm: perms => perms.hasPerm('pay.payment_intents.read.tejo') || perms.hasPerm('pay.payment_intents.read.uea'),
                paths: [
                    {
                        path: 'raporto',
                        component: elazy(() =>
                            import(/* webpackChunkName: "payment-balance-report" */ './payments/intents/report')),
                        type: 'stack',
                    },
                    {
                        match: /^(\w+)$/,
                        matchKey: 'intent',
                        component: elazy(() =>
                            import(/* webpackChunkName: "payment-intents" */ './payments/intents/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'payment-orgs',
                icon: PaymentOrgsIcon,
                type: 'bottom',
                path: 'organizoj',
                component: elazy(() =>
                    import(/* webpackChunkName: "payment-orgs" */ './payments/orgs')),
                hasPerm: perms => perms.hasPerm('pay.read.tejo') || perms.hasPerm('pay.read.uea'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'org',
                        component: elazy(() =>
                            import(/* webpackChunkName: "payment-orgs" */ './payments/orgs/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                            {
                                path: 'aldonebloj',
                                type: 'state',
                                state: 'addons',
                                paths: [
                                    {
                                        match: /^(\d+)$/,
                                        matchKey: 'addon',
                                        type: 'stack',
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "payment-orgs" */ './payments/orgs/addons/detail')),
                                        paths: [
                                            {
                                                path: 'redakti',
                                                type: 'state',
                                                state: 'editing',
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                path: 'metodoj',
                                type: 'state',
                                state: 'methods',
                                paths: [
                                    {
                                        match: /^(\d+)$/,
                                        matchKey: 'method',
                                        type: 'stack',
                                        component: elazy(() =>
                                            import(/* webpackChunkName: "payment-orgs" */ './payments/orgs/methods/detail')),
                                        paths: [
                                            {
                                                path: 'redakti',
                                                type: 'state',
                                                state: 'editing',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'intermediaries',
        path: 'perantoj',
        contents: [
            {
                id: 'intermediaries-intermediaries',
                component: elazy(() =>
                    import(/* webpackChunkName: "intermediaries" */ './intermediaries/intermediaries')),
                icon: MoveToInboxIcon,
                type: 'bottom',
                path: 'perantoj',
                hasPerm: perms => perms.hasPerm('intermediaries.read') && perms.hasPerm('codeholders.read'),
                paths: [
                    {
                        match: /^(\w+)$/,
                        matchKey: 'intermediary',
                        component: elazy(() =>
                            import(/* webpackChunkName: "intermediaries" */ './intermediaries/intermediaries/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'intermediaries-reports',
                component: elazy(() =>
                    import(/* webpackChunkName: "intermediaries-reports" */ './intermediaries/reports')),
                icon: DescriptionIcon,
                type: 'bottom',
                path: 'spezfolioj',
                badge: tasks => tasks.aksopay ? tasks.aksopay.intermediary : null,
                hasPerm: perms => perms.hasPerm('registration.entries.intermediary') && (perms.hasPerm('pay.payment_intents.intermediary.uea') || perms.hasPerm('pay.payment_intents.intermediary.tejo')),
                paths: [
                    {
                        path: 'krei',
                        component: elazy(() =>
                            import(/* webpackChunkName: "intermediaries-reports" */ './intermediaries/reports/create')),
                        type: 'stack',
                    },
                    {
                        match: /^(\w+)$/,
                        matchKey: 'report',
                        component: elazy(() =>
                            import(/* webpackChunkName: "intermediaries-reports" */ './intermediaries/reports/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'administration',
        path: 'administrado',
        contents: [
            {
                id: 'administration-groups',
                component: elazy(() =>
                    import(/* webpackChunkName: "admin-groups" */ './administration/groups')),
                icon: SupervisorAccountIcon,
                type: 'bottom',
                path: 'grupoj',
                hasPerm: perms => perms.hasPerm('admin_groups.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'group',
                        component: elazy(() =>
                            import(/* webpackChunkName: "admin-groups" */ './administration/groups/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'permesoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "admin-group-perms" */ './administration/groups/perms')),
                                type: 'stack',
                            },
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'administration-clients',
                icon: DeveloperModeIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "admin-clients" */ './administration/clients')),
                type: 'bottom',
                path: 'klientoj',
                hasPerm: perms => perms.hasPerm('clients.read'),
                paths: [
                    {
                        match: /^([\da-fA-F]+)$/,
                        matchKey: 'client',
                        component: elazy(() =>
                            import(/* webpackChunkName: "admin-clients" */ './administration/clients/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'permesoj',
                                component: elazy(() =>
                                    import(/* webpackChunkName: "admin-client-perms" */ './administration/clients/perms')),
                                type: 'stack',
                            },
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'administration-log',
                icon: HttpIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "admin-log" */ './administration/log')),
                type: 'bottom',
                path: 'protokolo',
                hasPerm: perms => perms.hasPerm('log.read'),
                paths: [
                    {
                        match: /^(\d+)$/,
                        matchKey: 'entry',
                        component: elazy(() =>
                            import(/* webpackChunkName: "admin-log" */ './administration/log/detail')),
                        type: 'stack',
                    },
                ],
            },
            {
                id: 'administration-countries',
                icon: PublicIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "admin-countries" */ './administration/countries')),
                type: 'bottom',
                path: 'landoj',
                hasPerm: () => true,
                paths: [
                    {
                        match: /^([a-z]{2})$/i,
                        matchKey: 'country',
                        component: elazy(() =>
                            import(/* webpackChunkName: "admin-countries" */ './administration/countries/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'administration-country-groups',
                icon: LanguageIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "admin-country-groups" */ './administration/country-groups')),
                type: 'bottom',
                path: 'landaroj',
                hasPerm: () => true,
                paths: [
                    {
                        match: /^(x[a-z0-9]{2})$/i,
                        matchKey: 'group',
                        component: elazy(() =>
                            import(/* webpackChunkName: "admin-country-groups" */ './administration/country-groups/detail')),
                        type: 'stack',
                        paths: [
                            {
                                path: 'redakti',
                                type: 'state',
                                state: 'editing',
                            },
                        ],
                    },
                ],
            },
            {
                id: 'administration-status',
                icon: DataUsageIcon,
                component: elazy(() =>
                    import(/* webpackChunkName: "admin-country-groups" */ './administration/status')),
                type: 'bottom',
                path: 'stato',
                hasPerm: perms => perms.hasPerm('status.worker_queues'),
                paths: [],
            },
        ],
    },
];
