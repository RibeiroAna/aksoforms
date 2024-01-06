import { h } from 'preact';
import { Fragment, PureComponent } from 'preact/compat';
import { Button, CircularProgress, AppBarProxy, MenuIcon } from 'yamdl';
import DoneIcon from '@material-ui/icons/Done';
import { coreContext } from '../../core/connection';
import { deepEq } from '../../../util';
import { detail as locale } from '../../locale';
import { Form } from '../form';
import DisplayError from '../utils/error';
import './detail-shell.less';

/**
 * The outer shell of a detail view. Does not handle fields.
 *
 * This opens a connection to a core data view and optionally to a core task to edit the data.
 *
 * # Props
 * - view: data view name. The data view should expect an `id` option.
 *   The view may use the `extra` field and pass `'delete'` to trigger onDelete.
 * - editing/onEndEdit: editing state
 * - onCommit: should commit and end edit (or not, if the user cancels the task).
 *   will be passed an array of changed field ids
 * - edit/onEditChange: editing copy. Is not necessarily synchronized with `editing`
 * - id: detail view id
 * - options: additional view options; will *not* cause a reload on update
 * - onDelete: called when the item is deleted
 * - onData: will be called with data when it loads
 * - onError: will be called with data when it fails
 * - children: (data, core) => Node
 * - inline: if true, will use a smaller inline style
 */
export default class DetailShell extends PureComponent {
    static contextType = coreContext;

    state = {
        data: null,
        error: null,
        committing: false,
    };

    /** current data view */
    #view;

    /** current form ref */
    #form;

    createView () {
        const { view, id, options } = this.props;
        if (!id) return;
        if (this.#view) this.#view.drop();
        this.#view = this.context.createDataView(view, { id, ...(options || {}) });
        this.#view.on('update', this.#onViewUpdate);
        this.#view.on('error', this.#onViewError);
    }

    #onViewUpdate = (data, extra) => {
        if (extra === 'delete') {
            if (this.props.onDelete) this.props.onDelete();
        }
        this.setState({ data, error: null });
        if (this.props.onData) this.props.onData(data);
    };
    #onViewError = error => {
        console.error(error); // eslint-disable-line no-console
        this.setState({ error });
    };

    componentDidMount () {
        this.createView();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.view !== this.props.view || prevProps.id !== this.props.id) {
            this.createView();
        }

        if (prevProps.edit !== this.props.edit && this.state.committing) {
            // while we should technically be doing this; this causes incorrect behavior
            // during commits. so, let's just accept for now that the visual edit might be slightly
            // out of date
            // this.setState({ committing: false });
        }
    }

    componentWillUnmount () {
        if (this.#view) this.#view.drop();
    }

    hasChanges () {
        if (!this.props.edit || !this.state.data) return false;
        for (const fieldId in this.state.data) {
            if (!deepEq(this.state.data[fieldId], this.props.edit[fieldId])) return true;
        }
        return false;
    }

    getChangedFields () {
        if (!this.props.edit || !this.state.data) return [];
        return Object.keys(this.state.data)
            .filter(fieldId => !deepEq(this.state.data[fieldId], this.props.edit[fieldId]));
    }

    beginCommit () {
        this.#form.requestSubmit();
    }

    #performCommit () {
        if (this.state.committing) return;
        const changes = this.getChangedFields();
        this.setState({ committing: true }, () => {
            this.props.onCommit(changes).then(() => this.setState({ committing: false }));
        });
    }

    render ({ inline, editing, children }) {
        let contents;
        if (this.state.error) {
            if (this.state.error.code === 'not-found') {
                contents = (
                    <div class="detail-view-not-found">
                        <h1>{locale.notFoundError.title}</h1>
                        <p>{locale.notFoundError.description}</p>
                        <p>{locale.notFoundError.description2}</p>
                        {window.history.length ? (
                            <div class="back-button-container">
                                <Button onClick={() => window.history.back()}>
                                    {locale.notFoundError.back}
                                </Button>
                            </div>
                        ) : null}
                    </div>
                );
            } else {
                contents = (
                    <div class="detail-view-error">
                        <DisplayError error={this.state.error} />
                    </div>
                );
            }
        } else if (this.state.data) {
            contents = (
                <Fragment>
                    <AppBarProxy
                        class="detail-view-editing-app-bar"
                        priority={editing ? 2 : -Infinity}
                        title={locale.editing}
                        menu={(
                            <Button icon small onClick={() => {
                                this.props.onEndEdit();
                                this.props.onEditChange(null);
                            }} aria-label={locale.cancel}>
                                <MenuIcon type="close" />
                            </Button>
                        )}
                        actions={[
                            {
                                label: locale.done,
                                icon: <DoneIcon />,
                                action: () => this.beginCommit(),
                            },
                        ]}
                        data={{
                            dirty: !this.state.committing && this.hasChanges(),
                        }} />
                    {!!children && children(this.state.data, this.context)}
                </Fragment>
            );
        } else {
            contents = (
                <div class="detail-view-loading">
                    <CircularProgress indeterminate small={inline} />
                </div>
            );
        }

        return (
            <Form
                ref={view => this.#form = view}
                class={'detail-view' + (inline ? ' p-inline' : '')}
                onSubmit={() => {
                    this.#performCommit();
                }}>
                {contents}
            </Form>
        );
    }
}
