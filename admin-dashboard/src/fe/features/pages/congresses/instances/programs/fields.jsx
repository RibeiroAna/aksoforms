import { h } from 'preact';
import moment from 'moment';
import { time, timestamp } from '../../../../../components/data';
import MdField from '../../../../../components/controls/md-field';
import LimitedTextField from '../../../../../components/controls/limited-text-field';
import LocationPicker from '../location-picker';
import './fields.less';

function TimeBoundEditor ({ value, editing, onChange, userData }) {
    const { tz } = userData;

    if (editing) return <timestamp.editor outline value={value} onChange={onChange} zone={tz} />;
    return <timestamp.renderer value={value} onChange={onChange} zone={tz} />;
}

export const FIELDS = {
    title: {
        sortable: true,
        slot: 'title',
        shouldHide: (_, editing) => !editing,
        component ({ value, editing, onChange }) {
            return <MdField
                value={value}
                onChange={onChange}
                maxLength={100}
                editing={editing}
                singleLine
                rules={['emphasis', 'strikethrough']} />;
        },
    },
    description: {
        slot: 'body',
        skipLabel: true,
        component ({ value, editing, onChange, slot }) {
            return <MdField
                class="congress-program-description"
                data-slot={slot}
                maxLength={2000}
                value={value}
                onChange={onChange}
                editing={editing}
                rules={['emphasis', 'strikethrough', 'link', 'list', 'table', 'image']} />;
        },
    },
    owner: {
        component ({ value, editing, onChange }) {
            if (editing) {
                return <LimitedTextField
                    outline
                    value={value}
                    onChange={onChange}
                    maxLength={100} />;
            }
            return value;
        },
    },
    timeFrom: {
        sortable: true,
        component: TimeBoundEditor,
    },
    timeTo: {
        sortable: true,
        component: TimeBoundEditor,
    },
    location: {
        sortable: true,
        component ({ value, editing, onChange, userData, slot }) {
            if (!userData) return null;
            return <LocationPicker
                disabled={slot !== 'detail'}
                congress={userData.congress}
                instance={userData.instance}
                value={value}
                editing={editing}
                onChange={onChange} />;
        },
    },
};

export const OVERVIEW_FIELDS = {
    ...FIELDS,
    time: {
        slot: 'body',
        skipLabel: true,
        component ({ item, userData }) {
            const { timeFrom, timeTo } = item;
            const { tz } = userData;

            const day = moment(timeFrom * 1000).tz(tz || 'UTC').startOf('d');
            const secondsFrom = moment(timeFrom * 1000).diff(day, 's');
            const secondsTo = moment(timeTo * 1000).diff(day, 's');

            return (
                <div class="congress-program-time-loc">
                    <div class="ptl-time">
                        <time.renderer value={secondsFrom} />
                        {'–'}
                        <time.renderer value={secondsTo} />
                    </div>
                </div>
            );
        },
    },
    timeLoc: {
        slot: 'body',
        skipLabel: true,
        component ({ item, userData, ...extra }) {
            const Location = FIELDS.location.component;

            const { timeFrom, timeTo, location } = item;
            const { tz } = userData;

            const day = moment(timeFrom * 1000).tz(tz || 'UTC').startOf('d');
            const secondsFrom = moment(timeFrom * 1000).diff(day, 's');
            const secondsTo = moment(timeTo * 1000).diff(day, 's');

            return (
                <div class="congress-program-time-loc">
                    <div class="ptl-time">
                        <time.renderer value={secondsFrom} />
                        {'–'}
                        <time.renderer value={secondsTo} />
                    </div>
                    <div class="ptl-location">
                        <Location {...extra} value={location} item={item} userData={userData} />
                    </div>
                </div>
            );
        },
    },
};
