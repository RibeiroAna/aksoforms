import { h } from 'preact';
import Page from '../../../../components/page';
import { WorkerQueueStatus } from './queue';
import { adminStatus as locale } from '../../../../locale';
import Meta from '../../../meta';

export default class StatusPage extends Page {
    render () {
        return (
            <div class="admin-status-page">
                <Meta title={locale.title} />
                <WorkerQueueStatus />
            </div>
        );
    }
}

