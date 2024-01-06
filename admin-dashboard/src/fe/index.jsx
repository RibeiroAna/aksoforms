import { h, render, Component } from 'preact';
import { Fragment } from 'preact/compat';
import { CircularProgress, LinearProgress } from 'yamdl';
import EventEmitter from 'events';
import { base } from 'akso:config';
import { LoginAuthStates } from '../protocol';
import isSpecialPage from './features/login/is-special-page';
import { Worker } from './core';
import { coreContext } from './core/connection';
import { routerContext } from './router';
import { insecureContext, getAuthSureIsTakingAWhile, getAuthTryCounter } from './locale';
import { loadTaskView } from './task-views';
import TaskView from './task-view';
import './style.less';

import 'preact-debug-if-dev';

/** AKSO session manager. */
class Session extends Component {
    state = {
        /** the Login component */
        login: null,
        /** the App component */
        app: null,
        /** whether or not we’re logged in */
        loggedIn: false,
        /**
         * whether or not we should show the login page
         * this exists to allow for animation buffer time between login and when the app displays
         */
        showLogin: false,
        /** if true, the app will play the you-just-logged-in animation */
        wasLoggedOut: false,
        /** if true, this is a special page (e.g. password reset) and must show the login screen */
        specialPage: false,

        /** (derived from this.#loadingTaskViews) number of task views being loaded at the moment */
        loadingTaskViews: 0,
    };

    loadLogin () {
        if (!this.loginPromise) {
            this.loginPromise =
                import(/* webpackChunkName: "login", webpackPrefetch: true */ './features/login');
            this.loginPromise.then(e => this.setState({ login: e.default }));
        }
    }

    loadApp () {
        if (!this.appPromise) {
            this.appPromise =
                import(/* webpackChunkName: "app", webpackPrefetch: true */ './app');
            this.appPromise.then(e => this.setState({ app: e.default }));
        }
    }

    componentDidMount () {
        this.createCore();

        if (isSpecialPage()) {
            this.setState({ specialPage: true });
            this.loadLogin();
        }

        this.loadApp();
    }

    errorEmitter = new EventEmitter();
    createCore () {
        if (this.loginView) this.loginView.drop();
        if (this.tasksView) this.tasksView.drop();
        if (this.core) this.core.drop();

        this.core = new Worker();
        this.loginView = this.core.createDataView('login');
        this.loginView.on('update', this.#onLoginUpdate);

        this.tasksView = this.core.createDataView('#tasks');
        this.tasksView.on('update', this.#onTasksUpdate);

        this.core.on('task-error', (...args) => this.errorEmitter.emit('task-error', ...args));
        this.core.on('unhandled-rejection', (...args) => this.errorEmitter.emit('unhandled-rejection', ...args));
    }

    #hideLoginTimeout = null;
    #firstSession = true;
    #onLoginUpdate = data => {
        if (data.completed) {
            // session completed; re-create core
            this.createCore();
            this.setState({ showLogin: true });
            return;
        }

        if (data.getAuthTries) {
            this.setState({ getAuthTries: data.getAuthTries });
        }

        this.setState({ loggedIn: data.authState === LoginAuthStates.LOGGED_IN && data.isAdmin });
        if (data.authState && (data.authState !== LoginAuthStates.LOGGED_IN || !data.isAdmin)) {
            clearTimeout(this.#hideLoginTimeout);
            this.setState({ wasLoggedOut: true });
            if (this.#firstSession) {
                this.setState({ showLogin: true });
                this.#firstSession = false;
            }
            this.loadLogin();
        } else if (data.authState && this.state.showLogin) {
            if (this.#hideLoginTimeout === null) {
                this.#hideLoginTimeout = setTimeout(() => {
                    this.setState({ showLogin: false });
                    this.#hideLoginTimeout = null;
                }, 1000);
            }
        }
    };

    #taskViews = new Map();
    #tasks = new Set();
    #loadingTaskViews = 0;
    #onTasksUpdate = data => {
        for (const id in data) {
            if (!this.#tasks.has(id)) {
                this.#onAddTask(id, data[id]);
            }
        }
        for (const id of this.#tasks.keys()) {
            if (!(id in data)) {
                this.#onRemoveTask(id);
            }
        }
        this.#cleanTasks();
        this.forceUpdate();
    };
    #onAddTask = async (id, path) => {
        this.#tasks.add(id);
        this.#loadingTaskViews++;
        this.setState({ loadingTaskViews: this.#loadingTaskViews });
        const taskView = await loadTaskView(path);
        this.#loadingTaskViews--;
        this.setState({ loadingTaskViews: this.#loadingTaskViews });

        if (taskView !== null) {
            this.#taskViews.set(id, {
                path,
                view: taskView,
                died: 0,
            });
            this.forceUpdate();
        }
    };
    #onRemoveTask = (id) => {
        this.#tasks.delete(id);
        const view = this.#taskViews.get(id);
        if (view) this.#taskViews.set(id, {
            ...view,
            died: Date.now(),
        });
    };
    #cleanTasks = () => {
        const toBeRemoved = new Set();
        for (const [id, { died }] of this.#taskViews.entries()) {
            if (died && Date.now() - died > 500) toBeRemoved.add(id);
        }
        for (const id of toBeRemoved) this.#taskViews.delete(id);
    };

    #appRef = null;
    #onRouterNavigationRequest = (...args) => {
        if (this.#appRef) this.#appRef.onRouterNavigationRequest(...args);
    };

    render () {
        const { loggedIn, showLogin, wasLoggedOut, specialPage, login: Login, app: App } = this.state;

        let login = null;
        let app = null;
        if (Login && (showLogin || specialPage)) {
            login = <Login />;
        }

        const tasks = [];
        let renderTasksHere = true;
        for (const [id, { path, view, died }] of this.#taskViews.entries()) {
            tasks.push(
                <TaskView
                    key={id}
                    id={id}
                    path={path}
                    core={this.core}
                    view={view}
                    isDead={!!died} />
            );
        }

        if (!specialPage && loggedIn && App) {
            // also pass tasks because those need some contexts only available in the app
            app = (
                <App
                    animateIn={wasLoggedOut}
                    ref={view => this.#appRef = view}
                    tasks={tasks}
                    errors={this.errorEmitter} />
            );
            renderTasksHere = false;
        }

        return (
            <coreContext.Provider value={this.core}>
                <routerContext.Provider value={{
                    navigate: this.#onRouterNavigationRequest,
                }}>
                    <Fragment>
                        <LoadingIndicator loading={!login && !app} />
                        {!login && !app && <GetAuthSureIsTakingAWhile tries={this.state.getAuthTries} />}
                        {app}
                        {login}
                        {renderTasksHere ? tasks : null}
                        <SmallLoadingIndicator loading={this.state.loadingTaskViews} />
                    </Fragment>
                </routerContext.Provider>
            </coreContext.Provider>
        );
    }
}

/** Loading indicator shown in the middle of the screen. Appears after a delay */
class LoadingIndicator extends Component {
    state = {
        visible: false,
    };

    componentDidMount () {
        this.setState({ visible: this.props.loading });
        if (this.props.loading) this.visibleTime = Date.now();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.loading !== this.props.loading) {
            if (!this.props.loading) {
                if (Date.now() - this.visibleTime < 500) {
                    // loading indicator never appeared
                    this.setState({ visible: false });
                } else {
                    this.hideTimeout = setTimeout(() => {
                        this.setState({ visible: false });
                    }, 1000);
                }
            } else {
                clearTimeout(this.hideTimeout);
                this.setState({ visible: true });
                this.visibleTime = Date.now();
            }
        }
    }

    render () {
        if (!this.state.visible) return null;
        return (
            <div id="app-loading-indicator" class={!this.props.loading ? 'animate-out' : ''}>
                <CircularProgress indeterminate />
            </div>
        );
    }
}

/** Small loading indicator shown on the top edge of the screen. */
class SmallLoadingIndicator extends LoadingIndicator {
    render () {
        if (!this.state.visible) return null;
        return (
            <div id="app-small-loading-indicator" class={!this.props.loading ? 'animate-out' : ''}>
                <LinearProgress class="inner-progress-indicator" indeterminate />
            </div>
        );
    }
}

/** Overlays information about connecting to API when it's taking a while */
class GetAuthSureIsTakingAWhile extends Component {
    componentDidMount () {
        this.updateInterval = setInterval(this.update, 50);
    }
    componentWillUnmount () {
        clearInterval(this.updateInterval);
    }
    update = () => this.forceUpdate();
    render ({ tries }) {
        if (!tries || tries[0] < 2) return;
        const [tryCount, nextTry] = tries;

        const contents = getAuthSureIsTakingAWhile.split(/[|]/g).map((x, i) =>
            i % 2 === 0 ? x : <a href={x} target="_blank" rel="noreferrer">{x}</a>);

        return (
            <Fragment>
                <div id="get-auth-sure-is-taking-a-while">
                    {contents}
                </div>
                <div id="get-auth-sitaw-backend-url">
                    <span class="inner-prog-box">
                        {(Date.now() < nextTry) && (
                            <span class="next-try-ind">{Math.ceil((nextTry - Date.now()) / 1000)}s</span>
                        )}
                        <CircularProgress
                            class="inner-progress"
                            small
                            indeterminate={(Date.now() + 300 > nextTry) || (Date.now() > nextTry)} />
                    </span>
                    <a
                        href={base}
                        target="_blank"
                        rel="noreferrer">{base}</a>
                    <span class="try-counter">{getAuthTryCounter(tryCount)}</span>
                </div>
            </Fragment>
        );
    }
}

if (navigator.standalone) {
    // iOS standalone mode
    document.body.classList.add('is-ios-standalone');
}

(async () => {
    if (!('PointerEvent' in window)) {
        await import('@wessberg/pointer-events');
    }

    const sessionRoot = document.createElement('div');
    sessionRoot.id = 'session-root';
    sessionRoot.className = 'root-container';
    document.body.appendChild(sessionRoot);
    if (window.isSecureContext) {
        render(<Session />, sessionRoot);
    } else {
        console.error('insecure context!'); // eslint-disable-line no-console
        sessionRoot.style.padding = '24px';
        sessionRoot.style.textAlign = 'center';
        sessionRoot.textContent = insecureContext;
    }
})();

// don’t show “add to homescreen” prompt
window.addEventListener('beforeinstallprompt', e => e.preventDefault());
