import { crudList, simpleDataView } from '../templates';
import asyncClient from '../client';
import * as store from '../store';
import { deepMerge } from '../../util';

const STATISTICS = 'statistics';

export const tasks = {
    listStatistics: crudList({
        apiPath: () => '/statistics',
        fields: ['date', 'data'],
        storePath: (_, item) => [STATISTICS, item.date],
        map: item => {
            item.id = item.date;
        },
    }),
    async getStatisticsForDate ({ date }) {
        const client = await asyncClient;
        const res = await client.get('/statistics', {
            filter: { date },
            fields: ['date', 'data'],
            limit: 1,
        });

        let found = null;
        for (const item of res.body) {
            item.id = item.date;
            const dataPath = [STATISTICS, item.date];
            const existing = store.get(dataPath);
            store.insert(dataPath, deepMerge(existing, item));
            if (item.date === date) found = item;
        }

        if (!found) throw { code: 'not-found', message: 'item not found in results' };
        return found;
    },
};

export const views = {
    statistics: simpleDataView({
        storePath: ({ date }) => [STATISTICS, date],
        get: ({ date }) => tasks.getStatisticsForDate({ date }),
        canBeLazy: true,
    }),
};