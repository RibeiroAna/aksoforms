import { h } from 'preact';
import { Fragment, useState } from 'preact/compat';
import { Button } from 'yamdl';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../components/detail/detail-page';
import DetailView from '../../../components/detail/detail';
import { newsletters as locale, newsletterUnsubs as unsubsLocale } from '../../../locale';
import { FIELDS } from './fields';
import SendNotifTemplate from '../notif-templates/send';
import './detail.less';
import { usePerms } from '../../../perms';
import { LinkButton } from '../../../router';

export default class Newsletter extends DetailPage {
    state = {
        org: null,
    };

    locale = locale;

    get id () {
        return +this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('newsletters/update', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }, { org }) {
        const actions = [];

        actions.push({
            label: unsubsLocale.title,
            action: () => this.props.push('malabonoj'),
        });

        if (perms.hasPerm(`newsletters.${org}.update`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm(`newsletters.${org}.delete`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('newsletters/delete', { id: this.id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailView
                    view="newsletters/newsletter"
                    id={this.id}
                    footer={Footer}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onData={data => data && this.setState({ org: data.org })}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete} />
            </Fragment>
        );
    }
}

function Footer ({ item }) {
    const perms = usePerms();
    const [sending, setSending] = useState(false);

    if (!perms.hasPerm('codeholders.read')) return null;
    if (!perms.hasPerm('codeholders.send_notif')) return null;
    if (!perms.hasPerm('notif_templates.read.tejo') || !perms.hasPerm('notif_templates.read.uea')) return null;

    const viewCodeholdersLink = `/membroj?filter(enabled:true,newsletterSubscriptions:${item.id})`;

    return (
        <div class="newsletter-send">
            <p>
                {locale.send.description}
            </p>
            <Button raised onClick={() => setSending(true)}>
                {locale.send.button}
            </Button>
            {' '}
            <LinkButton target={viewCodeholdersLink}>
                {locale.viewSubscribedCodeholders}
            </LinkButton>
            <SendNotifTemplate
                task="newsletters/send"
                context="newsletter"
                jsonFilter={{
                    org: item.org,
                    intent: {
                        $in: ['newsletter', 'newsletter_magazine'],
                    },
                }}
                options={{ newsletter: item.id }}
                open={sending}
                onClose={() => setSending(false)} />
        </div>
    );
}
