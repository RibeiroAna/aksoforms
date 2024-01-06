import { h } from 'preact';
import Page from '../../../../components/page';
import DetailView from '../../../../components/detail/detail';
import Meta from '../../../meta';
import FIELDS from './detail-fields';
import { httpLog as locale } from '../../../../locale';
import './style.less';

const availableFields = [
    'id',
    'time',
    'identity',
    'ip',
    'origin',
    'userAgent',
    'userAgentParsed',
    'method',
    'path',
    'query',
    'resStatus',
    'resTime',
    'resLocation',
];

export default class HttpLogDetailPage extends Page {
    render ({ match }) {
        const id = +match[1];

        return (
            <div class="http-log-detail-page">
                <Meta title={locale.detailTitle} />
                <DetailView
                    view="httpLog/request"
                    id={id}
                    options={{ fields: availableFields }}
                    fields={FIELDS}
                    header={Header}
                    locale={locale} />
            </div>
        );
    }
}

function Header ({ item }) {
    return (
        <div class="http-log-request-header">
            <h1>{item.method} {item.path}</h1>
        </div>
    );
}
