import { h } from 'preact';
import { useState, useRef } from 'preact/compat';
import { TextField, Slider } from 'yamdl';
import './range-editor.less';

/**
 * A text editor optimized for editing integer range bounds.
 *
 * # Props
 * - `min`: the minimum value
 * - `max`: the maximum value
 * - `value`/`onChange`: the range bound value/change callback
 * - `minSoftBound`: the minimum value at which changes will be committed while typing a number.
 *   Since numbers are typed digit-by-digit, their magnitude will usually increase from a very
 *   small value. However, if the user is editing the upper bound with a lower bound set to K,
 *   having the input *always* commit the values would be detrimental when the user starts typing
 *   and the value is momentarily less than K, thus clamping the lower bound. Hence, minSoftBound
 *   should be used on upper bounds to restrict the area in which they will live-update and thus
 *   prevent modifying the lower bound unnecessarily.
 */
export function BoundEditor ({ min, max, minSoftBound, value, onChange, innerRef, disabled }) {
    const [isFocused, setFocused] = useState(false);
    const [tmpValue, setTmpValue] = useState(value);
    const [didChange, setDidChange] = useState(false);

    const bindValue = v => Math.max(min, Math.min(v | 0, max));
    const softBindValue = v => {
        if (!v) return v;
        v = parseInt('' + v) | 0;
        if (min >= 0 && v < 0) v = -v;
        if (v > max) v = max;
        return v;
    };

    const commit = () => {
        onChange(bindValue(tmpValue));
    };

    const onFocus = () => {
        setTmpValue(value);
        setDidChange(false);
        setFocused(true);
    };
    const onBlur = () => {
        setFocused(false);
        if (didChange) commit();
    };
    const onInputChange = (v, e) => {
        if (isFocused) {
            setDidChange(true);
            const softBound = softBindValue(v);
            setTmpValue(softBound);
            const bound = bindValue(softBound);
            if (softBound === bound && bound > minSoftBound) onChange(bound);
        } else {
            // probably clicked the up/down arrows
            e.target.focus();
            setTmpValue(softBindValue(v));
            onChange(bindValue(softBindValue(v)));
        }
    };
    const onKeyDown = e => {
        if (e.key === 'Enter') e.target.blur();
    };

    return (
        <TextField
            type="number"
            class="bound-editor"
            center
            outline
            disabled={disabled}
            ref={innerRef}
            min={min}
            max={max}
            onFocus={onFocus}
            onBlur={onBlur}
            value={isFocused ? tmpValue : value}
            onKeyDown={onKeyDown}
            onChange={onInputChange} />
    );
}

/** Renders a range editor with inputs on either side. */
export default function RangeEditor ({ min, max, value, onChange, tickDistance, faded, disabled, transfer }) {
    const leftBound = useRef(null);
    const rightBound = useRef(null);

    return (
        <div class={'range-editor' + (faded ? ' faded' : '')}>
            <BoundEditor
                innerRef={leftBound}
                min={min}
                max={max}
                disabled={disabled}
                minSoftBound={min}
                value={value[0]}
                onChange={val => onChange([val, Math.max(val, value[1])])}/>
            <Slider
                min={min}
                max={max}
                value={value}
                disabled={disabled}
                popout
                discrete
                transfer={transfer}
                tickDistance={tickDistance}
                class="editor-inner"
                onChange={value => {
                    // bound editors aren’t unfocused automatically
                    leftBound.current.inputNode.blur();
                    rightBound.current.inputNode.blur();
                    onChange(value);
                }} />
            <BoundEditor
                innerRef={rightBound}
                min={min}
                max={max}
                disabled={disabled}
                minSoftBound={value[0]}
                value={value[1]}
                onChange={val => onChange([Math.min(val, value[0]), val])}/>
        </div>
    );
}
