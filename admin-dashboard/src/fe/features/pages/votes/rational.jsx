import { h, Component } from 'preact';
import './rational.less';

function gcd (a, b) {
    if (b === 0) return a;
    return gcd(b, a % b);
}
function reduceFrac ([n, d]) {
    if (!Number.isFinite(n) || !Number.isFinite(d)) return [0, 1];
    const sign = Math.sign(n) * Math.sign(d);
    n = Math.abs(n);
    d = Math.abs(d);

    const q = gcd(n, d);
    if (q > 1) {
        return reduceFrac([sign * n / q, d / q]);
    }
    return [n, d];
}

/**
 * Renders a rational number: either a tuple (numerator, denominator) or a float.
 *
 * # Props
 * - value: number value
 * - onChange: onChange handler
 * - editing: if true, will be editable
 */
export default class Rational extends Component {
    #numInputRef;
    #denInputRef;

    render ({ value, onChange, editing }) {
        const isFractional = Array.isArray(value);

        const switchButton = (
            <button
                class={'rational-type-switch' + (isFractional ? ' is-fraction' : '')}
                onClick={() => {
                    if (isFractional) {
                        onChange(value[0] / value[1]);
                    } else {
                        let numerator = value;
                        let denominator = 1;
                        while (Number.isFinite(numerator) && numerator % 1 !== 0) {
                            numerator *= 10;
                            denominator *= 10;
                        }
                        onChange(reduceFrac([numerator, denominator]));
                    }
                }}>
                <span class="rts-icon-container">
                    <span class="rts-dot1" />
                    <span class="rts-dot2" />
                    <span class="rts-line1" />
                    <span class="rts-line2" />
                </span>
            </button>
        );

        let contents;
        if (isFractional && editing) {
            contents = (
                <span class="rational-frac">
                    <span class="rf-numerator">
                        <input
                            type="number"
                            class="rf-field"
                            value={value[0]}
                            onKeyDown={e => {
                                if (e.key === '/') {
                                    e.preventDefault();
                                    this.#denInputRef.focus();
                                    onChange([value[0], '']);
                                }
                            }}
                            onChange={e => onChange([e.target.value, value[1]])} />
                    </span>
                    <span class="rf-divider">
                        {switchButton}
                    </span>
                    <span class="rf-denominator">
                        <input
                            ref={view => this.#denInputRef = view}
                            type="number"
                            class="rf-field"
                            value={value[1]}
                            onChange={e => onChange([value[0], e.target.value])} />
                    </span>
                </span>
            );
        } else if (isFractional) {
            contents = (
                <span class="rational-frac">
                    <span class="rf-numerator">
                        {value[0]}
                    </span>
                    <span class="rf-divider" />
                    <span class="rf-denominator">
                        {value[1]}
                    </span>
                </span>
            );
        } else if (editing) {
            contents = (
                <span class="rational-frac is-float">
                    <span class="rf-numerator">
                        <input
                            type="number"
                            step="0.00000000001"
                            class="rf-field"
                            value={value}
                            onChange={e => onChange(e.target.value)} />
                    </span>
                    <span class="rf-divider">
                        {switchButton}
                    </span>
                </span>
            );
        } else {
            contents = value;
        }

        return (
            <span class="rational-number">
                {contents}
            </span>
        );
    }
}
