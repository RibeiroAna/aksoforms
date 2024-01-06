import { h } from 'preact';
import {
    createContext,
    createPortal,
    memo,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    PureComponent,
} from 'preact/compat';
import { Button, Checkbox, Dialog } from 'yamdl';
import {
    spec,
    memberFieldsList as fieldsList,
    reverseMap,
    memberFieldsAll,
    memberFieldsRead,
    memberFieldsWrite,
} from '../../../../permissions';
import { data as locale } from '../../../../locale';
import CountryPicker from '../../../../components/pickers/country-picker';
import JSONEditor from '../../../../components/controls/json-editor';
import DisclosureArrow from '../../../../components/disclosure-arrow';
import DynamicHeightDiv from '../../../../components/layout/dynamic-height-div';
import TinyProgress from '../../../../components/controls/tiny-progress';
import DisplayError from '../../../../components/utils/error';
import {
    addPermission,
    hasPermission,
    removePermission,
    isPermissionUnknown,
    addMemberField,
    hasMemberField,
    removeMemberField,
} from './solver';
import './style.less';
import { useDataView } from '../../../../core';
import { coreContext } from '../../../../core/connection';
import TextArea from '../../../../components/controls/text-area';
import CloseIcon from '@material-ui/icons/Close';

const permsEditorState = createContext({
    showRaw: false,
});

const permsEditorPermissions = createContext({
    permissions: [],
    memberFields: null,
    mrEnabled: false,
});

const permsEditorMemberFilter = createContext('');

const permsEditorMutations = createContext({
    mutatePerms: callback => void callback,
    togglePerm: id => void id,
    setMREnabled: enabled => void enabled,
});

/**
 * Permissions editor.
 * Also edits member filter and member fields.
 *
 * ```
 * struct PermsData {
 *     permissions: string[],
 *     mrEnabled: bool,
 *     mrFilter: string,
 *     mrFields: { [string]: string? } | null,
 * }
 * ```
 *
 * # Props
 * - value/onChange: PermsData
 * - editable: if false, will not show as editable
 * - isGroup: bool
 */
export default class PermsEditor extends PureComponent {
    state = {
        // if true, will show raw perm ids
        showRaw: false,
        showData: false,
        isGroup: this.props.isGroup,

        categoryCursor: null,
    };

    #node = null;

    // memoized context values to prevent unnecessary updates
    permissions = {
        __derivedFrom: this.props.value,
        permissions: this.props.value?.permissions || [],
        mrEnabled: this.props.value?.mrEnabled || false,
        memberFilter: this.props.value?.mrFilter || '',
        memberFields: this.props.value?.mrFields || null,
    };
    mutations = {
        mutatePerms: (callback) => {
            if (!this.props.value || !this.props.editable) return;
            const { permissions, mrFields } = this.props.value;
            const [p, m] = callback(permissions, mrFields);
            this.props.onChange({ ...this.props.value, permissions: p, mrFields: m });
        },
        togglePerm: perm => {
            if (!this.props.value || !this.props.editable) return;

            const { permissions, mrFields } = this.props.value;
            if (hasPermission(permissions, mrFields, perm)) {
                const [p, m] = removePermission(permissions, mrFields, perm);
                this.props.onChange({ ...this.props.value, permissions: p, mrFields: m });
            } else {
                const [p, m] = addPermission(permissions, mrFields, perm);
                this.props.onChange({ ...this.props.value, permissions: p, mrFields: m });
            }
        },
        toggleField: (field, flags) => {
            if (!this.props.value || !this.props.editable) return;
            const { permissions, mrFields } = this.props.value;
            if (hasMemberField(permissions, mrFields, field, flags)) {
                const [p, m] = removeMemberField(permissions, mrFields, field, flags);
                this.props.onChange({ ...this.props.value, permissions: p, mrFields: m });
            } else {
                const [p, m] = addMemberField(permissions, mrFields, field, flags);
                this.props.onChange({ ...this.props.value, permissions: p, mrFields: m });
            }
        },
        toggleAllFields: () => {
            if (!this.props.value || !this.props.editable) return;
            const { mrFields } = this.props.value;
            if (mrFields === null) this.props.onChange({ ...this.props.value, mrFields: {} });
            else this.props.onChange({ ...this.props.value, mrFields: null });
        },
        setMREnabled: enabled => {
            if (!this.props.value || !this.props.editable) return;
            this.props.onChange({ ...this.props.value, mrEnabled: enabled });
        },
        setMemberFilter: filter => {
            if (!this.props.value || !this.props.editable) return;
            this.props.onChange({ ...this.props.value, mrFilter: filter });
        },
    };

    #scrollViewParent = null;
    componentDidMount () {
        // find scroll view container
        let cursor = this.#node;
        while (cursor) {
            if (['scroll', 'auto'].includes(getComputedStyle(cursor).overflowY)) {
                break;
            }
            cursor = cursor.parentNode;
        }
        this.#scrollViewParent = cursor;
        this.#scrollViewParent.addEventListener('scroll', this.onScrollContainer, { passive: true });
    }
    componentWillUnmount () {
        this.#scrollViewParent?.removeEventListener('scroll', this.onScrollContainer, { passive: true });
    }

    onScrollContainer = () => {
        const scrollViewRect = this.#scrollViewParent.getBoundingClientRect();

        let closestCategory = null;
        let closestCategoryDist = Infinity;
        if (!this.#node) return;
        for (const category of this.#node.querySelectorAll('.perms-category')) {
            const rect = category.getBoundingClientRect();
            const distance = Math.abs(rect.top - scrollViewRect.top);
            if (distance < closestCategoryDist) {
                closestCategory = category.dataset.name;
                closestCategoryDist = distance;
            }
        }

        if (closestCategory) {
            this.setState({ categoryCursor: closestCategory });
        }
    };
    scrollToCategory = (item) => {
        for (const category of this.#node.querySelectorAll('.perms-category')) {
            if (category.dataset.name === item.name) {
                category.scrollIntoView({ behavior: 'smooth' });
                break;
            }
        }
    };

    render ({ value, editable, isIndexOpen, setIndexOpen }, { showData }) {
        if (!value) return null;

        if (value.permissions !== this.permissions.__derivedFrom?.permissions
            || value.mrEnabled !== this.permissions.__derivedFrom?.mrEnabled
            || value.mrFields !== this.permissions.__derivedFrom?.mrFields) {
            this.permissions = {
                __derivedFrom: value,
                permissions: value.permissions,
                mrEnabled: value.mrEnabled,
                memberFields: value.mrFields,
            };
        }

        const { permissions, mrEnabled, mrFilter, mrFields } = value;

        const unknown = permissions.filter(isPermissionUnknown);
        const unknownPerms = unknown.map(perm => (
            <PermsItem key={perm} item={{ type: 'perm', name: perm, id: perm }} />
        ));

        return (
            <div class="perms-editor" ref={node => this.#node = node}>
                <p>
                    {locale.permsEditor.note}
                </p>
                {editable && (
                    <CopyPaste value={value} onChange={this.props.onChange} />
                )}
                <div class="perms-stats">
                    <div class="stats-line is-linkish" onClick={() => this.setState({ showData: true })}>
                        {locale.permsEditor.stats.permCount(permissions.length)}
                    </div>
                    {mrEnabled ? (
                        <div class="stats-line">
                            {mrFields
                                ? locale.permsEditor.stats.fieldCount(Object.keys(mrFields).length)
                                : locale.permsEditor.stats.fieldCountAll}
                        </div>
                    ) : null}
                </div>

                <permsEditorState.Provider value={this.state}>
                    <permsEditorMutations.Provider value={this.mutations}>
                        <permsEditorPermissions.Provider value={this.permissions}>
                            <permsEditorMemberFilter.Provider value={mrFilter}>
                                {spec.map((x, i) => <PermsItem item={x} key={i} disabled={!editable} />)}
                                {unknownPerms}
                            </permsEditorMemberFilter.Provider>
                        </permsEditorPermissions.Provider>
                    </permsEditorMutations.Provider>
                </permsEditorState.Provider>

                <Dialog
                    class="perms-editor-raw-permissions-dialog"
                    title={locale.permsEditor.data.title}
                    backdrop
                    open={showData}
                    onClose={() => this.setState({ showData: false })}>
                    <RawPermissions permissions={permissions} />
                </Dialog>

                {isIndexOpen ? (
                    <PermsIndex
                        cursor={this.state.categoryCursor}
                        onSelect={this.scrollToCategory}
                        onClose={() => setIndexOpen(false)} />
                ) : null}
            </div>
        );
    }
}

function CopyPaste ({ value, onChange }) {
    const core = useContext(coreContext);
    const [pasting, setPasting] = useState(false);
    const [pasted, setPasted] = useState('');

    const copyPerms = () => {
        navigator.clipboard.writeText(btoa(JSON.stringify(value))).catch(err => {
            console.error(err); // eslint-disable-line no-console
            core.createTask('info', {
                message: locale.permsEditor.copyPaste.copyError,
            });
        });
    };

    const tryPaste = () => {
        try {
            const perms = JSON.parse(atob(pasted.trim()));

            // basic validation
            for (const item of perms.permissions) {
                if (typeof item !== 'string') throw new Error('invalid permission');
            }
            if (typeof perms.mrEnabled !== 'boolean') throw new Error('invalid MR enabled');
            if (perms.mrFilter && typeof perms.mrFilter !== 'string') throw new Error('invalid MR filter');
            if (perms.mrFields) {
                for (const k in perms.mrFields) {
                    if (typeof perms.mrFields[k] !== 'string') throw new Error('invalid MR field');
                }
            }

            setPasted('');
            setPasting(false);
            onChange(perms);
        } catch (err) {
            console.error('error parsing perms', err); // eslint-disable-line no-console
            core.createTask('info', {
                message: locale.permsEditor.copyPaste.pasteParseError,
            });
        }
    };

    return (
        <div class="perms-editor-copy-paste">
            <Button onClick={copyPerms}>
                {locale.permsEditor.copyPaste.copy}
            </Button>
            <Button onClick={() => setPasting(true)}>
                {locale.permsEditor.copyPaste.paste}
            </Button>
            <Dialog
                class="perms-editor-paste-permissions-dialog"
                title={locale.permsEditor.copyPaste.paste}
                backdrop
                open={pasting}
                onClose={() => setPasting(false)}
                actions={[
                    {
                        label: locale.permsEditor.copyPaste.confirmPaste,
                        action: tryPaste,
                    },
                ]}>
                <p>
                    {locale.permsEditor.copyPaste.pasteDescription}
                </p>
                <TextArea autofocus value={pasted} onChange={setPasted} />
            </Dialog>
        </div>
    );
}

function PermsIndex ({ cursor, onSelect, onClose }) {
    const containerNode = useMemo(() => document.createElement('div'), []);
    useEffect(() => {
        document.body.appendChild(containerNode);
        return () => document.body.removeChild(containerNode);
    }, [containerNode]);

    const categories = spec.filter(x => x.type === 'category').map((item, i) => (
        <PermsIndexItem key={i} item={item} selected={cursor === item.name} onSelect={() => onSelect(item)} />
    ));

    return createPortal(
        <div class="perms-editor-index-sidebar">
            <div class="inner-header">
                <Button class="close-button" icon small onClick={onClose}>
                    <CloseIcon />
                </Button>
                <div class="inner-title">
                    {locale.permsEditor.indexSidebarTitle}
                </div>
            </div>
            <ul class="inner-categories">
                {categories}
            </ul>
        </div>,
        containerNode,
    );
}

function PermsIndexItem ({ item, selected, onSelect }) {
    const node = useRef();
    useEffect(() => {
        if (selected) node.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [selected]);

    return (
        <li ref={node} className={selected ? 'is-selected' : ''}>
            <Button class="inner-button" onClick={onSelect}>
                {item.name}
            </Button>
        </li>
    );
}

/** Renders a human-readable name for a given permission. */
function PermName ({ id }) {
    if (!reverseMap[id]) return id;
    const item = reverseMap[id];
    let c = spec;
    const nameParts = [];
    for (const i of item.path) {
        if (c.name) nameParts.push(c.name);
        if (Array.isArray(c)) c = c[i]; // root node
        else c = (c.children || c.options)[i];
    }
    if (c.name) nameParts.push(c.name);
    return nameParts.join(' › ');
}

function getUnfulfilledRequirements (permissions, memberFields, item) {
    const unfulfilledRequirements = [];
    if (item.requires) {
        for (const req of item.requires) {
            if (!hasPermission(permissions, memberFields, req)) {
                unfulfilledRequirements.push(req);
            }
        }
    }
    return unfulfilledRequirements;
}

function PermissionRequirementsNotice ({ unfulfilledRequirements }) {
    if (!unfulfilledRequirements.length) return null;
    return (
        <div class="perms-req-notice">
            {locale.permsEditor.requires} {unfulfilledRequirements.map((p, i) => (
                <span key={p}>
                    {i > 0 ? ', ' : ''}
                    <PermName id={p} />
                </span>
            ))}
        </div>
    );
}

function MaybePermissionRequirementsNotice ({ item }) {
    const { permissions, memberFields } = useContext(permsEditorPermissions);
    const unfulfilledRequirements = getUnfulfilledRequirements(permissions, memberFields, item);
    return <PermissionRequirementsNotice unfulfilledRequirements={unfulfilledRequirements} />;
}

function PermissionItemCheckbox ({ item, disabled, isSwitchOption }) {
    const { permissions, memberFields } = useContext(permsEditorPermissions);
    const editorState = useContext(permsEditorState);
    const mutations = useContext(permsEditorMutations);

    const isActive = hasPermission(permissions, memberFields, item.id);

    const checkboxId = useMemo(() => `perms-checkbox-${Math.random().toString(36)}`, []);

    let unfulfilledRequirements = [];
    if (!isSwitchOption) {
        unfulfilledRequirements = getUnfulfilledRequirements(permissions, memberFields, item);
        disabled = disabled || unfulfilledRequirements.length;
    }

    return (
        <div class={isSwitchOption ? 'switch-option' : 'perms-item perms-perm'}>
            <PermissionRequirementsNotice unfulfilledRequirements={unfulfilledRequirements} />
            <Checkbox
                id={checkboxId}
                disabled={disabled}
                class="perm-checkbox"
                checked={isActive}
                onClick={() => mutations.togglePerm(item.id)} />
            <label for={checkboxId}>
                {editorState.showRaw ? item.id : item.name}
            </label>
        </div>
    );
}

function PermissionItemSwitch ({ item, disabled }) {
    const { permissions, memberFields } = useContext(permsEditorPermissions);

    const unfulfilledRequirements = getUnfulfilledRequirements(permissions, memberFields, item);
    disabled = disabled || unfulfilledRequirements.length;

    return (
        <div class="perms-item perms-switch">
            {item.name ? <span class="switch-name">{item.name}</span> : <span class="spacer" />}
            <PermissionRequirementsNotice unfulfilledRequirements={unfulfilledRequirements} />
            <div class="switch-options">
                {item.options.map((opt, i) =>
                    <PermissionItemCheckbox key={i} item={opt} disabled={disabled} isSwitchOption />)}
            </div>
        </div>
    );
}

function PermissionItemCountry ({ item, disabled }) {
    const { permissions, memberFields } = useContext(permsEditorPermissions);
    const editorState = useContext(permsEditorState);
    const mutations = useContext(permsEditorMutations);

    const [countriesLoading, countriesError, countries] = useDataView('countries/countries');

    if (countriesLoading) return <TinyProgress />;
    if (countriesError) return <DisplayError error={countriesError} />;
    if (!countries) return null;

    const unfulfilledRequirements = getUnfulfilledRequirements(permissions, memberFields, item);
    disabled = disabled || unfulfilledRequirements.length;

    const [selectedItems, setSelectedItems] = useState([]);

    useEffect(() => {
        const items = [];
        for (const country of Object.keys(countries)) {
            if (hasPermission(permissions, memberFields, item.id + '.' + country)) {
                items.push(country);
            }
        }
        setSelectedItems(items);
    }, [permissions, memberFields]);

    const onSelectedChange = (value) => {
        mutations.mutatePerms((perms, mrFields) => {
            if (value.length === Object.keys(countries).length) {
                // all countries! add the wildcard instead
                [perms, mrFields] = addPermission(perms, mrFields, item.id + '.*');
            } else if (hasPermission(perms, mrFields, item.id + '.*')) {
                [perms, mrFields] = removePermission(perms, mrFields, item.id + '.*');
            }

            const toRemove = new Set();
            const toAdd = new Set();
            for (const country of Object.keys(countries)) {
                const id = item.id + '.' + country;
                const hasPerm = hasPermission(perms, mrFields, id);
                const shouldHavePerm = value.includes(country);
                if (hasPerm && !shouldHavePerm) {
                    toRemove.add(id);
                } else if (!hasPerm && shouldHavePerm) {
                    toAdd.add(id);
                }
            }

            // add first, then remove, to avoid weird behavior
            for (const id of toAdd) {
                [perms, mrFields] = addPermission(perms, mrFields, id);
            }
            for (const id of toRemove) {
                [perms, mrFields] = removePermission(perms, mrFields, id);
            }

            return [perms, mrFields];
        });
    };

    return (
        <div class="perms-item perms-perm-select">
            <PermissionRequirementsNotice unfulfilledRequirements={unfulfilledRequirements} />
            <label>
                {editorState.showRaw ? item.id : item.name}
            </label>
            <CountryPicker
                disabled={disabled}
                hideGroups
                value={selectedItems}
                onChange={onSelectedChange} />
        </div>
    );
}

const PermsItem = memo(function PermsItem ({ item, disabled }) {
    if (item.type === 'category') {
        const [expanded, setExpanded] = useState(true);

        return (
            <div class={'perms-category' + (expanded ? ' is-expanded' : '')} data-name={item.name}>
                <button class="category-title" onClick={() => setExpanded(!expanded)}>
                    <DisclosureArrow dir={expanded ? 'up' : 'down'} />
                    <span class="category-title-inner">{item.name}</span>
                </button>
                <MaybePermissionRequirementsNotice item={item} />
                <DynamicHeightDiv useFirstHeight lazy>
                    {expanded ? (
                        <div class="perms-category-contents">
                            {item.children.map((x, i) => <PermsItem key={i} item={x} disabled={disabled} />)}
                        </div>
                    ) : null}
                </DynamicHeightDiv>
            </div>
        );
    } else if (item.type === 'group') {
        return (
            <div class="perms-group">
                {item.name ? <div class="group-title">{item.name}</div> : null}
                <MaybePermissionRequirementsNotice item={item} />
                {item.children.map((x, i) => <PermsItem key={i} item={x} disabled={disabled} />)}
            </div>
        );
    } else if (item.type === 'switch') {
        return <PermissionItemSwitch item={item} />;
    } else if (item.type === 'perm') {
        return <PermissionItemCheckbox item={item} />;
    } else if (item.type === 'perm.country') {
        return <PermissionItemCountry item={item} />;
    } else if (item.type === '!memberRestrictionsSwitch') {
        const { isGroup } = useContext(permsEditorState);
        const { mrEnabled } = useContext(permsEditorPermissions);
        const mutations = useContext(permsEditorMutations);

        const checkboxId = useMemo(() => `perms-checkbox-${Math.random().toString(36)}`, []);
        return (
            <div class="perms-item perms-perm">
                <MaybePermissionRequirementsNotice item={item} />
                <Checkbox
                    id={checkboxId}
                    class="perm-checkbox"
                    checked={mrEnabled}
                    onClick={() => mutations.setMREnabled(!mrEnabled)} />
                <label for={checkboxId}>{item.name}</label>
                {!mrEnabled ? (
                    <div class="perm-mr-note">
                        {locale.permsEditor.mrDisabledDesc}
                    </div>
                ) : null}
                <div class="perm-mr-note">
                    {isGroup
                        ? locale.permsEditor.mrGroupDesc
                        : locale.permsEditor.mrDesc}
                </div>
            </div>
        );
    } else if (item === '!memberFieldsEditor') {
        const { mrEnabled, memberFields } = useContext(permsEditorPermissions);
        const mutations = useContext(permsEditorMutations);

        if (!mrEnabled) return null;
        return (
            <MemberFieldsEditor
                disabled={disabled}
                fields={memberFields}
                toggleField={mutations.toggleField}
                toggleAll={mutations.toggleAllFields} />
        );
    } else if (item === '!memberFilterEditor') {
        const { mrEnabled } = useContext(permsEditorPermissions);
        const memberFilter = useContext(permsEditorMemberFilter);
        const mutations = useContext(permsEditorMutations);

        if (!mrEnabled) return null;
        const defaultValue = { filter: {} };
        return (
            <MemberFilterEditor
                disabled={disabled}
                filter={memberFilter || defaultValue}
                onFilterChange={mutations.setMemberFilter} />
        );
    }
    return 'unknown perms spec type ' + item.type;
});

function MemberFieldsEditor ({ disabled, fields, toggleField, toggleAll }) {
    const items = [];
    if (fields !== null) {
        let i = 0;
        for (const [field, item] of fieldsList) {
            if (!field) {
                // not a real field
                items.push(
                    <tr key={i++}>
                        <th>{item.title}</th>
                    </tr>
                );
                continue;
            }

            let canRead = true;
            let canReadAny = false;
            let canWrite = true;
            let canWriteAny = false;
            for (const f of item.fields) {
                const r = fields[f] && fields[f].includes('r');
                const w = fields[f] && fields[f].includes('w');
                if (!r) canRead = false;
                else canReadAny = true;
                if (!w) canWrite = false;
                else canWriteAny = true;
            }

            const readCheckboxId = Math.random().toString(36);
            const writeCheckboxId = Math.random().toString(36);

            items.push(
                <tr class="member-field" key={field}>
                    <td class="field-name">{item.name}</td>
                    <td class="field-perms">
                        <Checkbox
                            id={readCheckboxId}
                            class={'perm-checkbox' + (canRead && canWrite ? ' is-implied-active' : '')}
                            disabled={disabled}
                            checked={canRead}
                            indeterminate={canReadAny && !canRead}
                            onClick={() => toggleField(field, 'r')} />
                        <label for={readCheckboxId}>
                            {memberFieldsRead}
                        </label>
                        {' \u00a0 \u00a0'}
                        <Checkbox
                            id={writeCheckboxId}
                            class="perm-checkbox"
                            disabled={disabled}
                            checked={canWrite}
                            indeterminate={canWriteAny && !canWrite}
                            onClick={() => toggleField(field, 'w')} />
                        <label for={writeCheckboxId}>
                            {memberFieldsWrite}
                        </label>
                    </td>
                </tr>
            );
        }
    }

    const toggleAllId = Math.random().toString(36);

    return (
        <div class="member-fields-container">
            <table class="member-fields">
                <thead class="member-fields-all">
                    <tr>
                        <th>
                            <Checkbox
                                id={toggleAllId}
                                class="perm-checkbox"
                                checked={fields === null}
                                onClick={toggleAll} />
                            <label for={toggleAllId}>
                                {memberFieldsAll}
                            </label>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items}
                </tbody>
            </table>
        </div>
    );
}

function MemberFilterEditor ({ disabled, filter, onFilterChange }) {
    return (
        <div class="member-filter-editor">
            <label class="filter-editor-label">{locale.permsEditor.mr}</label>
            <JSONEditor
                disabled={disabled}
                value={filter}
                onChange={onFilterChange} />
        </div>
    );
}

function RawPermissions ({ permissions }) {
    return (
        <div class="perms-editor-raw-permissions">
            {[...permissions].sort().map((perm, i) => (
                <div class="raw-perm" key={i}>
                    {perm}
                </div>
            ))}
            {!permissions.length && <div class="raw-perms-empty">{locale.permsEditor.data.empty}</div>}
        </div>
    );
}
