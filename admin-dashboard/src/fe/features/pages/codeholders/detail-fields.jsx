import { h, Component, createRef } from 'preact';
import { useState, Fragment, PureComponent, memo } from 'preact/compat';
import AddIcon from '@material-ui/icons/Add';
import PersonIcon from '@material-ui/icons/Person';
import BusinessIcon from '@material-ui/icons/Business';
import RemoveIcon from '@material-ui/icons/Remove';
import WarningIcon from '@material-ui/icons/Warning';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import { Button, CircularProgress, Checkbox, TextField, Dialog } from 'yamdl';
import { connect, coreContext } from '../../../core/connection';
import { connectPerms as connectPermsInner } from '../../../perms';
import { LinkButton } from '../../../router';
import { codeholders as locale, data as dataLocale } from '../../../locale';
import { ValidatedTextField } from '../../../components/form';
import {
    ueaCode,
    date,
    timestamp,
    address,
    country,
    email,
    phoneNumber,
    Required,
} from '../../../components/data';
import MdField from '../../../components/controls/md-field';
import SuggestionField from '../../../components/controls/suggestion-field';
import Select from '../../../components/controls/select';
import LimitedTextField from '../../../components/controls/limited-text-field';
import RearrangingList from '../../../components/lists/rearranging-list';
import TinyProgress from '../../../components/controls/tiny-progress';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import { FileIcon } from '../../../components/icons';
import ProfilePictureEditor from './profile-picture';
import Publicity from './publicity';
import { MembershipInDetailView, RolesInDetailView } from './memberships-roles';
import ChangeRequestsButton from '../change-requests/button';
import DelegationsButton from '../delegations/delegates/button';
import SubscriptionsButton from '../magazines/subscriptions/button';
import ParticipationsButton from '../congresses/participations/button';
import './detail-fields.less';

const connectPerms = (Component) => {
    const SelfConnected = connectPermsInner(({ perms, ...extra }) => {
        const selfPerms = {
            hasPerm: (...p) => perms.hasPerm(...p),
            hasCodeholderField: (f, m) => {
                if (m === 'r') return perms.hasOwnCodeholderField(f, 'r');
                else if (m === 'w') {
                    return perms.hasOwnCodeholderField(f, 'w') || perms.hasOwnCodeholderField(f, 'a');
                } else throw new Error('unimplemented');
            },
        };
        return <Component perms={selfPerms} {...extra} />;
    });
    const Connected = connectPermsInner(Component);
    return function ChPermsWrapper ({ userData, ...extra }) {
        if (userData?.isSelf) {
            return <SelfConnected userData={userData} {...extra} />;
        } else {
            return <Connected userData={userData} {...extra} />;
        }
    };
};

const makeEditable = (Renderer, Editor, History) => function EditableField ({
    value,
    onChange,
    editing,
    item,
    isHistory,
    userData,
}) {
    if (isHistory && History) return <History value={value} item={item} />;
    if (!editing) return <Renderer value={value} />;
    return <Editor value={value} item={item} onChange={onChange} userData={userData} />;
};

const makeDataEditable = (data, history) => makeEditable(data.renderer, data.editor, history);

// Lots of text fields
function lotsOfTextFields (lines, { value, onChange, ...restProps }) {
    const getKeyedValue = (value, key) => {
        let v = value;
        for (const p of key.split('.')) {
            if (!(p in v)) return null;
            v = v[p];
        }
        return v;
    };
    const replaceKeyedValue = (value, key, newValue) => {
        value = { ...value };
        const keyPath = key.split('.');
        const last = keyPath.pop();
        let v = value;
        for (const p of keyPath) {
            if (!(p in v)) return null;
            v = v[p] = { ...v[p] };
        }
        v[last] = newValue || null;
        return value;
    };

    return (
        <div {...restProps}>
            {lines.map((line, i) => (
                <div class="editor-line" key={i + (restProps.key || '')}>
                    {line.map((editor, i) => editor.component ? (
                        h(editor.component, {
                            key: i,
                            value: editor.fromValue
                                ? editor.fromValue(getKeyedValue(value, editor.key))
                                : getKeyedValue(value, editor.key),
                            item: value,
                            onChange: newValue => onChange(
                                replaceKeyedValue(
                                    value,
                                    editor.key,
                                    editor.intoValue ? editor.intoValue(newValue) : newValue,
                                )
                            ),
                            disabled: !editor.hasPerm,
                            helperLabel: !editor.hasPerm && locale.fieldEditorInsufficientPerms,
                            ...(editor.props || {}),
                        })
                    ) : (
                        <ValidatedTextField
                            disabled={!editor.hasPerm}
                            helperLabel={!editor.hasPerm && locale.fieldEditorInsufficientPerms}
                            validate={editor.validate || (() => {})}
                            key={i}
                            label={editor.label}
                            value={editor.fromValue
                                ? editor.fromValue(getKeyedValue(value, editor.key))
                                : getKeyedValue(value, editor.key)}
                            onChange={v => onChange(
                                replaceKeyedValue(
                                    value,
                                    editor.key,
                                    editor.intoValue
                                        ? editor.intoValue(v)
                                        : (v || null),
                                )
                            )}
                            {...(editor.props || {})} />
                    ))}
                </div>
            ))}
        </div>
    );
}

const validators = {
    required: (prev = (() => {})) => value => {
        prev(value);
        if (!value) return dataLocale.requiredField;
    },
};

const NameEditor = memo(connectPerms(function NameEditor ({
    perms,
    value,
    item,
    editing,
    onChange,
    noIcon,
    createHistoryLink,
    lastNamePublicity,
    onLastNamePublicityChange,
}) {
    if (!value) return null;

    // use actual type or heuristics otherwise
    const itemType = item.type || (value && ('firstLegal' in value) ? 'human' : 'org');

    if (!editing) {
        let primaryName;
        let secondaryName;
        let IconType = () => {};
        if (itemType === 'human') {
            const { honorific, first: firstName, firstLegal, last: lastName, lastLegal } = value;
            const first = firstName || firstLegal;
            const last = lastName || lastLegal;
            primaryName = '';
            primaryName += honorific || '';
            primaryName += (primaryName ? ' ' : '') + (first || '');
            primaryName += (primaryName ? ' ' : '') + (last || '');

            IconType = PersonIcon;

            if (first !== firstLegal || last !== lastLegal) {
                secondaryName = (
                    <div class="name-legal">
                        {locale.nameSubfields.legal}: <span class="name-legal-inner">
                            {firstLegal || ''} {lastLegal || ''}
                        </span>
                    </div>
                );
            }
        } else if (itemType === 'org') {
            IconType = BusinessIcon;

            primaryName = [value.full];
            if (value.abbrev) {
                primaryName.push(' ');
                primaryName.push(
                    <span class="name-abbrev" key={0}>
                        ({value.abbrev})
                    </span>
                );
            }

            if (value.local) {
                secondaryName = (
                    <div class="name-legal">
                        {locale.nameSubfields.local}: <span
                            class="name-legal-inner">
                            {value.local}
                        </span>
                    </div>
                );
            }
        }

        return (
            <div class="member-name">
                <div class="name-primary">
                    {!noIcon && <IconType className="type-icon" />}
                    {primaryName}
                    {(itemType === 'human') && (
                        <Publicity value={lastNamePublicity} style="icon" />
                    )}
                    {!noIcon && createHistoryLink('name')}
                </div>
                {secondaryName}
            </div>
        );
    } else if (itemType === 'human') {
        const lotf = lotsOfTextFields([
            [
                {
                    component: SuggestionField,
                    key: 'honorific',
                    props: {
                        maxLength: 15,
                        suggestions: locale.honorificSuggestions,
                        label: locale.nameSubfields.honorific,
                    },
                    hasPerm: perms.hasCodeholderField('honorific', 'w'),
                },
            ],
            [
                {
                    key: 'firstLegal',
                    label: <Required>{locale.nameSubfields.firstLegal}</Required>,
                    props: { maxLength: 50 },
                    validate: validators.required(),
                    hasPerm: perms.hasCodeholderField('firstNameLegal', 'w'),
                },
                {
                    key: 'lastLegal',
                    label: locale.nameSubfields.lastLegal,
                    props: { maxLength: 50 },
                    hasPerm: perms.hasCodeholderField('lastNameLegal', 'w'),
                },
            ],
            [
                {
                    key: 'first',
                    label: locale.nameSubfields.first,
                    props: { maxLength: 50 },
                    hasPerm: perms.hasCodeholderField('firstName', 'w'),
                },
                {
                    key: 'last',
                    label: locale.nameSubfields.last,
                    props: { maxLength: 50 },
                    hasPerm: perms.hasCodeholderField('lastName', 'w'),
                },
            ],
        ], {
            value,
            onChange,
            class: 'member-name editing',
            key: 'human',
        });

        let lastNamePublicityNode;
        if (lastNamePublicity && perms.hasPerm('lastNamePublicity', 'w')) {
            lastNamePublicityNode = (
                <div class="last-name-publicity-editor">
                    <label>{locale.fields.lastNamePublicity}</label>
                    <Publicity
                        value={lastNamePublicity}
                        onChange={onLastNamePublicityChange}
                        editing={true}
                        style="icon" />
                </div>
            );
        }

        return (
            <Fragment>
                {lotf}
                {lastNamePublicityNode}
            </Fragment>
        );
    } else if (itemType === 'org') {
        return lotsOfTextFields([
            [
                {
                    key: 'full',
                    label: <Required>{locale.nameSubfields.full}</Required>,
                    props: {
                        maxLength: 100,
                        validatorProps: { class: 'full-name-editor' },
                    },
                    validate: validators.required(),
                    hasPerm: perms.hasCodeholderField('fullName', 'w'),
                },
            ],
            [
                {
                    key: 'local',
                    label: <Required>{locale.nameSubfields.local}</Required>,
                    props: {
                        maxLength: 100,
                        validatorProps: { class: 'full-name-editor' },
                    },
                    hasPerm: perms.hasCodeholderField('fullNameLocal', 'w'),
                },
            ],
            [
                {
                    key: 'abbrev',
                    label: locale.nameSubfields.abbrev,
                    props: { maxLength: 12 },
                    hasPerm: perms.hasCodeholderField('nameAbbrev', 'w'),
                },
            ],
        ], {
            value,
            onChange,
            class: 'member-name editing',
            key: 'org',
        });
    }
}));

const CodeEditor = memo(connectPerms(function CodeEditor ({
    perms, value, item, originalItem, editing, onChange,
}) {
    if (!value) return null;
    if (!editing) {
        return <ueaCode.renderer value={value.new} value2={value.old} />;
    }
    if (editing && !perms.hasCodeholderField('newCode', 'w')) return null;

    // keep own code as a suggestion
    const keepSuggestions = [];
    if (originalItem && originalItem.code) keepSuggestions.push(originalItem.code.new);

    return <ueaCode.editor
        // due to migration using the old format for new codes, some codes may be technically
        // invalid. we'll leave them be
        skipValidationIfUnchanged

        value={value.new}
        onChange={v => onChange({ ...value, new: v })}
        id={item.id}
        suggestionParameters={item}
        keepSuggestions={keepSuggestions} />;
}));

class FileCounter extends PureComponent {
    state = { count: NaN };

    static contextType = coreContext;

    #updateView;
    reinit () {
        if (this.#updateView) this.#updateView.drop();
        this.#updateView = this.context.createDataView('codeholders/codeholderSigFiles', {
            id: this.props.id,
        });
        this.#updateView.on('update', this.load);
        this.load();
    }
    load = () => {
        this.context.createTask('codeholders/listFiles', { id: this.props.id }, {
            offset: 0,
            limit: 1,
        }).runOnceAndDrop().then(({ total }) => {
            this.setState({ count: total });
        }).catch(console.error); // eslint-disable-line no-console
    };
    componentDidMount () {
        this.reinit();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.id !== this.props.id) this.reinit();
    }
    componentWillUnmount () {
        if (this.#updateView) this.#updateView.drop();
    }

    render ({ children }, { count }) {
        return children(count);
    }
}

const FilesButton = memo(function FilesButton ({ id }) {
    return (
        <div class="info-button-container">
            <LinkButton class="info-button member-files-button" target={`/membroj/${id}/dosieroj`} raised>
                <span class="file-icon-container">
                    <FileIcon />
                </span>
                <FileCounter id={id}>
                    {fileCount => locale.filesButton(fileCount)}
                </FileCounter>
            </LinkButton>
        </div>
    );
});

export const Header = memo(connectPerms(connect('login')(login => ({ login }))(function Header ({
    item,
    originalItem,
    editing,
    onItemChange,
    createHistoryLink,
    canReadHistory,
    perms,
    userData,
    login,
}) {
    // field callbacks for detail view
    if (userData && userData.onHasEmail) userData.onHasEmail(!!item.email);
    if (userData && userData.onHasPassword) userData.onHasPassword(!!item.hasPassword);

    let pictureMeta = null;
    if (!editing) {
        let pub;
        let histLink;
        if (perms.hasCodeholderField('profilePicturePublicity', 'r')) {
            pub = <Publicity value={item.profilePicturePublicity} style="icon" />;
        }
        if (canReadHistory && perms.hasCodeholderField('profilePictureHash', 'r')) {
            histLink = createHistoryLink('profilePictureHash');
        }
        if (pub || histLink) {
            pictureMeta = (
                <div class="picture-meta">
                    {pub}
                    {histLink}
                </div>
            );
        }
    }

    return (
        <div class="member-header-container">
            {(item.id === login?.id) ? <IsSelfBanner /> : null}
            <div class="member-header">
                <div class="member-picture">
                    <ProfilePictureEditor
                        id={userData?.isSelf ? 'self' : item.id}
                        editing={editing}
                        profilePictureHash={item.profilePictureHash}
                        canEdit={(perms.hasPerm('codeholders.update') || userData?.isSelf) && perms.hasCodeholderField('profilePicture', 'w')}
                        createHistoryLink={createHistoryLink} />
                    {pictureMeta}
                    {editing && perms.hasCodeholderField('profilePicturePublicity', 'w') && <Publicity
                        value={item.profilePicturePublicity}
                        editing={true}
                        onChange={v => onItemChange({ ...item, profilePicturePublicity: v })}
                        types={['members', 'public']}
                        style="icon" />}
                </div>
                <div class="member-info">
                    <NameEditor
                        value={item.name}
                        item={item}
                        editing={editing}
                        onChange={name => onItemChange({ ...item, name })}
                        lastNamePublicity={item.lastNamePublicity}
                        onLastNamePublicityChange={v => onItemChange({ ...item, lastNamePublicity: v })}
                        createHistoryLink={createHistoryLink}
                        userData={userData} />
                    <div class="member-code">
                        <CodeEditor
                            value={item.code}
                            item={item}
                            originalItem={originalItem}
                            editing={editing}
                            onChange={code => onItemChange({ ...item, code })}
                            userData={userData} />
                        {!editing && createHistoryLink('code')}
                    </div>
                    <div class="info-membership-roles">
                        {!editing && perms.hasCodeholderField('membership', 'r') && (
                            <MembershipInDetailView
                                id={item.id}
                                canEdit={perms.hasPerm('codeholders.update')} />
                        )}
                        {!editing && perms.hasCodeholderField('roles', 'r') && perms.hasPerm('codeholder_roles.read') && (
                            <RolesInDetailView
                                id={item.id}
                                canEdit={perms.hasPerm('codeholder_roles.update')} />
                        )}
                    </div>
                    {!editing && (
                        <div class="info-buttons">
                            {perms.hasCodeholderField('files', 'r') && (
                                <FilesButton id={item.id} />
                            )}
                            {perms.hasPerm('codeholders.change_requests.read') && (
                                <ChangeRequestsButton id={userData?.isSelf ? 'self' : item.id} />
                            )}
                            {/* FIXME better perm check across orgs */}
                            {perms.hasPerm('codeholders.delegations.read.uea') && (
                                <DelegationsButton id={userData?.isSelf ? 'self' : item.id} />
                            )}
                            {perms.hasCodeholderField('roles', 'r')
                                && (perms.hasPerm('magazines.subscriptions.read.uea')
                                || perms.hasPerm('magazines.subscriptions.read.tejo')) && (
                                <SubscriptionsButton id={userData?.isSelf ? 'self' : item.id} />
                            )}
                            {(perms.hasPerm('congress_instances.participants.read.uea')
                                || perms.hasPerm('congress_instances.participants.read.tejo')) && (
                                <ParticipationsButton id={userData?.isSelf ? 'self' : item.id} />
                            )}
                        </div>
                    )}
                </div>
                <div class="decorative-flourish" />
            </div>
        </div>
    );
})));

function IsSelfBanner () {
    return (
        <div class="is-self-banner">
            <div class="inner-card">
                <div class="inner-title">{locale.detailIsSelf.title}</div>
                <div class="inner-description">{locale.detailIsSelf.description}</div>
            </div>
        </div>
    );
}

export class CodeholderAddressRenderer extends PureComponent {
    state = {
        address: null,
        postalOpen: false,
        postalLang: 'eo',
        postalAddress: null,
    };

    static contextType = coreContext;

    componentDidMount () {
        this.load();
    }
    componentDidUpdate (prevProps) {
        if (prevProps.id !== this.props.id) this.load();
    }
    componentWillUnmount () {
        clearTimeout(this.reloadTimeout);
        clearTimeout(this.reloadTimeout2);
    }

    load () {
        if (!this.props.id) return;
        const id = this.props.id;

        this.context.createTask('codeholders/address', { id: this.props.id }).runOnceAndDrop().then(res => {
            if (id !== this.props.id) return;
            this.setState({ address: res });
        }).catch(() => {
            this.reloadTimeout = setTimeout(() => this.load(), 1000);
        });
    }

    loadPostal () {
        if (!this.props.id) return;

        const id = this.props.id;
        const lang = this.state.postalLang;
        this.setState({ postalAddress: '' }, () => {
            this.context.createTask('codeholders/address', { id: this.props.id }, {
                lang,
                postal: true,
            }).runOnceAndDrop().then(res => {
                if (id !== this.props.id || lang !== this.state.postalLang) return;
                this.setState({ postalAddress: res });
            }).catch(() => {
                this.reloadTimeout2 = setTimeout(() => this.loadPostal(), 1000);
            });
        });
    }

    render () {
        if (!this.state.address) return <TinyProgress />;
        return (
            <div class="codeholder-address-rendered">
                {this.state.address
                    .split('\n')
                    .map((x, i) => (<div class="address-line" key={i}>{x}</div>))}
                <Button
                    class="address-postal-button"
                    onClick={() => {
                        this.setState({ postalOpen: true });
                        this.loadPostal();
                    }}>
                    {locale.postalAddress}
                </Button>

                <Dialog
                    // FIXME: this is kind of a terrible hack
                    class="codeholder-postal-address-dialog"
                    backdrop
                    open={this.state.postalOpen}
                    onClose={() => this.setState({ postalOpen: false })}
                    title={locale.postalAddress}>
                    {locale.postalLocale}{' '}
                    <Select
                        value={this.state.postalLang}
                        onChange={postalLang => {
                            this.setState({ postalLang }, () => this.loadPostal());
                        }}
                        items={Object.entries(locale.csvOptions.countryLocales)
                            .map(([k, v]) => ({ value: k, label: v }))} />

                    <textarea
                        class="postal-address"
                        value={this.state.postalAddress}
                        spellCheck="false"
                        onFocus={e => e.target.select()}
                        onMouseUp={e => setImmediate(() => e.target.select())}
                        onChange={() => this.forceUpdate()} />
                </Dialog>
            </div>
        );
    }
}

class FeeCountryEditor extends PureComponent {
    state = {
        addrCountryChanged: false,
    };

    lastMatchedAddrCountry = null;

    componentDidMount () {
        this.updateMatch();
    }
    componentDidUpdate () {
        this.updateMatch();
    }

    updateMatch () {
        const addrCountry = this.props.item.address?.country;
        if (addrCountry && this.lastMatchedAddrCountry) {
            if (this.lastMatchedAddrCountry !== addrCountry && !this.state.addrCountryChanged) {
                if (this.props.value === addrCountry) {
                    this.lastMatchedAddrCountry = addrCountry;
                } else {
                    this.setState({ addrCountryChanged: true });
                }
            } else if (this.lastMatchedAddrCountry === addrCountry && this.state.addrCountryChanged) {
                this.setState({ addrCountryChanged: false });
            }
        } else if (this.state.addrCountryChanged) {
            this.setState({ addrCountryChanged: false });
        }

        if (!this.lastMatchedAddrCountry) {
            this.lastMatchedAddrCountry = addrCountry;
        }
    }

    ignoreCountryChange = () => {
        this.lastMatchedAddrCountry = this.props.item.address?.country || null;
        this.setState({ addrCountryChanged: false });
    };
    applyCountryChange = () => {
        this.lastMatchedAddrCountry = this.props.item.address?.country || null;
        this.props.onChange(this.lastMatchedAddrCountry);
    };

    render ({ value, editing, onChange }) {
        if (!editing) return <country.renderer value={value} />;

        return (
            <div class="fee-country-editor">
                <country.editor value={value} onChange={onChange} />
                <DynamicHeightDiv lazy>
                    {this.state.addrCountryChanged && (
                        <div class="country-change-notice-container">
                            <div class="country-change-notice">
                                <div class="inner-description">
                                    {locale.countryChangeNotice.description}
                                </div>
                                <div class="inner-buttons">
                                    <Button onClick={this.ignoreCountryChange}>
                                        {locale.countryChangeNotice.no}
                                    </Button>
                                    <Button onClick={this.applyCountryChange}>
                                        {locale.countryChangeNotice.yes}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DynamicHeightDiv>
            </div>
        );
    }
}

function simpleField (component, extra) {
    return {
        component,
        ...extra,
    };
}

function makePhoneHistory (fieldName) {
    return ({ value, item }) => (
        <Fragment>
            <Publicity value={item[fieldName + 'Publicity']} style="icon" />
            {' '}
            <phoneNumber.renderer value={value} />
        </Fragment>
    );
}

function permsEditable (field, Component) {
    return connectPerms(({ perms, editing, ...props }) => {
        if (editing && !perms.hasCodeholderField(field, 'w')) editing = false;
        return <Component editing={editing} {...props} />;
    });
}

class ValidatedEmailEditor extends PureComponent {
    state = {
        checking: false,
        taken: false,
        error: false,
    };

    static contextType = coreContext;
    textField = createRef();

    checkId = 0;
    checkTaken () {
        const checkId = ++this.checkId;
        this.setState({ checking: true, error: false });

        if (!this.props.value || !this.textField.current?.inputNode?.checkValidity()) {
            // show nothing
            this.setState({ checking: false, error: true });
            return;
        }

        this.context.createTask('codeholders/list', {}, {
            jsonFilter: {
                filter: {
                    email: this.props.value,
                },
            },
            limit: 1,
        }).runOnceAndDrop().then(result => {
            if (this.checkId !== checkId) return;
            const taken = result.items.length && result.items[0] !== this.props.item.id;
            this.setState({ checking: false, taken });
        }).catch(err => {
            if (this.checkId !== checkId) return;
            console.error('failed to check email taken', err); // eslint-disable-line no-console
            this.setState({ checking: false, error: true });
        });
    }

    scheduledCheck = null;
    scheduleCheckTaken () {
        if (!this.scheduledCheck) {
            this.scheduledCheck = setTimeout(() => {
                this.scheduledCheck = null;
                this.checkTaken();
            }, 400);
        }
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value) {
            this.scheduleCheckTaken();
        }
    }

    render ({ value, onChange, userData }) {
        let trailing, errorLabel;
        if (this.state.checking) trailing = <CircularProgress small indeterminate />;
        else if (this.state.error) trailing = null;
        else if (this.state.taken) {
            trailing = <CloseIcon className="is-taken" style={{ verticalAlign: 'middle' }} />;
            errorLabel = locale.fields.emailTakenError;
        } else {
            trailing = <CheckIcon className="is-valid" style={{ verticalAlign: 'middle' }} />;
        }

        return <ValidatedTextField
            ref={this.textField}
            required={!!userData?.forceRequireEmail}
            trailing={
                <span class="trailing-validation-status">
                    {trailing}
                </span>
            }
            error={errorLabel}
            validate={() => {
                if (this.state.taken) {
                    return locale.fields.emailTakenError;
                }
            }}
            class="codeholder-validated-email-editor"
            value={value}
            onChange={v => onChange(v || null)}
            type="email" />;
    }
}

export const fields = {
    // for field history
    name: {
        component ({ value, item, editing, onChange }) {
            if (!value) return null;
            return (
                <NameEditor
                    value={value}
                    editing={editing}
                    onChange={onChange}
                    lastNamePublicity={item.lastNamePublicity}
                    item={item}
                    noIcon />
            );
        },
        shouldHide: (item, editing, userData) => userData ? !userData.forceShowName : true,
        hasPerm: 'self',
        history: true,
    },
    code: {
        component ({ value, item }) {
            if (!value) return null;
            return <CodeEditor value={value} item={item} />;
        },
        shouldHide: () => true,
        hasPerm: 'self',
        history: true,
    },
    profilePictureHash: {
        component ({ value, item }) {
            let formattedValue;
            let hash;
            if (value === null) {
                formattedValue = locale.profilePictureHashNone;
                hash = '';
            } else {
                formattedValue = locale.profilePictureHashSome;
                hash = Buffer.from(value).toString('hex');
            }

            return (
                <div class="profile-picture-hash" title={hash}>
                    {formattedValue}
                    {' '}
                    <Publicity value={item.profilePicturePublicity} style="icon" />
                </div>
            );
        },
        shouldHide: () => true,
        hasPerm: 'self',
        history: true,
    },
    // --
    enabled: {
        component: permsEditable('enabled', ({ value, editing, onChange }) => {
            if (!editing && !value) return '—';
            return (
                <Checkbox
                    class={!editing ? 'fixed-checkbox' : ''}
                    checked={value}
                    onChange={enabled => editing && onChange(enabled)} />
            );
        }),
        isEmpty: () => false,
        hasPerm: 'self',
        history: true,
    },
    hasPassword: simpleField(function ({ value }) {
        return <Checkbox class="fixed-checkbox" checked={value} />;
    }, {
        isEmpty: value => !value,
        shouldHide: (_, editing) => editing,
        hasPerm: 'self',
    }),
    creationTime: {
        component ({ value }) {
            if (!value) return '—';
            return <timestamp.renderer value={value} />;
        },
        shouldHide: (_, editing) => editing,
        hasPerm: 'self',
    },
    isDead: {
        component: permsEditable('isDead', ({ value, editing, item, onItemChange }) => {
            if (!editing && !value) return '—';
            return (
                <Checkbox
                    class={!editing ? 'fixed-checkbox' : ''}
                    checked={value}
                    onChange={isDead => {
                        if (!editing) return;
                        if (!isDead) onItemChange({ ...item, isDead, deathdate: null });
                        else onItemChange({ ...item, isDead });
                    }} />
            );
        }),
        hasPerm: 'self',
        history: true,
        renderLabel: ({ item }) => {
            if (item.type === 'org') return locale.fields.isDeadOrg;
            return locale.fields.isDead;
        },
    },
    birthdate: {
        component: permsEditable('birthdate', ({ value, editing, onChange, item, userData }) => {
            if (editing) {
                let maxDate = new Date();
                if (item.deathdate && new Date(item.deathdate) < maxDate) maxDate = new Date(item.deathdate);

                return (
                    <date.editor
                        required={!!userData?.forceRequireBirthdate}
                        value={value}
                        max={maxDate}
                        onChange={onChange} />
                );
            }

            if (!value) return '—';

            const age = item.age && item.age.now !== null
                ? locale.fields.ageFormat(item.age.now, item.age.atStartOfYear)
                : null;

            let additional = null;
            if (age) additional = ' · ' + locale.fields.age + ': ' + age;

            return (
                <span class="birth-date">
                    <date.renderer value={value} />
                    {additional}
                </span>
            );
        }),
        shouldHide: item => item.type !== 'human',
        hasPerm: 'self',
        history: true,
    },
    careOf: simpleField(permsEditable('careOf', function ({ value, editing, onChange }) {
        if (!editing) return value;
        return <LimitedTextField value={value} onChange={v => onChange(v || null)} maxLength={50} />;
    }), {
        shouldHide: item => item.type !== 'org',
        hasPerm: 'self',
        history: true,
    }),
    deathdate: {
        component: permsEditable('deathdate', function ({ value, editing, item, onItemChange }) {
            if (editing) {
                return <date.editor
                    value={value}
                    min={item.birthdate ? new Date(item.birthdate) : null}
                    max={new Date()}
                    onChange={v => {
                        if (v) {
                            onItemChange({ ...item, isDead: true, deathdate: v });
                        } else {
                            onItemChange({ ...item, deathdate: null });
                        }
                    }}/>;
            }
            if (!value) return '—';
            return <date.renderer value={value} />;
        }),
        hasPerm: 'self',
        history: true,
        renderLabel: ({ item }) => {
            if (item.type === 'org') return locale.fields.deathdateOrg;
            return locale.fields.deathdate;
        },
    },
    email: simpleField(permsEditable('email', makeDataEditable({
        renderer: email.renderer,
        inlineRenderer: email.inlineRenderer,
        editor: ValidatedEmailEditor,
    }, ({ value, item }) => (
        <Fragment>
            <Publicity value={item.emailPublicity} style="icon" />
            {' '}
            <email.renderer value={value} />
        </Fragment>
    ))), {
        extra: connectPerms(({ perms, item, editing, onItemChange }) => (
            <Publicity
                value={item.emailPublicity}
                onChange={v => onItemChange({ ...item, emailPublicity: v })}
                editing={editing && perms.hasCodeholderField('emailPublicity', 'w')}
                style="icon" />
        )),
        history: true,
        hasPerm: 'self',
        sectionMarkerAbove: locale.fields.sections.contact,
    }),
    cellphone: simpleField(permsEditable('cellphone', makeDataEditable(phoneNumber, makePhoneHistory('cellphone'))), {
        isEmpty: value => !value.value,
        shouldHide: item => item.type !== 'human',
        extra: connectPerms(({ perms, item, editing, onItemChange }) => (
            <Publicity
                value={item.cellphonePublicity}
                onChange={v => onItemChange({ ...item, cellphonePublicity: v })}
                editing={editing && perms.hasCodeholderField('cellphonePublicity', 'w')}
                style="icon" />
        )),
        history: true,
        hasPerm: 'self',
    }),
    landlinePhone: simpleField(permsEditable('landlinePhone', makeDataEditable(phoneNumber, makePhoneHistory('landlinePhone'))), {
        isEmpty: value => !value.value,
        shouldHide: item => item.type !== 'human',
        extra: connectPerms(({ perms, item, editing, onItemChange }) => (
            <Publicity
                value={item.landlinePhonePublicity}
                onChange={v => onItemChange({ ...item, landlinePhonePublicity: v })}
                editing={editing && perms.hasCodeholderField('landlinePhonePublicity', 'w')}
                style="icon" />
        )),
        history: true,
        hasPerm: 'self',
    }),
    officePhone: simpleField(permsEditable('officePhone', makeDataEditable(phoneNumber, makePhoneHistory('officePhone'))), {
        isEmpty: value => !value.value,
        extra: connectPerms(({ perms, item, editing, onItemChange }) => (
            <Publicity
                value={item.officePhonePublicity}
                onChange={v => onItemChange({ ...item, officePhonePublicity: v })}
                editing={editing && perms.hasCodeholderField('officePhonePublicity', 'w')}
                style="icon" />
        )),
        history: true,
        hasPerm: 'self',
    }),
    feeCountry: {
        sectionMarkerAbove: locale.fields.sections.location,
        component: permsEditable('feeCountry', FeeCountryEditor),
        history: true,
        hasPerm: 'self',
    },
    address: {
        component: connectPerms(({ value, item, editing, onChange, isHistory, perms, userData }) => {
            if (isHistory) {
                return (
                    <Fragment>
                        <Publicity value={item.addressPublicity} style="icon" />
                        <address.renderer value={value} />
                    </Fragment>
                );
            }

            if (!editing) {
                if (userData && userData.useLocalAddress) {
                    return <address.renderer value={value} />;
                }
                return <CodeholderAddressRenderer id={item.id} />;
            } else {
                const readableMask = [
                    'country', 'countryArea', 'city', 'cityArea', 'streetAddress', 'postalCode',
                    'sortingCode',
                ].filter(x => perms.hasCodeholderField(`address.${x}`, 'r') || perms.hasCodeholderField('address', 'r'));
                const editableMask = [
                    'country', 'countryArea', 'city', 'cityArea', 'streetAddress', 'postalCode',
                    'sortingCode',
                ].filter(x => perms.hasCodeholderField(`address.${x}`, 'w') || perms.hasCodeholderField('address', 'w'));

                return <address.editor
                    value={value}
                    onChange={onChange}
                    readableMask={readableMask}
                    editableMask={editableMask} />;
            }
        }),
        isEmpty: value => !value || !Object.values(value).filter(x => x).length,
        extra: connectPerms(({ perms, item, editing, onItemChange }) => (
            <Publicity
                value={item.addressPublicity}
                onChange={v => onItemChange({ ...item, addressPublicity: v })}
                editing={editing && perms.hasCodeholderField('addressPublicity', 'w')}
                style="icon" />
        )),
        history: true,
        hasPerm: 'self',
    },
    addressInvalid: simpleField(function ({ value, editing, onChange, slot }) {
        if (editing) {
            return <Checkbox checked={value} onChange={onChange} />;
        }
        if (value && slot === 'detail') {
            return (
                <div class="codeholder-address-invalid-warning">
                    <div class="inner-icon-container">
                        <WarningIcon />
                    </div>
                    <div class="inner-content">
                        <div class="inner-title">{locale.addressInvalid.title}</div>
                        <div class="inner-desc">{locale.addressInvalid.description}</div>
                    </div>
                </div>
            );
        }
        return value ? <Checkbox class="fixed-checkbox" checked={value} /> : '—';
    }, {
        shouldHide: ({ addressInvalid }, editing) => !editing && !addressInvalid,
        hasPerm: 'self',
    }),
    publicCountry: {
        component: permsEditable('publicCountry', makeDataEditable(country)),
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        history: true,
        hasPerm: 'self',
    },
    publicEmail: {
        component: permsEditable('publicEmail', makeDataEditable(email)),
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        history: true,
        hasPerm: 'self',
        sectionMarkerAbove: locale.fields.sections.factoids,
    },
    profession: simpleField(permsEditable('profession', function ({ value, editing, onChange }) {
        if (!editing) return value;
        return <LimitedTextField value={value} onChange={v => onChange(v || null)} maxLength={50} />;
    }), {
        shouldHide: item => item.type !== 'human',
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        history: true,
        hasPerm: 'self',
    }),
    website: simpleField(permsEditable('website', function ({ value, editing, onChange }) {
        if (!editing) {
            return (
                <a
                    class="codeholder-website-link"
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer">
                    {value}
                </a>
            );
        }
        return <LimitedTextField
            value={value}
            onChange={v => onChange(v || null)}
            maxLength={50}
            onBlur={() => {
                // prepend protocol if it’s missing
                if (value && !value.includes('://')) {
                    onChange('https://' + value);
                }
            }} />;
    }), {
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        history: true,
        hasPerm: 'self',
    }),
    biography: {
        component: permsEditable('biography', ({ value, editing, onChange }) => {
            if (!editing) {
                if (!value) return null;
                return (
                    <div class="member-biography">
                        {value.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
                    </div>
                );
            } else {
                return (
                    <div class="member-biography">
                        <textarea
                            value={value}
                            maxLength={2000}
                            onKeyDown={e => e.stopPropagation()}
                            onChange={e => onChange(e.target.value || null)} />
                    </div>
                );
            }
        }),
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        history: true,
        hasPerm: 'self',
    },
    mainDescriptor: {
        component: permsEditable('mainDescriptor', ({ value, editing, onChange }) => {
            if (!editing) return value;
            return <LimitedTextField value={value} onChange={v => onChange(v || null)} maxLength={80} />;
        }),
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        shouldHide: item => item.type !== 'org',
        history: true,
        hasPerm: 'self',
    },
    factoids: {
        component: permsEditable('factoids', ({ value, editing, onChange }) => {
            return <FactoidsEditor value={value} editing={editing} onChange={onChange} />;
        }),
        extra: ({ editing }) => <Publicity value="public" editing={editing} style="icon" />,
        shouldHide: item => item.type !== 'org',
        history: true,
        hasPerm: 'self',
    },
    notes: {
        sectionMarkerAbove: locale.fields.sections.admin,
        component: permsEditable('notes', ({ value, editing, onChange }) => {
            if (!editing) {
                if (!value) return null;
                return (
                    <div class="member-notes">
                        {value.split('\n').map((l, i) => <span key={i}>{l}<br /></span>)}
                    </div>
                );
            } else {
                return (
                    <div class="member-notes">
                        <textarea
                            value={value}
                            maxLength={10000}
                            onKeyDown={e => e.stopPropagation()}
                            onChange={e => onChange(e.target.value || null)} />
                    </div>
                );
            }
        }),
        history: true,
        hasPerm: 'self',
    },
    // for field history only
    password: {
        component: () => '••••••••',
        shouldHide: () => true,
    },
};

function FactoidsEditor ({ value, editing, onChange }) {
    const [keyIdMap] = useState(new WeakMap());
    value = value || {};
    const keys = Object.keys(value);

    for (const k of keys) {
        if (!keyIdMap.has(value[k])) keyIdMap.set(value[k], Math.random());
    }

    const items = keys.map(key => (
        <FactoidEditor
            key={keyIdMap.get(value[key])}
            k={key}
            v={value[key]}
            editing={editing}
            onKeyChange={newKey => {
                if (keys.includes(newKey)) return false;
                const newKeys = keys.slice();
                newKeys[newKeys.indexOf(key)] = newKey;
                onChange(Object.fromEntries(newKeys.map(k => [k, k === newKey ? value[key] : value[k]])));
                return true;
            }}
            onValueChange={v => {
                keyIdMap.set(v, keyIdMap.get(value[key]));
                onChange({ ...value, [key]: v });
            }}
            onDelete={() => {
                const newKeys = keys.slice();
                newKeys.splice(newKeys.indexOf(key), 1);
                onChange(newKeys.length ? Object.fromEntries(newKeys.map(k => [k, value[k]])) : null);
            }} />
    ));

    if (editing && keys.length < 15) items.push(
        <Button class="factoid-add" key="\nadd" icon small onClick={() => {
            let key = '';
            let i = keys.length + 1;
            while (keys.includes(key)) key = locale.factoids.newDupKeyName(i++);
            onChange({ ...value, [key]: { type: 'text', val: '' } });
        }}>
            <AddIcon />
        </Button>
    );

    return (
        <div class={'codeholder-factoids-editor' + (editing ? ' is-editing' : '')}>
            <RearrangingList
                isItemDraggable={index => index < keys.length && editing}
                spacing={4}
                canMove={pos => pos < keys.length}
                onMove={(fromPos, toPos) => {
                    const newKeys = keys.slice();
                    newKeys.splice(toPos, 0, newKeys.splice(fromPos, 1));
                    onChange(Object.fromEntries(newKeys.map(k => [k, value[k]])));
                }}>
                {items}
            </RearrangingList>
        </div>
    );
}
function FactoidEditor ({ k, v, onKeyChange, onValueChange, onDelete, editing }) {
    // if this is a new item and has a weird internal name, we'll set keyDup to ''
    const [keyDup, setKeyDup] = useState(null);
    const keyDupEnabled = keyDup !== null;

    let editor = null;
    if (v.type === 'tel') {
        if (editing) {
            editor = <phoneNumber.editor
                outline
                value={{ value: v.val }}
                onChange={val => onValueChange({ ...v, val: (val.value || '+').replace(/\s+/g, '') })}
                placeholder={locale.factoids.placeholders.tel} />;
        } else {
            editor = <phoneNumber.renderer value={{ value: v.val }} />;
        }
    } else if (v.type === 'text') {
        editor = <MdField
            outline
            maxLength={1500}
            editing={editing}
            value={v.val}
            onChange={val => onValueChange({ ...v, val })}
            rules={['emphasis', 'strikethrough', 'link']} />;
    } else if (v.type === 'number') {
        if (editing) {
            editor = <TextField
                outline
                maxLength={1500}
                type="number"
                value={v.val}
                onChange={value => {
                    if (value === v.val.toString()) return;
                    if (Number.isFinite(+value)) {
                        onValueChange({ ...v, val: +value });
                    }
                }} />;
        } else {
            editor = `${v.val}`;
        }
    } else if (v.type === 'email') {
        if (editing) {
            editor = <TextField
                outline
                maxLength={1500}
                type="email"
                value={v.val}
                onChange={value => onValueChange({ ...v, val: value })}
                placeholder={locale.factoids.placeholders.email} />;
        } else {
            editor = `${v.val}`;
        }
    } else if (v.type === 'url') {
        if (editing) {
            editor = <TextField
                outline
                maxLength={1500}
                type="url"
                value={v.val}
                onChange={value => onValueChange({ ...v, val: value })}
                placeholder={locale.factoids.placeholders.url} />;
        } else {
            editor = `${v.val}`;
        }
    }

    return (
        <div class={'factoid-editor' + (editing ? ' is-editing' : '')}>
            <div class="factoid-header">
                {editing ? (
                    <Button class="factoid-delete" icon small onClick={onDelete}>
                        <RemoveIcon />
                    </Button>
                ) : null}
                {editing ? (
                    <LimitedTextField
                        class="factoid-label-editor"
                        outline
                        error={keyDupEnabled ? locale.factoids.duplicateKey : null}
                        value={keyDupEnabled ? keyDup : k}
                        onChange={k => {
                            if (onKeyChange(k)) {
                                setKeyDup(null);
                            } else {
                                setKeyDup(k);
                            }
                        }}
                        maxLength={50} />
                ) : (
                    <span class="factoid-label">
                        {k}
                    </span>
                )}
            </div>
            <div class="factoid-value" data-type={v.type}>
                {editing ? (
                    <Select
                        outline
                        class="factoid-type-select"
                        value={v.type}
                        onChange={type => {
                            if (type === v.type) return;
                            if (type === 'tel') onValueChange({ type, val: '+' });
                            if (type === 'text') onValueChange({ type, val: '' });
                            if (type === 'number') onValueChange({ type, val: 0 });
                            if (type === 'email') onValueChange({ type, val: '' });
                            if (type === 'url') onValueChange({ type, val: '' });
                        }}
                        items={Object.keys(locale.factoids.types).map(k => ({
                            value: k,
                            label: locale.factoids.types[k],
                        }))} />
                ) : null}
                <div class="value-container">
                    {editor}
                </div>
            </div>
        </div>
    );
}

export const Footer = () => null;
