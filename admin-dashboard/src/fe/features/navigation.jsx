import { createRef, h } from 'preact';
import { Fragment, PureComponent, Suspense } from 'preact/compat';
import { Button, CircularProgress, AppBar, AppBarProxy, AppBarConsumer, MenuIcon } from 'yamdl';
import EventProxy from '../components/utils/event-proxy';
import { CardStackProvider, CardStackRenderer, CardStackItem } from '../components/layout/card-stack';
import { FULL_SCREEN_LAYOUT_MAX_WIDTH } from '../components/layout/card-stack';
import pages from './pages';
import { MetaProvider } from './meta';
import { app as locale } from '../locale';
import { LinkButton } from '../router';
import FatalError from './fatal-error';

const USE_LOCAL_MENU = true;

// --- navigation model ---
// notes:
// - url paths represent a stack of views with associated state,
//   e.g. /view1/state1/view2/state2/view3 -> [view1:state1] [view2:state2] [view3]
// - the URL path is only parsed once during page load or certain types of link navigation.
//   the page tree is used here
// - every stack item contains its own URL,
//   e.g. [view1:/view1/state1] [view2:/view1/state1/view2/state2]
// - the URL only shows the path and query of the top item
// - operations:
//   - push: (push an item according to the page tree)
//     - view: create a new stack item, push it on the stack (then update URL)
//     - state: push state onto the current item (then update URL)
//   - pop:
//     - view: pop the view off the stack (then update URL)
//     - state: pop the state off the current item (then update URL)
//   - navigate: conflates both of the above into one operation due to the way parsing works
//   - push out of tree: push a view that is not under the current top item in the page tree as a
//     stack item.
// -- url synchronization --
// - URL sync will be attempted in an interval (due to rate limiting of replace/pushState).
// - the URL is not read except...
//   - at page load
//   - on a popstate event

/** A navigation stack item (see explanation above) */
class NavigationStackItem {
    /** The view path of this item, i.e. excluding state. (e.g. /view1/view2) */
    viewPath = '/';
    /** Only the state path of this item (e.g. /state1) */
    statePath = '/';
    /** The result of matching the path component. */
    match = [];
    /** All matches in the *path* stack for this item. */
    matches = {};
    /** URL state items. */
    state = {};
    /** The query string of this item (without leading question mark) */
    query = '';
    /** Arbitrary data associated with this item (saved as history state). */
    data = {};
    /** The route item in the page tree. */
    route = null;
    /** arbitrary metadata */
    meta = {};
    /** if stack item: content scroll view */
    scrollView = createRef();
    /** If true, content scroll view is scrolled */
    isScrolled = false;

    clone () {
        const ns = new NavigationStackItem();
        ns.viewPath = this.viewPath;
        ns.statePath = this.statePath;
        ns.match = this.match;
        ns.matches = this.matches;
        ns.state = this.state;
        ns.query = this.query;
        ns.data = this.data;
        ns.route = this.route;
        ns.meta = this.meta;
        return ns;
    }

    get fullPath () {
        return this.viewPath + (this.statePath !== '/' ? this.statePath : '');
    }

    popState (key) {
        if (key in this.state) {
            const statePathParts = this.statePath.split('/');
            // ASSUMPTION: state keys are unique
            statePathParts.splice(statePathParts.indexOf(key));
            this.statePath = statePathParts.join('/') || '/';
            delete this.state[key];
        }
    }
}

class NavigationUrlState {
    constructor (route, pathPart) {
        this.route = route;
        this.pathPart = pathPart;
    }
}

const TRUNCATED_QUERY_NAME = '?T';
const MAX_LOCATION_LEN = 1887;

function ForbiddenPage () {
    return (
        <div class="forbidden-page">
            <div class="error-title">{locale.forbidden}</div>
            <LinkButton class="error-go-home" target="/">{locale.goHome}</LinkButton>
        </div>
    );
}

function NotFoundPage () {
    return (
        <div class="not-found-page">
            <div class="error-title">{locale.notFound}</div>
            <LinkButton class="error-go-home" target="/">{locale.goHome}</LinkButton>
        </div>
    );
}

const FORBIDDEN_ROUTE = {
    component: ForbiddenPage,
};

const NOT_FOUND_ROUTE = {
    component: NotFoundPage,
};

/** Parses a full URL using the page tree */
function parseTreeURL (url, state, perms) {
    url = new URL(url);

    if (url.search === TRUNCATED_QUERY_NAME) {
        if (state && state.href) url = new URL(url.origin + state.href);
        else {
            // oh no we don’t have the full url
            // just discard state i guess
            url = new URL(url.origin + url.pathname);
        }
    }

    // individual path fragments (also removing empty fragments like in ///////)
    const pathParts = url.pathname.split('/').filter(x => x);
    if (!pathParts.length) pathParts.push(''); // need at least one item to match top level page

    const topLevelItems = [];
    for (const category of pages) {
        if (category.path) {
            topLevelItems.push({
                path: category.path,
                paths: category.contents,
            });
        } else {
            topLevelItems.push(...category.contents);
        }
    }

    let cursor = { paths: topLevelItems };
    const viewStack = [];
    const pathMatches = {};
    outer:
    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];

        let foundRoute = false;
        for (const route of (cursor.paths || [])) {
            let match;
            if (route.match) match = part.match(route.match);
            else match = part === route.path ? [part] : null; // regex match format

            if (match) {
                const routeType = route.type || 'bottom';
                const isForbidden = !perms._isDummy && route.hasPerm && !route.hasPerm(perms);
                if (isForbidden) {
                    const item = new NavigationStackItem();
                    item.route = FORBIDDEN_ROUTE;
                    viewStack.push(item);
                } else if (routeType === 'stack' || routeType === 'bottom') {
                    // view
                    // the 'bottom' type clears the stack
                    while (routeType === 'bottom' && viewStack.length) viewStack.pop();
                    const item = new NavigationStackItem();
                    item.match = match;
                    item.viewPath = '/' + pathParts.slice(0, i + 1).join('/');
                    item.route = route;
                    pathMatches[route.matchKey] = item.match;
                    item.matches = { ...pathMatches };

                    const stateItem = state && state.stack[viewStack.length];
                    if (stateItem && stateItem.viewPath === item.viewPath) {
                        item.data = stateItem.data;
                        item.query = stateItem.query;
                    }

                    viewStack.push(item);
                } else if (routeType === 'state') {
                    if (route.matchKey) {
                        pathMatches[route.matchKey] = match;
                    }
                    // state
                    const viewItem = viewStack[viewStack.length - 1];
                    if (viewItem) {
                        viewItem.statePath = '/' + viewItem.statePath.split('/').concat([part]).filter(x => x).join('/');
                        viewItem.state[route.state] = new NavigationUrlState(route, part);
                    }
                }

                cursor = route;
                foundRoute = true;
                break;
            }
        }

        if (!foundRoute) {
            // route not found
            while (viewStack.length) viewStack.pop();
            const item = new NavigationStackItem();
            item.viewPath = '/' + pathParts.join('/');
            item.route = NOT_FOUND_ROUTE;
            viewStack.push(item);
            break outer;
        }
    }

    const urlQuery = (url.search || '').substr(1); // no question mark
    // the top stack item gets the query from the URL
    if (viewStack.length) viewStack[viewStack.length - 1].query = urlQuery;

    return {
        viewStack,
        pathname: url.pathname,
        query: urlQuery,
    };
}

/** Copies state from stack a to stack b if the items match. */
function copyMatchingNavStackState (a, b, onlyMeta) {
    for (let i = 0; i < a.length && i < b.length; i++) {
        const itemA = a[i];
        const itemB = b[i];
        if (itemA.route === itemB.route && itemA.viewPath === itemB.viewPath) {
            if (!onlyMeta) {
                if (i !== b.length - 1) itemB.query = itemA.query;
                itemB.data = itemA.data;
            }
            itemB.meta = itemA.meta;
        }
    }
}

class NavigationState {
    stack = [];
    /** full url location (starting with the path). may be longer than the URL length limit */
    fullLocation = '';
    /** URL location shown in the navigation bar */
    urlLocation = '';
    pathname = '';
    query = '';

    clone () {
        const ns = new NavigationState();
        Object.assign(ns, {
            stack: this.stack.slice(),
            fullLocation: this.fullLocation,
            urlLocation: this.urlLocation,
            pathname: this.pathname,
            query: this.query,
        });
        return ns;
    }

    parse (url, state, perms) {
        const result = parseTreeURL(url, state, perms);
        this.pathname = result.pathname;
        this.query = result.query;
        this.stack = result.viewStack;
        this.updateLocation();
    }

    updateLocation () {
        this.pathname = '/';
        this.query = '';
        const topItem = this.stack[this.stack.length - 1];
        if (topItem) {
            this.pathname = topItem.fullPath;
            if (topItem.query) this.query = '?' + topItem.query;
        }

        this.fullLocation = this.pathname + this.query;
        this.urlLocation = this.fullLocation.length > MAX_LOCATION_LEN
            ? this.pathname + TRUNCATED_QUERY_NAME
            : this.fullLocation;
    }

    push (pathComponent, state, perms) {
        this.navigate('/' + this.pathname.split('/').concat([pathComponent]).join('/'), state, perms);
        return this;
    }

    pop (state, perms) {
        const pathParts = this.pathname.split('/');
        pathParts.pop();
        this.navigate('/' + pathParts.join('/'), state, perms);
        return this;
    }

    navigate (url, state, perms) {
        const oldStack = this.stack;
        this.parse(url, state, perms);
        copyMatchingNavStackState(oldStack, this.stack, state);
        return this;
    }

    pushOutOfTree (url, state, perms) {
        const oldStack = this.stack;
        this.parse(url, state, perms);
        this.stack = oldStack.concat(this.stack.slice(this.stack.length - 1));
        return this;
    }

    get currentPageId () {
        return this.stack.map(x => x.route.id).filter(x => x)[0];
    }
}

/** these browsers will yell if you replaceState too often */
const SLOW_SAVE_STATE = navigator.userAgent.includes('Safari/');

/**
 * Interval at which state will be saved. This includes writing the query string to the URL and
 * replacing window.history state.
 */
const SAVE_STATE_INTERVAL = SLOW_SAVE_STATE ? 2100 : 500; // ms

const ENABLE_FORCE_RELOAD = true;

/**
 * Navigation controller sort of thing.
 *
 * # Props
 * - onNavigate: emitted when the URL changes
 * - permaSidebar: bool
 * - onOpenMenu: fires when the menu icon is pressed
 * - onCurrentPageChange: fired when the current page id changes
 * - perms: permissions
 */
export default class Navigation extends PureComponent {
    state = {
        state: new NavigationState(),
        error: null,
    };

    #lastNavigateTime;
    #debouncedNavigateTimeout;
    #debouncedNavArgs;

    // because using this.state and this.setState is asynchronous, this may lead to weird bugs where
    // navigation state is changed at the same time but only one of those changes is retained.
    // this is a wrapper around react state to allow for nav state to be read and written coherently
    #pendingNavState;
    getNavState () {
        return this.#pendingNavState || this.state.state;
    }
    setNavState (state, then) {
        this.#pendingNavState = state;
        this.setState({ state }, then);
    }

    readStateFromURL (href, historyState, pushOutOfTree) {
        if (this.state.error && ENABLE_FORCE_RELOAD) {
            try {
                // only force reload up to 2 times so we don't get stuck in a loop
                window.sessionStorage.forceReloadCount = (window.sessionStorage.forceReloadCount | 0) + 1;
                if (window.sessionStorage.forceReloadCount > 2) {
                    return;
                }
            } catch {
                return;
            }
            // force reload to clear error state
            window.location = href;
        }

        const state = this.getNavState().clone();

        // resolve url
        // note that currentFullURL is not equal to document.location.href since the
        // document.location may be truncated
        const currentFullURL = document.location.protocol + '//' + document.location.host
            + state.fullLocation;
        const target = new URL(href, currentFullURL);

        // const prevLocation = state.fullLocation;

        if (pushOutOfTree) {
            state.pushOutOfTree(target.href, historyState, this.props.perms);
        } else {
            state.navigate(target.href, historyState, this.props.perms);
        }

        // always replace if it's just the same location
        // const forceReplace = prevLocation === state.fullLocation;
        const forceReplace = false; // FIXME: this appears to be broken

        return new Promise(resolve => {
            this.setNavState(state, () => {
                this.props.onCurrentPageChange(this.state.state.currentPageId);
                resolve(forceReplace);
            });
        });
    }

    writeStateToURL (replace) {
        this.props.onCurrentPageChange(this.getNavState().currentPageId);

        if (replace) {
            this.scheduleSaveState();
        } else {
            window.history.pushState(this.serializeState(), '', this.state.state.urlLocation);
            this.props.onNavigate();
            this.stateIsDirty = false;
        }
    }

    #ignoreNextPopState = false;
    onPopState = e => {
        if (this.#ignoreNextPopState) {
            this.#ignoreNextPopState = false;
            return;
        }
        if (this.promptCancelNavigationSync(true)) {
            // HACK: undo popstate (preventDefault does not work)
            window.history.forward();
            this.#ignoreNextPopState = true;
            return;
        }
        this.readStateFromURL(document.location.href, e.state);
    };

    /** Navigates with an href. */
    navigate = (href, replace, pushOutOfTree) => {
        if (this.promptCancelNavigationSync()) return;
        this.saveState();
        this.readStateFromURL(href, null, pushOutOfTree).then(forceReplace => {
            this.stateIsDirty = true;
            this.writeStateToURL(replace || forceReplace);
        });
    };

    /** Called when a page changes its query. */
    onQueryChange (stackIndex, newQuery) {
        const state = this.getNavState().clone();
        if (state.stack[stackIndex].query !== newQuery) {
            state.stack[stackIndex].query = newQuery;
            this.stateIsDirty = true;

            const isTopView = stackIndex === state.stack.length - 1;

            state.updateLocation();
            if (isTopView) {
                // write to URL
                this.setNavState(state, () => this.writeStateToURL(true));
            } else {
                // just save to state
                this.setNavState(state, () => this.scheduleSaveState());
            }
        }
    }

    /** Replaces all stack items above the given index with the given path. */
    pushStackAt (stackIndex, path, replace) {
        const state = this.getNavState().clone();
        state.stack.splice(stackIndex + 1);
        state.stack[state.stack.length - 1].statePath = '/'; // legacy behavior
        state.updateLocation();
        const pathname = (state.stack[state.stack.length - 1]?.fullPath || '').split('/').concat(path.split('/')).join('/');
        this.navigate(pathname, replace);
    }

    /** Removes all stack items at and above the given index. */
    popStackAt (stackIndex, replace) {
        if (this.promptCancelNavigationSync()) return;
        const state = this.getNavState().clone();
        state.stack.splice(stackIndex);
        state.updateLocation();
        this.setNavState(state, () => {
            this.stateIsDirty = true;
            this.writeStateToURL(replace);
        });
    }

    popStackState (stackIndex, stateKey, replace) {
        if (this.promptCancelNavigationSync()) return;
        const state = this.getNavState().clone();
        state.stack.splice(stackIndex + 1);
        state.stack[stackIndex].popState(stateKey);
        state.updateLocation();
        this.setNavState(state, () => {
            this.stateIsDirty = true;
            this.writeStateToURL(replace);
        });
    }

    goBackOrOpenMenu = () => {
        const state = this.getNavState().clone();
        if (state.stack.length === 1) {
            this.props.onOpenMenu();
            return;
        }
        state.stack.pop();
        state.updateLocation();
        this.setNavState(state, () => {
            this.stateIsDirty = true;
            this.writeStateToURL();
        });
    };

    updateStackScrollAt (stackIndex) {
        let state = this.getNavState();
        if (!state.stack[stackIndex]) return;
        const scrollView = state.stack[stackIndex].scrollView.current;
        if (scrollView) {
            const isScrolled = scrollView.scrollTop > 0;
            if (state.stack[stackIndex].isScrolled !== isScrolled) {
                state = state.clone();
                state.stack[stackIndex].isScrolled = isScrolled;
                this.setNavState(state);
            }
        }
    }

    // - state saving
    #saveStateTimeout;

    scheduleSaveState () {
        clearTimeout(this.#saveStateTimeout);
        this.#saveStateTimeout = setTimeout(this.saveState, SAVE_STATE_INTERVAL);
    }

    serializeState () {
        return {
            stack: this.getNavState().stack
                .map(item => ({ viewPath: item.viewPath, data: item.data, query: item.query })),
            href: this.getNavState().fullLocation,
        };
    }

    saveState = () => {
        if (!this.state.error && this.stateIsDirty) {
            clearTimeout(this.#saveStateTimeout);
            // only save while we don’t have an error
            this.stateIsDirty = false;
            try {
                window.history.replaceState(this.serializeState(), '', this.getNavState().urlLocation);
            } catch {
                // shrug
            }
        }
    };

    pageIsDirty = false;
    setPageDirty (dirty) {
        this.pageIsDirty = dirty;
    }

    onBeforeUnload = (e) => {
        if (this.pageIsDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    };

    promptCancelNavigationSync (hackDontThrow) {
        if (this.pageIsDirty) {
            const cancel = !confirm(locale.dirtyConfirmation.description);
            if (cancel) {
                if (hackDontThrow) return true;
                // FIXME: this is a hack. oftentimes state will be reset regardless of navigation,
                // so we throw an error here to prevent any subsequent code from executing
                throw new Error('Navigation canceled');
            }
        }
        return false;
    }

    componentDidMount () {
        this.readStateFromURL(document.location.href, window.history.state);
        this.scheduleSaveState();

        setTimeout(() => {
            try {
                window.sessionStorage.removeItem('forceReloadCount');
            } catch {
                // nothing
            }
        }, 30000);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.perms !== this.props.perms) {
            // if perms change (e.g. shortly after page load) we need to read state again
            // to update any “forbidden” error pages
            this.readStateFromURL(document.location.href);
        }
    }

    componentWillUnmount () {
        clearTimeout(this.#saveStateTimeout);
    }

    componentDidCatch (error, errorInfo) {
        // is it just me or does this method not actually work at all (*)
        console.error('[Navigation] render error', error, errorInfo); // eslint-disable-line no-console
    }

    static getDerivedStateFromError (error) {
        return { error };
    }

    render () {
        if (this.state.error) {
            // instead i’m just going to log the error here (*)
            if (this.state.error !== this._prevError) {
                console.error('[Navigation] render error', this.state.error); // eslint-disable-line no-console
                this._prevError = this.state.error;
            }
            return (
                <div class="navigation-view error">
                    <EventProxy
                        dom target={window}
                        onpopstate={this.onPopState} />
                    <FatalError error={this.state.error} />
                </div>
            );
        }

        let bottomPage, bottomPageMeta;
        let canPopBottomPage = false;
        const stackItems = [];

        let currentTabTitle = '';
        let currentTitle = locale.title();
        let currentActions = [];

        const state = this.state.state;
        const globalMenu = !USE_LOCAL_MENU || window.innerWidth <= FULL_SCREEN_LAYOUT_MAX_WIDTH;

        for (let i = 0; i < state.stack.length; i++) {
            const stackItem = state.stack[i];

            if (stackItem.meta) {
                currentTabTitle = stackItem.meta.title;
                currentTitle = stackItem.meta.title;
                currentActions = stackItem.meta.actions;
            }

            const index = i;

            const stateProxies = {};
            for (const k in stackItem.state) {
                stateProxies[k] = {
                    pop: (replace) => this.popStackState(index, k, replace),
                };
            }

            const isTop = i === state.stack.length - 1;
            const isBottom = i === 0;
            const PageComponent = stackItem.route.component || (() => null);

            let localHeaderClassName = 'local-page-header';
            if (stackItem.isScrolled) localHeaderClassName += ' is-scrolled';

            const metaProviderOnUpdate = ({ title, actions }) => {
                const state = this.getNavState().clone();
                state.stack[i] = state.stack[i].clone();
                state.stack[i].meta = { title, actions };
                this.setNavState(state);
            };

            let itemHeader = null;
            let itemAppBar = null;
            if (!globalMenu && !isBottom) {
                itemHeader = (
                    <Fragment>
                        <div class="page-app-bar-spacer" />
                        {isTop ? (
                            <AppBarConsumer
                                onData={data => {
                                    this.setPageDirty(!!data?.dirty);
                                }}
                                class={'app-header ' + localHeaderClassName} />
                        ) : null}
                    </Fragment>
                );
                itemAppBar = (
                    <AppBarProxy
                        class={localHeaderClassName}
                        local={!isTop}
                        priority={1}
                        menu={(
                            <Button icon small onClick={this.goBackOrOpenMenu}>
                                <MenuIcon type="back" />
                            </Button>
                        )}
                        title={stackItem.meta?.title || ''}
                        actions={stackItem.meta?.actions || []} />
                );
            }

            const itemContents = (
                <MetaProvider onUpdate={metaProviderOnUpdate}>
                    <Suspense fallback={
                        <div class="page-loading-indicator">
                            <CircularProgress indeterminate class="page-loading-indicator-inner" />
                        </div>
                    }>
                        <PageComponent
                            // the page component's key is its path, such that if the
                            // path changes the page component will be re-created.
                            // A lot of detail views aren't equipped to handle the ID of their
                            // item changing.
                            key={stackItem.path}
                            isTopPage={isTop}
                            query={stackItem.query}
                            onQueryChange={query => this.onQueryChange(index, query)}
                            match={stackItem.match}
                            matches={stackItem.matches}
                            onNavigate={this.navigate}
                            push={(path, replace) => this.pushStackAt(index, path, replace)}
                            pop={() => this.popStackAt(index)}
                            {...stateProxies} />
                    </Suspense>
                </MetaProvider>
            );

            if (isBottom) {
                bottomPage = itemContents;
                bottomPageMeta = stackItem.meta;
                if (stackItem.canPop) {
                    canPopBottomPage = stackItem.path.split('/');
                    canPopBottomPage.pop();
                    canPopBottomPage = canPopBottomPage.join('/');
                }
            } else {
                const itemIndex = i;
                stackItems.push(
                    <CardStackItem
                        wide={stackItem.route.requestWide}
                        open
                        onClose={() => this.popStackAt(itemIndex)}
                        appBar={itemAppBar}
                        header={itemHeader}
                        scrollViewRef={stackItem.scrollView}
                        onScroll={() => this.updateStackScrollAt(itemIndex)}>
                        {itemContents}
                    </CardStackItem>
                );
            }
        }

        let appBarMenuType = null;
        if (!stackItems.length || !globalMenu) {
            // bottom page
            // show menu button if applicable
            appBarMenuType = this.props.permaSidebar ? null : 'menu';
        } else {
            appBarMenuType = 'back';
        }

        const appBarMenu = appBarMenuType
            ? (
                <Button icon small onClick={this.goBackOrOpenMenu}>
                    <MenuIcon type={appBarMenuType} />
                </Button>
            )
            : null;

        document.title = locale.title(currentTabTitle);

        return (
            <div class="navigation-view-container">
                <EventProxy
                    dom target={window}
                    onpopstate={this.onPopState}
                    onbeforeunload={this.onBeforeUnload} />
                {globalMenu ? (
                    <AppBarConsumer
                        onData={data => {
                            this.setPageDirty(!!data?.dirty);
                        }}
                        class="app-header" />
                ) : null}
                <div class="navigation-view">
                    {globalMenu ? (
                        <AppBarProxy
                            priority={1}
                            menu={appBarMenu}
                            title={currentTitle}
                            actions={currentActions} />
                    ) : (
                        <AppBar
                            menu={appBarMenu}
                            title={bottomPageMeta?.title}
                            actions={bottomPageMeta?.actions}
                            class="bottom-page-header" />
                    )}
                    <CardStackProvider>
                        <div class="bottom-page-container">
                            {bottomPage}
                        </div>
                        {stackItems}
                        <CardStackRenderer class="navigation-card-stack" />
                    </CardStackProvider>
                </div>
            </div>
        );
    }
}
