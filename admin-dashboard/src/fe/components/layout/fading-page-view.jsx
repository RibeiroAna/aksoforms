import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { globalAnimator, Spring } from 'yamdl';

/**
 * Container for multiple pages. Fades between pages.
 *
 * # Props
 * - selected: index into children
 * - children: array of vnodes
 * - onPageChange: callback for when the animation finishes
 */
export default class FadingPageView extends PureComponent {
    actualSelected = this.props.selected;
    opacity = new Spring(1, 0.2);

    constructor (props) {
        super(props);
        this.opacity.value = this.opacity.target = 1;
    }

    update (dt) {
        if (this.props.selected !== this.actualSelected) {
            this.opacity.target = 0;

            if (this.opacity.value < 0.01) {
                this.actualSelected = this.props.selected;
            }
        } else {
            this.opacity.target = 1;
        }
        this.opacity.update(dt);
        this.forceUpdate();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.selected !== this.props.selected) {
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render ({ children }) {
        return (
            <div class="fading-page-view" style={{ opacity: this.opacity.value }}>
                {children[this.actualSelected]}
            </div>
        );
    }
}
