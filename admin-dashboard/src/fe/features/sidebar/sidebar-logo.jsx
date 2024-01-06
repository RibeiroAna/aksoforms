import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import Logo from '../../components/logo';
import { routerContext } from '../../router';

/**
 * # Props
 * - onClick
 */
export default class SidebarLogo extends PureComponent {
    static contextType = routerContext;

    onClick = e => {
        if (this.props.onClick) this.props.onClick(e);
        this.logo.bounce(100);
        this.logo.spin();
    };

    onFocus = () => this.logo.focus();
    onBlur = () => this.logo.blur();

    render () {
        return (
            <button
                class="sidebar-logo"
                onClick={this.onClick}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                ref={node => this.node = node}>
                <Logo ref={view => this.logo = view} />
                <img
                    class="logo-label"
                    src="/assets/logo-label.svg"
                    draggable="false"
                    aria-label="AKSO"
                    alt="AKSO" />
            </button>
        );
    }
}
