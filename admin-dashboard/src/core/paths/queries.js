import asyncClient from '../client';

export const tasks = {
    /**
     * queries/list: lists available queries
     *
     * # Options and Parameters
     * - limit, offset
     * - category: category id
     *
     * # Returns
     * - items: list of queries
     * - total: total item count
     */
    list: async ({ category }, { limit, offset }) => {
        const client = await asyncClient;
        const res = await client.get('/queries', {
            offset,
            limit,
            fields: ['id', 'name', 'description', 'query'],
            order: [['name', 'asc']],
            filter: { category: category },
        });

        return {
            total: +res.res.headers.get('x-total-items'),
            items: res.body,
        };
    },

    /**
     * queries/add: adds a query
     *
     * # Options and Parameters
     * - category
     * - name
     * - description
     * - query
     *
     * Returns the id of the new query.
     */
    add: async ({ category }, { name, description, query }) => {
        const client = await asyncClient;
        const res = await client.post('/queries', {
            category,
            name,
            description: description || null,
            query,
        });
        return +res.res.headers.get('x-identifier');
    },

    /**
     * queries/update: updates a query
     *
     * # Options and Parameters
     * - id
     * - category
     * - name
     * - description
     * - query
     */
    update: async ({ id }, { name, description, query }) => {
        const client = await asyncClient;
        await client.patch(`/queries/${id}`, {
            name,
            description: description || null,
            query,
        });
        return +id;
    },

    /**
     * queries/delete: deletes a query
     *
     * # Options
     * - id: query to delete
     */
    delete: async ({ id }) => {
        const client = await asyncClient;
        await client.delete(`/queries/${id}`);
    },
};
