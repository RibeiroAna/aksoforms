import { h } from 'preact';
import './error.less';
import { errors as locale } from '../../locale';

/** Renders an error. */
export default function DisplayError ({ error, class: className, ...extra }) {
    if (error.code === 'invalid-search-query') {
        return (
            <div class="display-error is-invalid-search-query">
                {locale.invalidSearchQuery.pre.map((x, i) => <p key={i}>{x}</p>)}
                <ul>
                    {locale.invalidSearchQuery.list.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
                {locale.invalidSearchQuery.post.map((x, i) => <p key={i}>{x}</p>)}
            </div>
        );
    }

    let errorString = (
        <details>
            <summary>{locale.unknown}</summary>
            <pre>
                {'' + error}
            </pre>
        </details>
    );

    if (error.code === 'bad-request') {
        errorString = (
            <details>
                <summary>{locale[error.code]}</summary>
                {error.parsedSchemaError ? (
                    <SchemaErrorList items={error.parsedSchemaError} />
                ) : (
                    <pre>
                        {error.message}
                    </pre>
                )}
            </details>
        );
    } else if (error.code && locale[error.code]) {
        if (typeof locale[error.code] === 'function') {
            errorString = locale[error.code](error);
        } else {
            errorString = locale[error.code];
        }
    } else if (error.localizedDescription) {
        errorString = error.localizedDescription;
    }

    return (
        <div class={'display-error ' + (className || '')} {...extra}>
            {errorString}
        </div>
    );
}

function SchemaErrorList ({ items }) {
    try {
        const seenItems = new Map();
        const coalesced = [];
        for (const item of items) {
            try {
                const itemId = item.dataPath + '###' + item.message + '###' + JSON.stringify(item.params);
                if (seenItems.has(itemId)) {
                    seenItems.get(itemId).schemaPaths.push(item.schemaPath);
                } else {
                    item.schemaPaths = [item.schemaPath];
                    coalesced.push(item);
                    seenItems.set(itemId, item);
                }
            } catch {
                coalesced.push(item);
            }
        }

        return (
            <div class="schema-error error-list">
                {coalesced.map((item, i) => (
                    <SchemaErrorItem key={i} item={item} />
                ))}
            </div>
        );
    } catch (err) {
        console.error('could not render schema error', err); // eslint-disable-line no-console
        return <pre>{JSON.stringify(items)}</pre>;
    }
}

function SchemaErrorItem ({ item }) {
    try {
        let message = '?';
        switch (item.keyword) {
        default:
            if (locale.schema.keywords[item.keyword]) {
                message = locale.schema.keywords[item.keyword](item.params);
            } else {
                message = item.message;
            }
            break;
        }

        return (
            <div class="schema-error error-item" title={item.schemaPaths ? item.schemaPaths.join('\n') : item.schemaPath}>
                <div class="item-header">
                    <SchemaErrorDataPath path={item.instancePath} />
                    {' '}
                    {message}
                </div>
            </div>
        );
    } catch (err) {
        console.error('could not render schema error', err); // eslint-disable-line no-console
        return <pre>{JSON.stringify(item)}</pre>;
    }
}

function SchemaErrorDataPath ({ path }) {
    try {
        const contents = path.split(/\//).filter((x, i) => x || !i).map((item, i) => {
            if (!item) return <span class="path-item is-empty">⬥</span>;
            if (item.match(/^\d+$/)) return <span key={i} class="path-item is-index">{locale.schema.nthItem(+item + 1)}</span>;
            return <span key={i} class="path-item">{item}</span>;
        });
        return <span class="schema-error data-path">{contents}</span>;
    } catch {
        return <span class="schema-error data-path">?</span>;
    }
}
