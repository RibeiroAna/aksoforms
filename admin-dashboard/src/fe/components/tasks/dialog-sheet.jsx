import { h } from 'preact';
import { Dialog, Button, MenuIcon } from 'yamdl';
import './dialog-sheet.less';

const clamp = (x, a, b) => Math.max(a, Math.min(x, b));
const lerp = (a, b, t) => (b - a) * t + a;

// TODO: deduplicate with yamdl
const DEFAULT_FULLSCREEN_WIDTH = 420;

/**
 * A more persistent and less transient dialog.
 *
 * # Props
 * - open/onClose
 * - title
 * - allowBackdropClose - set to true to re-enable this feature
 */
export default class DialogSheet extends Dialog {
    updatePeriod (presence) {
        presence.setPeriod((this.state.fullScreen || this.props.open) ? 0.5 : 0.3);
    }

    updateFullScreen () {
        const fullScreen = typeof this.props.fullScreen === 'function'
            ? this.props.fullScreen(window.innerWidth)
            : ('fullScreen' in this.props)
                ? this.props.fullScreen
                : window.innerWidth <= DEFAULT_FULLSCREEN_WIDTH;
        this.setState({ fullScreen });
    }

    onContainerClick = () => {
        if (this.props.onClose) {
            if (this.props.allowBackdropClose) this.props.onClose();
            else this.onCancel();
        }
    };

    onCancel = () => {
        const button = this.closeButton.button;
        button.classList.add('highlight-focus');
        setTimeout(() => {
            button.classList.remove('highlight-focus');
        }, 500);
    };

    renderStyle (style, presence) {
        if (this.state.fullScreen) {
            style.transform += ` translateY(${lerp(100, 0, presence)}%)`;
            style.opacity *= clamp(lerp(0, 50, presence), 0, 1);
        } else if (this.props.open) {
            if (!this.props.fadeOnly) {
                style.transform += ` translateY(${lerp(window.innerHeight / 2, 0, presence)}px)`;
            }
            style.opacity *= 1 - Math.exp(-8 * presence);
        } else {
            style.opacity *= presence;
        }
    }

    renderAppBarMenu () {
        return this.props.onClose ? (
            <Button
                class="dialog-sheet-close-button"
                ref={node => this.closeButton = node}
                icon
                small
                onClick={this.props.onClose}>
                <MenuIcon type="close" />
            </Button>
        ) : null;
    }
}
