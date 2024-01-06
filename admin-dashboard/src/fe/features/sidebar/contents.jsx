import { h, Component } from 'preact';
import { PureComponent, useState } from 'preact/compat';
import { Button, Menu, DrawerItem, DrawerLabel, Spring, globalAnimator } from 'yamdl';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ProfilePicture from '../../components/profile-picture';
import { TejoIcon, UeaIcon } from '../../components/org-icon';
import { Link, routerContext } from '../../router';
import permsContext from '../../perms';
import SidebarLogo from './sidebar-logo';
import pages from '../pages';
import { app as locale, pages as localePages, meta as localeMeta } from '../../locale';
import { connect } from '../../core/connection';

// also see src/pages/index.js

/**
 * Renders a single item in the sidebar.
 *
 * # Props
 * - `id`: page id (for the localized name, among other things)
 * - `icon`: page icon
 * - `path`: page path
 * - `category`: containing category to prepend the path of
 * - `locked`: if true, this item will be disabled
 * - `index`: item index in the sidebar list. Used for the cascade animation
 */
class NavItem extends PureComponent {
    /** normalized x transform (from -1 to 1, sort of) for animating in */
    offsetX = new Spring(1, 0.5);
    /**
     * time since initialization. This is used in conjunction with the index prop to cascade
     * the sidebar item animation
     */
    initTime = 0;

    componentDidMount () {
        globalAnimator.register(this);
        // load spring to make this item move in from the right
        this.offsetX.value = 1;
    }

    update (dt) {
        // wait until cascade has arrived at this item
        if (this.initTime < this.props.index / 40) {
            this.initTime += dt;
            this.forceUpdate();
            return;
        }

        this.offsetX.update(dt);

        if (!this.offsetX.wantsUpdate()) {
            globalAnimator.deregister(this);
        }

        this.forceUpdate();
    }

    render ({ category, item, currentPage, locked, tasks }) {
        const { id, icon, path } = item;

        const targetPath = category.path ? category.path + '/' + path : path;

        let badge = null;
        if (item.badge && tasks) {
            const contents = item.badge(tasks);
            if (contents) {
                badge = (
                    <span class="nav-item-badge">
                        {contents}
                    </span>
                );
            }
        }

        const Icon = typeof icon === 'object' ? icon.resolve(tasks) : (icon || (() => null));
        // using tabIndex -1 on Link because DrawerItem is focusable anyway
        return (
            <Link target={`/${targetPath}`} class="sidebar-link" tabIndex={-1}>
                <DrawerItem
                    style={{
                        transform: `translateX(${this.offsetX.value * 100}%)`,
                        opacity: 1 - Math.abs(this.offsetX.value),
                    }}
                    selected={currentPage === id}
                    disabled={locked}
                    icon={<Icon />}
                    onKeyDown={e => {
                        if (e.key === 'ArrowDown') {
                            const parent = e.currentTarget.parentNode;
                            const next = parent.nextElementSibling;
                            if (next) {
                                const drawerItem = next.children[0];
                                e.preventDefault();
                                drawerItem.focus();
                            }
                        } else if (e.key === 'ArrowUp') {
                            const parent = e.currentTarget.parentNode;
                            const prev = parent.previousElementSibling;
                            if (prev) {
                                const drawerItem = prev.children[0];
                                e.preventDefault();
                                drawerItem.focus();
                            }
                        }
                    }}>
                    <span class="nav-item-inner">
                        <span class="nav-item-label">
                            {localePages[id]}
                        </span>
                        {badge}
                    </span>
                </DrawerItem>
            </Link>
        );
    }
}

/**
 * Contains the sidebar navigation items.
 *
 * # Props
 * - currentPage: current page id
 * - locked: if true, the sidebar is locked and can’t be used
 */
const SidebarNav = connect('tasks/tasks')(tasks => ({ tasks }))(class SidebarNav extends Component {
    static contextType = permsContext;

    render ({ currentPage, locked, tasks }) {
        const perms = this.context;

        const items = [];

        if (!perms._isDummy) {
            // don’t show sidebar until perms have loaded to prevent dis-/appearing items
            let i = 0;
            for (const category of pages) {
                const categoryItems = category.contents
                    .filter(item => !item.hidden && item.hasPerm(perms));

                if (!categoryItems.length) continue;

                if (localePages[category.id]) {
                    items.push(
                        <DrawerLabel key={category.id + '-label'}>
                            {localePages[category.id]}
                        </DrawerLabel>
                    );
                }

                for (const item of categoryItems) {
                    const itemIndex = i;
                    items.push(
                        <NavItem
                            key={item.id}
                            index={itemIndex}
                            category={category}
                            item={item}
                            tasks={tasks}
                            currentPage={currentPage}
                            locked={locked} />
                    );
                    i++;
                }
            }
        }

        return (
            <div class="sidebar-nav">
                <nav class="sidebar-nav-list" role="navigation">
                    {items}
                </nav>
            </div>
        );
    }
});

/**
 * Renders the sidebar contents.
 *
 * # Props
 * - currentPage: current page ID, use to highlight the corresponding sidebar item
 * - locked: if true, the sidebar is disabled
 */
export default class SidebarContents extends PureComponent {
    static contextType = routerContext;

    state = {
        userMenuOpen: false,
        userName: null,
        id: null,
        profilePictureHash: null,
    };

    focus () {}

    render () {
        return (
            <div class="app-sidebar-contents">
                <div class="sidebar-header">
                    <SidebarLogo onClick={() => this.context.navigate('/')} />
                    <SidebarUser />
                </div>
                <div class="sidebar-nav-container">
                    <SidebarNav
                        currentPage={this.props.currentPage}
                        locked={this.props.locked} />
                    <div class="sidebar-meta-info">
                        <div class="info-logos">
                            <UeaIcon />
                            <TejoIcon />
                        </div>
                        <div class="info-line">
                            {localeMeta.copyright} <a
                                href={localeMeta.copyrightHref}
                                target="_blank"
                                rel="noopener noreferrer">
                                {localeMeta.copyrightHolder}
                            </a>, {localeMeta.license} · <a
                                href={localeMeta.sourceHref}
                                target="_blank"
                                rel="noopener noreferrer">
                                {localeMeta.source}
                            </a>
                        </div>
                    </div>
                    <div class="sidebar-bottom-padding" />
                </div>
            </div>
        );
    }
}

/** The user card in the sidebar. */
const SidebarUser = connect('codeholders/codeholder', {
    id: 'self',
    fields: ['name', 'type', 'profilePictureHash'],
})((data, core) => ({ ...data, core }))(function SidebarUser (props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState([0, 0]);

    let compiledName = '';
    if (props.type === 'human') {
        compiledName = [
            props.name?.honorific,
            props.name?.first || props.name?.firstLegal,
            props.name?.last || props.name?.lastLegal,
        ].map(x => x).join(' ');
    } else if (props.type === 'org') {
        compiledName = props.name.full.length > 30
            ? props.name?.abbrev || props.name?.full
            : props.name?.full;
    }

    const onLogout = () => props.core.createTask('login/logOut').run();

    const onPictureClick = e => {
        if (e.altKey) {
            // reload perms and tasks
            e.preventDefault();
            this.props.core.createTask('perms/perms').runOnce().catch(() => {});
            this.props.core.createTask('tasks/tasks').runOnce().catch(() => {});
        }
    };

    return (
        <div class="sidebar-user">
            <div class="user-profile-picture" onClick={onPictureClick}>
                <ProfilePicture
                    id={props.id}
                    self={true}
                    profilePictureHash={props.profilePictureHash} />
            </div>
            <div class="user-name">
                {compiledName}
            </div>
            <Button
                icon
                small
                class="user-options"
                aria-owns={this.state.userMenuOpen ? 'sidebar-user-popup-menu' : null}
                aria-haspopup="true"
                onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuPos([
                        rect.right - rect.width / 3,
                        rect.top + rect.height / 3,
                    ]);
                    setMenuOpen(true);
                }}>
                <ExpandMoreIcon color="inherit" />
            </Button>
            <Menu
                id="sidebar-user-popup-menu"
                position={menuPos}
                open={menuOpen}
                anchor={[1, 0]}
                onClose={() => setMenuOpen(false)}
                items={[
                    {
                        label: locale.logOut,
                        action: onLogout,
                    },
                ]} />
        </div>
    );
});
