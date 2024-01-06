import { h } from 'preact';
import { useState, useEffect, useRef, useContext } from 'preact/compat';
import { Button, CircularProgress, Menu } from 'yamdl';
import ResizeObserver from 'resize-observer-polyfill';
import AddAPhotoIcon from '@material-ui/icons/AddAPhoto';
import EditIcon from '@material-ui/icons/Edit';
import { coreContext } from '../../core/connection';
import { data as locale } from '../../locale';
import pickFile from '../pick-file';
import Lightbox from '../lightbox';
import DialogSheet from '../tasks/dialog-sheet';
import TaskButton from './task-button';
import DisplayError from '../utils/error';
import { FileThumbnail, Mime, FileSize } from '../files';
import { useDataView } from '../../core';
import './url-view-image.less';

// TODO: add a crop dialog or something

/**
 * Renders an image.
 *
 * # Props
 * - `sizes`: available image sizes (sorted ascending!)
 * - `urlView`: the view that contains a URL for the image
 * - `options`: urlView options
 * - `urlViewField`: name of the field in the URL view that contains image sizes
 * - `editing`: bool - editing state
 * - `onUpdate`: (Blob, core) => Promise<void, any>
 * - `onDelete`: (core) => void
 * - `contain`: bool - if true, image will use object-fit: contain instead of cover
 * - `lightbox`: bool - if true, will allow tapping to open a lightbox
 * - `placeholder`: VNode - placeholder to show if there is no image
 */
export default function UrlViewImage ({
    sizes,
    urlView, options, urlViewField,
    editing, onUpdate, onDelete, contain, lightbox, placeholder,
    ...extra
}) {
    const containerNode = useRef();
    const core = useContext(coreContext);
    const [loading, error, data] = useDataView(urlView, options);
    const urlSizes = data && data[urlViewField];

    const [sizeToLoad, setSizeToLoad] = useState(null);
    useEffect(() => {
        if (!containerNode.current) return;
        const observer = new ResizeObserver(entries => {
            if (!entries.length) return;
            const entry = entries[0];
            const rect = entry.contentRect;

            const pixelWidth = window.devicePixelRatio * rect.width;

            let size = 0;
            for (const s of sizes) {
                size = s;
                if (s >= pixelWidth) {
                    break;
                }
            }

            setSizeToLoad(size);
        });
        observer.observe(containerNode.current);
        return () => observer.disconnect();
    }, [containerNode.current]);

    const [isLightboxOpen, setLightboxOpen] = useState(false);
    const lightboxComponent = useRef();
    const onImageClick = (e) => {
        if (lightboxComponent.current) {
            lightboxComponent.current.setOpenFromImage(e.currentTarget);
            setLightboxOpen(true);
        }
    };

    const [isUploading, setUploading] = useState(false);
    const uploadingFile = useRef();
    const doUpload = () => {
        pickFile('image/png, image/jpeg', files => {
            const file = files[0];
            if (!file) return;

            setUploading(true);
            uploadingFile.current = file;
        });
    };

    const [isEditMenuOpen, setEditMenuOpen] = useState(false);
    const [editMenuPosition, setEditMenuPosition] = useState([0, 0]);
    const onEdit = (e) => {
        if (urlSizes) {
            // image exists; show choice to upload or delete
            setEditMenuOpen(true);
            setEditMenuPosition([e.clientX, e.clientY]);
        } else {
            doUpload();
        }
    };

    extra.class = (extra.class || '') + ' url-view-image';
    if (contain) extra.class += ' p-contain';
    if (lightbox) extra.class += ' p-lightbox';

    return (
        <div {...extra} ref={containerNode}>
            <CircularProgress class="image-loading-indicator" indeterminate={loading} />
            {error ? (
                <DisplayError error={error} />
            ) : loading ? null : urlSizes ? (
                sizeToLoad ? (
                    <img
                        className="inner-image"
                        onClick={onImageClick}
                        src={urlSizes[sizeToLoad]} />
                ) : null
            ) : (
                <div class="inner-image is-placeholder">
                    {placeholder}
                </div>
            )}

            {editing ? (
                <Button
                    class="inner-edit-button"
                    fab
                    icon
                    onClick={onEdit}>
                    {(urlSizes && onDelete) ? (
                        <EditIcon />
                    ) : (
                        <AddAPhotoIcon />
                    )}
                </Button>
            ) : null}
            {editing ? (
                <Menu
                    open={isEditMenuOpen}
                    onClose={() => setEditMenuOpen(false)}
                    position={editMenuPosition}
                    items={[
                        {
                            label: locale.taskImageUpload.menuItem,
                            action: doUpload,
                        },
                        {
                            label: locale.taskImageUpload.delete,
                            action: () => onDelete(core),
                        },
                    ]} />
            ) : null}
            {editing ? (
                <UploadDialog
                    open={isUploading}
                    file={uploadingFile.current}
                    onUpdate={onUpdate}
                    onClose={() => setUploading(false)} />
            ) : null}

            {lightbox ? (
                <Lightbox
                    ref={lightboxComponent}
                    src={urlSizes && urlSizes[sizeToLoad]}
                    open={isLightboxOpen}
                    onClose={() => setLightboxOpen(false)} />
            ) : null}
        </div>
    );
}

function UploadDialog ({ open, onClose, file, onUpdate }) {
    const core = useContext(coreContext);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    // reset error when new file is selected
    useEffect(() => setError(null), [file]);

    const doUpload = async () => {
        setError(null);
        setUploading(true);

        try {
            await onUpdate(file, core);

            onClose();
        } catch (err) {
            console.error(err); // eslint-disable-line no-console
            setError(err);
        }

        setUploading(false);
    };

    return (
        <DialogSheet
            class="task-image-upload-dialog"
            backdrop
            title={locale.taskImageUpload.title}
            open={open}
            onClose={uploading ? null : onClose}>
            <UploaderContents file={file} upload={doUpload} error={error} />
        </DialogSheet>
    );
}

function UploaderContents ({ file, upload, error }) {
    if (!file) return null;

    return (
        <div class="upload-preview">
            <FilePreview class="image-preview" file={file} />
            <div class="image-details">
                <FileThumbnail file={file} />
                <div class="inner-details">
                    <div class="inner-file-type">
                        <Mime mime={file.type} />
                    </div>
                    <div class="inner-file-size">
                        <FileSize bytes={file.size || 0} />
                    </div>
                </div>
                <TaskButton
                    raised
                    run={upload}
                    class="upload-button">
                    {locale.taskImageUpload.button}
                </TaskButton>
            </div>
            {error && (
                <div class="error-container">
                    <DisplayError error={error} />
                </div>
            )}
        </div>
    );
}

function FilePreview ({ file, ...extra }) {
    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
        const objUrl = URL.createObjectURL(file);
        setBlobUrl(objUrl);
        return (() => {
            URL.revokeObjectURL(objUrl);
        });
    }, [file]);

    if (!blobUrl) return null;
    return <img {...extra} src={blobUrl} />;
}
