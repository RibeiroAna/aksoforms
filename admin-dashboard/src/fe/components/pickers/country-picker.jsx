import { h } from 'preact';
import { useMemo, useRef } from 'preact/compat';
import LanguageIcon from '@material-ui/icons/Language';
import { CountryFlag } from '../data/country';
import { useDataView } from '../../core';
import LargeMultiSelect from './large-multi-select';
import { data as locale } from '../../locale';
import './country-picker.less';
import DisplayError from '../utils/error';

/*8
 * Renders a country picker.
 *
 * # Props
 * - value/onChange: array of strings
 * - hideGroups: if false, will hide country groups
 * - shouldHideItem: (id) => bool will hide individual items
 * - hidden: if true, will disable tab focusing
 * - disabled: bool
 */
export default function CountryPicker ({ value, onChange, hideGroups, shouldHideItem, hidden, disabled }) {
    const [countriesLoading, countriesError, countries_] = useDataView('countries/countries', {});
    const [groupsLoading, groupsError, countryGroups_] = useDataView('countries/countryGroups', {});

    if (countriesLoading || groupsLoading) {
        hidden = true;
    }

    const countries = countries_ || {};
    const countryGroups = countryGroups_ || {};

    const items = useMemo(() => {
        return (hideGroups ? [] : Object.keys(countryGroups)).concat(Object.keys(countries))
            .filter(id => !shouldHideItem || !shouldHideItem(id));
    }, [hideGroups, shouldHideItem, countries, countryGroups]);

    const itemName = useMemo(() => id => {
        if (id in countries) return countries[id].name_eo;
        return countryGroups[id]?.name;
    }, [countries, countryGroups]);

    const renderPreviewItem = useMemo(() => ({ id }) => {
        if (id in countries) {
            return <CountryFlag country={id} />;
        } else if (countryGroups[id]) {
            return <span>{countryGroups[id].name}</span>;
        }
    }, [countries, countryGroups]);

    const renderItemContents = useMemo(() => ({ id }) => (
        <div class="country-picker-inner-country-item">
            <div class="country-icon">
                {id in countries
                    ? <CountryFlag country={id} />
                    : <LanguageIcon />}
            </div>
            <div class="country-name">{itemName(id)}</div>
        </div>
    ), [countries, itemName]);

    // prevent re-rendering due to onChange closure being different
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const onChangeMemoizedProxy = useMemo(() => (value) => {
        onChangeRef.current(value);
    }, []);

    if (countriesError || groupsError) {
        return <DisplayError error={countriesError || groupsError} />;
    }

    return <LargeMultiSelect
        value={value}
        onChange={onChangeMemoizedProxy}
        items={items}
        renderPreviewItem={renderPreviewItem}
        itemName={itemName}
        renderItemContents={renderItemContents}
        title={hideGroups
            ? locale.countryPicker.dialogTitleNoGroups
            : locale.countryPicker.dialogTitle}
        disabled={hidden || disabled} />;
}
