import { h, createRef } from 'preact';
import { createPortal, PureComponent } from 'preact/compat';
import { Button, globalAnimator, Spring } from 'yamdl';
import CloseIcon from '@material-ui/icons/Close';
import ErrorIcon from '@material-ui/icons/Error';
import ExternalIcon from '@material-ui/icons/OpenInNew';
import DisplayError from './components/utils/error';
import { app as locale } from './locale';
import './notif.less';

const NOTIF_TIMEOUT = 5; // seconds
const Y_GAP = () => window.innerWidth <= 420 ? 0 : 8;

const notificationsContainer = document.createElement('div');
notificationsContainer.className = 'notifier-container';
document.body.appendChild(notificationsContainer);

/** Displays notifications in the corner. */
export default class Notifications extends PureComponent {
    state = {
        notifs: [],
    };

    componentDidMount () {
        this.props.errors.on('task-error', this.onTaskError);
        this.props.errors.on('unhandled-rejection', this.onUnhandledRejection);
    }

    componentWillUnmount () {
        this.props.errors.removeListener('task-error', this.onTaskError);
        this.props.errors.removeListener('unhandled-rejection', this.onUnhandledRejection);
    }

    pushNotif (props) {
        const notifs = this.state.notifs.slice();
        notifs.push({
            key: Math.random().toString(36),
            height: 0,
            ...props,
        });
        this.setState({ notifs });
    }

    onTaskError = (code) => {
        if (code === 'service-unavailable') {
            // only emit one at a time
            if (this.state.notifs.find(n => n.contents.type === 'error' && n.contents.code === code)) {
                // a lot of elements request several things at once so this just ends up as spam...
                /* this.pushNotif({
                    persistent: false,
                    icon: 'error',
                    contents: {
                        type: 'error',
                        code: 'service-still-unavailable',
                    },
                }); */
            } else {
                this.pushNotif({
                    persistent: true,
                    icon: 'error',
                    contents: {
                        type: 'error',
                        code,
                    },
                });
            }
        }
    };

    onUnhandledRejection = (promise, error) => {
        this.pushNotif({
            persistent: false,
            icon: 'error',
            contents: {
                type: 'error',
                code: 'error',
                error,
            },
        });
    };

    render () {
        const notifs = [];

        let y = 0;
        for (let i = this.state.notifs.length - 1; i >= 0; i--) {
            const notif = this.state.notifs[i];

            notifs.unshift(
                <Notification
                    key={notif.key}
                    y={y}
                    onHeight={height => {
                        const notifs = this.state.notifs.slice();
                        notifs[i].height = height;
                        this.setState({ notifs });
                    }}
                    onEnd={() => {
                        const notifs = this.state.notifs.slice();
                        notifs.splice(i, 1);
                        this.setState({ notifs });
                    }}
                    contents={notif.contents}
                    icon={notif.icon}
                    persistent={notif.persistent} />
            );

            y += notif.height + Y_GAP();
        }

        return createPortal(
            <div class="global-notifications">
                {notifs}
            </div>,
            notificationsContainer,
        );
    }
}

class Notification extends PureComponent {
    yPos = new Spring(1, 0.3);
    timeout = 0;
    node = createRef(null);

    constructor (props) {
        super(props);

        this.yPos.value = -999;
        this.yPos.target = this.props.y;
    }

    componentDidMount () {
        this.yPos.value = -this.node.current.offsetHeight - Y_GAP();
        globalAnimator.register(this);
    }

    height = 0;
    update (dt) {
        this.timeout += dt / NOTIF_TIMEOUT;
        if (!this.props.persistent && this.timeout > 1) {
            this.props.onEnd();
        }

        const height = this.node.current.offsetHeight;
        if (height !== this.height) {
            this.height = height;
            this.props.onHeight(height);
        }

        this.yPos.target = this.props.y;
        this.yPos.update(dt);
        this.forceUpdate();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render ({ icon, contents, persistent }) {
        const transform = `translateY(${-this.yPos.value}px)`;

        return (
            <div
                class={'global-notification' + (icon === 'error' ? ' is-error' : '')}
                ref={this.node}
                style={{
                    transform,
                }}>
                {persistent ? (
                    <div class="notif-close-container">
                        <Button icon small class="notif-close" onClick={this.props.onEnd}>
                            <CloseIcon />
                        </Button>
                    </div>
                ) : icon ? (
                    <div class="notif-icon-container">
                        <NotifIcon icon={icon} />
                    </div>
                ) : null}
                {!persistent && (
                    <div class="notif-timeout-container">
                        <div
                            class="notif-timeout"
                            style={{ width: `${(1 - this.timeout) * 100}%` }} />
                    </div>
                )}
                <div class="notif-contents">
                    <NotifContents contents={contents} />
                </div>
            </div>
        );
    }
}

function NotifIcon ({ icon }) {
    if (icon === 'error') {
        return <ErrorIcon />;
    }
    return null;
}

function NotifContents ({ contents }) {
    if (contents.type === 'error') {
        const { code, error } = contents;
        if (code === 'service-unavailable') {
            return (
                <div class="inner-error">
                    <div class="error-title">{locale.globalErrors.serviceUnavailable.title}</div>
                    <div class="error-desc">{locale.globalErrors.serviceUnavailable.description}</div>
                    <a
                        class="error-link"
                        target="_blank"
                        rel="noreferrer"
                        href={locale.globalErrors.serviceUnavailable.statusPage}>
                        {locale.globalErrors.serviceUnavailable.openStatusPage}
                        {' '}
                        <ExternalIcon style={{ verticalAlign: 'middle' }} />
                    </a>
                </div>
            );
        } else if (code === 'service-still-unavailable') {
            return (
                <div class="short-error">
                    {locale.globalErrors.serviceUnavailable.title}
                </div>
            );
        } else if (code === 'error') {
            return <DisplayError error={error} />;
        }
    }
}
