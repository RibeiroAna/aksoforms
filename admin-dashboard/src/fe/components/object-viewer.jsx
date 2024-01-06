import { h } from 'preact';
import { useState } from 'preact/compat';
import DisclosureArrow from './disclosure-arrow';
import { data as locale } from '../locale';
import './object-viewer.less';

/**
 * Renders a JSON object with collapsibles and stuff à la dev tools.
 *
 * # Props
 * - value: the JSON object
 */
export default function ObjectViewer ({ value }) {
    return <div class="object-viewer">
        <button type="button" class="obj-copy-button" onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(value, undefined, 4)).catch(console.error); // eslint-disable-line no-console
        }}>{locale.copy}</button>
        <InnerObjectViewer value={value} />
    </div>;
}

const PREVIEW_LEN = 3;

function InnerObjectViewer ({ value: obj, shallow }) {
    const [open, setOpen] = useState(false);
    const disclosure = (
        <button type="button" class="obj-disclosure" onClick={() => setOpen(!open)}>
            <DisclosureArrow dir={open ? 'up' : 'down'} />
        </button>
    );

    if (Array.isArray(obj)) {
        if (shallow) return '[…]';
        return open ? (
            <ol class="o-array">
                {disclosure}[
                {obj.map((x, i) => (<li class="o-array-item" key={i}>
                    <span class="o-array-index">{i}</span>: <InnerObjectViewer value={x} />
                </li>))}
                ]
            </ol>
        ) : (
            <ol class="o-array-inline">
                {disclosure}
                [
                {obj.slice(0, PREVIEW_LEN).flatMap((x, i) => [
                    <InnerObjectViewer key={i} value={x} shallow />,
                    ', ',
                ])}
                {obj.length > PREVIEW_LEN ? '…' : ''}
                ] <span class="o-array-comment">({locale.objViewerArrayItems(obj.length)})</span>
            </ol>
        );
    } else if (typeof obj === 'object' && obj !== null) {
        if (shallow) return '{…}';
        const keys = Object.keys(obj);
        return open ? (
            <ul class="o-object">
                {disclosure}
                {'{'}
                {keys.map(x => (
                    <li key={x}>
                        <span class="o-ident">{x}</span>: <InnerObjectViewer value={obj[x]} />
                    </li>))}
                {'}'}
            </ul>
        ) : (
            <ul class="o-object-inline">
                {disclosure}
                {'{ '}
                {keys.slice(0, PREVIEW_LEN).flatMap(x => [
                    <li key={x}>
                        <span class="o-ident">{x}</span>: <InnerObjectViewer value={obj[x]} shallow />
                    </li>,
                    ', ',
                ])}
                {keys.length > PREVIEW_LEN ? '…' : ''}
                {' }'}
            </ul>
        );
    } else {
        let className = 'o-value';
        let os = '' + obj;
        if (typeof obj === 'number') className += ' o-number';
        else if (typeof obj === 'string') {
            className += ' o-string';
            os = JSON.stringify(obj);
        } else if (typeof obj === 'boolean') className += ' o-boolean';
        return <span class={className}>{os}</span>;
    }
}
