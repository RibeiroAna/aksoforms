import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import Page from '../../../components/page';
import DetailView from '../../../components/detail/detail';
import Meta from '../../meta';
import { codeholders as locale, detail as detailLocale } from '../../../locale';
import { coreContext, connect } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { Header, fields, Footer } from './detail-fields';
import './style.less';

export default connectPerms(connect('codeholders/fields')(res => ({
    availableFields: res?.fields,
    availableSelfFields: res?.ownFields,
}))(class Detail extends Page {
    static contextType = coreContext;

    state = {
        edit: null,

        hasPassword: false,
        hasEmail: false,
    };

    onEndEdit = () => {
        this.props.editing && this.props.editing.pop(true);
        this.setState({ edit: null });
    };

    #commitTask;

    onCommit = changedFields => {
        if (!this.props.editing || this.#commitTask) return Promise.resolve();
        if (!changedFields.length) {
            // nothing changed, so we can just pop the editing state
            this.props.editing.pop(true);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.#commitTask = this.context.createTask('codeholders/update', {
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

    // field callbacks
    onHasEmail = hasEmail => this.setState({ hasEmail });
    onHasPassword = hasPassword => this.setState({ hasPassword });

    get isSelf () {
        return this.props.match[1] === 'self';
    }

    render ({ availableFields, editing, match, perms }, { hasPassword, hasEmail }) {
        if (!availableFields) return;
        const id = match[1];
        const isSelf = this.isSelf;
        if (isSelf) availableFields = this.props.availableSelfFields;

        const canReadHistory = perms.hasPerm('codeholders.hist.read');

        const actions = [];
        if (!editing) {
            if (perms.hasPerm('codeholders.perms.read') || isSelf) {
                actions.push({
                    label: locale.perms.title,
                    action: () => this.props.onNavigate(`/membroj/${id}/permesoj`),
                    overflow: true,
                });
            }
            if (perms.hasPerm('codeholders.update') || isSelf) {
                actions.push({
                    label: detailLocale.edit,
                    icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                    action: () => this.props.onNavigate(`/membroj/${id}/redakti`, true),
                });
            }
            if (perms.hasCodeholderField('logins', 'r') || isSelf) {
                actions.push({
                    label: locale.logins.title,
                    action: () => this.props.onNavigate(`/membroj/${id}/ensalutoj`),
                    overflow: true,
                });
            }

            if (canReadHistory && (!availableFields || availableFields.includes('password'))) {
                actions.push({
                    label: locale.fieldHistory.title(locale.fields.password.toLowerCase()),
                    action: () => this.props.onNavigate(`/membroj/${id}/historio?password`),
                    overflow: true,
                });
            }

            if (hasPassword) {
                actions.push({
                    label: locale.resetPassword.reset,
                    action: () => this.context.createTask('codeholders/resetPassword', { id }, { org: 'akso' }),
                    overflow: true,
                });
            } else if (hasEmail) {
                actions.push({
                    label: locale.resetPassword.create,
                    action: () => this.context.createTask('codeholders/createPassword', { id }, { org: 'akso' }),
                    overflow: true,
                });
            }

            if (perms.hasPerm('codeholders.disable_totp')) {
                actions.push({
                    label: locale.resetTotp.menuItem,
                    action: () => this.context.createTask('codeholders/resetTotp', { id }),
                    overflow: true,
                });
            }

            if (perms.hasPerm('codeholders.delete')) {
                actions.push({
                    label: locale.delete,
                    action: () => this.context.createTask('codeholders/delete', { id }),
                    overflow: true,
                    danger: true,
                });
            }
        }

        const sfields = !availableFields ? fields : Object.fromEntries(Object.keys(fields)
            .filter(f => {
                if (!fields[f].hasPerm) return true;
                if (fields[f].hasPerm === 'self') return availableFields.includes(f);
                return fields[f].hasPerm(availableFields, perms);
            })
            .map(f => [f, fields[f]]));

        return (
            <div class="codeholder-detail-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />
                <DetailView
                    view="codeholders/codeholder"
                    id={id}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    edit={this.state.edit}
                    onEditChange={edit => this.setState({ edit })}
                    onDelete={() => this.props.pop()}
                    makeHistoryLink={canReadHistory
                        ? field => `/membroj/${id}/historio?${field}`
                        : null}
                    options={{ fields: availableFields }}
                    header={Header}
                    fields={sfields}
                    footer={Footer}
                    locale={locale}
                    userData={this}
                    wideExtra />
            </div>
        );
    }
}));
