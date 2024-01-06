import { h, Component } from 'preact';
import { AppBarProvider } from 'yamdl';
import { Perms } from '@tejo/akso-client';
import Sidebar from './features/sidebar';
import Navigation from './features/navigation';
import FatalError from './features/fatal-error';
import EventProxy from './components/utils/event-proxy';
import Notifications from './notif';
import { connect } from './core/connection';
import permsContext from './perms';
import './app.less';

// set up moment
import moment from 'moment';
import 'moment-timezone';
import 'moment/locale/eo';
moment.locale('eo');
moment.tz.setDefault('UTC');

/** width at which we'll show the sidebar permanently instead of having it slide out */
const PERMA_SIDEBAR_WIDTH = 900;

/** dummy permissions are used until actual permissions have been loaded from the server */
function createDummyPerms () {
    const perms = new Perms();
    perms.load({
        permissions: [],
        memberFilter: {},
        memberFields: null,
        ownMemberFields: null,
        isActiveMember: false,
    });
    perms._isDummy = true;
    return perms;
}

/**
 * The application component.
 * This contains everything pertaining to a logged-in session.
 */
export default connect('perms/perms')(perms => ({ perms }))(class App extends Component {
    state = {
        permaSidebar: window.innerWidth >= PERMA_SIDEBAR_WIDTH,
        sidebarOpen: false,
        currentPage: null,
        error: null,
    };

    onResize = () => this.setState({ permaSidebar: window.innerWidth >= PERMA_SIDEBAR_WIDTH });

    // close the sidebar when the user navigates, especially when they select a sidebar item
    onNavigate = () => this.setState({ sidebarOpen: false });

    onCurrentPageChange = currentPage => this.setState({ currentPage });

    // navigation ref
    #navigation = null;

    onRouterNavigationRequest = (...args) => this.#navigation.navigate(...args);

    perms = createDummyPerms();

    componentDidMount () {
        this.onResize();

        if (this.props.perms) {
            // this is a silly requirement for the react context to update properly:
            // the two perms objects must not be identical
            this.perms = new Perms();
            this.perms.load(this.props.perms);
        }
    }

    componentDidUpdate (prevProps) {
        if (prevProps.perms !== this.props.perms) {
            // this is a silly requirement for the react context to update properly:
            // the two perms objects must not be identical
            this.perms = new Perms();
            this.perms.load(this.props.perms);
            this.forceUpdate();
        }
    }

    componentDidCatch (error, errorInfo) {
        console.error(`[App] render error`, error, errorInfo); // eslint-disable-line no-console
    }

    static getDerivedStateFromError (error) {
        return { error };
    }

    render ({ tasks, errors }) {
        let className = 'akso-app';
        if (this.props.animateIn) className += ' animate-in';

        if (this.state.error) {
            return (
                <div class="app-error">
                    <FatalError error={this.state.error} />
                </div>
            );
        }

        return (
            <permsContext.Provider value={this.perms}>
                <div class={className}>
                    <EventProxy dom target={window} onresize={this.onResize} />
                    <Sidebar
                        permanent={this.state.permaSidebar}
                        open={this.state.sidebarOpen || this.state.permaSidebar}
                        onOpen={() => this.setState({ sidebarOpen: true })}
                        onClose={() => this.setState({ sidebarOpen: false })}
                        currentPage={this.state.currentPage}
                        onDirectTransition={this.props.onDirectTransition}
                        onDoAnimateIn={() => this.setState({ animateIn: true })} />
                    <AppBarProvider>
                        <Navigation
                            ref={view => this.#navigation = view}
                            permaSidebar={this.state.permaSidebar}
                            onOpenMenu={() => this.setState({ sidebarOpen: true })}
                            onCurrentPageChange={this.onCurrentPageChange}
                            onNavigate={this.onNavigate}
                            perms={this.perms} />
                        {tasks}
                    </AppBarProvider>
                    <Notifications errors={errors} />
                </div>
            </permsContext.Provider>
        );
    }
});
