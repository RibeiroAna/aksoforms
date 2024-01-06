import { h } from 'preact';
import './style.less';

/** Renders an API key as a hex string. */
function APIKeyRenderer ({ value }) {
    const hex = Buffer.from(value || []).toString('hex');

    return (
        <span class="data api-key">
            {hex}
        </span>
    );
}

export default {
    renderer: APIKeyRenderer,
    inlineRenderer: APIKeyRenderer,
    editor: () => null,
};
