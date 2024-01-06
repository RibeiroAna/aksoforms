import { h } from 'preact';
import { Button } from 'yamdl';
import { app as locale } from '../locale';
import './fatal-error.less';

export default function FatalError ({ error }) {
    return (
        <div class="fatal-error-contents">
            <h1>{locale.genericErrorTitle}</h1>
            {locale.genericError}
            <br />
            <br />
            <Button onClick={() => window.location.reload()}>
                {locale.genericErrorReload}
            </Button>
            <br />
            <br />
            <details class="error-details">
                <summary>{locale.genericErrorViewDetails}</summary>
                <pre>
                    {error?.stack ? error.toString() + '\n' + error.stack.toString() : error.toString()}
                </pre>
            </details>
        </div>
    );
}
