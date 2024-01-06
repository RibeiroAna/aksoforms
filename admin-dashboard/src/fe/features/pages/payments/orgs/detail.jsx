import { h } from 'preact';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import { org } from '../../../../components/data';
import Page from '../../../../components/page';
import Meta from '../../../meta';
import DetailView from '../../../../components/detail/detail';
import Tabs from '../../../../components/controls/tabs';
import { coreContext } from '../../../../core/connection';
import { connectPerms } from '../../../../perms';
import { paymentOrgs as locale } from '../../../../locale';
import { FIELDS } from './fields';
import AddonsTab from './addons';
import MethodsTab from './methods';
import './detail.less';

function Header ({ item, editing }) {
    if (editing) return null;
    return (
        <div class="payment-org-header">
            <h1 class="payment-org-title">
                <span class="payment-org-icon">
                    <org.renderer value={item.org} />
                </span>
                {item.name}
            </h1>
            <p class="payment-org-description">
                {item.description}
            </p>
        </div>
    );
}

export default connectPerms(class Org extends Page {
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
            this.#commitTask = this.context.createTask('payments/updateOrg', {
                id: this.props.match[1],
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

    getId () {
        return +this.props.match[1];
    }

    #onData = data => {
        if (!data) return;
        if (data.org) this.setState({ org: data.org });
    };

    #onTabChange = tab => {
        if (tab === 'org') {
            if (this.props.addons) this.props.addons.pop(true);
            if (this.props.methods) this.props.methods.pop(true);
        } else if (tab === 'addons') {
            if (this.props.addons) return;
            if (this.props.methods) this.props.methods.pop(true);
            this.props.push('aldonebloj', true);
        } else if (tab === 'methods') {
            if (this.props.methods) return;
            if (this.props.addons) this.props.addons.pop(true);
            this.props.push('metodoj', true);
        }
    };

    render ({ perms, editing, addons, methods }, { org, edit }) {
        const actions = [];
        const id = this.getId();
        const tab = addons ? 'addons' : methods ? 'methods' : 'org';

        if (tab === 'addons') {
            if (perms.hasPerm(`pay.payment_addons.create.${org}`)) {
                actions.push({
                    key: 'ca',
                    icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                    label: locale.createAddon,
                    action: () => this.context.createTask('payments/createAddon', { org: id }),
                });
            }
        } else if (tab === 'methods') {
            if (perms.hasPerm(`pay.payment_methods.create.${org}`)) {
                actions.push({
                    key: 'cm',
                    icon: <AddIcon style={{ verticalAlign: 'middle' }} />,
                    label: locale.createMethod,
                    action: () => this.context.createTask('payments/createMethod', { org: id }),
                });
            }
        } else if (tab === 'org') {
            if (perms.hasPerm(`pay.payment_orgs.update.${org}`)) {
                actions.push({
                    key: 'edit',
                    icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                    label: locale.update.menuItem,
                    action: () => this.props.push('redakti', true),
                });
            }
        }

        if (perms.hasPerm(`pay.payment_orgs.delete.${org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('payments/deleteOrg', { id }),
                overflow: true,
                danger: true,
            });
        }

        let contents = null;

        if (tab === 'org') {
            contents = (
                <DetailView
                    view="payments/org"
                    id={id}
                    header={Header}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onData={this.#onData}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()} />
            );
        } else if (tab === 'addons') {
            contents = <AddonsTab org={id} />;
        } else if (tab === 'methods') {
            contents = <MethodsTab org={id} />;
        }

        return (
            <div class="payment-org-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />
                <Tabs
                    value={tab}
                    disabled={editing}
                    onChange={this.#onTabChange}
                    tabs={locale.detailTabs} />

                {contents}
            </div>
        );
    }
});
