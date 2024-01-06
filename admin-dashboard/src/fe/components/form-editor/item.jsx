import { h } from 'preact';
import { PureComponent, useState } from 'preact/compat';
import { Button, Dialog } from 'yamdl';
import EditIcon from '@material-ui/icons/Edit';
import DoneIcon from '@material-ui/icons/Done';
import RemoveIcon from '@material-ui/icons/Remove';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import InputItem from './input-item';
import TextItem from './text-item';
import ScriptItem from './script-item';
import { RefNameView } from './script-views';
import { FormContext } from '../form';
import { formEditor as locale } from '../../locale';
import './item.less';

/**
 * A form editor item.
 *
 * - item/onChange: the item
 * - editing/onEditingChange: bool
 * - editable: bool
 * - isEditingContext: bool
 * - disableValidation: bool
 * - onRemove: fn
 * - previousNodes: previous nodes' asc definitions (see getAscDefs in model)
 */
export default class FormEditorItem extends PureComponent {
    state = {
        edit: null,
    };

    static contextType = FormContext;

    componentDidMount () {
        if (this.props.editing) {
            this.setState({
                edit: this.props.item,
            });
        }
    }

    componentDidUpdate (prevProps) {
        if (prevProps.editing !== this.props.editing) {
            if (this.props.editing) {
                this.setState({
                    edit: this.props.item,
                });
            } else {
                const edit = this.state.edit;
                this.setState({
                    edit: null,
                });
                this.props.onChange(edit);
            }
        }
    }

    onEditChange = (edit) => {
        this.setState({ edit });
    };

    onFinishEditing = () => {
        this.props.onEditingChange(false);
    };

    render ({
        item, editable, onChange, editing, onEditingChange, editingData, value, onValueChange,
        onRemove, isEditingContext, disableValidation, hasValues,
        onMoveItem,
    }) {
        if (!item) return null;

        const props = {
            editable,
            editing,
            item: this.state.edit || item,
            onChange: this.state.edit ? this.onEditChange : onChange,
            previousNodes: this.props.previousNodes,
            isEditingContext,
            disableValidation,
            hasValues,
        };

        let contents, contentsPreview;
        if (item.el === 'input') {
            contents = <InputItem
                {...props}
                onStopEditing={() => onEditingChange(false)}
                editingData={editingData}
                value={value}
                onValueChange={onValueChange}
                registerTestInput={this.props.registerTestInput}
                deregisterTestInput={this.props.registerTestInput} />;

            contentsPreview = <InputItem
                {...props}
                hasValues={false}
                editing={false}
                value={value}
                registerTestInput={() => {}}
                deregisterTestInput={() => {}} />;
        } else if (item.el === 'text') {
            contents = <TextItem {...props} />;
            contentsPreview = <TextItem {...props} editing={false} />;
        } else if (item.el === 'script') {
            contents = <ScriptItem {...props} onEditingChange={onEditingChange} />;
            contentsPreview = <ScriptItem {...props} editing={false} />;
        }

        return (
            <div class="form-editor-item">
                <ItemBar
                    el={item.el}
                    onMoveItem={onMoveItem}
                    editable={editable}
                    name={item.name}
                    type={item.type}
                    editing={editing}
                    onStartEditing={() => onEditingChange(true)}
                    onClose={this.onFinishEditing}
                    onRemove={onRemove}
                    removePreview={contentsPreview} />
                {contents}
            </div>
        );
    }
}

/** The top bar on a form editor item. */
function ItemBar ({
    editable,
    el,
    type,
    name,
    editing,
    onStartEditing,
    onClose,
    onRemove,
    onMoveItem,
    removePreview,
}) {
    const [removing, setRemoving] = useState(false);

    let button = null;
    if (editing) {
        button = (
            <Button small icon onClick={onClose}>
                <DoneIcon style={{ verticalAlign: 'middle' }} />
            </Button>
        );
    } else if (editable) {
        button = (
            <Button small icon onClick={onStartEditing}>
                <EditIcon style={{ verticalAlign: 'middle' }} />
            </Button>
        );
    }

    let moveItem = null;
    if (editable && onMoveItem) {
        moveItem = (
            <div class="item-bar-move-item">
                <Button small icon onClick={() => onMoveItem(-1)}>
                    <KeyboardArrowUpIcon style={{ verticalAlign: 'middle' }} />
                </Button>
                <Button small icon onClick={() => onMoveItem(1)}>
                    <KeyboardArrowDownIcon style={{ verticalAlign: 'middle' }} />
                </Button>
            </div>
        );
    }

    let nameNode;
    if (el === 'input') {
        nameNode = <RefNameView def name={'@' + name} />;
    } else {
        nameNode = <span class="item-bar-name">{locale.itemTypes[el]}</span>;
    }

    return (
        <div class={'form-editor-item-bar' + (editing ? ' is-editing' : '')}>
            <span>
                {editable ? (
                    <Button class="remove-button" small icon onClick={e => {
                        if (e.shiftKey) {
                            onRemove();
                        } else {
                            setRemoving(true);
                        }
                    }}>
                        <RemoveIcon style={{ verticalAlign: 'middle' }} />
                    </Button>
                ) : null}
                {el === 'input' ? locale.inputTypes[type] : null}
            </span>
            {nameNode}
            <span class="item-bar-right">
                {button}
                <span class="inner-move-controls">
                    {moveItem}
                </span>
            </span>

            <Dialog
                class="form-editor-item-remove-confirmation"
                backdrop
                open={removing}
                onClose={() => setRemoving(false)}
                title={locale.removeItem.confirmation}
                actions={[
                    { label: locale.removeItem.cancel, action: () => setRemoving(false) },
                    {
                        label: locale.removeItem.confirm,
                        action: () => {
                            setRemoving(false);
                            onRemove();
                        },
                    },
                ]}>
                <div className="item-preview">
                    {removePreview}
                </div>
                <div className="remove-skip-hint">
                    {locale.removeItem.hint}
                </div>
            </Dialog>
        </div>
    );
}
