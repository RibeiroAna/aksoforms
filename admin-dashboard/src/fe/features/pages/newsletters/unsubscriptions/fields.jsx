import { h } from 'preact';
import { timestamp } from '../../../../components/data';
import { newsletterUnsubs as locale } from '../../../../locale';

export const FIELDS = {
    time: {
        component ({ value }) {
            return <timestamp.renderer value={value} />;
        },
    },
    reason: {
        component ({ value }) {
            return locale.reasons[value];
        },
        isEmpty: () => false,
    },
    description: {
        component ({ value }) {
            return (
                <div>
                    {(value || '').split('\n').map((x, i) => <div key={i}>{x}</div>)}
                </div>
            );
        },
    },
    subscriberCount: {
        component ({ value }) {
            return value;
        },
        isEmpty: () => false,
    },
};
