import { h } from 'preact';
import { Fragment, useState } from 'preact/compat';
import { Checkbox } from 'yamdl';
import { magazines as locale } from '../../../locale';
import { IsoDuration, IsoDurationEditor } from '../../../components/data/timespan';
import JSONFilterEditor from '../../../components/overview/json-filter-editor';
import Segmented from '../../../components/controls/segmented';
import './magazine-subscribers.less';
import { SavedFilterPickerButton } from '../../../components/overview/saved-filter-picker';

function MagazinePerms ({ value, editing, onChange, hasCopyableItems }) {
    if (!editing) {
        if (value === true) return locale.subscribers.everyone;
        else if (value === false) return locale.subscribers.noone;
    }

    const selected = value === true ? 'true' : value === false ? 'false' : 'complex';
    const topSwitch = (
        <Segmented class="inner-switch" selected={selected} onSelect={value => {
            if (value === selected) return;
            if (value === 'complex') {
                onChange({
                    members: true,
                    membersFilterInner: null,
                    membersIncludeLastYear: null,
                    filter: null,
                    freelyAvailableAfter: null,
                });
            } else onChange(value === 'true');
        }}>
            {[
                { id: 'true', label: locale.subscribers.everyone },
                { id: 'false', label: locale.subscribers.noone },
                { id: 'complex', label: locale.subscribers.complex },
            ]}
        </Segmented>
    );

    if (editing && selected !== 'complex') {
        return (
            <div class="magazine-subscriber-perms">
                <div class="perms-top-switch">
                    {topSwitch}
                </div>
            </div>
        );
    }

    return (
        <div class="magazine-subscriber-perms">
            {editing ? (
                <div class="perms-top-switch">
                    {topSwitch}
                </div>
            ) : null}
            <div class="perms-field">
                <div class="field-label">
                    {locale.subscribers.members}
                </div>
                <div class="field-desc">
                    {locale.subscribers.membersDesc}
                </div>
                <MagazinePermsMembers
                    value={value.members}
                    editing={editing}
                    onChange={members => onChange({ ...value, members })} />
            </div>
            <div class="perms-field">
                <div class="field-label">
                    {locale.subscribers.membersFilterInner}
                </div>
                <div class="field-desc">
                    {locale.subscribers.membersFilterInnerDesc}
                </div>
                <MagazinePermsFilter
                    value={value.membersFilterInner || null}
                    editing={editing}
                    onChange={membersFilterInner => onChange({ ...value, membersFilterInner })}
                    desc={locale.subscribers.membersFilterInnerFieldDesc} />
                {!value.membersFilterInner && (
                    <p class="field-desc">
                        {locale.subscribers.membersFilterInnerDefault}
                    </p>
                )}
            </div>
            {(editing || value.membersIncludeLastYear) ? (
                <div class="perms-field">
                    <div class="field-label">
                        {locale.subscribers.membersIncludeLastYear}
                    </div>
                    <div class="field-desc">
                        {locale.subscribers.membersIncludeLastYearDesc}
                    </div>
                    <MagazinePermsDuration
                        value={value.membersIncludeLastYear}
                        editing={editing}
                        onChange={v => onChange({
                            ...value,
                            membersIncludeLastYear: v,
                        })} />
                </div>
            ) : null}
            {(editing || value.filter) ? (
                <div class="perms-field">
                    <div class="field-label">
                        {locale.subscribers.filter}
                    </div>
                    <div class="field-desc">
                        {locale.subscribers.filterDesc}
                    </div>
                    <MagazinePermsFilter
                        value={value.filter}
                        editing={editing}
                        onChange={filter => onChange({ ...value, filter })}
                        category="codeholders" />
                </div>
            ) : null}
            {(editing || value.excludeFilter) ? (
                <div class="perms-field">
                    <div class="field-label">
                        {locale.subscribers.excludeFilter}
                    </div>
                    <div class="field-desc">
                        {locale.subscribers.excludeFilterDesc}
                    </div>
                    <MagazinePermsFilter
                        value={value.excludeFilter}
                        editing={editing}
                        onChange={excludeFilter => onChange({ ...value, excludeFilter })}
                        category="codeholders" />
                </div>
            ) : null}
            {hasCopyableItems && (editing || value.freelyAvailableAfter) ? (
                <div class="perms-field">
                    <div class="field-label">
                        {locale.subscribers.freelyAvailableAfter}
                    </div>
                    <div class="field-desc">
                        {locale.subscribers.freelyAvailableAfterDesc}
                    </div>
                    <MagazinePermsDuration
                        value={value.freelyAvailableAfter}
                        editing={editing}
                        onChange={v => onChange({
                            ...value,
                            freelyAvailableAfter: v,
                        })} />
                </div>
            ) : null}
        </div>
    );
}

function MagazinePermsMembers ({ value, editing, onChange }) {
    if (!editing) {
        if (value === true) return locale.subscribers.membersAll;
        if (value === false) return locale.subscribers.membersNone;
        return <MagazinePermsFilterControl value={value} />;
    }

    const selected = value === true ? 'true' : value === false ? 'false' : 'filter';
    return (
        <div class="magazine-perms-members">
            <Segmented selected={selected} onSelect={value => {
                if (value === selected) return;
                if (value === 'filter') onChange({});
                else onChange(value === 'true');
            }}>
                {[
                    { id: 'true', label: locale.subscribers.membersAll },
                    { id: 'false', label: locale.subscribers.membersNone },
                    { id: 'filter', label: locale.subscribers.membersFilter },
                ]}
            </Segmented>
            {(selected === 'filter') ? (
                <MagazinePermsFilterControl
                    value={value}
                    editing={editing}
                    onChange={onChange} />
            ) : null}
        </div>
    );
}

function MagazinePermsDuration ({ value, editing, onChange }) {
    return (
        <div class="magazine-perms-duration">
            {editing ? (
                <IsoDurationEditor value={value} onChange={value => {
                    onChange(value === 'P' ? null : value);
                }} />
            ) : (
                <IsoDuration value={value || 'P'} />
            )}
        </div>
    );
}

function MagazinePermsFilter ({ value, editing, onChange, desc, category }) {
    const chkId = Math.random().toString(36);
    const hasValue = value !== null && value !== undefined;

    return (
        <div class="filter-field">
            {editing ? (
                <Fragment>
                    <Checkbox
                        id={chkId}
                        checked={hasValue}
                        disabled={!editing}
                        onChange={enabled => {
                            if (enabled === hasValue) return;
                            onChange(enabled ? {} : null);
                        }} />
                    {' '}
                    <label for={chkId}>
                        {locale.subscribers.enableFilter}
                    </label>
                </Fragment>
            ) : null}
            {hasValue ? (
                <MagazinePermsFilterControl
                    desc={desc}
                    category={category}
                    value={value}
                    editing={editing}
                    onChange={onChange} />
            ) : null}
        </div>
    );
}

function MagazinePermsFilterControl ({ value, editing, onChange, category, desc }) {
    const [source, setSource] = useState(null);

    return (
        <div class="filter-control">
            {editing ? (
                <div class="filter-control-desc">
                    {desc || locale.subscribers.filterFieldDesc}
                </div>
            ) : null}
            {(editing && category) ? (
                <div class="saved-filter-container">
                    <SavedFilterPickerButton
                        class="perms-pick-saved"
                        category={category}
                        onLoad={data => {
                            setSource(null);
                            onChange(data.query.filter);
                        }} />
                </div>
            ) : null}
            <JSONFilterEditor
                class="perms-filter"
                expanded={editing}
                value={{ filter: value, source: editing ? source : null }}
                disabled={!editing}
                onChange={value => {
                    if (!editing) return;
                    setSource(value?.source || null);
                    onChange(value?.filter || null);
                }} />
        </div>
    );
}

export default function MagazineSubscribers ({ value, editing, onChange }) {
    if (!value) value = { paper: false, access: false };

    return (
        <div class="magazine-subscribers">
            <div class="subscriber-type">
                <div class="type-label">{locale.subscribers.access}</div>
                <MagazinePerms
                    hasCopyableItems
                    value={value.access}
                    editing={editing}
                    onChange={access => onChange({
                        ...value,
                        access,
                    })} />
            </div>
            <div class="subscriber-type">
                <div class="type-label">{locale.subscribers.paper}</div>
                <MagazinePerms
                    value={value.paper}
                    editing={editing}
                    onChange={paper => onChange({
                        ...value,
                        paper,
                    })} />
            </div>
        </div>
    );
}
