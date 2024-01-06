//! This file contains code for both memberships and roles, because they’re really similar.

import { h } from 'preact';
import { useContext, useEffect, useState } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import BusinessIcon from '@material-ui/icons/Business';
import InfoIcon from '@material-ui/icons/Info';
import LanguageIcon from '@material-ui/icons/Language';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import Page from '../../../components/page';
import DataList from '../../../components/lists/data-list';
import { IdUEACode } from '../../../components/data/uea-code';
import { country, date } from '../../../components/data';
import MembershipChip from '../../../components/membership-chip';
import TinyProgress from '../../../components/controls/tiny-progress';
import { coreContext } from '../../../core/connection';
import { usePerms } from '../../../perms';
import { codeholders as locale } from '../../../locale';
import Meta from '../../meta';
import { LinkButton } from '../../../router';
import { useDataView } from '../../../core';
import './memberships-roles.less';

function makeDetailViewPreview ({ task, signal, render, empty, target, className }) {
    return function MRDetailViewPreview ({ id }) {
        const core = useContext(coreContext);
        const [loading, setLoading] = useState(false);
        const [items, setItems] = useState([]);

        const [previewVersion, setPreviewVersion] = useState(0);
        useDataView(signal, { id }, {
            onUpdate: () => {
                setPreviewVersion(previewVersion + 1);
            },
        });

        useEffect(() => {
            setLoading(true);
            core.createTask(task, { id }, {
                offset: 0,
                limit: 20,
            }).runOnceAndDrop().then(res => {
                setItems(res.items);
            }).catch(err => {
                console.error(`Failed to fetch ${task}`, err); // eslint-disable-line no-console
            }).finally(() => {
                setLoading(false);
            });
        }, [id, previewVersion]);

        const renderedItems = items.map(render);

        let noItems = false;
        if (!renderedItems.length) {
            noItems = true;
            renderedItems.push(
                <span key={0} class="items-empty">
                    {empty}
                </span>
            );
        }

        return (
            <div class={className + '-editor'}>
                <div class={className + 's' + (noItems ? ' is-empty' : '')}>
                    {loading ? <TinyProgress /> : renderedItems}
                </div>
                <LinkButton
                    icon
                    small
                    class="membership-edit-button"
                    style={{ lineHeight: '36px' }} // FIXME: weird
                    target={`/membroj/${id}/${target}`}>
                    <MoreHorizIcon style={{ verticalAlign: 'middle' }} />
                </LinkButton>
            </div>
        );
    };
}

export const MembershipInDetailView = makeDetailViewPreview({
    task: 'codeholders/listMemberships',
    signal: 'codeholders/codeholderSigMemberships',
    render: item => {
        return (
            <MembershipChip
                class="membership-item"
                key={`${item.id}-${item.year}`}
                abbrev={item.nameAbbrev}
                name={item.name}
                year={item.year}
                givesMembership={item.givesMembership}
                lifetime={item.lifetime}/>
        );
    },
    empty: locale.noMemberships,
    target: 'membrecoj',
    className: 'membership',
});

export const RolesInDetailView = makeDetailViewPreview({
    task: 'codeholders/listRoles',
    signal: 'codeholders/codeholderSigRoles',
    render: item => {
        return (
            <span key={item.id} class={'role' + (!item.isActive ? ' is-inactive' : '')}>
                {item.role.name}
            </span>
        );
    },
    empty: locale.noRoles,
    target: 'roloj',
    className: 'role',
});

function makePage ({
    createTask,
    signal,
    listTask,
    deleteTask,
    fieldId,
    perm,
    renderItem,
    renderMenu,
    title,
    add,
    empty,
}) {
    function PageContents ({ id }) {
        const perms = usePerms();
        const core = useContext(coreContext);
        const canEdit = perms.hasPerm('codeholders.update') && perms.hasCodeholderField(perm, 'w');

        return (
            <div class="codeholder-memberships-or-roles-page">
                <Meta
                    title={title}
                    priority={9}
                    actions={[canEdit && {
                        label: add,
                        icon: <AddIcon />,
                        action: () => {
                            core.createTask(createTask, { id }); // task view
                        },
                    }].filter(x => x)} />
                <DataList
                    updateView={[signal, { id }]}
                    onLoad={(offset, limit) =>
                        core.createTask(listTask, {
                            id,
                        }, { offset, limit }).runOnceAndDrop()}
                    emptyLabel={empty}
                    onRemove={canEdit && (item =>
                        core.createTask(deleteTask, {
                            id,
                        }, { [fieldId]: item.id }).runOnceAndDrop())}
                    renderItem={renderItem}
                    renderMenu={renderMenu(id)} />
            </div>
        );
    }

    return class MRPage extends Page {
        render () {
            // get codeholder id from the match above
            const id = +this.props.matches.codeholder[1];
            return <PageContents id={id} />;
        }
    };
}

export const MembershipPage = makePage({
    createTask: 'codeholders/addMembership',
    signal: 'codeholders/codeholderSigMemberships',
    listTask: 'codeholders/listMemberships',
    deleteTask: 'codeholders/deleteMembership',
    fieldId: 'membership',
    perm: 'membership',
    renderItem: item => (
        <div class="membership-item">
            <div class="item-title">
                <MembershipChip
                    class="item-chip"
                    abbrev={item.nameAbbrev}
                    name={item.name}
                    year={item.year}
                    givesMembership={item.givesMembership}
                    lifetime={item.lifetime}/>
                <span class="item-name">{item.name}</span>
            </div>
            <div class="item-desc">
                <span class="item-attr attr-lifetime" data-value={item.lifetime}>
                    {locale.membership.lifetime[item.lifetime ? 'yes' : 'no']}
                </span>
                <span class="item-attr attr-gives-membership" data-value={item.givesMembership}>
                    {locale.membership.givesMembership[item.givesMembership ? 'yes' : 'no']}
                </span>
                {item.canuto && (
                    <span class="item-attr attr-canuto" data-value="true">
                        {locale.membership.canutoAttr}
                    </span>
                )}
            </div>
        </div>
    ),
    renderMenu: () => null,
    title: locale.memberships,
    add: locale.addMembership,
    empty: locale.noMemberships,
});

export const RolesPage = makePage({
    createTask: 'codeholders/addRole',
    signal: 'codeholders/codeholderSigRoles',
    listTask: 'codeholders/listRoles',
    deleteTask: 'codeholders/deleteRole',
    fieldId: 'role',
    perm: 'roles',
    renderItem: item => (
        <div class="role-item">
            <div class="item-name">
                {item.role.name}
            </div>
            <div class="item-desc">
                <span class="item-timespan">
                    <date.inlineRenderer value={item.durationFrom * 1000}/>
                    {'–'}
                    <date.inlineRenderer value={item.durationTo * 1000}/>
                </span>
                <span class="additional-details">
                    {item.dataCountry ? (
                        <span class="detail-country">
                            <LanguageIcon className="detail-icon"/>
                            <country.renderer value={item.dataCountry}/>
                        </span>
                    ) : null}
                    {item.dataOrg ? (
                        <span class="detail-org">
                            <BusinessIcon className="detail-icon"/>
                            <IdUEACode id={item.dataOrg}/>
                        </span>
                    ) : null}
                    {item.dataString ? (
                        <span class="detail-string">
                            <InfoIcon className="detail-icon"/>
                            {item.dataString}
                        </span>
                    ) : null}
                </span>
            </div>
        </div>
    ),
    renderMenu: id => (item, core) => [
        {
            label: locale.role.edit,
            action: () => {
                core.createTask('codeholders/updateRole', {
                    id,
                    entry: item.id,
                }, {
                    // FIXME: kinda hacky
                    durationFrom: item.durationFrom ? new Date(item.durationFrom * 1000).toISOString().split('T')[0] : null,
                    durationTo: item.durationTo ? new Date(item.durationTo * 1000).toISOString().split('T')[0] : null,
                    role: item.role.id,
                    dataCountry: item.dataCountry,
                    dataOrg: item.dataOrg,
                    dataString: item.dataString,
                }); // task view
            },
        },
    ],
    title: locale.roles,
    add: locale.addRole,
    empty: locale.noRoles,
});
