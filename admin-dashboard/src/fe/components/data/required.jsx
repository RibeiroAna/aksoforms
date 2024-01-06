import { h } from 'preact';
import { Fragment } from 'preact/compat';
import './style.less';

function YellingAsterisk () {
    return <span class="data yelling-asterisk">*</span>;
}

/** Shows a red asterisk and does nothing else. */
export default function Required ({ children }) {
    return <Fragment>{children}<YellingAsterisk /></Fragment>;
}
