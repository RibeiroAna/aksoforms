import { h } from 'preact';
import './style.less';
import { TejoIcon, UeaColorIcon, UeaIcon } from '../org-icon';
import Segmented from '../controls/segmented';
import Logo from '../logo';

const ORGS = {
    uea: {
        label: 'UEA',
        icon: <UeaIcon />,
        iconColor: <UeaColorIcon />,
        accent: '33 33 33',
        background: '148 201 255',
    },
    tejo: {
        label: 'TEJO',
        icon: <TejoIcon />,
        iconColor: <TejoIcon />,
        accent: '43 168 81',
        foreground: '255 255 255',
        background: '43 168 81',
    },
    akso: {
        label: 'AKSO',
        icon: <span class="i-akso-icon"><Logo monochrome /></span>,
        iconColor: <span class="i-akso-icon"><Logo /></span>,
        accent: 'var(--akso-logo-a)',
        background: 'var(--akso-logo-bg)',
    },
};

function Org ({ value, color, ...extra }) {
    const org = ORGS[value];
    if (!org) return '—';

    if (color) {
        extra.style = extra.style || {};
        extra.style['--color-accent'] = org.accent;

        return (
            <div {...extra} class={'data org is-icon is-color ' + (extra.class || '')}>
                {org.iconColor}
            </div>
        );
    }

    return (
        <div {...extra} class={'data org is-icon ' + (extra.class || '')}>
            {org.icon}
        </div>
    );
}

function OrgEditor ({ value, onChange, orgs }) {
    orgs = orgs || Object.keys(ORGS);

    return (
        <Segmented
            class="data org is-editor"
            style={{
                '--color-background': ORGS[value]?.background,
                '--color-foreground': ORGS[value]?.foreground || ORGS[value]?.accent,
            }}
            selected={value}
            onSelect={v => onChange(v || null)}>
            {orgs.map(org => ({
                id: org,
                alt: ORGS[org].label,
                label: value === org ? (
                    <span class="selected-item">
                        {ORGS[org].iconColor}
                    </span>
                ) : ORGS[org].icon,
            }))}
        </Segmented>
    );
}

export default {
    renderer: Org,
    inlineRenderer: Org,
    editor: OrgEditor,
};
