import { h, Component } from 'preact';
import './text-area.less';

export default class TextArea extends Component {
    render ({ onChange, ...props }) {
        return (
            <textarea
                {...props}
                class={'a-text-area ' + (props.class || '')}
                onChange={e => onChange(e.target.value)} />
        );
    }
}
