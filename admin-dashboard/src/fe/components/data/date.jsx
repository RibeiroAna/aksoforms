import { h } from 'preact';
import { Fragment, createPortal, PureComponent } from 'preact/compat';
import moment from 'moment';
import { globalAnimator, TextField, DatePicker, RootContext } from 'yamdl';
import { data as locale } from '../../locale';
import './style.less';

/** Renders a formatted date (not editable). Use prop `value`. */
function DateFormatter ({ value }) {
    return value ? moment(value).format('D[-a de] MMMM Y') : '';
}

const MIN_DATE = new Date(1900, 0, 1);
// TODO CHANGE THIS ONCE MYSQL ALLOWS DATES PAST 2038
const MAX_DATE = new Date(2147482647 * 1000);

const APPROX_DATE_EDITOR_HEIGHT = 300; // for deciding whether to show above or below

function stringifyDate (date) {
    if (date && Number.isNaN(new Date(date).getSeconds())) return '';
    return date ? moment(date).format('D[-a de] MMMM Y') : '';
}

const parsePreprocessors = [
    input => input.replace(/^la/i, ''),
    input => input.trim(),
    input => input.replace(/\s+/g, ' '),
    input => input.replace(/\//g, ' '),
];
const parseFormatsToTry = [
    undefined,
    'D[-a de] MMMM YYYY',
    'D[-a de] MMM YYYY',
    'D[-a de] M YYYY',
    'D[-a] MMMM YYYY',
    'D[-a] MMM YYYY',
    'D[-a] M YYYY',
    'D[.]MMMM[.]YYYY',
    'D[.]MMM[.]YYYY',
    'D[.]M[.]YYYY',
    'D MMMM YYYY',
    'D MMM YYYY',
    'D M YYYY',
    'D[-a de] MMMM',
    'D[-a de] MMM',
    'D[-a de] M',
    'D[-a] MMMM',
    'D[-a] MMM',
    'D[-a] M',
    'D[.]MMMM',
    'D[.]MMM',
    'D[.]M',
    'D MMMM',
    'D MMM',
    'D M',
];

function tryParseDate (input) {
    if (!input) return null;
    for (const prep of parsePreprocessors) {
        input = prep(input);
    }
    for (const f of parseFormatsToTry) {
        const m = moment.utc(input, f, true);
        if (m.isValid()) return m.toDate();
    }
    return undefined;
}

/** Edits a date. Value must be formatted as YYYY-MM-DD. */
class DateEditor extends PureComponent {
    static contextType = RootContext;

    state = {
        // popout screen pos
        popoutX: 0,
        popoutY: 0,
        anchorBottom: false,
        // true if input is focused
        focused: false,
        // if true, the pointer interacted with the popout and the popout should remain open
        pointerInteracted: false,
        // input string that might be invalid
        inputText: null,
    };

    textField = null;

    #onFocus = (e) => {
        if (this.props.onFocus) this.props.onFocus(e);
        if (e.defaultPrevented) return;
        this.setState({ focused: true });
        globalAnimator.register(this);
    };
    #onBlur = (e) => {
        if (e && this.props.onBlur) this.props.onBlur(e);
        if (e?.defaultPrevented) return;
        this.setState({
            focused: false,
            inputText: stringifyDate(this.props.value),
        });
        globalAnimator.deregister(this);
    };

    bindDate (date) {
        if (!date) return date;
        if (this.props.min) {
            date = date < this.props.min ? this.props.min : date;
        }
        if (this.props.max) {
            date = date > this.props.max ? this.props.max : date;
        }
        return date;
    }

    onInputTextChange = value => {
        this.setState({ inputText: value });
        const date = this.bindDate(tryParseDate(value));

        if (date !== undefined) {
            this.ignoreNextTextUpdate = true; // stop parsed date from overwriting user text
            this.props.onChange(date ? moment(date).format('YYYY-MM-DD') : date);
        }
    };

    getDateValue () {
        const { value } = this.props;
        return value ? moment.utc(value, 'YYYY-MM-DD').toDate() : null;
    }

    update () {
        if (this.textField && this.textField.node) {
            const rect = this.textField.node.getBoundingClientRect();
            let { left, top, bottom } = rect;
            let windowHeight = window.innerHeight;

            if (window.visualViewport) {
                left += window.visualViewport.offsetLeft;
                top += window.visualViewport.offsetTop;
                bottom += window.visualViewport.offsetTop;
                windowHeight = window.visualViewport.height;
            }

            if (left !== this.state.popoutX) this.setState({ popoutX: left });

            const anchorBottom = windowHeight - bottom < APPROX_DATE_EDITOR_HEIGHT;
            const popoutY = anchorBottom ? top : bottom;

            if (popoutY !== this.state.popoutY) this.setState({ popoutY });
            if (anchorBottom !== this.state.anchorBottom) this.setState({ anchorBottom });
        }
    }

    componentDidMount () {
        this.setState({ inputText: stringifyDate(this.getDateValue()) });
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value && (!this.state.focused || !prevProps.value)) {
            if (this.ignoreNextTextUpdate) {
                this.ignoreNextTextUpdate = false;
            } else {
                this.setState({ inputText: stringifyDate(this.getDateValue()) });
            }
        }
        if (this.props.disabled && this.state.focused) {
            this.setState({ focused: false });
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render ({ onChange, disabled, min, max, ...props }, {
        popoutX,
        popoutY,
        anchorBottom,
        focused,
        pointerInteracted,
        inputText,
    }) {
        const dateValue = this.getDateValue();

        const fakeUTCValue = dateValue
            ? new Date(dateValue.getTime() + dateValue.getTimezoneOffset() * 60000)
            : null;

        const today = new Date();
        const fakeUTCToday = new Date(today.getTime() + today.getTimezoneOffset() * 60000);

        let popout;
        if (focused || pointerInteracted) {
            popout = createPortal(
                <div
                    class="data-date-picker-portal"
                    style={{
                        transform: anchorBottom
                            ? `translateY(-100%) translate(${popoutX}px, ${popoutY}px)`
                            : `translate(${popoutX}px, ${popoutY}px)`,
                    }}
                    onPointerDown={() => this.setState({ pointerInteracted: true })}>
                    {pointerInteracted ? (
                        <div
                            onClick={() => {
                                this.setState({ pointerInteracted: false });
                                this.textField?.blur();
                                this.#onBlur();
                            }}
                            class="data-date-picker-pointer-backdrop" />
                    ) : null}
                    <DatePicker
                        months={locale.months}
                        weekdays={locale.weekdays}
                        weekStart={locale.weekStart}
                        min={min || MIN_DATE}
                        max={max || MAX_DATE}
                        today={fakeUTCToday}
                        value={fakeUTCValue}
                        useMaxHeight={anchorBottom}
                        onChange={date => {
                            const newDate = this.bindDate(new Date(date.getTime() - date.getTimezoneOffset() * 60000));
                            onChange(moment(newDate).format('YYYY-MM-DD'));
                            this.setState({ inputText: stringifyDate(newDate) });
                        }} />
                </div>,
                this.context || document.body,
            );
        }

        props.class = 'data date-editor ' + (props.class || '');

        return (
            <Fragment>
                <TextField
                    {...props}
                    ref={view => this.textField = view}
                    disabled={disabled}
                    onFocus={this.#onFocus}
                    onBlur={this.#onBlur}
                    value={inputText}
                    onChange={this.onInputTextChange} />
                {popout}
            </Fragment>
        );
    }
}

export default {
    renderer: DateFormatter,
    inlineRenderer: DateFormatter,
    editor: DateEditor,
    stringify: stringifyDate,
};

