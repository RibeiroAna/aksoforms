import { h } from 'preact';
import { lazy, Suspense } from 'preact/compat';
import { Button, CircularProgress, Checkbox, TextField } from 'yamdl';
import CheckIcon from '@material-ui/icons/Check';
import { CopyIcon } from '../../../../../components/icons';
import CodeholderPicker from '../../../../../components/pickers/codeholder-picker';
import Segmented from '../../../../../components/controls/segmented';
import TextArea from '../../../../../components/controls/text-area';
import NumberField from '../../../../../components/controls/number-field';
import { IdUEACode } from '../../../../../components/data/uea-code';
import { LinkButton } from '../../../../../router';
import { currencyAmount, timestamp } from '../../../../../components/data';
import { congressParticipants as locale, formEditor as formLocale } from '../../../../../locale';
import { usePerms } from '../../../../../perms';
import './fields.less';

const FormEditor = lazy(() => import('../../../../../components/form-editor'));

export const FIELDS = {
    dataId: {
        weight: 2,
        component ({ value, slot }) {
            return (
                <span class="congress-participant-data-id">
                    <span class="inner-data-id">{value}</span>

                    {slot === 'detail' && navigator.clipboard && navigator.clipboard.writeText ? (
                        <Button class="id-copy-button" icon small onClick={() => {
                            navigator.clipboard.writeText(value).catch(console.error); // eslint-disable-line no-console
                            // TODO: create toast
                        }}>
                            <CopyIcon style={{ verticalAlign: 'middle' }} />
                        </Button>
                    ) : null}
                </span>
            );
        },
        stringify: v => v,
    },
    identity: {
        weight: 1.5,
        isEmpty: () => false,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            const perms = usePerms();

            if (!value && !editing) return;
            value = value || {};
            let codeholder = null;
            if (editing) {
                codeholder = (
                    <CodeholderPicker
                        limit={1}
                        value={value.codeholder ? [value.codeholder] : []}
                        onChange={v => {
                            if (v.length) onChange({ ...value, codeholder: +v[0] });
                            else onChange({ ...value, codeholder: null });
                        }} />
                );
            } else if (value.codeholder) {
                codeholder = (
                    <span class="identity-codeholder">
                        <IdUEACode id={value.codeholder} />
                        {slot === 'detail' && perms.hasPerm('codeholders.read') && (
                            <LinkButton target={`/membroj/${value.codeholder}`}>
                                {locale.fields.codeholderIdViewCodeholder}
                            </LinkButton>
                        )}
                    </span>
                );
            }

            let formData = null;
            if (!editing && slot !== 'detail' && (value.name || value.email)) {
                formData = (
                    <span class="identity-form-data">
                        {value.name ? <span class="fd-name">{'' + value.name}</span> : null}
                        {' '}
                        {value.email ? <span class="fd-email">{'' + value.email}</span> : null}
                    </span>
                );
            }

            return (
                <div class="congress-participant-identity">
                    {formData}
                    {' '}
                    {codeholder}
                    {(!formData && !codeholder) ? '—' : ''}
                </div>
            );
        },
        stringify (value, item, fields, options, core) {
            if (!value) return '';

            let formData = value.name || '';
            if (value.email) {
                if (formData) formData += ' ';
                formData += '<' + value.email + '>';
            }
            if (!value.codeholder) return formData;

            return new Promise((resolve, reject) => {
                const view = core.createDataView('codeholders/codeholder', {
                    id: value.codeholder,
                    fields: ['code'],
                    lazyFetch: true,
                });
                view.on('update', data => {
                    if (data === null) return;
                    resolve([formData, data.code.new].filter(x => x).join(' '));
                    view.drop();
                });
                view.on('error', err => {
                    reject(err);
                    view.drop();
                });
            });
        },
    },
    approved: {
        sortable: true,
        weight: 0.5,
        isEmpty: () => false,
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <Checkbox
                        checked={value}
                        onChange={onChange} />
                );
            }
            if (value) return <CheckIcon style={{ verticalAlign: 'middle' }} />;
            return '—';
        },
        stringify: v => locale.spreadsheet.bool['' + v],
    },
    isValid: {
        sortable: true,
        weight: 0.5,
        isEmpty: () => false,
        component ({ value }) {
            if (value) return <CheckIcon style={{ verticalAlign: 'middle' }} />;
            return '—';
        },
        stringify: v => locale.spreadsheet.bool['' + v],
    },
    notes: {
        weight: 2,
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <TextArea value={value} onChange={onChange} />
                );
            }

            if (!value) return;
            return (
                <div>
                    {value.split('\n').map((x, i) => <div key={i}>{x}</div>)}
                </div>
            );
        },
        stringify: v => v,
    },
    price: {
        weight: 0.5,
        component ({ value, userData }) {
            return <currencyAmount.renderer value={value} currency={userData.currency} />;
        },
        stringify: (v, item, fields, options) => currencyAmount.stringify(v, options.currency),
    },
    paid: {
        weight: 0.5,
        component ({ value, userData }) {
            if (!value) return null;
            return (
                <span class="congress-participant-paid">
                    <currencyAmount.renderer value={value.amount} currency={userData.currency} />
                    {value.hasPaidMinimum ? (
                        <span class="has-paid-minimum" title={locale.fields.hasPaidMinimumDescription}>
                            {locale.fields.hasPaidMinimumShort}
                            {' '}
                            <CheckIcon className="check-icon" />
                        </span>
                    ) : null}
                </span>
            );
        },
        stringify: (v, item, fields, options) => {
            if (!v) return '';
            return currencyAmount.stringify(v.amount, options.currency)
                + (v.hasPaidMinimum ? ` (${locale.fields.hasPaidMinimumShort})` : '');
        },
    },
    sequenceId: {
        sortable: true,
        weight: 0.5,
        slot: 'titleAlt',
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <NumberField
                        type="number"
                        outline
                        value={value}
                        onChange={onChange} />
                );
            }
            return value;
        },
        stringify: v => v,
    },
    createdTime: {
        sortable: true,
        weight: 1.5,
        component ({ value }) {
            return <timestamp.renderer value={value} />;
        },
        stringify: v => timestamp.stringify(v),
    },
    editedTime: {
        sortable: true,
        weight: 1.5,
        component ({ value }) {
            if (!value) return '—';
            return <timestamp.renderer value={value} />;
        },
        stringify: v => timestamp.stringify(v),
    },
    cancelledTime: {
        sortable: true,
        weight: 1.5,
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <timestamp.editor
                        outline
                        value={value}
                        onChange={onChange} />
                );
            }
            if (!value) return '—';
            return <timestamp.renderer value={value} />;
        },
        stringify: v => timestamp.stringify(v),
    },
    checkInTime: {
        sortable: true,
        weight: 1.5,
        component ({ value, editing, onChange }) {
            if (editing) {
                return (
                    <timestamp.editor
                        outline
                        value={value}
                        onChange={onChange} />
                );
            }
            if (!value) return '—';
            return <timestamp.renderer value={value} />;
        },
        stringify: v => timestamp.stringify(v),
    },
    data: {
        component ({ value, editing, onChange, userData }) {
            const disableValidation = value && value['@$disableValidation'];
            const dvCheckboxId = `disable-validation-${Math.random().toString(36)}`;

            return (
                <div class="congress-participant-form-data">
                    <Suspense fallback={<CircularProgress indeterminate />}>
                        {editing && <div class={'data-allow-invalid' + (disableValidation ? ' is-active' : '')}>
                            <Checkbox
                                checked={disableValidation}
                                onChange={v => onChange({ ...value, '@$disableValidation': v })}
                                id={dvCheckboxId} />
                            <label for={dvCheckboxId}>
                                {locale.fields.dataAllowInvalid}
                            </label>
                        </div>}
                        <FormEditor
                            skipSettings
                            skipNonInputs
                            value={userData.registrationForm}
                            formData={value}
                            editingFormData={editing}
                            onFormDataChange={onChange}
                            disableValidation={disableValidation} />
                    </Suspense>
                </div>
            );
        },
    },
    customFormVars: {
        component ({ value, editing, onChange, slot, userData }) {
            if (!value) return;

            const form = userData?.registrationForm;
            if (!form) return '??';

            const items = [];
            for (const k in form.customFormVars) {
                const customFormVar = form.customFormVars[k];
                const isSet = k in value;
                const checkboxId = Math.random().toString(36);

                if (!editing && !isSet) continue; // not set

                let enableCheckbox = null;
                let content = null;

                if (!editing) {
                    const varValue = value[k];

                    if (varValue === null) {
                        content = '—';
                    } else if (customFormVar.type === 'boolean') {
                        content = formLocale.customFormVars.bool[varValue];
                    } else {
                        content = varValue.toString();
                    }
                } else {
                    let editor = null;

                    if (customFormVar.type === 'boolean') {
                        editor = (
                            <Segmented
                                selected={'' + value[k]}
                                onSelect={v => {
                                    if (v === 'null') onChange({ ...value, [k]: null });
                                    if (v === 'true') onChange({ ...value, [k]: true });
                                    if (v === 'false') onChange({ ...value, [k]: false });
                                }}>
                                {[
                                    { id: 'null', label: formLocale.customFormVars.bool.null },
                                    { id: 'false', label: formLocale.customFormVars.bool.false },
                                    { id: 'true', label: formLocale.customFormVars.bool.true },
                                ]}
                            </Segmented>
                        );
                    } else if (customFormVar.type === 'number') {
                        editor = (
                            <NumberField
                                class="inner-editor"
                                decimal
                                outline
                                value={value[k]}
                                onChange={newValue => {
                                    onChange({ ...value, [k]: newValue });
                                }} />
                        );
                    } else if (customFormVar.type === 'text') {
                        editor = (
                            <TextField
                                class="inner-editor"
                                outline
                                value={value[k]}
                                onChange={v => {
                                    onChange({ ...value, [k]: v || null });
                                }} />
                        );
                    }

                    enableCheckbox = (
                        <Checkbox
                            id={checkboxId}
                            checked={isSet}
                            onChange={isSet => {
                                if (isSet) {
                                    onChange({ ...value, [k]: null });
                                } else {
                                    const newValue = { ...value };
                                    delete newValue[k];
                                    onChange(newValue);
                                }
                            }} />
                    );

                    if (isSet) content = editor;
                }

                items.push(
                    <div class={'custom-var-item' + (isSet ? ' is-enabled' : '')}>
                        {enableCheckbox && (
                            <div class="item-enabled">
                                {enableCheckbox}
                            </div>
                        )}
                        <label class="item-name" for={checkboxId}>
                            {k}
                        </label>
                        <div class="item-value">
                            {content}
                        </div>
                    </div>
                );
            }

            if (!items.length) {
                items.push(
                    <div class="vars-empty">
                        {locale.fields.customFormVarsEmpty}
                    </div>
                );
            }

            return (
                <div
                    data-slot={slot}
                    class="congress-participant-custom-form-vars">
                    {items}
                </div>
            );
        },
        stringify: v => {
            return Object.entries(v || {}).map(([k, v]) => {
                let content = '-';
                if (typeof v === 'boolean') {
                    content = formLocale.customFormVars.bool[v];
                } else {
                    content = (v || '').toString();
                }

                return `${k}: ${content}`;
            }).join('\n');
        },
        weight: 2,
    },
};
