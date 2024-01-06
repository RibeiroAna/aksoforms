import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { globalAnimator, Spring, ModalPortal } from 'yamdl';
import './lightbox.less';

/**
 * An image lightbox.
 *
 * # Props
 * - open/onClose: bool
 * - src: image source
 */
export default class Lightbox extends PureComponent {
    #openFromImage = null;

    /**
     * If this is set before open is set to true, then the given image element will be used to
     * animate the lightbox into view.
     *
     * - img: DOM Node
     */
    setOpenFromImage (img) {
        this.#openFromImage = img;
    }

    // 0 for closed, 1 for open
    #open = new Spring(1, 0.9);
    // x/y position of the image from the top left corner
    #x = new Spring(1, 0.6);
    #y = new Spring(1, 0.6);
    // width and height of the image
    #w = new Spring(1, 0.6);
    #h = new Spring(1, 0.6);
    #imageSize = [0, 0];
    #closeTarget = null;

    #didOpen = () => {
        if (this.#openFromImage) {
            const rect = this.#openFromImage.getBoundingClientRect();

            this.#x.value = rect.left;
            this.#y.value = rect.top;
            this.#w.value = rect.width;
            this.#h.value = rect.height;
        }
    };

    #didClose = () => {
        this.#closeTarget = null;
        if (this.#openFromImage) {
            const rect = this.#openFromImage.getBoundingClientRect();
            this.#closeTarget = [rect.left, rect.top, rect.width, rect.height];
        }
    };

    #loadImage = () => {
        const img = new Image();
        img.src = this.props.src;
        img.onload = () => {
            if (img.src !== this.props.src) return;
            this.#imageSize = [img.width, img.height];
            globalAnimator.register(this);
        };
    };

    #onResize = () => globalAnimator.register(this);

    update (dt) {
        this.#open.target = this.props.open ? 1 : 0;

        const { innerWidth, innerHeight } = window;
        const [width, height] = this.#imageSize;

        if (width === 0 || height === 0) {
            this.#w.target = this.#h.target = 0;
        } else if (width / height > innerWidth / innerHeight) {
            // fit horizontally
            this.#w.target = innerWidth;
            this.#h.target = innerWidth * (height / width);
        } else {
            // fit vertically
            this.#w.target = innerHeight * (width / height);
            this.#h.target = innerHeight;
        }
        this.#x.target = (innerWidth - this.#w.target) / 2;

        if (this.props.open) {
            this.#y.target = (innerHeight - this.#h.target) / 2;
        } else {
            this.#y.target = innerHeight;
        }

        if (!this.props.open && this.#closeTarget) {
            const [xt, yt, wt, ht] = this.#closeTarget;
            this.#x.target = xt;
            this.#y.target = yt;
            this.#w.target = wt;
            this.#h.target = ht;
        }

        this.#open.update(dt);
        this.#x.update(dt);
        this.#y.update(dt);
        this.#w.update(dt);
        this.#h.update(dt);

        const wantsUpdate = this.#open.wantsUpdate()
            || this.#x.wantsUpdate()
            || this.#y.wantsUpdate()
            || this.#w.wantsUpdate()
            || this.#h.wantsUpdate();

        if (!wantsUpdate) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    componentDidMount () {
        globalAnimator.register(this);
        if (this.props.open) this.#didOpen();
        this.#loadImage();
        window.addEventListener('resize', this.#onResize);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.open !== this.props.open) {
            globalAnimator.register(this);
            if (this.props.open) this.#didOpen();
            else this.#didClose();
        }
        if (prevProps.src !== this.props.src) this.#loadImage();
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
        window.removeEventListener('resize', this.#onResize);
    }

    render ({ src, open, onClose }) {
        const x = this.#x.value;
        const y = this.#y.value;
        const imageOpacity = Math.max(0, Math.min(this.#open.value * 30, 1));

        return (
            <ModalPortal mounted={this.#open.value > 0.01} onCancel={onClose}>
                <div class={'lightbox-portal' + (open ? ' is-open' : '')} onClick={onClose}>
                    <div
                        class="lightbox-backdrop"
                        style={{ opacity: Math.max(0, Math.min(this.#open.value, 1)) }} />
                    <div class="lightbox-image-container" style={{
                        transform: `translate(${x}px, ${y}px)`,
                        width: this.#w.value,
                        height: this.#h.value,
                        opacity: imageOpacity,
                    }}>
                        <img src={src} />
                    </div>
                </div>
            </ModalPortal>
        );
    }
}
