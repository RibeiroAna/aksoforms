import { h } from 'preact';
import { createContext, createPortal, PureComponent } from 'preact/compat';
import { AppBar, Button, MenuIcon, Spring, globalAnimator } from 'yamdl';
import SvgIcon from './svg-icon';
import { data as locale } from '../locale';
import './cm-templating-popup.less';

const createTemplatingContext = () => {
    const onFocus = new Set();
    const onBlur = new Set();
    const emit = (e, arg) => {
        for (const cb of e) {
            try {
                cb(arg);
            } catch (err) {
                console.error(err); // eslint-disable-line no-console
            }
        }
    };
    let currentlyFocused = null;
    return {
        get current () {
            return currentlyFocused;
        },
        onFocus: callback => onFocus.add(callback),
        onBlur: callback => onBlur.add(callback),
        offFocus: callback => onFocus.delete(callback),
        offBlur: callback => onBlur.delete(callback),
        didFocus: (node) => {
            if (currentlyFocused !== node) emit(onBlur, currentlyFocused);
            currentlyFocused = node;
            emit(onFocus, node);
        },
        didBlur: (node) => {
            if (currentlyFocused !== node) return;
            currentlyFocused = null;
            emit(onBlur, node);
        },
    };
};

export const TemplatingContext = createContext(createTemplatingContext());
TemplatingContext.create = createTemplatingContext;

function AddTemplatingIcon (props) {
    return (
        <SvgIcon {...props}>
            <path d="M19 1v4h4v2h-4v4h-2V7h-4V5h4V1h2zM10 12l.94-2.07L13 9l-2.06-.93L10 6l-.92 2.07L7 9l2.08.93zM13 22l1.25-2.75L17 18l-2.75-1.25L13 14l-1.25 2.75L9 18l2.75 1.25zM4.5 16l.5-2 2-.5-2-.5-.5-2-.5 2-2 .5 2 .5z" fillRule="nonzero" fill="currentColor" />
        </SvgIcon>
    );
}

/**
 * Renders a FAB in the bottom right corner that appears if the user has focused a text input that
 * supports templating, and lets them insert templating constructs.
 */
export default class TemplatingPopup extends PureComponent {
    state = {
        visible: false,
        open: false,
    };

    static contextType = TemplatingContext;

    onInputFocus = node => {
        this.setState({ visible: true });
        this.currentInput = node;
    };
    onInputBlur = () => {
        this.setState({ visible: false, open: false });
        this.currentInput = null;
    };

    onInsert = string => {
        this.setState({ open: false });
        setTimeout(() => {
            this.currentInput.insertString(string);
        }, 200);
    };

    componentDidMount () {
        this.context.onFocus(this.onInputFocus);
        this.context.onBlur(this.onInputBlur);
    }
    componentWillUnmount () {
        this.context.offFocus(this.onInputFocus);
        this.context.offBlur(this.onInputBlur);
    }

    onClickFab = (e) => {
        if (!this.state.visible) return;
        e.preventDefault();

        this.setState({ open: true });
    };

    render () {
        const fabVisible = !this.state.open && this.state.visible && this.props.editing;

        const portal = createPortal(
            <ItemsSheet
                item={this.props.item}
                open={this.state.open}
                onClose={() => this.setState({ open: false })}
                onInsert={this.onInsert}
                title={this.props.title}
                varName={this.props.varName}
                knownItems={this.props.knownItems} />,
            document.body,
        );

        return (
            <div class={'cm-templating-popup' + (fabVisible ? '' : ' is-hidden')}>
                <Button
                    class="popup-fab"
                    icon
                    fab
                    onMouseDown={e => e.preventDefault()} // don't steal focus
                    onClick={this.onClickFab}>
                    <AddTemplatingIcon />
                </Button>
                {portal}
            </div>
        );
    }
}

class ItemsSheet extends PureComponent {
    #open = new Spring(1, 0.3);

    update (dt) {
        this.#open.target = this.props.open ? 1 : 0;
        this.#open.update(dt);

        if (!this.#open.wantsUpdate()) globalAnimator.deregister(this);
        this.forceUpdate();
    }

    componentDidMount () {
        globalAnimator.register(this);
    }
    componentDidUpdate (prevProps) {
        if (this.props.open !== prevProps.open) {
            if (this.props.open) this.#open.setDampingRatioAndPeriod(0.8, 0.5);
            else this.#open.setDampingRatioAndPeriod(1, 0.3);
            globalAnimator.register(this);
        }
    }
    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render ({ item, onClose, onInsert, title, varName, knownItems }) {
        if (this.#open.value < 0.01) return null;
        const transform = `translateY(${((1 - this.#open.value) * 100).toFixed(3)}%)`;

        return (
            <div class="cm-templating-popup-portal">
                <div class="items-sheet" style={{ transform }} onMouseDown={e => {
                    e.preventDefault(); // prevent stealing focus
                }}>
                    <AppBar
                        class="items-top-bar"
                        menu={<Button icon small onClick={onClose}>
                            <MenuIcon type="close" />
                        </Button>}
                        title={title} />
                    <Items
                        item={item}
                        onInsert={onInsert}
                        varName={varName}
                        knownItems={knownItems} />
                </div>
            </div>
        );
    }
}

function Items ({ item, onInsert, varName, knownItems }) {
    const items = [];

    items.push(
        <Button class="templating-item" onClick={() => {
            onInsert(`{{#if }} {{#else}} {{/if}}`);
        }}>
            <span class="item-preview is-condition">
                {locale.cmTemplating.condition.if}
                {' '}
                <span class="inner-var">…</span>
                {' '}
                {locale.cmTemplating.condition.then}
            </span>
            {' '}
            <span class="item-preview is-condition">
                {locale.cmTemplating.condition.else}
            </span>
            {' '}
            <span class="item-preview is-condition">
                {locale.cmTemplating.condition.end}
            </span>
        </Button>
    );

    for (const v of knownItems) {
        items.push(
            <Button class="templating-item" onClick={() => {
                onInsert(`{{${v}}}`);
            }}>
                {v.startsWith('@') ? (
                    <span class="item-preview is-form-var">{varName(v.substr(1))}</span>
                ) : (
                    <code class="item-preview is-script-var">{v}</code>
                )}
            </Button>
        );
    }

    return (
        <div class="templating-items">
            {items}
        </div>
    );
}
