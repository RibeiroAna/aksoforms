import { h } from 'preact';
import { Dialog } from 'yamdl';
import { generic as locale } from './locale';
import './tasks.less';

/** Shows a single info dialog. */
export function info ({ open, task }) {
    if (!task.options) return null;
    const { title, message } = task.options;

    return (
        <Dialog
            backdrop
            open={open}
            onClose={() => task.drop()}
            title={title}
            actions={[
                {
                    label: locale.close,
                    action: () => task.run(),
                },
            ]}>
            {message}
        </Dialog>
    );
}

export function openExternalLink ({ open, task }) {
    return (
        <Dialog
            class="task-open-external-link"
            backdrop
            open={open}
            onClose={() => task.drop()}
            actions={[
                {
                    label: locale.cancel,
                    action: () => task.run(),
                },
                {
                    label: locale.openExternalLink.open,
                    action: () => {
                        const a = document.createElement('a');
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.href = task.options.link;
                        a.click();
                        task.run();
                    },
                },
            ]}>
            <div class="inner-description">{locale.openExternalLink.title}</div>
            <code>{task.options.link}</code>
        </Dialog>
    );
}
