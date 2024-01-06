import { h } from 'preact';

export default function SvgIcon (props) {
    return (
        <svg
            width="24"
            height="24"
            {...props}
            style={{
                verticalAlign: 'middle',
                fill: 'currentColor',
                ...(props.style || {}),
            }}>
            {props.children}
        </svg>
    );
}
