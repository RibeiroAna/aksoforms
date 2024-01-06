import { h } from 'preact';
import moment from 'moment';
import { timestampFormat, httpLog as locale } from '../../../../locale';
import { IdUEACode } from '../../../../components/data/uea-code';
import { apiKey } from '../../../../components/data';

const identityComponent = {
    component: ({ value }) => value ? '' + value : '',
    stringify: x => x ? '' + x : '',
};

export default {
    time: {
        sortable: true,
        component ({ value }) {
            return value ? moment(value * 1000).format(timestampFormat) : '';
        },
        stringify (value) {
            return value ? moment(value * 1000).format(timestampFormat) : '';
        },
    },
    identity: {
        slot: 'titleAlt',
        sortable: true,
        component ({ value }) {
            if (value.type === 'codeholder') {
                return <IdUEACode id={value.id} />;
            } else if (value.type === 'apiKey') {
                return <apiKey.renderer value={value.id} />;
            } else {
                return null;
            }
        },
        stringify: async (value, item, fields, options, core) => {
            if (value.type === 'codeholder') {
                return await new Promise((resolve, reject) => {
                    const view = core.createDataView('codeholders/codeholder', {
                        id: value.id,
                        fields: ['code'],
                        lazyFetch: true,
                    });
                    view.on('update', data => {
                        if (data === null) return;
                        resolve(data.code.new);
                        view.drop();
                    });
                    view.on('error', err => {
                        reject(err);
                        view.drop();
                    });
                });
            } else if (value.type === 'apiKey') {
                return Buffer.from(value.id || []).toString('hex');
            }
        },
        weight: 0.5,
    },
    ip: {
        weight: 1.5,
        sortable: true,
        component ({ value }) {
            return <code class="admin-http-log-ip-address">{value}</code>;
        },
        stringify: x => x ? x + '' : x,
    },
    origin: {
        sortable: true,
        ...identityComponent,
    },
    userAgent: identityComponent,
    userAgentParsed: identityComponent,
    method: {
        slot: 'title',
        weight: 0.3,
        sortable: true,
        ...identityComponent,
    },
    path: {
        slot: 'title',
        sortable: true,
        ...identityComponent,
    },
    query: {
        component ({ value }) {
            let isNonEmptyQuery = !!value;
            if (typeof value === 'object') {
                isNonEmptyQuery = !!Object.keys(value).length;
            }

            return isNonEmptyQuery
                ? locale.query.some
                : locale.query.none;
        },
        stringify (value) {
            return JSON.stringify(value);
        },
    },
    resStatus: {
        sortable: true,
        ...identityComponent,
    },
    resTime: {
        sortable: true,
        component ({ value }) {
            return (+value).toLocaleString('fr-FR') + ' ms';
        },
        stringify (value) {
            return (+value).toLocaleString('fr-FR') + ' ms';
        },
    },
    resLocation: identityComponent,
};
