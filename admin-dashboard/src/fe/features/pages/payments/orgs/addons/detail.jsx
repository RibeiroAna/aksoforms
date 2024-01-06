import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import Page from '../../../../../components/page';
import DetailView from '../../../../../components/detail/detail';
import Meta from '../../../../meta';
import { connectPerms } from '../../../../../perms';
import { coreContext } from '../../../../../core/connection';
import { paymentAddons as locale } from '../../../../../locale';
import PaymentOrgOrg from '../org-org';
import { FIELDS } from './fields';

export default connectPerms(class AddonPage extends Page {
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
            this.#commitTask = this.context.createTask('payments/updateAddon', {
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

        if (perms.hasPerm(`pay.payment_addons.update.${pOrg}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (perms.hasPerm(`pay.payment_addons.delete.${pOrg}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('payments/deleteAddon', { org, id }),
                overflow: true,
                danger: true,
            });
        }

        return (
            <div class="payment-addon-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />

                <PaymentOrgOrg id={org} onGetOrg={org => this.setState({ org })} />

                <DetailView
                    view="payments/addon"
                    id={id}
                    options={{ org }}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()} />
            </div>
        );
    }
});
