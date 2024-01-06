//! Admin notices!
//! Loads a file at notices/index.txt and any YYYY-MM-DD dates within as <date>.md

import { h } from 'preact';
import { createRef, PureComponent } from 'preact/compat';
import { Button, CircularProgress } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import DisplayError from '../../../components/utils/error';
import MdField from '../../../components/controls/md-field';
import { index as locale } from '../../../locale';
import './notices.less';

export default class Notices extends PureComponent {
    state = {
        loading: false,
        index: [],
        error: null,
    };

    componentDidMount () {
        this.load();
    }

    readState = [];

    load () {
        try {
            this.readState = JSON.parse(localStorage.aksoNoticesReadState);
            if (!Array.isArray(this.readState)) this.readState = [];
        } catch {
            /* */
        }

        this.setState({ loading: true, error: null });
        fetch('/notices/index.txt').then(res => res.text().then(text => ([res, text]))).then(([res, text]) => {
            if (!res.ok) {
                throw text;
            }
            this.setState({
                loading: false,
                index: text.split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#')).sort().reverse(),
            });
        }).catch(error => {
            this.setState({
                loading: false,
                error,
            });
        });
    }

    saveReadState () {
        try {
            localStorage.aksoNoticesReadState = JSON.stringify(this.readState);
        } catch {
            /* */
        }
    }

    isRead (id) {
        return this.readState.includes(id);
    }

    setRead (id, read) {
        if (read && !this.readState.includes(id)) {
            this.readState.push(id);
            this.readState.sort();
        } else if (!read && this.readState.includes(id)) {
            this.readState.splice(this.readState.indexOf(id), 1);
        }
        this.saveReadState();
        this.forceUpdate();
    }

    markAllRead () {
        this.readState = this.state.index.slice();
        this.saveReadState();
        this.forceUpdate();
    }

    render () {
        let contents = null;
        let unreadCount = 0;
        if (this.state.loading) {
            contents = <CircularProgress indeterminate />;
        } else if (this.state.error) {
            contents = <DisplayError error={this.state.error} />;
        } else {
            unreadCount = this.state.index.filter(id => !this.isRead(id)).length;

            contents = (
                <div class="notices-list">
                    {this.state.index.map(id => (
                        <NoticeItem
                            key={id}
                            id={id}
                            isRead={this.isRead(id)}
                            setRead={read => this.setRead(id, read)} />
                    ))}
                </div>
            );
        }

        return (
            <div class="home-card home-notices">
                <div class="notices-header">
                    <div class="title-container">
                        <span class="inner-title">
                            {locale.notices.title}
                        </span>
                        {unreadCount ? (
                            <span class="inner-count">
                                {unreadCount}
                            </span>
                        ) : null}
                    </div>
                    <Button onClick={() => this.markAllRead()}>
                        {locale.notices.markAllRead}
                    </Button>
                </div>
                {contents}
            </div>
        );
    }
}

class NoticeItem extends PureComponent {
    state = {
        loading: false,
        data: null,
        error: null,
        expanded: false,
    };
    observer = null;

    load () {
        this.setState({ loading: true, error: null });
        fetch(`/notices/${this.props.id}.md`).then(res => res.text().then(text => ([res, text]))).then(([res, text]) => {
            if (!res.ok) {
                if (res.status === 404) throw { code: 'not-found', message: text };
                if (res.status === 403) throw { code: 'forbidden', message: text };
                throw text;
            }
            this.setState({
                loading: false,
                data: text,
            });
        }).catch(error => {
            this.setState({
                loading: false,
                error,
            });
        });
    }

    node = createRef(null);

    componentDidMount () {
        if (!this.props.isRead) {
            // expand items that weren't read at page load
            this.setState({ expanded: true });
        }

        if (window.IntersectionObserver) {
            this.observer = new IntersectionObserver(entries => {
                if (!entries.length) return;
                if (entries[0].intersectionRatio <= 0) return;

                if (!this.state.data) this.load();
            });
            this.observer.observe(this.node.current);
        } else {
            this.load();
        }
    }

    componentDidUpdate (prevProps) {
        if (!prevProps.isRead && this.props.isRead) {
            // collapse on read
            this.setState({ expanded: false });
        }
    }

    componentWillUnmount () {
        this.observer?.disconnect();
    }

    render () {
        let contents = null;
        if (this.state.loading) {
            contents = (
                <CircularProgress indeterminate />
            );
        } else if (this.state.error) {
            contents = (
                <DisplayError error={this.state.error} />
            );
        } else if (this.state.data) {
            contents = (
                <div class={'inner-contents' + (this.state.expanded ? '' : ' is-collapsed')}>
                    <MdField
                        value={this.state.data}
                        rules={[
                            'emphasis', 'strikethrough', 'link', 'list', 'table', 'image',
                            'heading', 'backticks',
                        ]} />
                </div>
            );
        }

        return (
            <div class={'notice-item' + (this.props.isRead ? ' is-read' : '')} ref={this.node}>
                <div class="notice-header">
                    <div class="inner-title">
                        {!this.props.isRead && (
                            <span class="notice-unread-dot" />
                        )}
                        {this.props.id}
                    </div>
                    <Button
                        class={'read-button' + (this.props.isRead ? ' is-read' : '')}
                        onClick={() => this.props.setRead(!this.props.isRead)}>
                        {this.props.isRead && (
                            <span class="check-icon-container">
                                <CheckIcon />
                            </span>
                        )}
                        {this.props.isRead ? locale.notices.markedRead : locale.notices.markRead}
                    </Button>
                </div>
                <DynamicHeightDiv lazy useFirstHeight class="notice-contents">
                    {contents}
                </DynamicHeightDiv>
                <div class="notice-footer">
                    <Button onClick={() => this.setState({ expanded: !this.state.expanded })}>
                        {this.state.expanded
                            ? locale.notices.noticeCollapse
                            : locale.notices.noticeExpand}
                    </Button>
                </div>
            </div>
        );
    }
}
