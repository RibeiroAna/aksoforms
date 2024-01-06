import { h, Component } from 'preact';
import { useState, useEffect, Fragment, createPortal } from 'preact/compat';
import { Button, globalAnimator, RootContext } from 'yamdl';
import { ValidatedTextField } from '../form';
import fuzzaldrin from 'fuzzaldrin';
import './suggestion-field.less';

/**
 * A text field with suggestions that behaves like a typical browser address bar.
 *
 * # Props
 * - `value`, `onChange`: as expected
 * - `onSelect`: pass to handle/validate suggestions. Should return true if suggestion should be
 *   passed to onChange.
 * - `suggestions`: array of strings or any object with `toString`
 * - `alwaysHighlight`: set to true to always highlight an item
 * - `skipFilter`: to skip fuzzaldrin filtering
 */
export default function SuggestionField ({
    value, onChange, onSelect, suggestions, alwaysHighlight, skipFilter, ...extraProps
}) {
    if (!skipFilter) {
        const filteredSuggestions = fuzzaldrin.filter(
            suggestions.map((item, i) => ({ s: item.toString(), i })),
            value,
            { key: 's' },
        );
        suggestions = filteredSuggestions.map(({ i }) => suggestions[i]);
    } else {
        suggestions = suggestions.slice().sort((a, b) => {
            return fuzzaldrin.score(a.toString(), value) - fuzzaldrin.score(b.toString(), value);
        });
    }

    onSelect = onSelect || (() => true);

    const minHighlight = alwaysHighlight ? 0 : -1;

    const [isFocused, setFocused] = useState(false);
    const [highlight, setHighlight] = useState(minHighlight);

    useEffect(() => {
        if (highlight > suggestions.length - 1) {
            setHighlight(Math.max(minHighlight, suggestions.length - 1));
        }
    });

    const onFocus = (e) => {
        setFocused(true);
        if (extraProps.onFocus) extraProps.onFocus(e);
    };

    const onBlur = (e) => {
        setFocused(false);
        setHighlight(minHighlight);
        if (extraProps.onBlur) extraProps.onBlur(e);
    };

    const onKeyDown = e => {
        switch (e.key) {
        case 'ArrowUp':
            if (highlight > minHighlight) {
                setHighlight(highlight - 1);
                e.preventDefault();
            }
            break;
        case 'ArrowDown':
            if (highlight < suggestions.length - 1) {
                setHighlight(highlight + 1);
                e.preventDefault();
            }
            break;
        case 'Enter':
            if (highlight >= 0) {
                if (onSelect(suggestions[highlight])) {
                    onChange(suggestions[highlight].toString());
                }
                e.preventDefault();
            }
            break;
        }
    };

    const onButtonClick = suggestion => e => {
        e.preventDefault(); // prevent form submit
        if (onSelect(suggestion)) {
            onChange(suggestion.toString());
        }
    };

    return <SuggestionFieldRender textFieldProps={{
        ...extraProps,
        value,
        onChange,
        onFocus,
        onBlur,
        onKeyDown,
    }} showPopout={isFocused} popoutContents={suggestions.map((suggestion, index) => (
        <Button
            class={'suggestion' + (index === highlight ? ' is-highlighted' : '')}
            key={index}
            onClick={onButtonClick(suggestion)}>
            {highlightSuggestion(suggestion.toString(), value)}
        </Button>
    ))} />;
}

class SuggestionFieldRender extends Component {
    static contextType = RootContext;

    state = { x: 0, y: 0, maxHeight: 10000 };

    update () {
        if (!this.textField || !this.textField.node) return;
        const rect = this.textField.node.getBoundingClientRect();
        let x = rect.left;
        let y = rect.bottom;
        if (window.visualViewport) {
            x += window.visualViewport.offsetLeft;
            y += window.visualViewport.offsetTop;
        }
        const maxHeight = window.innerHeight - rect.bottom;
        if (x !== this.state.x || y !== this.state.y || maxHeight !== this.state.maxHeight) {
            this.setState({ x, y, maxHeight });
        }
    }

    componentDidUpdate (prevProps) {
        if (prevProps.showPopout !== this.props.showPopout) {
            // FIXME: kinda hacky
            if (this.props.showPopout) globalAnimator.register(this);
            else globalAnimator.deregister(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render ({ textFieldProps, showPopout, popoutContents }) {
        let popout;
        if (showPopout) {
            popout = createPortal(
                <div
                    class="suggestion-field-suggestions"
                    style={{
                        transform: `translate(${this.state.x}px, ${this.state.y}px)`,
                        maxHeight: this.state.maxHeight,
                    }}
                    onMouseDown={e => e.preventDefault()}>
                    {popoutContents}
                </div>,
                this.context || document.body,
            );
        }

        return (
            <Fragment>
                <ValidatedTextField {...textFieldProps} ref={view => {
                    this.textField = view;
                    if (textFieldProps.ref) textFieldProps.ref(view);
                }} />
                {popout}
            </Fragment>
        );
    }
}

function highlightSuggestion (suggestion, value) {
    value = value ? [...value] : [];
    let bold = false;
    const result = [];
    for (const c of suggestion) {
        const newBold = (value[0] || '').toLowerCase() === c.toLowerCase();
        if (newBold !== bold || !result.length) {
            result.push({ content: '', bold: newBold });
        }
        bold = newBold;
        if (bold) value.shift();
        result[result.length - 1].content += c;
    }
    return result.map(({ content, bold }) => bold ? <b>{content}</b> : content);
}
