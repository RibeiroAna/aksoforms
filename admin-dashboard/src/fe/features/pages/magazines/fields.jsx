import { h } from 'preact';
import { TextField } from 'yamdl';
import MdField from '../../../components/controls/md-field';
import { org } from '../../../components/data';
import { magazines as locale, magazineSubs as subsLocale } from '../../../locale';
import MagazineSubscribers from './magazine-subscribers';
import { connectPerms } from '../../../perms';
import { LinkButton } from '../../../router';
import './fields.less';

export const FIELDS = {
    org: {
        weight: 0.25,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (slot === 'create' && editing) {
                return (
                    <org.editor
                        orgs={['uea', 'tejo']}
                        value={value}
                        onChange={onChange} />
                );
            }
            return <org.renderer value={value} />;
        },
        shouldHide: () => true,
    },
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <TextField
                    class="magazine-field-name"
                    outline
                    label={slot === 'create' ? locale.fields.name : null}
                    required
                    value={value}
                    onChange={onChange} />;
            }
            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
        shouldHide: (_, editing) => !editing,
    },
    description: {
        skipLabel: true,
        wantsCreationLabel: true,
        weight: 2,
        component ({ value, editing, onChange, slot }) {
            return <MdField
                ignoreLiveUpdates
                inline={slot !== 'detail'}
                editing={editing}
                rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                value={value || ''}
                onChange={value => onChange(value || null)} />;
        },
        shouldHide: (_, editing) => !editing,
    },
    issn: {
        wantsCreationLabel: true,
        weight: 1.5,
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <TextField
                        outline
                        value={value}
                        pattern="\d{8}"
                        maxLength={8}
                        onChange={v => onChange(v || null)} />
                );
            }
            if (!value) return null;
            return <span class="magazine-field-issn">{value}</span>;
        },
    },
    subscribers: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            return <MagazineSubscribers value={value} editing={editing} onChange={onChange} />;
        },
    },
};

export const Header = connectPerms(function Header ({ item, editing, perms }) {
    if (editing) return null;
    return (
        <div class="magazine-header">
            <div class="inner-title">
                <org.renderer color value={item.org} />
                <h1 class="inner-title-text">{item.name}</h1>
            </div>
            <FIELDS.description.component value={item.description} slot="detail" />

            <div class="header-additional">
                {(perms.hasPerm('codeholders.read') && perms.hasPerm(`magazines.subscriptions.read.${item.org}`)) ? (
                    <LinkButton raised class="subs-button" target={`/revuoj/${item.id}/simplaj-abonoj`}>
                        {subsLocale.title}
                    </LinkButton>
                ) : null}
            </div>
        </div>
    );
});
