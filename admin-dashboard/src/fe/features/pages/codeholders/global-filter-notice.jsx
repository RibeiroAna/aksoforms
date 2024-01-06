import { h } from 'preact';
import { Dialog } from 'yamdl';
import ObjectViewer from '../../../components/object-viewer';
import { useState } from 'preact/compat';
import { codeholders as locale } from '../../../locale';

export default function GlobalFilterNotice ({ perms }) {
    const [viewerOpen, setViewerOpen] = useState(false);

    const hasGlobalFilter = perms.perms
        ? !!Object.keys(perms.perms.memberFilter).length
        : false;

    if (hasGlobalFilter) {
        return (
            <span class="global-filter-notice">
                {locale.globalFilterNotice[0]}
                <a href="#" onClick={e => {
                    e.preventDefault();
                    setViewerOpen(true);
                }}>
                    {locale.globalFilterNotice[1]}
                </a>
                {locale.globalFilterNotice[2]}
                <GlobalFilterViewer
                    open={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    filter={perms.perms ? perms.perms.memberFilter : null} />
            </span>
        );
    }
    return null;
}


function GlobalFilterViewer ({ open, onClose, filter }) {
    return (
        <Dialog
            class="codeholders-global-filter-viewer"
            backdrop
            open={open}
            onClose={onClose}
            title={locale.globalFilterTitle}
            fullScreen={width => width < 600}>
            <ObjectViewer value={filter} />
        </Dialog>
    );
}
