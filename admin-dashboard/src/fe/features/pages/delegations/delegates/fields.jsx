import { h } from 'preact';
import { useState, useEffect } from 'preact/compat';
import { Button, Checkbox } from 'yamdl';
import SearchIcon from '@material-ui/icons/Search';
import RemoveIcon from '@material-ui/icons/Remove';
import { CountryFlag } from '../../../../components/data/country';
import { IdUEACode } from '../../../../components/data/uea-code';
import Required from '../../../../components/data/required';
import { country, org, timestamp } from '../../../../components/data';
import CountryPicker from '../../../../components/pickers/country-picker';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import { ValidatedTextField } from '../../../../components/form';
import Select from '../../../../components/controls/select';
import TextArea from '../../../../components/controls/text-area';
import DiffAuthor from '../../../../components/diff-author';
import { delegations as locale, delegationSubjects as subjectsLocale, data as dataLocale } from '../../../../locale';
import { Link, routerContext } from '../../../../router';
import { connectPerms } from '../../../../perms';
import { makeCodeholderFilterQuery } from '../applications/filters';
import GeoCity from './geo-city';
import Subject from './subject';
import CityPicker from './city-picker';
import SubjectPicker from '../subjects/subject-picker';
import './fields.less';
import NumberField from '../../../../components/controls/number-field';

export const FIELDS = {
    org: {
        sortable: true,
        weight: 0.3,
        slot: 'icon',
        wantsCreationLabel: true,
        component ({ value, editing, onChange, slot }) {
            if (slot === 'create' && editing) {
                return <org.editor value={value} onChange={onChange} orgs={['uea']} />;
            }
            return <org.renderer value={value} />;
        },
        validate: ({ value }) => {
            if (!value) return dataLocale.requiredField;
        },
    },
    codeholderId: {
        sortable: true,
        weight: 0.5,
        slot: 'title',
        wantsCreationLabel: true,
        component ({ value, editing, onChange, slot }) {
            if (slot === 'create' && editing) {
                return (
                    <CodeholderPicker
                        value={value ? [value] : []}
                        onChange={v => onChange(+v[0] || null)}
                        limit={1} />
                );
            }
            if (!value) return '—';
            if (slot === 'detail') {
                return <Link class="delegation-codeholder" target={`/membroj/${value}`} outOfTree><IdUEACode id={value} /></Link>;
            }
            return <IdUEACode id={value} />;
        },
        validate: ({ value }) => {
            if (!value) return dataLocale.requiredField;
        },
    },
    approvedBy: {
        component ({ value, slot }) {
            if (!value) return '—';

            return (
                <div class="delegation-approved-by">
                    <DiffAuthor author={value} interactive={slot === 'detail'} />
                </div>
            );
        },
    },
    approvedTime: {
        component ({ value, item, slot }) {
            if (!value) return null;
            if (slot === 'detail') {
                return (
                    <div class="delegation-approved-time">
                        <span class="inner-approved-time">
                            <timestamp.renderer value={value} />
                        </span>
                        <routerContext.Consumer>
                            {routerContext => (
                                <Button
                                    class="application-find-button"
                                    title={locale.approvalTimeFindMatching}
                                    icon small
                                    onClick={() => {
                                        routerContext.navigate(
                                            `/delegitoj/kandidatighoj?${makeCodeholderFilterQuery(item.codeholderId)}`
                                        );
                                    }}>
                                    <SearchIcon style={{ verticalAlign: 'middle' }} />
                                </Button>
                            )}
                        </routerContext.Consumer>
                    </div>
                );
            }
            return <timestamp.renderer value={value} />;
        },
    },
    cities: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange, slot }) {
            const [pickerOpen, setPickerOpen] = useState(false);
            if (!value && !editing) return null;
            if (!value) value = [];

            const removeCity = id => {
                const newValue = [...value];
                newValue.splice(newValue.indexOf(id), 1);
                onChange(newValue);
            };

            return (
                <div class={'delegation-cities' + ((slot !== 'detail' && !editing) ? ' is-short' : '')}>
                    {value.map(id => (
                        <div class={'delegation-city' + (editing ? ' is-editing' : '')} key={id}>
                            {editing ? (
                                <div class="city-remove-container">
                                    <Button clas="remove-button" icon small onClick={() => removeCity(id)}>
                                        <RemoveIcon style={{ verticalAlign: 'middle' }} />
                                    </Button>
                                </div>
                            ) : null}
                            <GeoCity class="inner-city" id={id} short={slot !== 'detail'} />
                        </div>
                    ))}

                    {editing ? (
                        <div class="cities-editing">
                            <Button class="pick-button" onClick={() => setPickerOpen(true)}>{locale.cityPicker.pick}</Button>
                            <CityPicker
                                value={value}
                                onChange={onChange}
                                limit={10}
                                open={pickerOpen}
                                onClose={() => setPickerOpen(false)} />
                        </div>
                    ) : null}
                </div>
            );
        },
        isEmpty: value => !value?.length,
    },
    countries: {
        wantsCreationLabel: true,
        component: connectPerms(({ value, editing, onChange, item, slot, perms }) => {
            if (editing) {
                if (!value) value = [];

                return (
                    <div class="delegation-countries is-editing">
                        {(editing && value.length) ? (
                            <div class="country-select-title">
                                {locale.countrySelectTitle}
                            </div>
                        ) : null}
                        <CountryPicker
                            value={value.map(x => x.country)}
                            onChange={newValue => {
                                onChange(newValue.map(country => ({
                                    country,
                                    level: value.find(x => x.country === country)?.level || 0,
                                })).slice(0, 10));
                            }}
                            hideGroups
                            shouldHideItem={country =>
                                !perms.hasPerm(`codeholders.delegations.update_country_delegates.${item.org}.${country}`)} />
                        {value.length ? (
                            <div class="country-levels-title">
                                {locale.countryLevelsTitle}
                            </div>
                        ) : null}
                        <div class="country-levels">
                            {value.map((item, index) => (
                                <div class="country-item" key={item.country}>
                                    <div class="country-label">
                                        <country.renderer value={item.country} />
                                    </div>
                                    <div class="country-level">
                                        <Select
                                            value={item.level}
                                            onChange={level => {
                                                const newValue = [...value];
                                                newValue[index] = { ...item, level: level | 0 };
                                                onChange(newValue);
                                            }}
                                            items={Object.entries(locale.countryLevels).map(([k, v]) => ({
                                                value: k,
                                                label: v,
                                            }))} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            if (!value) return '—';
            return (
                <div class="delegation-countries" data-slot={slot}>
                    {value.map(({ country: code, level }) => (
                        <span class="delegation-country" key={code}>
                            {(slot === 'detail') ? (
                                <country.renderer value={code} />
                            ) : (
                                <CountryFlag country={code} />
                            )}
                            <span class="country-level">{locale.countryLevels[level]}</span>
                        </span>
                    ))}
                </div>
            );
        }),
        isEmpty: value => !value || !value.length,
    },
    subjects: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange, slot }) {
            const [pickerOpen, setPickerOpen] = useState(false);

            if (!value && !editing) return null;
            if (!value) value = [];

            const removeSubject = id => {
                const newValue = [...value];
                newValue.splice(newValue.indexOf(id), 1);
                onChange(newValue);
            };

            return (
                <div class={'delegation-subjects' + (editing ? ' is-editing' : '')} data-slot={slot}>
                    {value.map(id => (
                        <span class="subject-item" key={id}>
                            {editing ? (
                                <div class="subject-remove-container">
                                    <Button clas="remove-button" icon small onClick={() => removeSubject(id)}>
                                        <RemoveIcon style={{ verticalAlign: 'middle' }} />
                                    </Button>
                                </div>
                            ) : null}
                            <Subject id={id} interactive={slot === 'detail' && !editing} />
                        </span>
                    ))}
                    {editing ? (
                        <Button class="pick-button" onClick={() => setPickerOpen(true)}>
                            {subjectsLocale.picker.pick}
                            <SubjectPicker
                                value={value}
                                onChange={onChange}
                                open={pickerOpen}
                                onClose={() => setPickerOpen(false)}
                                limit={50} />
                        </Button>
                    ) : null}
                </div>
            );
        },
        isEmpty: value => !value?.length,
    },
    hosting: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            const editable = (disp, edit) => editing ? edit : disp;

            if (!editing && !(value && Object.values(value).find(x => x))) return null;
            if (!value) value = {};

            useEffect(() => {
                if (editing) {
                    const newValue = { ...value };
                    let changed = false;
                    for (const fieldName of ['maxDays', 'maxPersons', 'description', 'psProfileURL']) {
                        if (!(fieldName in newValue)) {
                            newValue[fieldName] = null;
                            changed = true;
                        }
                    }
                    if (changed) onChange(newValue);
                }
            });

            return (
                <div class="delegation-hosting is-editing">
                    <div class="hosting-field small">
                        <label>{locale.hosting.maxDays}</label>
                        {editable(
                            value.maxDays ? (
                                `${value.maxDays} ${locale.hosting.maxDaysUnit(value.maxDays)}`
                            ) : locale.hosting.maxDaysNone,
                            <NumberField
                                type="number"
                                trailing={locale.hosting.maxDaysUnit(0)}
                                outline
                                placeholder={locale.hosting.maxDaysNone}
                                value={value.maxDays}
                                onChange={maxDays => {
                                    onChange({ ...value, maxDays: maxDays > 0 ? maxDays : null });
                                }} />
                        )}
                    </div>
                    <div class="hosting-field small">
                        <label>{locale.hosting.maxPersons}</label>
                        {editable(
                            value.maxPersons ? (
                                `${value.maxPersons} ${locale.hosting.maxPersonsUnit(value.maxPersons)}`
                            ) : locale.hosting.maxPersonsNone,
                            <NumberField
                                type="number"
                                trailing={locale.hosting.maxPersonsUnit(0)}
                                outline
                                placeholder={locale.hosting.maxPersonsNone}
                                value={value.maxPersons}
                                onChange={maxPersons => {
                                    onChange({ ...value, maxPersons: maxPersons > 0 ? maxPersons : null });
                                }} />
                        )}
                    </div>
                    <div class="hosting-field">
                        <label>{locale.hosting.description}</label>
                        {editable(
                            value.description || '—',
                            <TextArea
                                value={value.description || ''}
                                onChange={val => onChange({ ...value, description: val || null })} />
                        )}
                    </div>
                    <div class="hosting-field">
                        <label>{locale.hosting.psProfileURL}</label>
                        {editable(
                            value.psProfileURL ? (
                                <a target="_blank" rel="nofollow noreferrer" href={value.psProfileURL}>{value.psProfileURL}</a>
                            ) : '—',
                            <ValidatedTextField
                                validate={value => {
                                    if (!value) return;
                                    if (!value.match(/^https:\/\/www\.pasportaservo\.org\/ejo\/\d+\/?$/)) {
                                        return locale.hosting.psProfileURLInvalid;
                                    }
                                }}
                                type="url"
                                placeholder="https://www.pasportaservo.org/ejo/..."
                                outline
                                value={value.psProfileURL || ''}
                                onChange={val => {
                                    onChange({ ...value, psProfileURL: val || null });
                                }} />
                        )}
                    </div>
                </div>
            );
        },
        isEmpty: value => !value || !Object.values(value).find(x => x),
    },
    tos: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            const required = [
                'docDataProtectionUEA',
                'docDelegatesUEA',
                'docDelegatesDataProtectionUEA',
            ];
            const fieldNames = [
                ...required,
                'paperAnnualBook',
            ];

            if (!value) value = {};

            useEffect(() => {
                if (editing) {
                    const newValue = { ...value };
                    let changed = false;
                    for (const fieldName of fieldNames) {
                        if (!(fieldName in newValue)) {
                            newValue[fieldName] = required.includes(fieldName);
                            changed = true;
                        }
                    }
                    if (changed) onChange(newValue);
                }
            });

            const fields = [];
            for (const fieldName of fieldNames) {
                const checkboxId = 'tosf-' + Math.random().toString(36);
                fields.push(
                    <div class="tos-field" key={fieldName}>
                        <Checkbox
                            class="field-checkbox"
                            id={checkboxId}
                            checked={value[fieldName]}
                            onChange={checked => {
                                if (!editing) return;
                                onChange({
                                    ...value,
                                    [fieldName]: checked,
                                    [fieldName + 'Time']: Math.floor(Date.now() / 1000),
                                });
                            }}
                            disabled={!editing || required.includes(fieldName)} />
                        <label for={checkboxId} class="field-labels">
                            <div class="field-title">
                                {required.includes(fieldName) ? (
                                    <Required>{locale.tos[fieldName]}</Required>
                                ) : (
                                    locale.tos[fieldName]
                                )}
                            </div>
                            {value[fieldName + 'Time'] ? (
                                <div class="field-time">
                                    <label>{locale.tos.fieldTime}</label>
                                    <timestamp.renderer value={value[fieldName + 'Time']} />
                                </div>
                            ) : null}
                        </label>
                    </div>
                );
            }

            return (
                <div class="delegation-tos">
                    {fields}
                </div>
            );
        },
    },
};
