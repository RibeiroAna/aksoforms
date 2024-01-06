import { h } from 'preact';
import { Link } from '../router';
import { IdUEACode } from './data/uea-code';
import { connect } from '../core/connection';
import './diff-author.less';

/**
 * Renders a diff author, like `ch:1234` or `app:0123456abcdef`, with their proper name.
 *
 * # Props
 * - author: author string
 * - interactive: bool
 */
export default function DiffAuthor ({ author, interactive }) {
    if (typeof author !== 'string') return null;
    if (author.startsWith('ch:')) {
        const chId = +author.substr(3);
        if (interactive) {
            return <Link target={`/membroj/${chId}`} class="diff-author-link" outOfTree><IdUEACode id={chId} /></Link>;
        } else {
            return <IdUEACode id={chId} />;
        }
    } else if (author.startsWith('app:')) {
        const appId = author.substr(4);
        if (interactive) {
            return (
                <Link target={`/administrado/klientoj/${appId}`} class="diff-author-link">
                    <AppId id={appId} />
                </Link>
            );
        } else {
            return <AppId id={appId} />;
        }
    }
}

const AppId = connect(({ id }) => ['clients/client', { id }])(data => ({ data }))(function AppId ({ id, data }) {
    if (!data) return <span class="diff-author-app-id not-loaded">{id}</span>;
    return <span class="diff-author-app-id">{data.name}</span>;
});

