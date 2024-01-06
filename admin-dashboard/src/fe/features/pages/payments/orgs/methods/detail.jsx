import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import PaymentIcon from '@material-ui/icons/Payment';
import Page from '../../../../../components/page';
import DetailView from '../../../../../components/detail/detail';
import UrlViewImage from '../../../../../components/controls/url-view-image';
import Meta from '../../../../meta';
import { connectPerms } from '../../../../../perms';
import { coreContext } from '../../../../../core/connection';
import { paymentMethods as locale } from '../../../../../locale';
import PaymentOrgOrg from '../org-org';
import { FIELDS } from './fields';
import './detail.less';

export default connectPerms(class MethodPage extends Page {
    state = {
        edit: null,
        org: 'meow', // nonsense default value
    };

    static contextType = coreContext;

    onEndEdit = () => {
        this.props.editing && this.props.editing.pop(true);
        this.setState({ edit: null });
    };

    #commitTask = null;
    onCommit = changedFields => {
        if (!this.props.editing || this.#commitTask) return Promise.resolve();
        if (!changedFields.length) {
            // nothing changed, so we can just pop the editing state
            this.props.editing.pop(true);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.#commitTask = this.context.createTask('payments/updateMethod', {
                org: this.getOrg(),
                id: this.getId(),
                _changedFields: changedFields,
            }, this.state.edit);
            this.#commitTask.on('success', this.onEndEdit);
            this.#commitTask.on('drop', () => {
                this.#commitTask = null;
                resolve();
            });
        });
    };

    componentWillUnmount () {
        if (this.#commitTask) this.#commitTask.drop();
    }

    getOrg () {
        return +this.props.matches.org[1];
    }
    getId () {
        return +this.props.match[1];
    }

    render ({ perms, editing }, { edit, org: pOrg }) {
        const actions = [];

        const org = this.getOrg();
        const id = this.getId();

        if (perms.hasPerm(`pay.payment_methods.update.${pOrg}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (perms.hasPerm(`pay.payment_methods.delete.${pOrg}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('payments/deleteMethod', { org, id }),
                overflow: true,
                danger: true,
            });
        }

        return (
            <div class="payment-method-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />

                <PaymentOrgOrg id={org} onGetOrg={org => this.setState({ org })} />

                <DetailView
                    view="payments/method"
                    id={id}
                    options={{ org }}
                    header={Header}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}
                    userData={{ org, id }} />
            </div>
        );
    }
});

function Header ({ item, editing, userData }) {
    return (
        <div class="payment-method-detail-header">
            <UrlViewImage
                editing={editing}
                class="method-thumbnail"
                contain lightbox
                sizes={[32, 64, 128, 256, 512]}
                placeholder={
                    <div class="method-thumbnail-placeholder">
                        <PaymentIcon className="inner-icon" />
                    </div>
                }
                urlView="payments/method"
                urlViewField="thumbnail"
                options={{ org: userData.org, id: userData.id }}
                onUpdate={(thumbnail, core) => {
                    const task = core.createTask('payments/updateMethodThumbnail', {
                        org: userData.org,
                        id: userData.id,
                    }, {
                        thumbnail,
                    });
                    return task.runOnceAndDrop();
                }}
                onDelete={core => {
                    core.createTask('payments/deleteMethodThumbnail', {
                        org: userData.org,
                        id: userData.id,
                    });
                }} />
            <div class="method-name">{item.name}</div>
        </div>
    );
}
