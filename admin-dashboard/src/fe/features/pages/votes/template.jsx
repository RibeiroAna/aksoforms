import { h } from 'preact';
import { Button } from 'yamdl';
import EditIcon from '@material-ui/icons/Edit';
import DetailView from '../../../components/detail/detail';
import Page from '../../../components/page';
import { org } from '../../../components/data';
import Meta from '../../meta';
import { coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { votes as locale } from '../../../locale';
import {
    voterCodeholders,
    voterCodeholdersMemberFilter,
    viewerCodeholders,
    viewerCodeholdersMemberFilter,
    ballotsSecret,
    type,
    config,
} from './config';
import FIELDS from './fields';
import './detail.less';

const DETAIL_FIELDS = {
    ...FIELDS,
    type: { component: type },
    ballotsSecret: { component: ballotsSecret },
    config: { component: config },
    voterCodeholders: { component: voterCodeholders },
    voterCodeholdersMemberFilter: { component: voterCodeholdersMemberFilter, shouldHide: (_, editing) => editing },
    viewerCodeholders: { component: viewerCodeholders },
    viewerCodeholdersMemberFilter: {
        component: viewerCodeholdersMemberFilter,
        shouldHide: (item, editing) => editing || item.viewerCodeholders === 'null',
    },
};

export default connectPerms(class VoteTemplateDetailpage extends Page {
    static contextType = coreContext;

    state = {
        edit: null,
        org: null,
    };

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
            this.#commitTask = this.context.createTask('votes/updateTemplate', {
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

    /** Mildly hacky function for getting the org so we can check for perms */
    setOrg (org) {
        if (this.state.org !== org) this.setState({ org });
    }

    render ({ match, perms, editing }, { edit, org }) {
        const id = match[1];

        const actions = [];

        if (perms.hasPerm(`votes.delete.${org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('votes/deleteTemplate', { id }),
                overflow: true,
                danger: true,
            });
        }

        if (perms.hasPerm(`votes.update.${org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update,
                action: () => this.props.push('redakti', true),
            });
        }

        return (
            <div class="vote-detail-page template-page">
                <Meta
                    title={locale.templateDetailTitle}
                    actions={actions} />

                <DetailView
                    view="votes/voteTemplate"
                    id={id}
                    options={{
                        fields: Object.keys(fields),
                    }}
                    header={Header}
                    fields={fields}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={() => this.props.pop()}
                    userData={this} />
            </div>
        );
    }
});

function Header ({ item, editing, userData: owner }) {
    if (editing) return null;
    owner.setOrg(item.org);

    const canCreateVote = owner.props.perms.hasPerm(`votes.create.${item.org}`);

    const createVote = () => {
        owner.context.createTask('votes/create', {}, {
            ...item.vote,
            org: item.org,
        });
    };

    return (
        <div class="vote-header">
            <h1>
                <span class="vote-org-icon">
                    <org.renderer value={item.org} />
                </span>
                {item.name}
            </h1>
            {canCreateVote && (
                <Button onClick={createVote}>
                    {locale.templates.createVote}
                </Button>
            )}
        </div>
    );
}

const FORCE_VISIBLE_FIELDS = ['name'];
const FORCE_HIDE_FIELDS = ['timespan'];
const fields = {
    // we can steal these because they’re idential
    name: DETAIL_FIELDS.name,
    description: DETAIL_FIELDS.description,
    vote: {
        component ({ value, editing, onChange }) {
            const fields = [];
            for (const k in DETAIL_FIELDS) {
                if (FORCE_HIDE_FIELDS.includes(k)) continue;
                const Component = DETAIL_FIELDS[k].component;
                if (DETAIL_FIELDS[k].shouldHide && !FORCE_VISIBLE_FIELDS.includes(k)) {
                    const hide = DETAIL_FIELDS[k].shouldHide(value, editing);
                    if (hide) continue;
                }

                fields.push(
                    <div class="vote-field">
                        <div class="vote-field-label">
                            {locale.fields[k]}
                        </div>
                        <div class="vote-field-editor">
                            {(editing || value[k]) ? (
                                <Component
                                    value={value[k]}
                                    editing={editing}
                                    onChange={v => {
                                        onChange({
                                            ...value,
                                            [k]: v,
                                        });
                                    }}
                                    item={value}
                                    onItemChange={onChange} />
                            ) : '—'}
                        </div>
                    </div>
                );
            }

            return (
                <div class="vote-fields">
                    {fields}
                </div>
            );
        },
    },
};
