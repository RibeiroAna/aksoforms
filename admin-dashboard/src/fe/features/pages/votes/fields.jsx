import { h } from 'preact';
import moment from 'moment';
import MdField from '../../../components/controls/md-field';
import LimitedTextField from '../../../components/controls/limited-text-field';
import { org } from '../../../components/data';
import { votes as locale, timestampFormat } from '../../../locale';
import { timeStart as TimeStart, timeEnd as TimeEnd } from './config';

export default {
    org: {
        sortable: true,
        weight: 0.5,
        slot: 'title',
        component ({ value }) {
            return <org.renderer value={value} />;
        },
        stringify (value) {
            return value;
        },
        shouldHide: () => true,
    },
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, onChange, editing }) {
            if (!editing) return value;
            return (
                <LimitedTextField
                    class="name-field"
                    outline
                    maxLength={100}
                    value={value}
                    onChange={onChange} />
            );
        },
        stringify (value) {
            return value;
        },
        shouldHide: (item, editing) => !editing || item.state?.hasEnded,
    },
    description: {
        sortable: true,
        component ({ value, onChange, editing, slot }) {
            return (
                <MdField
                    rules={['emphasis', 'strikethrough', 'link', 'list', 'table', 'image']}
                    value={value}
                    editing={editing}
                    inline={slot !== 'detail'}
                    onChange={onChange}
                    maxLength={10000} />
            );
        },
        stringify (value) {
            return value;
        },
        shouldHide: (item, editing) => item.state?.hasEnded && editing,
    },
    type: {
        component ({ value }) {
            return locale.types[value];
        },
        stringify (value) {
            return locale.types[value];
        },
        shouldHide: (item, editing) => item.state?.hasEnded && editing,
    },
    state: (() => {
        const stringify = value => {
            if (value.hasResults) {
                return value.usedTieBreaker
                    ? locale.state.hasResultsTiebreaker
                    : locale.state.hasResults;
            }
            if (value.hasEnded) return locale.state.hasEnded;
            if (value.isActive) return locale.state.isActive;
            return locale.state.hasNotStarted;
        };

        return {
            component: ({ value }) => (
                <div>
                    {stringify(value).split('\n').map((x, i) => <div key={i}>{x}</div>)}
                </div>
            ),
            stringify,
            shouldHide: (item, editing) => item.state?.hasEnded && editing,
        };
    })(),
    timespan: {
        sortable: true,
        component ({ value, onChange, editing, item }) {
            if (!value) return;

            return (
                <span class="vote-timespan">
                    <TimeStart
                        value={value.start}
                        onChange={start => onChange({ ...value, start })}
                        editing={editing}
                        item={item} />
                    {'–'}
                    <TimeEnd
                        value={value.end}
                        onChange={end => onChange({ ...value, end })}
                        editing={editing}
                        item={item}
                        copyFrom="start" />
                </span>
            );
        },
        stringify (value) {
            return `${moment(value.start * 1000).format(timestampFormat)}–${moment(value.end * 1000).format(timestampFormat)}`;
        },
        shouldHide: (item, editing) => item.state?.hasEnded && editing,
    },
};
