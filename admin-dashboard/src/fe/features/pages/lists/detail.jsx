import { h, Component } from 'preact';
import { Button, TextField } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import RemoveIcon from '@material-ui/icons/Remove';
import Page from '../../../components/page';
import DetailView from '../../../components/detail/detail';
import JSONEditor from '../../../components/controls/json-editor';
import RearrangingList from '../../../components/lists/rearranging-list';
import Tabs from '../../../components/controls/tabs';
import TextArea from '../../../components/controls/text-area';
import DataList from '../../../components/lists/data-list';
import ProfilePicture from '../../../components/profile-picture';
import Meta from '../../meta';
import { coreContext } from '../../../core/connection';
import { connectPerms } from '../../../perms';
import { Link } from '../../../router';
import { lists as locale } from '../../../locale';
import './detail.less';
import { SavedFilterPickerButton } from '../../../components/overview/saved-filter-picker';

export default connectPerms(class ListDetailPage extends Page {
    state = {
        edit: null,
    };

    static contextType = coreContext;

    #commitTask = null;
    onCommit = changedFields => {
        if (!this.props.editing || this.#commitTask) return Promise.resolve();
        if (!changedFields.length) {
            // nothing changed, so we can just pop the editing state
            this.props.editing.pop(true);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.#commitTask = this.context.createTask('lists/update', {
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
    onEndEdit = () => {
        this.props.editing && this.props.editing.pop(true);
        this.setState({ edit: null });
    };

    render ({ match, perms, editing }) {
        const id = +match[1];

        const actions = [];

        if (perms.hasPerm('lists.update') && perms.hasPerm('codeholders.read')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: () => {
                    this.props.onNavigate(`/listoj/${id}/redakti`, true);
                },
            });
        }

        if (perms.hasPerm('lists.delete')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('lists/delete', { id }),
                overflow: true,
                danger: true,
            });
        }

        return (
            <div class="list-detail-page">
                <Meta
                    title={locale.detailTitle}
                    actions={actions} />
                <DetailView
                    view="lists/list"
                    id={id}
                    editing={editing}
                    edit={this.state.edit}
                    onEditChange={edit => this.setState({ edit })}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    header={DetailViewInner}
                    onDelete={() => this.props.pop()} />
            </div>
        );
    }
});

class DetailViewInner extends Component {
    state = {
        tab: 'preview',
    };

    render ({ editing, item, onItemChange }) {
        let tab = this.state.tab;
        if (editing) tab = 'filters';

        return (
            <div class={'list-detail-inner' + (editing ? ' is-editing' : '')}>
                <Tabs
                    value={tab}
                    onChange={tab => this.setState({ tab })}
                    disabled={editing}
                    tabs={{
                        preview: locale.preview.title,
                        filters: locale.filters.title,
                    }} />
                <Header
                    item={item}
                    editing={editing}
                    onItemChange={onItemChange} />
                {tab === 'filters' ? (
                    <Filters item={item} editing={editing} onItemChange={onItemChange} />
                ) : (
                    <ListPreview item={item} />
                )}
            </div>
        );
    }
}

function Header ({ item, editing, onItemChange }) {
    if (editing) {
        return (
            <div class="detail-header">
                <div class="detail-header-field">
                    <TextField
                        outline
                        label={locale.fields.name}
                        value={item.name}
                        onChange={name => onItemChange({ ...item, name })} />
                </div>
                <div class="detail-header-field">
                    <label class="header-field-label">{locale.fields.description}</label>
                    <TextArea
                        onKeyDown={e => e.stopPropagation()}
                        value={item.description}
                        onChange={value => onItemChange({ ...item, description: value || null })} />
                </div>
            </div>
        );
    } else {
        return (
            <div class="detail-header">
                <h1>{item.name}</h1>
                <p>{(item.description || '').split('\n').map((x, i) => <div key={i}>{x}</div>)}</p>
            </div>
        );
    }
}

class Filters extends Component {
    /**
     * These keys are used to identify filters while editing the list.
     * This is necessary to enable rearranging that doesn’t look confusing.
     */
    editFilterKeys = [];

    render ({ item, editing, onItemChange }) {
        const filters = [];
        for (let i = 0; i < (item.filters || []).length; i++) {
            if (!this.editFilterKeys[i]) {
                this.editFilterKeys[i] = 'f' + Math.random();
            }

            const index = i;
            const filter = item.filters[index];
            filters.push(
                <div class="filter-item" key={this.editFilterKeys[index]}>
                    <div class="filter-item-header">
                        {editing ? (
                            <span class="filter-item-remove-container">
                                <Button icon small class="filter-item-remove" onClick={() => {
                                    const newFilters = [...item.filters];
                                    newFilters.splice(index, 1);
                                    this.editFilterKeys.splice(index, 1);
                                    if (!newFilters.length) newFilters.push('{\n\t\n}');
                                    onItemChange({ ...item, filters: newFilters });
                                }}>
                                    <RemoveIcon style={{ verticalAlign: 'middle' }} />
                                </Button>
                            </span>
                        ) : null}
                        <span class="filter-item-title">{locale.filters.itemTitle(i)}</span>
                        {editing ? (
                            <SavedFilterPickerButton
                                class="load-saved-filter-button"
                                category="codeholders"
                                onLoad={query => {
                                    const newFilters = [...item.filters];
                                    newFilters[index] = query.query.filter;
                                    onItemChange({ ...item, filters: newFilters });
                                }} />
                        ) : null}
                    </div>
                    <JSONEditor
                        value={filter}
                        disabled={!editing}
                        onChange={value => {
                            if (!editing) return;
                            const newFilters = [...item.filters];
                            newFilters[index] = value;
                            onItemChange({ ...item, filters: newFilters });
                        }} />
                </div>
            );
        }

        if (editing) {
            filters.push(
                <div class="add-filter-item" key="add">
                    <Button icon class="add-filter-button" onClick={() => {
                        const newFilters = [...item.filters];
                        newFilters.push('{\n\t\n}');
                        onItemChange({ ...item, filters: newFilters });
                    }}>
                        <AddIcon />
                    </Button>
                </div>
            );
        }

        if (editing) {
            return (
                <RearrangingList
                    class="detail-filters is-editing"
                    isItemDraggable={(index) => index < filters.length - 1}
                    canMove={(toPos) => toPos >= 0 && toPos < filters.length - 1}
                    onMove={(fromPos, toPos) => {
                        const newFilters = [...item.filters];
                        const filter = newFilters.splice(fromPos, 1)[0];
                        newFilters.splice(toPos, 0, filter);
                        const filterKey = this.editFilterKeys.splice(fromPos, 1)[0];
                        this.editFilterKeys.splice(toPos, 0, filterKey);
                        onItemChange({ ...item, filters: newFilters });
                    }}>
                    {filters}
                </RearrangingList>
            );
        } else {
            return (
                <div class="detail-filters">
                    {filters}
                </div>
            );
        }
    }
}

function ListPreview ({ item }) {
    const listId = item.id;

    return (
        <coreContext.Consumer>
            {core => (
                <div class="detail-preview">
                    <DataList
                        onLoad={(offset, limit) => core.createTask('lists/codeholders', {
                            id: listId,
                        }, { offset, limit }).runOnceAndDrop()}
                        renderItem={item => {
                            return (
                                <div class="codeholder-item">
                                    <div class="codeholder-picture">
                                        <ProfilePicture
                                            id={item.id}
                                            profilePictureHash={item.profilePictureHash} />
                                    </div>
                                    <div class="codeholder-name">
                                        <Link target={`/membroj/${item.id}`} outOfTree>
                                            {item.firstNameLegal ? [
                                                item.honorific,
                                                item.firstName || item.firstNameLegal,
                                                item.lastName || item.lastNameLegal,
                                            ].filter(x => x).join(' ') : item.fullName}
                                        </Link>
                                    </div>
                                </div>
                            );
                        }}
                        emptyLabel={locale.preview.empty} />
                </div>
            )}
        </coreContext.Consumer>
    );
}
