import { h } from 'preact';
import { Checkbox } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import PublicIcon from '@material-ui/icons/Public';
import LockIcon from '@material-ui/icons/Lock';
import moment from 'moment';
import LimitedTextField from '../../../../components/controls/limited-text-field';
import MdField from '../../../../components/controls/md-field';
import { date } from '../../../../components/data';
import { magazineEditions as locale } from '../../../../locale/magazines';
import MagazineSubscribers from '../magazine-subscribers';
import './fields.less';

export const FIELDS = {
    idHuman: {
        sortable: true,
        slot: 'title',
        weight: 1,
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <LimitedTextField
                    class="magazine-edition-field-id-human"
                    outline
                    label={slot === 'create' && locale.fields.idHuman}
                    required
                    value={value}
                    maxLength={50}
                    onChange={onChange} />;
            }
            if (slot === 'title') return <b class="edition-field-id-human">{value}</b>;
            return value;
        },
    },
    date: {
        sortable: true,
        slot: 'titleAlt',
        weight: 1.2,
        component ({ value, editing, onChange, slot, item, userData }) {
            if (editing) {
                return <date.editor
                    class="magazine-edition-field-id-human"
                    label={slot === 'create' && locale.fields.date}
                    outline
                    required
                    value={value}
                    onChange={onChange} />;
            }

            if (slot === 'detail' && item.published && userData?.magazineSubscribers) {
                const subscribers = item.subscribers || userData.magazineSubscribers;
                const durPaper = subscribers.paper?.freelyAvailableAfter || null;
                const durAccess = subscribers.access?.freelyAvailableAfter || null;

                const expPaper = durPaper ? moment(value).add(moment.duration(durPaper, moment.ISO_8601)) : null;
                const expAccess = durAccess ? moment(value).add(moment.duration(durAccess, moment.ISO_8601)) : null;

                if (expPaper || expAccess) {
                    return (
                        <div class="magazine-edition-date">
                            <date.renderer value={value} />
                            <div class="expiry-dates">
                                {expAccess ? (
                                    <div class="expiry-date">
                                        {locale.fields.dateFreelyAvailable.access}
                                        {' '}
                                        <date.renderer value={+expAccess} />
                                    </div>
                                ) : null}
                                {expPaper ? (
                                    <div class="expiry-date">
                                        {locale.fields.dateFreelyAvailable.paper}
                                        {' '}
                                        <date.renderer value={+expPaper} />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    );
                }
            }

            return <date.renderer value={value} />;
        },
    },
    published: {
        slot: 'icon',
        weight: 0.5,
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return <Checkbox checked={value} onChange={onChange} />;
            }
            if (slot === 'icon') {
                if (value) return <PublicIcon value={{ verticalAlign: 'middle' }} />;
                return <LockIcon value={{ verticalAlign: 'middle' }} />;
            }
            if (value) return <CheckIcon value={{ verticalAlign: 'middle' }} />;
            return '—';
        },
        isEmpty: () => false,
    },
    description: {
        sortable: true,
        skipLabel: true,
        weight: 2,
        component ({ value, editing, onChange, slot }) {
            return <MdField
                inline={slot !== 'detail'}
                editing={editing}
                rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
                value={value || ''}
                maxLength={5000}
                onChange={value => onChange(value || null)} />;
        },
    },
    subscribers: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            const chkId = Math.random().toString(36);
            return (
                <div class="magazine-edition-subscribers">
                    {editing ? (
                        <div class="override-switch">
                            <Checkbox
                                id={chkId}
                                checked={value !== null}
                                onChange={v => {
                                    if (v === (value !== null)) return;
                                    if (v) onChange({ paper: false, access: false });
                                    else onChange(null);
                                }} />
                            {' '}
                            <label for={chkId}>
                                {locale.fields.subscribersOverride}
                            </label>
                        </div>
                    ) : null}
                    {(value !== null) ? (
                        <MagazineSubscribers value={value} editing={editing} onChange={onChange} />
                    ) : null}
                </div>
            );
        },
    },
};
