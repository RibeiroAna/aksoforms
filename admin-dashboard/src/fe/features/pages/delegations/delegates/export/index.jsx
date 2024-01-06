import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, Checkbox, CircularProgress } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import DialogSheet from '../../../../../components/tasks/dialog-sheet';
import DynamicHeightDiv from '../../../../../components/layout/dynamic-height-div';
import DisplayError from '../../../../../components/utils/error';
import { coreContext } from '../../../../../core/connection';
import { delegations as locale } from '../../../../../locale';
import './index.less';

const loadLoader = (() => {
    let loader = null;
    return () => {
        if (!loader) loader = import('./data');
        return loader.then(({ load }) => load);
    };
})();
const load = async (...args) => {
    const loader = await loadLoader();
    return loader(...args);
};

export default class DelegatesExportDialog extends PureComponent {
    render ({ open, onClose, filters }) {
        return (
            <DialogSheet
                class="delegates-export-dialog"
                backdrop
                title={locale.export.title}
                open={open}
                onClose={onClose}>
                <DelegatesExport filters={filters} />
            </DialogSheet>
        );
    }
}

class DelegatesExport extends PureComponent {
    state = {
        ignoreTos: false,
        loading: false,
        progress: {},
        error: null,
        data: null,
        org: 'uea',
    };

    static contextType = coreContext;

    load () {
        this.setState({ loading: true, progress: {} });
        this._pendingProgress = {};
        load((status, current, target) => {
            const progress = { ...(this._pendingProgress || this.state.progress) };
            progress[status] = [current, target];
            progress._current = status;
            this._pendingProgress = progress; // setState may be too slow sometimes
            this.setState({ progress });
        }, this.context, this.state.org, this.state.useFilter ? this.props.filters : {}, this.state.ignoreTos).then(data => {
            const progress = { ...(this._pendingProgress || this.state.progress) };
            progress._current = null;
            const objectURL = URL.createObjectURL(data);
            this.setState({ loading: false, data: objectURL, progress });
        }).catch(error => {
            this.setState({ loading: false, error });
            console.error(error); // eslint-disable-line no-console
        });
    }

    render () {
        let contents;
        if (this.state.loading) {
            contents = (
                <div class="export-contents">
                    <ProgressDisplay progress={this.state.progress} running />
                </div>
            );
        } else if (this.state.error) {
            contents = (
                <div class="export-contents">
                    <ProgressDisplay progress={this.state.progress} />
                    <div class="export-error-container">
                        <DisplayError error={this.state.error} />
                    </div>
                    <div class="export-action-container">
                        <Button raised onClick={() => this.load()}>
                            {locale.export.retry}
                        </Button>
                    </div>
                </div>
            );
        } else if (this.state.data) {
            contents = (
                <div class="export-contents">
                    <ProgressDisplay progress={this.state.progress} />
                    <div class="export-action-container">
                        <Button raised download={locale.export.fileName} href={this.state.data}>
                            {locale.export.downloadFile}
                        </Button>
                    </div>
                </div>
            );
        } else {
            const ignoreTosId = 'checkbox-' + Math.random().toString(36);
            const useFilterId = 'checkbox-' + Math.random().toString(36);
            const hasFilter = this.props.filters
                && (!!Object.values(this.props.filters.filters || {}).find(x => x.enabled)
                    || (this.props.filters.jsonFilter && !this.props.filters.jsonFilter?._disabled));

            contents = (
                <div class="export-contents">
                    <div class="export-setting">
                        <Checkbox
                            id={ignoreTosId}
                            checked={this.state.ignoreTos}
                            onChange={ignoreTos => this.setState({ ignoreTos })} />
                        {' '}
                        <label for={ignoreTosId}>
                            {locale.export.settings.ignoreTos}
                        </label>
                    </div>
                    {hasFilter ? (
                        <div class="export-setting">
                            <Checkbox
                                id={useFilterId}
                                checked={this.state.useFilter}
                                onChange={useFilter => this.setState({ useFilter })} />
                            <label for={useFilterId}>
                                {locale.export.settings.useFilter}
                            </label>
                        </div>
                    ) : null}
                    <div class="export-action-container">
                        <Button raised onClick={() => this.load()}>
                            {locale.export.start}
                        </Button>
                    </div>
                </div>
            );
        }

        return (
            <div class="delegates-export-contents">
                {contents}
            </div>
        );
    }
}

function ProgressDisplay ({ progress, running }) {
    return (
        <DynamicHeightDiv class="progress-display" useFirstHeight>
            {Object.keys(progress).filter(key => !key.startsWith('_')).map(key => (
                <div class="progress-item" key={key}>
                    <div class="progress-icon" data-done={!(running && progress._current === key) && progress[key][0] === progress[key][1]}>
                        <CircularProgress
                            small
                            class="progress-circle"
                            indeterminate={running && progress._current === key}
                            progress={(progress[key][0] + progress[key][1] === 0)
                                ? 1 // show 1 for 0/0
                                : progress[key][0] / Math.max(1e-9, progress[key][1])} />
                        <CheckIcon className="check-icon" />
                    </div>
                    <span class="item-label">
                        {locale.export.progress.messages[key]}
                    </span>
                    <span class="item-value">
                        <span class="item-completed">{progress[key][0]}</span>
                        /
                        <span class="item-total">{progress[key][1]}</span>
                    </span>
                </div>
            ))}
        </DynamicHeightDiv>
    );
}
