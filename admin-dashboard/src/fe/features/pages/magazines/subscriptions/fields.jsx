import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button, Checkbox } from 'yamdl';
import RemoveIcon from '@material-ui/icons/Remove';
import AddIcon from '@material-ui/icons/Add';
import { timestamp } from '../../../../components/data';
import { IdUEACode } from '../../../../components/data/uea-code';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import { Link } from '../../../../router';
import { connect } from '../../../../core/connection';
import TextArea from '../../../../components/controls/text-area';
import TinyProgress from '../../../../components/controls/tiny-progress';
import ItemPicker from '../../../../components/pickers/item-picker-dialog';
import { magazineSubs as locale, magazines as magazinesLocale } from '../../../../locale';
import { FIELDS as MAGAZINE_FIELDS } from '../fields';
import './fields.less';
import CheckIcon from '@material-ui/icons/Check';
import NumberField from '../../../../components/controls/number-field';

const REDUCED_MAGAZINE_FIELDS = Object.fromEntries(['org', 'name'].map(k => [k, MAGAZINE_FIELDS[k]]));

export const FIELDS = {
    magazineId: {
        wantsCreationLabel: true,
        component ({ value, onChange, slot }) {
            const [open, setOpen] = useState(false);

            if (slot === 'create') {
                return (
                    <div class="magazine-subscription-magazine-picker">
                        {value ? (
                            <div class="selected-item">
                                <Button class="remove-button" icon small onClick={() => onChange(null)}>
                                    <RemoveIcon />
                                </Button>
                                <div class="magazine-id-container">
                                    <MagazineId id={value} />
                                </div>
                            </div>
                        ) : (
                            <div class="add-button-container">
                                <Button class="add-button" icon small onClick={() => setOpen(true)}>
                                    <AddIcon />
                                </Button>
                            </div>
                        )}
                        <ItemPicker
                            open={open}
                            onClose={() => setOpen(false)}
                            limit={1}
                            value={value ? [value] : []}
                            onChange={v => onChange(+v[0] || null)}
                            task="magazines/listMagazines"
                            view="magazines/magazine"
                            search={{ field: 'name', placeholder: magazinesLocale.search.placeholders.name }}
                            fields={REDUCED_MAGAZINE_FIELDS}
                            locale={magazinesLocale.fields} />
                    </div>
                );
            }

            if (slot === 'detail') {
                return (
                    <Link class="magazine-subscription-magazine-id-link" target={`/revuoj/${value}`}>
                        <MagazineId id={value} />
                    </Link>
                );
            }

            return <MagazineId id={value} />;
        },
    },
    codeholderId: {
        wantsCreationLabel: true,
        sortable: true,
        component ({ value, onChange, slot }) {
            if (slot === 'create') {
                return (
                    <CodeholderPicker
                        value={value ? [value] : []}
                        onChange={v => onChange(+v[0] || null)}
                        limit={1} />
                );
            }

            if (slot === 'detail') {
                return (
                    <Link class="magazine-subscription-codeholder-id-link" outOfTree target={`/membroj/${value}`}>
                        <IdUEACode id={value} />
                    </Link>
                );
            }
            return <IdUEACode id={value} />;
        },
    },
    createdTime: {
        sortable: true,
        component ({ value }) {
            return <timestamp.renderer value={value} />;
        },
    },
    year: {
        sortable: true,
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return (
                    <NumberField
                        outline
                        type="number"
                        label={slot === 'create' ? locale.fields.year : null}
                        value={value}
                        onFocus={e => {
                            if (!e.target.value) {
                                onChange(new Date().getFullYear());
                            }
                        }}
                        onChange={onChange} />
                );
            }
            return '' + value;
        },
    },
    internalNotes: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextArea value={value} onChange={onChange} />;
            }
            if (!value) return '—';
            return (
                <div>
                    {(value || '').split('\n').map((ln, i) => (
                        <div key={i}>{ln}</div>
                    ))}
                </div>
            );
        },
    },
    paperVersion: {
        wantsCreationLabel: true,
        component ({ value, editing, onChange }) {
            if (editing) {
                return <Checkbox checked={value} onChange={onChange} />;
            }
            if (value) return <CheckIcon />;
            return '—';
        },
    },
};

const MagazineId = connect(({ id }) => ['magazines/magazine', { id }])(data => ({ data }))(function Magazine ({ data }) {
    if (!data) return <TinyProgress />;
    return data.name;
});
