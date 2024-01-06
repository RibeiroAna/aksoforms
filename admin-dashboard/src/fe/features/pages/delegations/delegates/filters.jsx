import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import Segmented from '../../../../components/controls/segmented';
import OrgIcon from '../../../../components/org-icon';
import RangeEditor from '../../../../components/controls/range-editor';
import Select from '../../../../components/controls/select';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import CountryPicker from '../../../../components/pickers/country-picker';
import SubjectPicker from '../subjects/subject-picker';
import CityPicker from './city-picker';
import Subject from './subject';
import GeoCity from './geo-city';
import { delegations as locale } from '../../../../locale';
import './filters.less';

export const FILTERS = {
    org: {
        default () {
            return { enabled: false, value: null };
        },
        serialize ({ value }) {
            return value;
        },
        deserialize (value) {
            return { enabled: true, value };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <Segmented class="smaller" selected={value} onSelect={value => {
                    onEnabledChange(!!value);
                    onChange(value);
                }} disabled={hidden}>
                    {[
                        {
                            label: <OrgIcon org="uea" />,
                            id: 'uea',
                        },
                        {
                            label: locale.search.filters.orgFilterNone,
                            class: 'bordered',
                            id: null,
                        },
                    ]}
                </Segmented>
            );
        },
    },
    approvedBy: {
        default () {
            return { enabled: false, value: [] };
        },
        serialize ({ value }) {
            return value.join(',');
        },
        deserialize (value) {
            return { enabled: true, value: value.split(',').map(x => +x).filter(x => x) };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <CodeholderPicker
                    disabled={hidden}
                    value={value}
                    onChange={v => {
                        onChange(v);
                        onEnabledChange(!!v.length);
                    }} />
            );
        },
    },
    hostingMaxDays: {
        default () {
            return { enabled: false, value: [1, 4] };
        },
        serialize ({ value }) {
            return value.join('-');
        },
        deserialize (value) {
            return { enabled: true, value: value.split('-').slice(0, 2) };
        },
        needsSwitch: true,
        editor ({ value, onChange, enabled, onEnabledChange, hidden }) {
            const f = x => Math.pow(x, 2.5);
            const finv = x => Math.pow(x, 1 / 2.5);

            return (
                <RangeEditor
                    min={0}
                    max={365}
                    value={value}
                    onChange={v => {
                        onChange(v);
                        onEnabledChange(true);
                    }}
                    faded={!enabled}
                    disabled={hidden}
                    discrete
                    tickDistance={5}
                    transfer={[
                        x => x < 0.05 ? 0 : 1 + f((x - 0.05) / (1 - 0.05)) * 364,
                        v => v < 1 ? 0 : finv(((v - 1) / 364)) * (1 - 0.05) + 0.05,
                    ]} />
            );
        },
    },
    hostingMaxPersons: {
        default () {
            return { enabled: false, value: [1, 4] };
        },
        serialize ({ value }) {
            return value.join('-');
        },
        deserialize (value) {
            return { enabled: true, value: value.split('-').slice(0, 2) };
        },
        needsSwitch: true,
        editor ({ value, onChange, enabled, onEnabledChange, hidden }) {
            return (
                <RangeEditor
                    min={0}
                    max={10}
                    value={value}
                    onChange={v => {
                        onChange(v);
                        onEnabledChange(true);
                    }}
                    faded={!enabled}
                    disabled={hidden}
                    discrete
                    tickDistance={1} />
            );
        },
    },
    subjects: {
        default () {
            return { enabled: false, value: [] };
        },
        serialize ({ value }) {
            return value.join(',');
        },
        deserialize (value) {
            return { enabled: true, value: value.split(',').map(id => +id).filter(x => x) };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            const [pickerOpen, setPickerOpen] = useState(false);

            return (
                <div class={'delegates-subjects-filter' + (value.length ? ' has-selected' : '')}>
                    <div class="selected-values">
                        {value.map(id => (
                            <Subject key={id} id={id} />
                        ))}
                    </div>
                    <Button icon small onClick={() => setPickerOpen(true)} disabled={hidden}>
                        <AddIcon />
                    </Button>
                    <SubjectPicker
                        open={pickerOpen}
                        onClose={() => setPickerOpen(false)}
                        value={value}
                        onChange={v => {
                            onChange(v);
                            onEnabledChange(!!v.length);
                        }} />
                </div>
            );
        },
    },
    cities: {
        default () {
            return { enabled: false, value: [] };
        },
        serialize ({ value }) {
            return value.join('-');
        },
        deserialize (value) {
            return { enabled: true, value: value.split('-').map(id => +id.substr(1)).filter(x => x).map(id => 'Q' + id) };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            const [pickerOpen, setPickerOpen] = useState(false);

            return (
                <div class={'delegates-cities-filter' + (value.length ? ' has-selected' : '')}>
                    <div class="selected-values">
                        {value.map(id => (
                            <div class="city-item" key={id}>
                                <GeoCity id={id} />
                            </div>
                        ))}
                    </div>
                    <Button icon small onClick={() => setPickerOpen(true)} disabled={hidden}>
                        <AddIcon />
                    </Button>
                    <CityPicker
                        open={pickerOpen}
                        onClose={() => setPickerOpen(false)}
                        value={value}
                        onChange={v => {
                            onChange(v);
                            onEnabledChange(!!v.length);
                        }} />
                </div>
            );
        },
    },
    countries: {
        default () {
            return { enabled: false, value: [] };
        },
        serialize ({ value }) {
            return value.join('-');
        },
        deserialize (value) {
            return { enabled: true, value: value.split('-').filter(x => x) };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <CountryPicker
                    hideGroups
                    value={value}
                    onChange={v => {
                        onChange(v);
                        onEnabledChange(!!v.length);
                    }}
                    disabled={hidden} />
            );
        },
    },
    countryLevels: {
        default () {
            return { enabled: false, value: null };
        },
        serialize ({ value }) {
            return '' + value;
        },
        deserialize (value) {
            return { enabled: true, value: +value };
        },
        editor ({ value, onChange, onEnabledChange, hidden }) {
            return (
                <Select
                    disabled={hidden}
                    value={value}
                    onChange={v => {
                        if (v === 'null') v = null;
                        else v = +v;
                        onChange(v);
                        onEnabledChange(v !== null);
                    }}
                    items={[{
                        value: 'null',
                        label: locale.search.filters.countryLevelsDontCare,
                    }].concat(locale.countryLevels.map((v, k) => ({
                        value: k,
                        label: v,
                    })))} />
            );
        },
    },
};
