import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { DefsPreview } from './script-views';
import ScriptContext from './script-context';
import './script-item.less';

export default class ScriptItem extends PureComponent {
    static contextType = ScriptContext;

    openEditor = () => {
        if (!this.props.editable) return;
        this.props.onEditingChange(true);
    };

    componentDidUpdate (prevProps) {
        if (prevProps.editing !== this.props.editing) {
            if (this.props.editing) this.beginEditing();
        }
    }

    beginEditing () {
        this.context.openDefs(this.props.item.script, {
            previousNodes: this.props.previousNodes,
        }).then(script => {
            this.props.onEditingChange(false);
            this.props.onChange({ ...this.props.item, script });
        });
    }

    render ({ item, previousNodes }) {
        return (
            <div class="form-editor-script-item">
                <DefsPreview
                    class="inner-preview"
                    previousNodes={previousNodes}
                    onClick={this.openEditor}
                    script={item.script} />
            </div>
        );
    }
}
