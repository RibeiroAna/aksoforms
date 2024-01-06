import { h } from 'preact';
import { Button } from 'yamdl';
import ApprovedIcon from '@material-ui/icons/CheckCircleOutline';
import DeniedIcon from '@material-ui/icons/HighlightOff';
import EditIcon from '@material-ui/icons/Edit';
import Page from '../../../components/page';
import DetailShell from '../../../components/detail/detail-shell';
import Meta from '../../meta';
import { connectPerms } from '../../../perms';
import { coreContext } from '../../../core/connection';
import { codeholderChgReqs as locale } from '../../../locale';
import { FIELDS } from './fields';
import './detail.less';

export default connectPerms(class ChangeRequest extends Page {
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
            this.#commitTask = this.context.createTask('codeholders/updateChangeRequest', {
                id: this.id,
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

    get id () {
        return +this.props.match[1];
    }

    render ({ perms, editing }, { edit }) {
        const actions = [];

        if (perms.hasPerm('')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => this.props.push('redakti', true),
            });
        }

        return (
            <div class="codeholder-change-request-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />

                <DetailShell
                    view="codeholders/changeRequest"
                    id={this.id}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}>
                    {(data, core) => (
                        <DetailContents
                            core={core}
                            item={this.state.edit || data}
                            editing={editing}
                            onItemChange={edit => this.setState({ edit })} />
                    )}
                </DetailShell>
            </div>
        );
    }
});

function DetailField ({ field, item, editing, onItemChange }) {
    const Cmp = FIELDS[field].component;
    return <Cmp
        slot="detail"
        value={item[field]}
        onChange={v => onItemChange({ ...item, [field]: v })}
        editing={editing}
        item={item}
        onItemChange={onItemChange} />;
}

function DetailContents ({ item, editing, onItemChange, core }) {
    return (
        <div class="change-request-detail-contents">
            <div class="request-header">
                <div class="request-status">
                    <DetailField field="status" item={item} editing={editing} onItemChange={onItemChange} />
                </div>
                <div class="request-codeholder">
                    <DetailField field="codeholderId" item={item} editing={editing} onItemChange={onItemChange} />
                </div>
                <div class="request-description">
                    <DetailField field="codeholderDescription" item={item} editing={editing} onItemChange={onItemChange} />
                </div>
                <div class="request-time">
                    <DetailField field="time" item={item} editing={editing} onItemChange={onItemChange} />
                </div>
            </div>
            <div class="request-data">
                <div class="request-field-title">{locale.fields.data}</div>
                <DetailField field="data" item={item} editing={editing} onItemChange={onItemChange} />
            </div>
            {item.status === 'pending' ? (
                <div class="request-approval">
                    <Button class="approve-button" onClick={() => core.createTask('codeholders/updateChangeRequest', {
                        id: item.id,
                        _changedFields: ['status'],
                    }, { status: 'approved' })}>
                        <ApprovedIcon style={{ verticalAlign: 'middle' }} />
                        {' '}
                        {locale.approval.approve}
                    </Button>
                    <Button class="deny-button" onClick={() => core.createTask('codeholders/updateChangeRequest', {
                        id: item.id,
                        _changedFields: ['status'],
                    }, { status: 'denied' })}>
                        <DeniedIcon style={{ verticalAlign: 'middle' }} />
                        {' '}
                        {locale.approval.deny}
                    </Button>
                </div>
            ) : null}
            <div class="request-notes">
                <div class="request-field-title">{locale.fields.internalNotes}</div>
                <div class="internal-notes-container">
                    <DetailField field="internalNotes" item={item} editing={editing} onItemChange={onItemChange} />
                </div>
            </div>
        </div>
    );
}
