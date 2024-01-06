import { h } from 'preact';
import { Button, LinearProgress } from 'yamdl';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import FileUploadIcon from '@material-ui/icons/Publish';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import pickFile from '../../../../components/pick-file';
import { coreContext } from '../../../../core/connection';
import { useContext } from 'preact/compat';
import { magazineEditions as locale } from '../../../../locale';
import './files.less';
import { useDataView } from '../../../../core';
import DisplayError from '../../../../components/utils/error';

export function Files ({
    view,
    options,
    icon,
    onUpload,
    onDelete,
    formats,
    canUpload,
    canDelete,
}) {
    const core = useContext(coreContext);
    const [loading, error, data] = useDataView(view, options);

    if (loading) {
        return (
            <div class="magazine-edition-files is-loading">
                <LinearProgress class="inner-progress" indeterminate />
            </div>
        );
    }
    if (error) {
        return <DisplayError error={error} />;
    }
    if (!data) return null;

    const fileSlots = {};
    for (const item of data) {
        fileSlots[item.format] = item;
    }

    const uploadFile = format => () => {
        pickFile(formats[format], files => {
            const file = files[0];
            if (!file) return;
            onUpload(core, format, file);
        });
    };

    const deleteFile = format => () => onDelete(core, format);

    return (
        <div class="magazine-edition-files">
            {Object.keys(formats).map(f => (
                <EditionFileSlot
                    key={f}
                    icon={icon}
                    format={f}
                    downloads={fileSlots[f]?.downloads}
                    size={fileSlots[f]?.size}
                    downloadURL={fileSlots[f]?.url}
                    onUpload={uploadFile(f)}
                    onDelete={deleteFile(f)}
                    canUpload={canUpload}
                    canDelete={canDelete} />
            ))}
        </div>
    );
}

function EditionFileSlot ({
    icon,
    format,
    downloads,
    size,
    onUpload,
    downloadURL,
    onDelete,
    canUpload,
    canDelete,
}) {
    const exists = !!size;

    return (
        <div class={'edition-file-slot' + (exists ? ' file-exists' : '')}>
            <div class="file-info">
                <div class="file-icon">
                    {icon}
                </div>
                {exists ? (
                    <a
                        class="file-format is-download"
                        href={downloadURL}
                        rel="noopener noreferrer"
                        download={format}
                        target="_blank">
                        {format.toUpperCase()}
                        {' '}
                        <OpenInNewIcon className="external-icon" style={{ verticalAlign: 'middle' }} />
                    </a>
                ) : (
                    <span class="file-format">
                        {format.toUpperCase()}
                    </span>
                )}
                <div class="fi-spacer" />
                {exists ? (
                    <div class="file-actions">
                        {canUpload ? (
                            <Button class="file-replace" icon small onClick={onUpload}>
                                <FileUploadIcon style={{ verticalAlign: 'middle' }} />
                            </Button>
                        ) : null}
                        {' '}
                        {canDelete ? (
                            <Button class="file-delete" icon small onClick={onDelete}>
                                <DeleteForeverIcon style={{ verticalAlign: 'middle' }} />
                            </Button>
                        ) : null}
                    </div>
                ) : (
                    <div class="file-actions">
                        {canUpload ? (
                            <Button class="upload-fab" fab onClick={onUpload}>
                                <FileUploadIcon style={{ verticalAlign: 'middle' }} />
                                {' '}
                                {locale.files.upload}
                            </Button>
                        ) : null}
                    </div>
                )}
            </div>
            {exists && (
                <div class="file-details">
                    <span class="file-downloads">
                        {locale.files.downloads(downloads)}
                    </span>
                </div>
            )}
        </div>
    );
}
