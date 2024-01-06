import { h } from 'preact';
import { CircularProgress } from 'yamdl';
import { useDataView } from '../../../../core';
import DisplayError from '../../../../components/utils/error';
import { adminStatus as locale } from '../../../../locale';
import './queue.less';

export function WorkerQueueStatus () {
    const [loading, error, items] = useDataView('adminStatus/workerQueues', {});

    if (loading) {
        return (
            <div class="admin-worker-queue-status is-loading">
                <CircularProgress indeterminate/>
            </div>
        );
    } else if (error) {
        return (
            <div class="admin-worker-queue-status is-error">
                <DisplayError error={error}/>
            </div>
        );
    } else if (!items) {
        return null;
    }

    return (
        <div class="admin-worker-queue-status">
            <ul class="queue-items">
                {items.map(item => (
                    <li class="queue-item" key={item.queue}>
                        <div class="item-title">
                            {locale.workerQueues.labels[item.queue]}
                        </div>
                        <div class="item-counters">
                            <div class="item-counter">
                                <div class="counter-label">
                                    {locale.workerQueues.pendingMessages}
                                </div>
                                <div class="counter-value is-messages" style={{ '--count': item.messageCount }}>
                                    {item.messageCount}
                                </div>
                            </div>
                            <div class="item-counter">
                                <div class="counter-label">
                                    {locale.workerQueues.consumers}
                                </div>
                                <div class="counter-value is-consumers" style={{ '--count': item.consumerCount }}>
                                    {item.consumerCount}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}