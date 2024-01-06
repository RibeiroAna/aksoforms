import { h } from 'preact';
import { Fragment, PureComponent } from 'preact/compat';
import { CircularProgress, Dialog } from 'yamdl';
import { coreContext } from '../../../core/connection';
import Meta from '../../meta';
import Page from '../../../components/page';
import DisplayError from '../../../components/utils/error';
import Tabs from '../../../components/controls/tabs';
import { notifTemplates as locale } from '../../../locale';
import './preview.less';

export default class NotifTemplatePreviewPage extends Page {
    state = {
        loading: false,
        data: null,
        error: null,
        tab: 'html',
    };

    get id () {
        return +this.props.matches.template[1];
    }

    static contextType = coreContext;

    load () {
        this.setState({ loading: true });
        this.context.createTask('notifTemplates/preview', {
            id: this.id,
        }).runOnceAndDrop().then(data => {
            this.setState({ loading: false, data });
        }).catch(error => {
            this.setState({ loading: false, error });
        });
    }

    componentDidMount () {
        this.load();
    }

    render (_, { tab, loading, data, error }) {
        return (
            <div class="notif-template-preview-page">
                <Meta
                    title={locale.preview.title} />
                {loading ? (
                    <div class="preview-loading">
                        <CircularProgress indeterminate />
                    </div>
                ) : error ? (
                    <div class="preview-error">
                        <DisplayError error={error} />
                    </div>
                ) : data ? (
                    <div class="preview-contents">
                        <Tabs
                            class="preview-tabs"
                            value={tab}
                            onChange={tab => this.setState({ tab })}
                            tabs={locale.preview.tabs} />
                        {tab === 'html' ? (
                            <HTMLPreviewRender html={data.html} />
                        ) : (
                            <TextPreviewRender text={data.text} />
                        )}
                    </div>
                ) : null}
            </div>
        );
    }
}

class HTMLPreviewRender extends PureComponent {
    state = {
        openLinkPrompt: false,
        linkToOpen: '',
    };

    load () {
        const doc = this.frame.contentWindow.document;

        // document.write may be antiquated but it actually works well for this use case, because
        // it lets you overwrite the <html> and <head> elements
        doc.write(this.props.html);

        // prevent links from navigating the iframe
        for (const anchor of doc.querySelectorAll('a')) {
            anchor.addEventListener('click', e => {
                e.preventDefault();
                if (e.target.getAttribute('href')) {
                    this.setState({ linkToOpen: e.target.href, openLinkPrompt: true });
                }
            });
        }
    }

    onFrameLoad = () => this.load();

    render () {
        return (
            <Fragment>
                <iframe
                    ref={frame => this.frame = frame}
                    onLoad={this.onFrameLoad}
                    class="html-preview"
                    allow=""
                    referrerpolicy="no-referrer"
                    sandbox="allow-same-origin"
                    src="/assets/insecure-content/html-preview.html" />

                <Dialog
                    class="notif-template-html-preview-link-prompt"
                    open={this.state.openLinkPrompt}
                    onClose={() => this.setState({ openLinkPrompt: false })}
                    actions={[
                        {
                            label: locale.preview.htmlNavigationCancel,
                            action: () => this.setState({ openLinkPrompt: false }),
                        },
                        {
                            label: locale.preview.htmlNavigationConfirm,
                            action: () => {
                                const feats = 'noopener,noreferrer';
                                window.open(this.state.linkToOpen, '_blank', feats);
                                this.setState({ openLinkPrompt: false });
                            },
                        },
                    ]}>
                    {locale.preview.htmlNavigationPrompt(this.state.linkToOpen.length > 100
                        ? this.state.linkToOpen.substr(0, 100) + '…'
                        : this.state.linkToOpen)}
                </Dialog>
            </Fragment>
        );
    }
}

class TextPreviewRender extends PureComponent {
    render ({ text }) {
        return (
            <div class="text-preview">
                <pre class="text-contents">
                    {text}
                </pre>
            </div>
        );
    }
}
