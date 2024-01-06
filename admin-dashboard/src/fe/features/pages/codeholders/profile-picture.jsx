import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, Dialog, Menu, Slider, CircularProgress, Spring, globalAnimator } from 'yamdl';
import AddAPhotoIcon from '@material-ui/icons/AddAPhoto';
import { coreContext } from '../../../core/connection';
import ProfilePicture from '../../../components/profile-picture';
import pickFile from '../../../components/pick-file';
import { codeholders as locale } from '../../../locale';

// TODO: use core task view

const clamp = (x, l, h) => Math.max(l, Math.min(x, h));
const lerp = (a, b, x) => (b - a) * x + a;

/**
 * Renders an editable codeholder profile picture or identicon.
 *
 * # Props
 * - `id`: the member ID
 * - `profilePictureHash`: whether the identicon should be used or not
 * - `canEdit`: bool
 */
export default class ProfilePictureEditor extends PureComponent {
    state = {
        uploading: false,
        croppingFile: null,
        showingMenu: false,
    };
    menuPos = [0, 0];

    static contextType = coreContext;

    beginUpload () {
        pickFile('image/png, image/jpeg', files => {
            const file = files[0];
            if (!file) return;
            const fileURL = URL.createObjectURL(file);
            this.setState({ uploading: true, croppingFile: fileURL });
        });
    }

    removePicture () {
        this.context.createTask('codeholders/removeProfilePicture', {
            id: this.props.id,
        });
    }

    render () {
        return (
            <div class="member-picture-container">
                <ProfilePicture {...this.props} />
                {this.props.canEdit && (
                    <Button icon class="edit-overlay" onClick={(e) => {
                        this.menuPos = [e.clientX, e.clientY];
                        this.setState({ showingMenu: true });
                    }}>
                        <AddAPhotoIcon class="edit-icon" />
                    </Button>
                )}

                <Menu
                    open={this.state.showingMenu}
                    onClose={() => this.setState({ showingMenu: false })}
                    position={this.menuPos}
                    anchor={[0, 0]}
                    items={[
                        {
                            label: locale.profilePicture.upload,
                            action: () => this.beginUpload(),
                        },
                        this.props.profilePictureHash ? {
                            label: locale.profilePicture.remove.menuItem,
                            action: () => this.removePicture(),
                            danger: true,
                        } : null,
                    ].filter(x => x)}/>
                <Dialog
                    class="member-picture-crop-dialog"
                    backdrop
                    open={this.state.uploading}
                    onClose={() => {}}
                    title={locale.profilePicture.crop}>
                    <FileCropDialog
                        id={this.props.id}
                        url={this.state.croppingFile}
                        onCancel={() => this.setState({ uploading: false })}
                        onSuccess={() => {
                            this.setState({ uploading: false });
                            if (this.props.onSuccess) this.props.onSuccess();
                        }} />
                </Dialog>
            </div>
        );
    }
}

const PP_INSET_SCALE = 0.8;
const SLIDER_REGION_HEIGHT = 48;
const ACCEPT_REJECT_REGION_HEIGHT = 48;
const MAX_PX_SCALE = 1 / Math.hypot(128, 128);

class FileCropDialog extends PureComponent {
    imageX = 0;
    imageY = 0;
    normalizedScale = 1;
    maxScale = 2;
    transferScale = 0;

    time = 0; // for animation

    uploading = new Spring(1, 0.5);

    state = {
        uploading: false,
    };

    initCanvas = canvas => {
        if (this.canvas === canvas || !canvas) return;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');

        globalAnimator.register(this);

        this.image = new Image();
        this.image.src = this.props.url;
        this.needsDisplay = true;
        this.image.onload = () => {
            this.needsDisplay = true;

            this.imageAspect = this.image.width / this.image.height;

            const diagonal = Math.hypot(this.image.width, this.image.height);

            this.maxScale = Math.max(2, diagonal * MAX_PX_SCALE);

            this.forceUpdate();
        };
    };

    scaleTo (newScale) {
        const c = newScale / this.normalizedScale;
        this.normalizedScale = newScale;
        this.imageX *= c;
        this.imageY *= c;

        this.clampImagePos();
    }

    logScaleTransfer = x => {
        const min = Math.log2(1);
        const max = Math.log2(this.maxScale);
        return Math.pow(2, lerp(min, max, x));
    };
    logScaleTransferInv = t => {
        const min = Math.log2(1);
        const max = Math.log2(this.maxScale);
        const val = Math.log2(t);
        return (val - min) / (max - min);
    };

    lastPointerPos = null;
    pointerDown (x, y) {
        this.lastPointerPos = [x, y];
    }
    pointerMove (x, y) {
        const deltaX = x - this.lastPointerPos[0];
        const deltaY = y - this.lastPointerPos[1];

        this.imageX += deltaX * this.transferScale;
        this.imageY += deltaY * this.transferScale;
        this.clampImagePos();

        this.lastPointerPos = [x, y];
    }

    onMouseDown = e => {
        if (e.button !== 0) return;
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('mouseup', this.onMouseUp);
        this.pointerDown(e.clientX, e.clientY);
        e.preventDefault();
    };
    onMouseMove = e => {
        e.preventDefault();
        this.pointerMove(e.clientX, e.clientY);
    };
    onMouseUp = e => {
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
        e.preventDefault();
    };
    onTouchStart = e => {
        e.preventDefault();
        this.pointerDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    onTouchMove = e => {
        e.preventDefault();
        this.pointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    onTouchEnd = e => {
        e.preventDefault();
    };

    clampImagePos () {
        const { imageAspect, normalizedScale } = this;
        const imageWidth = (imageAspect > 1 ? imageAspect : 1) * normalizedScale;
        const imageHeight = (imageAspect < 1 ? 1 / imageAspect : 1) * normalizedScale;

        const maxXMagnitude = imageWidth / 2 - 0.5;
        const maxYMagnitude = imageHeight / 2 - 0.5;

        this.imageX = clamp(this.imageX, -maxXMagnitude, maxXMagnitude);
        this.imageY = clamp(this.imageY, -maxYMagnitude, maxYMagnitude);
    }

    update (dt) {
        this.width = this.canvas.offsetWidth;
        this.height = this.canvas.offsetHeight;
        this.scale = Math.ceil(window.devicePixelRatio || 1); // fractional DPR are evil
        this.canvas.width = this.width * this.scale;
        this.canvas.height = this.height * this.scale;

        this.time += dt;

        this.uploading.target = this.state.uploading ? 1 : 0;
        if (this.uploading.wantsUpdate()) this.needsDisplay = true;
        this.uploading.update(dt);

        if (this.needsDisplay) this.draw();
    }

    draw () {
        const { width, height, scale, ctx, imageX, imageY, imageAspect, time } = this;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.clearRect(0, 0, width, height);

        const viewAspect = width / height;

        const squareFit = viewAspect > 1 ? 'v' : 'h';
        let squareSize = (squareFit === 'h' ? width : height) * PP_INSET_SCALE;
        squareSize = Math.min(squareSize, height - 2 * SLIDER_REGION_HEIGHT);
        const squareInsetX = (width - squareSize) / 2;
        let squareInsetY = (height - squareSize) / 2;

        if (squareInsetY + squareSize > height - SLIDER_REGION_HEIGHT - ACCEPT_REJECT_REGION_HEIGHT) {
            let aSquareInsetY = height - squareSize - SLIDER_REGION_HEIGHT - ACCEPT_REJECT_REGION_HEIGHT;
            let aSquareSize = squareSize;
            if (aSquareInsetY < 0) {
                aSquareInsetY = 0;
                aSquareSize -= ACCEPT_REJECT_REGION_HEIGHT;
            }

            squareInsetY = lerp(aSquareInsetY, squareInsetY, this.uploading.value);
            squareSize = lerp(aSquareSize, squareSize, this.uploading.value);
        }

        this.transferScale = 1 / squareSize;

        if (Number.isFinite(imageAspect)) {
            let imageWidth = imageAspect > 1 ? squareSize * imageAspect : squareSize;
            let imageHeight = imageAspect < 1 ? squareSize / imageAspect : squareSize;
            imageWidth *= this.normalizedScale;
            imageHeight *= this.normalizedScale;

            ctx.drawImage(
                this.image,
                squareInsetX + squareSize / 2 - imageWidth / 2 + imageX * squareSize,
                squareInsetY + squareSize / 2 - imageHeight / 2 + imageY * squareSize,
                imageWidth,
                imageHeight,
            );

            ctx.beginPath();
            // CCW
            ctx.moveTo(0, 0);
            ctx.lineTo(0, height);
            ctx.lineTo(width, height);
            ctx.lineTo(width, 0);
            ctx.closePath();
            // CW for cutout
            ctx.arc(
                squareInsetX + squareSize / 2,
                squareInsetY + squareSize / 2,
                squareSize / 2,
                0,
                Math.PI * 2,
            );
            ctx.closePath();
            const luma = lerp(0, 255, this.uploading.value);
            const alpha = lerp(0.5, 1, this.uploading.value);
            ctx.fillStyle = `rgba(${luma}, ${luma}, ${luma}, ${alpha})`;
            ctx.fill();

            if (this.uploading.value < 1) {
                ctx.beginPath();
                ctx.moveTo(squareInsetX, squareInsetY);
                ctx.lineTo(squareInsetX, squareInsetY + squareSize);
                ctx.lineTo(squareInsetX + squareSize, squareInsetY + squareSize);
                ctx.lineTo(squareInsetX + squareSize, squareInsetY);
                ctx.closePath();

                const gradient = ctx.createRadialGradient(
                    squareInsetX + squareSize / 2,
                    squareInsetY + squareSize / 2,
                    0,
                    squareInsetX + squareSize / 2,
                    squareInsetY + squareSize / 2,
                    Math.hypot(squareSize / 2, squareSize / 2),
                );

                for (let i = 0; i <= 1; i += 1 / 10) {
                    const o = Math.sin(-time + i * 4) ** 2;
                    gradient.addColorStop(i, `rgba(255, 255, 255, ${o / 2})`);
                }

                ctx.strokeStyle = gradient;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(
                    squareInsetX + squareSize / 2,
                    squareInsetY + squareSize / 2,
                    squareSize / 2,
                    0,
                    Math.PI * 2,
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('mouseup', this.onMouseUp);
    }

    upload = () => {
        this.setState({ uploading: true });

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d');
        {
            const squareSize = 512;
            const { imageX, imageY, imageAspect } = this;
            let imageWidth = imageAspect > 1 ? squareSize * imageAspect : squareSize;
            let imageHeight = imageAspect < 1 ? squareSize / imageAspect : squareSize;
            imageWidth *= this.normalizedScale;
            imageHeight *= this.normalizedScale;

            ctx.drawImage(
                this.image,
                squareSize / 2 - imageWidth / 2 + imageX * squareSize,
                squareSize / 2 - imageHeight / 2 + imageY * squareSize,
                imageWidth,
                imageHeight,
            );
        }
        canvas.toBlob(blob => {
            // TODO: make this a task view instead of creating the task here
            this.context.createTask('codeholders/setProfilePicture', {
                id: this.props.id,
            }, {
                blob,
            }).runOnceAndDrop().then(this.props.onSuccess).catch(err => {
                console.error('failed to upload pp', err); // eslint-disable-line no-console
            }).then(() => this.setState({ uploading: false }));
        }, 'image/png');
    };

    static contextType = coreContext;

    render () {
        return (
            <div class="file-crop-editor">
                <canvas
                    class="file-crop-canvas"
                    ref={this.initCanvas}
                    onMouseDown={this.onMouseDown}
                    onTouchStart={this.onTouchStart}
                    onTouchMove={this.onTouchMove}
                    onTouchEnd={this.onTouchEnd} />
                {!this.state.uploading && (
                    <Slider
                        class="file-crop-slider"
                        min={1}
                        max={this.maxScale}
                        value={this.normalizedScale}
                        transfer={[this.logScaleTransfer, this.logScaleTransferInv]}
                        onChange={value => {
                            this.scaleTo(value);
                            this.needsDisplay = true;
                            this.forceUpdate();
                        }} />
                )}
                {!this.state.uploading && (
                    <div class="accept-reject-region">
                        <Button onClick={this.props.onCancel}>
                            {locale.profilePicture.cancel}
                        </Button>
                        <Button onClick={this.upload}>
                            {locale.profilePicture.set}
                        </Button>
                    </div>
                )}
                {this.state.uploading && (
                    <CircularProgress class="progress-indicator" indeterminate />
                )}
            </div>
        );
    }
}
