import { h, Component } from 'preact';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import { CircularProgress } from 'yamdl';
import TaskDialog from '../../../../components/tasks/task-dialog';
import DynamicHeightDiv from '../../../../components/layout/dynamic-height-div';
import DisplayError from '../../../../components/utils/error';
import { deepEq } from '../../../../../util';
import { data as locale } from '../../../../locale';

const State = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    ERROR: 'error',
    isIdle: state => state !== State.RUNNING,
};

/**
 * # Props
 * - open: bool
 * - pxTask: string
 * - mrTask: string
 * - task: object
 * - core: object
 */
export default class SaveTask extends Component {
    state = {
        px: null,
        pxState: State.PENDING,
        pxError: null,
        mr: null,
        mrState: State.PENDING,
        mrError: null,
        diff: null,
    };

    componentDidMount () {
        const { task: { parameters } } = this.props;
        this.setState({
            diff: getPermsDiff(parameters.original, parameters.permissions),
        });
    }

    #run = () => {
        if (this.state.pxState === State.SUCCESS && this.state.mrState === State.SUCCESS) {
            return this.props.task.runOnce();
        }

        if (!State.isIdle(this.state.pxState) || !State.isIdle(this.state.mrState)) return;
        const { core, task, pxTask, mrTask } = this.props;

        let px;
        if (this.state.pxState !== State.SUCCESS) {
            this.setState({ pxState: State.RUNNING });
            px = core.createTask(pxTask, task.options, task.parameters).runOnce().then(() => {
                this.setState({ pxState: State.SUCCESS });
            }).catch(err => {
                console.error(err); // eslint-disable-line no-console
                this.setState({ pxState: State.ERROR, pxError: err });
                throw err;
            });
        } else {
            px = Promise.resolve();
        }

        let mr;
        if (this.state.mrState !== State.SUCCESS) {
            this.setState({ mrState: State.RUNNING });
            mr = core.createTask(mrTask, task.options, task.parameters).runOnce().then(() => {
                this.setState({ mrState: State.SUCCESS });
            }).catch(err => {
                console.error(err); // eslint-disable-line no-console
                this.setState({ mrState: State.ERROR, mrError: err });
                throw err;
            });
        } else {
            mr = Promise.resolve();
        }

        return Promise.all([px, mr]).then(() => {
            // tasks succeeded
            // success is too fast, so we wait for a bit before dropping
            return new Promise(r => setTimeout(r, 500));
        }).then(() => this.props.task.drop()).catch(() => {
            // we don't want to show an error message because we already handled that above
            throw null;
        });
    };

    render ({ open, task }, { diff, pxState, mrState, pxError, mrError }) {
        const showDiff = pxState === State.PENDING && mrState === State.PENDING;

        let contents;
        if (showDiff) {
            if (diff) {
                contents = (
                    <div class="perms-changes">
                        <ul>
                            {diff.added ? (
                                <li>{locale.permsEditor.update.added(diff.added)}</li>
                            ) : null}
                            {diff.removed ? (
                                <li>{locale.permsEditor.update.removed(diff.removed)}</li>
                            ) : null}
                            {diff.mrChanged ? (
                                <li>{locale.permsEditor.update.mrChanged}</li>
                            ) : null}
                        </ul>
                    </div>
                );
            } else contents = null;
        } else {
            contents = (
                <ul class="perms-state">
                    <StateLine
                        state={pxState}
                        label={locale.permsEditor.update.px}
                        error={pxError} />
                    <StateLine
                        state={mrState}
                        label={locale.permsEditor.update.mr}
                        error={mrError} />
                </ul>
            );
        }

        return (
            <TaskDialog
                class="admin-perms-save-dialog"
                open={open}
                onClose={() => task.drop()}
                title={locale.permsEditor.update.title}
                actionLabel={locale.permsEditor.update.button}
                run={this.#run}>
                <DynamicHeightDiv class="autosizer">
                    {contents}
                </DynamicHeightDiv>
            </TaskDialog>
        );
    }
}

function StateLine ({ state, label, error }) {
    return (
        <li class="state-line">
            <DynamicHeightDiv class="autosizer" useFirstHeight>
                <div class="state-line-inner">
                    <span class="state-icon">
                        <CircularProgress
                            class="state-progress"
                            indeterminate={state === State.RUNNING}
                            progress={state === State.SUCCESS ? 1 : 0} />
                        <span class={'state-check-container' + (state === State.SUCCESS ? ' visible' : '')}>
                            <CheckIcon />
                        </span>
                        <span class={'state-error-container' + (state === State.ERROR ? ' visible' : '')}>
                            <CloseIcon />
                        </span>
                    </span>
                    <label class="state-label">
                        {label}
                    </label>
                </div>
                {state === State.ERROR ? (
                    <div class="state-line-error">
                        <DisplayError error={error} />
                    </div>
                ) : null}
            </DynamicHeightDiv>
        </li>
    );
}

function getPermsDiff (orig, perms) {
    const origPerms = new Set(orig.permissions);
    const newPerms = new Set(perms.permissions);

    const added = new Set();
    const removed = new Set();
    for (const p of newPerms) if (!origPerms.has(p)) added.add(p);
    for (const p of origPerms) if (!newPerms.has(p)) removed.add(p);

    let mrChanged = false;
    if (orig.mrEnabled !== perms.mrEnabled) {
        mrChanged = true;
    }
    if (!mrChanged && perms.mrEnabled) {
        if (!deepEq(orig.mrFields, perms.mrFields) || orig.mrFilter !== perms.mrFilter) {
            mrChanged = true;
        }
    }

    return {
        added: added.size,
        removed: removed.size,
        mrChanged,
    };
}
