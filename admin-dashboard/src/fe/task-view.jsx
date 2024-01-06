import { h, Component } from 'preact';

/**
 * A task view container.
 *
 * Used to hold task views, which are GUI dialogs to interact with core tasks.
 * See index for usage.
 *
 * # Props
 * - id: task id
 * - path: task path
 * - core: core ref
 * - view: task view
 * - isDead: whether this task is dead
 */
export default class TaskView extends Component {
    constructor (props) {
        super(props);

        this.task = props.core.getTask(props.id);
        this.task.on('result', this.#onTaskResult);
    }

    state = {
        mayBeOpen: false,
        error: null,
    };

    #onTaskResult = () => {
        this.forceUpdate();
    };

    #onClose = () => {
        if (this.viewRef && this.viewRef.onClose) this.viewRef.onClose();
        else this.task.drop();
    };

    componentDidMount () {
        setImmediate(() => this.setState({ mayBeOpen: true }));
    }

    componentWillUnmount () {
        this.task.removeListener('result', this.#onTaskResult);
    }

    componentDidCatch (error, errorInfo) {
        console.error(`[Task View ${this.props.path}] render error`, error, errorInfo); // eslint-disable-line no-console
    }

    static getDerivedStateFromError (error) {
        return { error };
    }

    render ({ id, path, core, view: View, isDead }, { mayBeOpen }) {
        if (this.state.error) {
            return null;
        }

        if (this.task.type !== path) {
            console.error('task type mismatch', this.task, path); // eslint-disable-line no-console
            throw new Error('task view: task type does not match path prop');
        }
        return (
            <View
                ref={view => this.viewRef = view}
                open={!isDead && mayBeOpen}
                id={id}
                core={core}
                task={this.task} />
        );
    }
}
