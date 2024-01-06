import { h, Component } from 'preact';
import CheckIcon from '@material-ui/icons/Check';
import { Menu, globalAnimator } from 'yamdl';
import './select.less';

/**
 * A <select>.
 *
 * # Props
 * - `value`: currently selected value
 * - `onChange`: (value) => void
 * - `items`: select items { value, label, shortLabel?, disabled? }
 * - `outline`: pass true for outline style
 * - `multi`: pass true for multi-select. Value must be an array
 * - `rendered`: pass true for rendered select (i.e. not the native element)
 * - `emptyLabel`: label to use in multi-select mode when empty
 */
export default class Select extends Component {
    state = {
        focused: false,
    };

    onFocus = () => {
        this.setState({ focused: true });
    };
    onBlur = () => {
        this.setState({ focused: false });
    };

    render ({ value, outline, multi, rendered, onChange, emptyLabel, items, disabled, ...extra }, { focused }) {
        const props = extra;
        props.class = (props.class || '') + ' paper-select';
        if (focused) props.class += ' is-focused';
        if (outline) props.class += ' p-outline';
        if (disabled) props.class += ' is-disabled';
        if (multi || rendered) props.class += ' is-multi';

        const selectIcon = (
            <svg class="p-select-icon" width="24" height="24">
                <path d="M7 10h10l-5 5z" />
            </svg>
        );

        if (multi || rendered) {
            return (
                <span {...props}>
                    <MultiSelect
                        disabled={disabled}
                        multi={multi}
                        value={multi ? value : (value ? [value] : [])}
                        items={items}
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        onChange={multi ? onChange : (v => onChange(v[0] || null))}
                        emptyLabel={emptyLabel} />
                    {selectIcon}
                </span>
            );
        } else {
            return (
                <span {...props}>
                    <select
                        disabled={disabled}
                        value={value}
                        onFocus={this.onFocus}
                        onBlur={this.onBlur}
                        onChange={e => {
                            onChange(e.target.value);
                        }}>
                        {(items || []).map((item, i) => (
                            <option
                                key={i}
                                value={item.value}
                                disabled={item.disabled}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                    {selectIcon}
                </span>
            );
        }
    }
}

class MultiSelect extends Component {
    state = {
        open: false,
        clientX: 0,
        clientY: 0,
    };

    #open = () => {
        if (this.props.disabled) return;
        this.setState({ open: true });
        this.update(0);
        globalAnimator.register(this);
    };
    #close = () => {
        this.setState({ open: false });
        globalAnimator.deregister(this);
    };

    componentDidUpdate () {
        if (this.state.open && this.props.disabled) {
            this.#close();
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    update () {
        if (!this.node) return;
        const nodeRect = this.node.getBoundingClientRect();
        this.setState({
            clientX: nodeRect.left,
            clientY: nodeRect.top,
        });
    }

    render ({ multi, value, onChange, items, emptyLabel, disabled }, { open, clientX, clientY }) {
        const keyedItems = {};
        for (const item of items) {
            keyedItems[item.value] = item;
        }

        let label;
        if (multi) {
            label = value.length
                ? value.map(v => keyedItems[v]?.shortLabel || keyedItems[v]?.label).join(', ')
                : emptyLabel || '';
        } else {
            const v = value[0];
            label = value.length ? keyedItems[v]?.shortLabel || keyedItems[v]?.label : emptyLabel;
        }

        return (
            <span
                class="multi-select"
                tabIndex={disabled ? -1 : 0}
                onClick={this.#open}
                ref={node => this.node = node}>
                <span class="inner-select-label">
                    {label}
                </span>

                <Menu
                    open={open}
                    persistent={multi}
                    onClose={this.#close}
                    selectionIcon={<CheckIcon style={{ verticalAlign: 'middle' }} />}
                    position={[clientX, clientY]}
                    items={items.map(item => ({
                        ...item,
                        selected: value.includes(item.value),
                        action: () => {
                            if (multi) {
                                const v = new Set(value);
                                if (v.has(item.value)) v.delete(item.value);
                                else v.add(item.value);
                                onChange([...v]);
                            } else {
                                onChange([item.value]);
                            }
                        },
                    }))} />
            </span>
        );
    }
}
