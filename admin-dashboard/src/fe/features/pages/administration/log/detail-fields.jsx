import { h } from 'preact';
import { Button } from 'yamdl';
import FIELDS from './table-fields';
import ObjectViewer from '../../../../components/object-viewer';
import { CopyIcon } from '../../../../components/icons';
import { LinkButton } from '../../../../router';
import { httpLog as locale } from '../../../../locale';
import { usePerms } from '../../../../perms';

const DETAIL_FIELDS = Object.fromEntries(Object.entries(FIELDS)
    .map(([id, { component, isEmpty = (x => !x) }]) => ([id, {
        component,
        isEmpty,
    }])));

const IdentityComponent = DETAIL_FIELDS.identity.component;
DETAIL_FIELDS.identity.component = function Identity ({ value }) {
    const perms = usePerms();
    if (!value || value.type === 'none') return;

    const linkTarget = value.type === 'codeholder'
        ? `/membroj/${value.id}`
        : `/administrado/klientoj/${Buffer.from(value.id).toString('hex')}`;
    const linkLabel = value.type === 'codeholder'
        ? locale.viewCodeholder
        : locale.viewClient;

    return (
        <div class="request-identity">
            <IdentityComponent value={value} />
            {' '}
            {perms.hasPerm('codeholders.read') && (
                <LinkButton target={linkTarget} outOfTree>
                    {linkLabel}
                </LinkButton>
            )}
        </div>
    );
};

DETAIL_FIELDS.query.component = function Query ({ value }) {
    if (!value) return;
    return (
        <pre class="request-query">
            <ObjectViewer value={value} />
        </pre>
    );
};

DETAIL_FIELDS.ip.component = function Ip ({ value }) {
    if (!value) return;
    return (
        <div class="ip-address">
            {value}

            {navigator.clipboard && navigator.clipboard.writeText ? (
                <Button class="ip-copy-button" icon small onClick={() => {
                    navigator.clipboard.writeText(value).catch(console.error); // eslint-disable-line no-console
                    // TODO: create toast
                }}>
                    <CopyIcon style={{ verticalAlign: 'middle' }} />
                </Button>
            ) : null}
        </div>
    );
};

export default DETAIL_FIELDS;
