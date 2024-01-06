import { createRef, h } from 'preact';
import { PureComponent, useEffect, useRef, useState } from 'preact/compat';
import { stdlib, currencies } from '@tejo/akso-script';
import { ModalPortal, TextField } from 'yamdl';
import Select from '../controls/select';
import { data as locale } from '../../locale';
import './currency-amount.less';
import { useDataView } from '../../core';

function stringify (value, currency) {
    return stdlib.currency_fmt.apply(null, [currency || '?', value | 0]);
}

/**
 * Displays a currency amount.
 *
 * - value: amount in smallest currency unit
 * - currency: currency id
 */
function CurrencyAmount ({ value, currency }) {
    return stringify(value, currency);
}

/**
 * Edits a currency value.
 *
 * # Props
 * - value/onChange: currency value
 * - min/max/step
 * - currency: currency id
 */
class CurrencyEditor extends PureComponent {
    state = {
        // is the editor focused?
        editing: false,
        // current input string being edited (may not be a valid number). Exists only while editing
        editingValue: null,
        error: false,
        // is the conversion popover open?
        conversionPopover: false,
    };

    onFocus = () => this.setState({ editing: true, editingValue: this.format(this.props.value) });
    onBlur = () => this.setState({ editing: false, error: false });

    onInputChange = (value) => {
        this.setState({ editingValue: value });

        const v = parseFloat(value.replace(/\s/g, '').replace(/,/g, '.'));
        if (Number.isNaN(v) || !this.props.currency) {
            this.setState({ error: true });
        } else {
            this.setState({ error: false });
            const value = v * currencies[this.props.currency];
            this.props.onChange(this.clamp(value));
        }
    };

    getStep () {
        if (Number.isFinite(this.props.step)) return this.props.step;
        return 1;
    }

    onKeyDown = e => {
        if (e.ctrlKey || e.metaKey) return;
        if (e.key === 'ArrowUp') {
            // step up
            e.preventDefault();
            const value = this.props.value + this.getStep();
            this.setState({ editingValue: this.format(this.clamp(value)), error: false });
            this.props.onChange(value);
        } else if (e.key === 'ArrowDown') {
            // step down
            e.preventDefault();
            const value = this.props.value - this.getStep();
            this.setState({ editingValue: this.format(this.clamp(value)), error: false });
            this.props.onChange(value);
        } else if (e.key.length === 1 && !e.key.match(/[-\d,.]/)) {
            // not a valid character; don't do anything
            e.preventDefault();
        }
    };

    /** Restricts the given value according to min, max, and step. */
    clamp (value) {
        if (Number.isFinite(this.props.min)) {
            value = Math.max(value, this.props.min);
        }
        if (Number.isFinite(this.props.max)) {
            value = Math.min(value, this.props.max);
        }
        if (Number.isFinite(this.props.step)) {
            value = Math.round(value / this.props.step) * this.props.step;
        }
        return value;
    }

    /** Formats the given value for the user according to the current currency (e.g. 102 -> "1,02") */
    format (value) {
        const { currency } = this.props;
        const fractValue = currency ? (value | 0) / currencies[currency] : (value | 0);
        const minimumFractionDigits = Math.log10(currencies[currency]) | 0;
        return fractValue.toLocaleString('fr-FR', {
            minimumFractionDigits,
        });
    }

    popoverAnchor = createRef();

    render ({ value, currency, ...extra }, { editing }) {
        const conversionPopover = (
            <ModalPortal
                mounted={this.state.conversionPopover}
                onCancel={() => this.setState({ conversionPopover: false })}>
                <CurrencyConversionPopover
                    anchor={this.popoverAnchor}
                    targetCurrency={currency}
                    value={value}
                    onChange={value => {
                        this.setState({ error: value === null });
                        if (value !== null) this.props.onChange(this.clamp(value));
                    }}
                    onClose={() => this.setState({ conversionPopover: false })} />
            </ModalPortal>
        );

        return (
            <TextField
                {...extra}
                error={this.state.error ? locale.invalidCurrencyAmount : null}
                value={editing ? this.state.editingValue : this.format(value)}
                onChange={this.onInputChange}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                onKeyDown={this.onKeyDown}
                inputMode="numeric"
                style={{ textAlign: 'right' }}
                trailing={(
                    <button
                        ref={this.popoverAnchor}
                        type="button"
                        class="data-currency-amount-editor-trailing"
                        data-editing={this.state.editing.toString()}
                        onClick={() => this.setState({ conversionPopover: true })}>
                        {currency}
                        <span class="inner-arrow p-above" />
                        <span class="inner-arrow p-below" />
                        {conversionPopover}
                    </button>
                )} />
        );
    }
}

class CurrencyConversionPopover extends PureComponent {
    componentDidMount () {
        this.updatePosition();
    }

    anchor = createRef();

    updatePosition () {
        const anchor = this.props.anchor.current;
        const innerAnchor = this.anchor.current;
        if (!anchor || !innerAnchor) return;

        const anchorRect = anchor.getBoundingClientRect();
        let x = anchorRect.left + anchorRect.width / 2;
        const padding = 120;
        x = Math.max(padding, Math.min(x, window.innerWidth - padding));

        const anchorAbove = anchorRect.top + anchorRect.height / 2 > window.innerHeight / 2;
        const y = anchorAbove ? anchorRect.top : anchorRect.bottom;

        innerAnchor.style.left = `${x}px`;
        innerAnchor.style.top = `${y}px`;
        innerAnchor.dataset.anchor = anchorAbove ? 'above' : 'below';
    }

    render ({ anchor, value, onChange, onClose, targetCurrency }) {
        return (
            <div class="data-currency-amount-editor-conversion-popover">
                <div class="inner-backdrop" onClick={onClose} />
                <div class="inner-anchor" ref={this.anchor}>
                    <div class="inner-popover">
                        <CurrencyConversion
                            value={value}
                            onChange={onChange}
                            targetCurrency={targetCurrency}
                            onClose={onClose} />
                    </div>
                </div>
            </div>
        );
    }
}

function pickInitialSourceCurrency (targetCurrency) {
    if (targetCurrency === 'EUR') return 'USD';
    return 'EUR';
}

function CurrencyConversion ({ value, onChange, targetCurrency, onClose }) {
    const [sourceCurrency, setSourceCurrency] = useState(pickInitialSourceCurrency(targetCurrency));
    const [innerValue, setInnerValue] = useState('');
    const [isValueInvalid, setValueInvalid] = useState(false);

    const [loadingRates, ratesError, ratesSource] = useDataView('payments/exchangeRates', { base: sourceCurrency });
    const [loadingRates2, ratesError2, ratesTarget] = useDataView('payments/exchangeRates', { base: targetCurrency });

    const isReady = !loadingRates && !loadingRates2 && !ratesError && !ratesError2 && ratesSource && ratesTarget;

    const updateFromTarget = () => {
        const fractValue = Math.round(
            ratesTarget[sourceCurrency] * value / currencies[targetCurrency] * currencies[sourceCurrency]
        ) / currencies[sourceCurrency];
        const minimumFractionDigits = Math.log10(currencies[sourceCurrency]) | 0;
        setInnerValue(fractValue.toLocaleString('fr-FR', {
            minimumFractionDigits,
        }));
    };

    const updateToTarget = () => {
        const value = innerValue.replace(/\s/g, '').replace(/,/g, '.');
        if (Number.isNaN(value)) {
            setValueInvalid(true);
        } else {
            setValueInvalid(false);
            onChange(Math.round(ratesSource[targetCurrency] * currencies[targetCurrency] * value));
        }
    };

    const currentSourceCurrency = useRef(null);
    const textField = useRef(null);
    useEffect(() => {
        if (!isReady) return;
        if (currentSourceCurrency.current !== sourceCurrency) {
            currentSourceCurrency.current = sourceCurrency;
            updateFromTarget();
            textField.current?.focus();
        } else {
            updateToTarget();
        }
    }, [sourceCurrency, innerValue, isReady]);

    const onKeyDown = e => {
        if (e.ctrlKey || e.metaKey) return;
        if (e.key === 'Enter') {
            onClose();
        }
        if (e.key.length === 1 && !e.key.match(/[-\d,.]/)) {
            // not a valid character; don't do anything
            e.preventDefault();
        }
    };

    return (
        <div>
            <h4 class="inner-title">
                {locale.currencyConversionPopover.title}
            </h4>
            <TextField
                class="inner-input"
                ref={textField}
                value={innerValue}
                disabled={!isReady}
                helperLabel={(loadingRates || loadingRates2)
                    ? locale.currencyConversionPopover.loadingRates
                    : null}
                error={(ratesError || ratesError2)
                    ? locale.currencyConversionPopover.loadingRatesError
                    : isValueInvalid ? locale.invalidCurrencyAmount : null}
                onChange={setInnerValue}
                onKeyDown={onKeyDown}
                trailing={(
                    <Select
                        class="inner-currency-selector"
                        value={sourceCurrency}
                        onChange={setSourceCurrency}
                        items={Object.keys(currencies).map(currency => ({
                            value: currency,
                            label: currency,
                        }))} />
                )} />
        </div>
    );
}

export default {
    renderer: CurrencyAmount,
    inlineRenderer: CurrencyAmount,
    editor: CurrencyEditor,
    stringify,
};
