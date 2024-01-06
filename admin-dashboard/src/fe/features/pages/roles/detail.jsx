import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import Page from '../../../components/page';
import DetailView from '../../../components/detail/detail';
import Meta from '../../meta';
import { connectPerms } from '../../../perms';
import { coreContext } from '../../../core/connection';
import { roles as locale } from '../../../locale';
import { LinkButton } from '../../../router';
import { FIELDS } from './fields';
import './detail.less';

export default connectPerms(class Role extends Page {
    state = {
        edit: null,
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
            this.#commitTask = this.context.createTask('roles/update', {
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

    getId () {
        return +this.props.match[1];
    }

    render ({ perms, editing }, { edit }) {
        const actions = [];

        const id = this.getId();

        if (perms.hasPerm('codeholder_roles.update')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        if (perms.hasPerm('codeholder_roles.delete')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('roles/delete', { id }),
                overflow: true,
                danger: true,
            });
        }

        return (
            <div class="role-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />

                <DetailView
                    view="roles/role"
                    id={id}
                    fields={FIELDS}
                    footer={Footer}
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

function Footer ({ item }) {
    const link = `/membroj?filter(enabled:true,roles:${item.id}$)`;

    return (
        <div class="detail-footer">
            <LinkButton target={link}>
                {locale.detail.viewMembers}
            </LinkButton>
        </div>
    );
}
