import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button, Dialog, TextField } from 'yamdl';
import RemoveIcon from '@material-ui/icons/Remove';
import OfferPrice from '../../../memberships/options/price';
import { FIELDS as CATEGORY_FIELDS } from '../../../memberships/categories/fields';
import { FIELDS as MAGAZINE_FIELDS } from '../../../magazines/fields';
import ItemPicker from '../../../../../components/pickers/item-picker-dialog';
import { ScriptContextProvider } from '../../../../../components/form-editor';
import TinyProgress from '../../../../../components/controls/tiny-progress';
import { connect } from '../../../../../core/connection';
import {
    paymentMethods as locale,
    membershipCategories as categoriesLocale,
    magazines as magazinesLocale,
} from '../../../../../locale';
import './prices.less';
import NumberField from '../../../../../components/controls/number-field';

/** Edits the “prices” field on payment methods. */
export default function Prices ({ value, editing, onChange, isIntermediary }) {
    const [addingYear, setAddingYear] = useState(false);

    value = value || {};

    const years = [];
    for (const year in value) {
        years.push(
            <PriceYear
                key={year}
                year={+year}
                value={value[year]}
                editing={editing}
                onChange={v => onChange({
                    ...value,
                    [year]: v,
                })}
                onRemove={() => {
                    const newValue = { ...value };
                    delete newValue[year];
                    onChange(newValue);
                }}
                isIntermediary={isIntermediary} />
        );
    }

    return (
        <div class="payment-method-prices">
            <ScriptContextProvider reallyOnTop>
                {years}
            </ScriptContextProvider>
            {editing && (
                <Button onClick={() => setAddingYear(true)}>
                    {locale.prices.addYear}
                </Button>
            )}
            {editing && (
                <AddYear
                    open={addingYear}
                    onClose={() => setAddingYear(false)}
                    onAdd={year => {
                        if (value[year]) return;
                        onChange({
                            ...value,
                            [year]: {
                                registrationEntries: {
                                    membershipCategories: [],
                                    magazines: [],
                                },
                            },
                        });
                    }} />
            )}
        </div>
    );
}

function AddYear ({ open, onClose, onAdd }) {
    const [year, setYear] = useState(new Date().getFullYear());

    return (
        <Dialog
            backdrop
            open={open}
            onClose={onClose}
            title={locale.prices.addYear}
            actions={[
                {
                    label: locale.prices.addYearAdd,
                    action: () => {
                        onAdd(year);
                        onClose();
                    },
                },
            ]}>
            <NumberField
                type="number"
                outline
                value={year}
                onChange={setYear} />
        </Dialog>
    );
}

function PriceYear ({ year, value, editing, onChange, onRemove, isIntermediary }) {
    const [addingCategories, setAddingCategories] = useState(false);
    const [addingMagazines, setAddingMagazines] = useState(false);

    if (!value?.registrationEntries?.membershipCategories) {
        value = {
            ...value,
            registrationEntries: {
                membershipCategories: value?.registrationEntries?.membershipCategories || [],
                magazines: value?.registrationEntries?.magazines || [],
            },
        };
    }

    return (
        <div class="price-year">
            <header class="year-header">
                <Button icon small onClick={onRemove}>
                    <RemoveIcon style={{ verticalAlign: 'middle' }} />
                </Button>
                <span class="year-label">{year}</span>
            </header>
            <div class="year-section-label">{locale.prices.membershipCategories.title}</div>
            <div class="membership-categories">
                {value.registrationEntries.membershipCategories.map((category, i) => (
                    <MembershipCategory
                        key={category.id}
                        value={category}
                        editing={editing}
                        onChange={category => {
                            const membershipCategories = value.registrationEntries.membershipCategories.slice();
                            membershipCategories[i] = category;
                            onChange({
                                ...value,
                                registrationEntries: {
                                    ...value.registrationEntries,
                                    membershipCategories,
                                },
                            });
                        }}
                        onRemove={() => {
                            const membershipCategories = value.registrationEntries.membershipCategories.slice();
                            membershipCategories.splice(i, 1);
                            onChange({
                                ...value,
                                registrationEntries: {
                                    ...value.registrationEntries,
                                    membershipCategories,
                                },
                            });
                        }}
                        isIntermediary={isIntermediary} />
                ))}
                {editing && (
                    <Button onClick={() => setAddingCategories(true)}>
                        {locale.prices.membershipCategories.addCategory}
                    </Button>
                )}
                {editing && (
                    <AddMembershipCategory
                        open={addingCategories}
                        onClose={() => setAddingCategories(false)}
                        onAdd={category => onChange({
                            ...value,
                            registrationEntries: {
                                ...value.registrationEntries,
                                membershipCategories: value.registrationEntries.membershipCategories.concat([{
                                    id: category,
                                    commission: 0,
                                    price: null,
                                }]),
                            },
                        })} />
                )}
            </div>
            <div class="year-section-label">{locale.prices.magazines.title}</div>
            <div class="magazines">
                {value.registrationEntries.magazines.map((magazine, i) => (
                    <Magazine
                        key={magazine.id}
                        value={magazine}
                        editing={editing}
                        onChange={magazine => {
                            const magazines = value.registrationEntries.magazines.slice();
                            magazines[i] = magazine;
                            onChange({
                                ...value,
                                registrationEntries: {
                                    ...value.registrationEntries,
                                    magazines,
                                },
                            });
                        }}
                        onRemove={() => {
                            const magazines = value.registrationEntries.magazines.slice();
                            magazines.splice(i, 1);
                            onChange({
                                ...value,
                                registrationEntries: {
                                    ...value.registrationEntries,
                                    magazines,
                                },
                            });
                        }}
                        isIntermediary={isIntermediary} />
                ))}
                {editing && (
                    <Button onClick={() => setAddingMagazines(true)}>
                        {locale.prices.magazines.addMagazine}
                    </Button>
                )}
                {editing && (
                    <AddMagazine
                        open={addingMagazines}
                        onClose={() => setAddingMagazines(false)}
                        onAdd={category => onChange({
                            ...value,
                            registrationEntries: {
                                ...value.registrationEntries,
                                magazines: value.registrationEntries.magazines.concat([{
                                    id: category,
                                    prices: { paper: null, access: null },
                                }]),
                            },
                        })} />
                )}
            </div>
        </div>
    );
}

const REDUCED_CATEGORY_FIELDS = Object.fromEntries([
    // givesMembership comes before name for sorting order
    'givesMembership', 'nameAbbrev', 'name', 'availability',
].map(x => [x, CATEGORY_FIELDS[x]]));

const REDUCED_MAGAZINE_FIELDS = Object.fromEntries([
    'org', 'name',
].map(x => [x, MAGAZINE_FIELDS[x]]));

function AddMembershipCategory ({ open, onClose, onAdd }) {
    return (
        <ItemPicker
            open={open}
            onClose={onClose}
            title={locale.prices.membershipCategories.addCategory}
            noCloseButton
            limit={1}
            value={[]}
            onChange={v => {
                if (v.length) {
                    onAdd(v[0]);
                    onClose();
                }
            }}
            task="memberships/listCategories"
            view="memberships/category"
            sorting={{ nameAbbrev: 'asc', givesMembership: 'desc' }}
            fields={REDUCED_CATEGORY_FIELDS}
            locale={categoriesLocale.fields} />
    );
}
function AddMagazine ({ open, onClose, onAdd }) {
    return (
        <ItemPicker
            open={open}
            onClose={onClose}
            title={locale.prices.magazines.addMagazine}
            noCloseButton
            limit={1}
            value={[]}
            onChange={v => {
                if (v.length) {
                    onAdd(v[0]);
                    onClose();
                }
            }}
            task="magazines/listMagazines"
            view="magazines/magazine"
            sorting={{ name: 'asc' }}
            fields={REDUCED_MAGAZINE_FIELDS}
            locale={magazinesLocale.fields} />
    );
}

function MembershipCategory ({ value, editing, onChange, onRemove, isIntermediary }) {
    return (
        <div class="price-membership-category" data-id={value.id}>
            <div class="item-header">
                {editing ? (
                    <Button icon small class="item-remove" onClick={onRemove}>
                        <RemoveIcon />
                    </Button>
                ) : null}
                <div class="item-label">
                    <MembershipCategoryId id={value.id} />
                </div>
            </div>

            <Price
                editing={editing}
                commission={value.commission}
                onCommissionChange={commission => onChange({ ...value, commission })}
                price={value.price}
                onPriceChange={price => onChange({ ...value, price })}
                isIntermediary={isIntermediary} />
        </div>
    );
}

function Magazine ({ value, editing, onChange, onRemove, isIntermediary }) {
    return (
        <div class="price-magazine" data-id={value.id}>
            <div class="item-header">
                {editing ? (
                    <Button icon small class="item-remove" onClick={onRemove}>
                        <RemoveIcon />
                    </Button>
                ) : null}
                <div class="item-label">
                    <MagazineId id={value.id} />
                </div>
            </div>

            <div class="magazine-price">
                <div class="price-label">{locale.prices.magazines.prices.paper}</div>
                <Price
                    editing={editing}
                    commission={value.prices.paper?.commission}
                    onCommissionChange={commission => onChange({ ...value, prices: { ...value.prices, paper: { ...value.prices.paper, commission } } })}
                    price={value.prices.paper}
                    onPriceChange={paper => onChange({ ...value, prices: { ...value.prices, paper } })}
                    isIntermediary={isIntermediary} />
            </div>
            <div class="magazine-price">
                <div class="price-label">{locale.prices.magazines.prices.access}</div>
                <Price
                    editing={editing}
                    commission={value.prices.access?.commission}
                    onCommissionChange={commission => onChange({ ...value, prices: { ...value.prices, access: { ...value.prices.access, commission } } })}
                    price={value.prices.access}
                    onPriceChange={access => onChange({ ...value, prices: { ...value.prices, access } })}
                    isIntermediary={isIntermediary} />
            </div>
        </div>
    );
}

const MembershipCategoryId = connect(({ id }) => ['memberships/category', { id }])(data => ({
    data,
}))(function MembershipCategoryId ({ data }) {
    if (!data) return <TinyProgress />;
    return data.nameAbbrev + ' ' + data.name;
});

const MagazineId = connect(({ id }) => ['magazines/magazine', { id }])(data => ({
    data,
}))(function MagazineId ({ data }) {
    if (!data) return <TinyProgress />;
    return data.name;
});

function Price ({ commission, onCommissionChange, price, onPriceChange, editing, isIntermediary }) {
    return (
        <div class="intermediary-price">
            {price && (
                <div class={'price-commission' + (editing ? ' is-editing' : '')}>
                    <label>{locale.prices.membershipCategories.commission}</label>
                    {!editing && ': '}
                    {editing ? (
                        <TextField
                            outline
                            type="number"
                            value={commission}
                            onChange={v => {
                                if (+v <= 100) {
                                    onCommissionChange(+v);
                                }
                            }}
                            onBlur={e => {
                                e.target.value = commission;
                            }}
                            trailing="%" />
                    ) : (
                        <span>
                            {commission | 0} %
                        </span>
                    )}
                </div>
            )}

            <OfferPrice
                noDescription
                hasCurrencyVar={isIntermediary}
                value={price}
                editing={editing}
                onChange={onPriceChange} />
        </div>
    );
}
