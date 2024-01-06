import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { TextField } from 'yamdl';
import './limited-text-field.less';

/**
 * Renders a text field with a counter for the max length.
 *
 * # Props
 * - maxLength: max content length (using Javascript string length, i.e. UTF-16 code points)
 * - other props will be forwarded to TextField
 */
export default class LimitedTextField extends PureComponent {
    render ({ maxLength, value, ...props }) {
        let isAtLimit = false;
        let helperLabel;
        const valueLen = value ? ('' + value).length : 0;
        if (maxLength && valueLen) {
            isAtLimit = valueLen === maxLength;
            helperLabel = (
                <span class={'limited-text-field-counter' + (isAtLimit ? ' is-at-limit' : '')}>
                    {valueLen}/{maxLength}
                </span>
            );
        }

        props.class = (props.class || '') + ' limited-text-field';
        if (isAtLimit) props.class += ' is-at-limit';

        return (
            <TextField
                value={value}
                maxLength={maxLength}
                {...props}
                helperLabel={helperLabel} />
        );
    }
}
