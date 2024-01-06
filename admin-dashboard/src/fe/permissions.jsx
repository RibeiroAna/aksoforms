//! Global permissions config

const baseOrgs = {'uea': 'UEA', 'tejo': 'TEJO'};

/**
 * Specification for the permissions editor.
 *
 * Each node is an object with a type:
 *
 * - type `perm`: shows a simple permission checkbox. Has a `name` (string)
 *   and `id` (permission string).
 * - type `perm.country` shows a country picker. Has a `name` (string)
 *   and `id` (permission string prefix). The final permissions will look like `id`.<country code>.
 *   `id` should not end in a wildcard!
 * - type `category`: a category of permissions. has a `name` (string)
 * - type `group`: identical to category except in presentation
 *   and `children` (list of nodes)
 * - type `switch`: a switch, mainly for read/write/create/delete permission escalation.
 *   Has a `name` (string) and `options`, which are objects with a `name` and `id`.
 *
 * Every node may additionally have a field `implies` that contains a list of permissions that will
 * also be activated by this node (requirements, sort of), and `requires`, which will disable the
 * node until all requirements are met.
 *
 * The `impliesFields` field works like `implies`, except it implies member fields for member
 * restrictions (if enabled).
 *
 * There are also three special nodes:
 * - `{ type: '!memberRestrictionsSwitch', name: string }` which will show a switch to enable or
 *   disable member restrictions
 * - `'!memberFieldsEditor'` and `'!memberFilterEditor'`, which will show their namesake
 *
 * The `id` of a node must be unique across the entire spec.
 */
export const spec = [
    {
        type: 'perm',
        name: 'Ĉio',
        id: '*',
    },
    {
        type: 'perm',
        name: 'Aliro al admin.akso.org',
        id: 'admin',
    },
    {
        type: 'perm',
        name: 'Malŝalti uzadlimon',
        id: 'ratelimit.disable',
    },
    {
        type: 'category',
        name: 'Membroj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'codeholders.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'codeholders.update',
                        implies: ['codeholders.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'codeholders.create',
                        implies: ['codeholders.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'codeholders.delete',
                        implies: ['codeholders.create'],
                    },
                    {
                        name: 'Ĉio',
                        id: 'codeholders.*',
                    },
                ],
            },
            {
                type: 'group',
                requires: ['codeholders.read'],
                children: [
                    { type: '!memberRestrictionsSwitch', name: 'Agordi Membrorestriktojn' },
                    '!memberFieldsEditor',
                    '!memberFilterEditor',
                ],
            },
            {
                type: 'group',
                requires: ['codeholders.read'],
                children: [
                    {
                        type: 'perm',
                        name: 'Legi datumhistorion',
                        id: 'codeholders.hist.read',
                    },
                    {
                        type: 'switch',
                        name: 'Membropermesoj',
                        options: [
                            {
                                name: 'Legi',
                                id: 'codeholders.perms.read',
                            },
                            {
                                name: 'Ŝanĝi',
                                id: 'codeholders.perms.update',
                                implies: ['codeholders.perms.read'],
                            },
                        ],
                    },
                    {
                        type: 'perm',
                        name: 'Malŝalti duan faktoron',
                        id: 'codeholders.disable_totp',
                        requires: ['codeholders.read'],
                    },
                    {
                        type: 'switch',
                        name: 'Ŝanĝpetoj',
                        options: [
                            {
                                name: 'Legi',
                                id: 'codeholders.change_requests.read',
                            },
                            {
                                name: 'Ŝanĝi kaj (mal)aprobi',
                                id: 'codeholders.change_requests.update',
                                implies: ['codeholders.change_requests.read'],
                            },
                        ],
                    },
                ],
            },
            {
                type: 'perm',
                name: 'Sendi amasmesaĝon',
                id: 'codeholders.send_notif',
                requires: ['codeholders.read'],
            },
        ],
    },
    {
        type: 'category',
        name: 'Membrokategorioj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'membership_categories.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'membership_categories.update',
                        implies: ['membership_categories.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'membership_categories.create',
                        implies: ['membership_categories.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'membership_categories.delete',
                        implies: ['membership_categories.create'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Roloj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'codeholder_roles.read',
                        implies: ['codeholders.read'],
                        impliesFields: {
                            roles: 'r',
                        },
                    },
                    {
                        name: 'Redakti',
                        id: 'codeholder_roles.update',
                        implies: ['codeholder_roles.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'codeholder_roles.create',
                        implies: ['codeholder_roles.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'codeholder_roles.delete',
                        implies: ['codeholder_roles.create'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Membrolistoj',
        requires: ['codeholders.read'],
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'lists.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'lists.update',
                        implies: ['lists.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'lists.create',
                        implies: ['lists.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'lists.delete',
                        implies: ['lists.create'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Konservitaj filitriloj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'queries.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'queries.update',
                        implies: ['queries.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'queries.create',
                        implies: ['queries.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'queries.delete',
                        implies: ['queries.create'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Adresetikedaj ŝablonoj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'address_label_templates.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'address_label_templates.update',
                        implies: ['address_label_templates.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'address_label_templates.create',
                        implies: ['address_label_templates.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'address_label_templates.delete',
                        implies: ['address_label_templates.create'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Administrado',
        children: [
            {
                type: 'perm',
                name: 'Legi la HTTP-protokolon',
                id: 'log.read',
            },
            {
                type: 'perm',
                name: 'Ĝisdatigi landojn',
                id: 'countries.update',
            },
            {
                type: 'group',
                name: 'Landaroj',
                children: [
                    {
                        type: 'switch',
                        options: [
                            {
                                name: 'Redakti',
                                id: 'country_groups.update',
                            },
                            {
                                name: 'Krei',
                                id: 'country_groups.create',
                                implies: ['country_groups.update'],
                            },
                            {
                                name: 'Forigi',
                                id: 'country_groups.delete',
                                implies: ['country_groups.create'],
                            },

                        ],
                    },
                ],
            },
            {
                type: 'group',
                name: 'API-klientoj',
                children: [
                    {
                        type: 'switch',
                        options: [
                            {
                                name: 'Legi',
                                id: 'clients.read',
                            },
                            {
                                name: 'Redakti',
                                id: 'clients.update',
                                implies: ['clients.read'],
                            },
                            {
                                name: 'Krei',
                                id: 'clients.create',
                                implies: ['clients.update'],
                            },
                            {
                                name: 'Forigi',
                                id: 'clients.delete',
                                implies: ['clients.create'],
                            },
                        ],
                    },
                    {
                        type: 'switch',
                        name: 'Permesoj',
                        requires: ['clients.read'],
                        options: [
                            {
                                name: 'Legi',
                                id: 'clients.perms.read',
                            },
                            {
                                name: 'Redakti',
                                id: 'clients.perms.update',
                                implies: ['clients.perms.read'],
                            },
                        ],
                    },
                ],
            },
            {
                type: 'group',
                name: 'Administraj grupoj',
                children: [
                    {
                        type: 'switch',
                        options: [
                            {
                                name: 'Legi',
                                id: 'admin_groups.read',
                            },
                            {
                                name: 'Redakti',
                                id: 'admin_groups.update',
                                implies: ['admin_groups.read'],
                            },
                            {
                                name: 'Krei',
                                id: 'admin_groups.create',
                                implies: ['admin_groups.update'],
                            },
                            {
                                name: 'Forigi',
                                id: 'admin_groups.delete',
                                implies: ['admin_groups.create'],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Listoj de landaj asocioj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'countries.lists.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'countries.lists.update',
                        implies: ['countries.lists.read'],
                    },
                    {
                        name: 'Forigi',
                        id: 'countries.lists.delete',
                        implies: ['countries.lists.update'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Listoj de fakaj asocioj',
        children: [
            {
                type: 'switch',
                options: [
                    {
                        name: 'Legi',
                        id: 'org_lists.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'org_lists.update',
                        implies: ['org_lists.read'],
                    },
                    {
                        name: 'Forigi',
                        id: 'org_lists.delete',
                        implies: ['org_lists.update'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Voĉdonoj',
        children: Object.entries(baseOrgs).map(([org, name]) => {
            return {
                type: 'switch',
                name: 'Voĉdonoj de ' + name,
                options: [
                    {
                        name: 'Legi',
                        id: 'votes.read.' + org,
                    },
                    {
                        name: 'Redakti',
                        id: 'votes.update.' + org,
                        implies: ['votes.read.' + org],
                    },
                    {
                        name: 'Krei',
                        id: 'votes.create.' + org,
                        implies: ['votes.update.' + org],
                    },
                    {
                        name: 'Forigi',
                        id: 'votes.delete.' + org,
                        implies: ['votes.create.' + org],
                    },
                ],
            };
        }),
    },
    {
        type: 'category',
        name: 'Amasmesaĝaj ŝablonoj',
        children: Object.entries(baseOrgs).map(([org, name]) => {
            return {
                type: 'switch',
                name: 'Amasmesaĝaj ŝablonoj de ' + name,
                options: [
                    {
                        name: 'Legi',
                        id: 'notif_templates.read.' + org,
                    },
                    {
                        name: 'Redakti',
                        id: 'notif_templates.update.' + org,
                        implies: ['notif_templates.read.' + org],
                    },
                    {
                        name: 'Krei',
                        id: 'notif_templates.create.' + org,
                        implies: ['notif_templates.update.' + org],
                    },
                    {
                        name: 'Forigi',
                        id: 'notif_templates.delete.' + org,
                        implies: ['notif_templates.create.' + org],
                    },
                ],
            };
        }),
    },
    {
        type: 'category',
        name: 'AKSO-Pago',
        children: [
            {
                type: 'switch',
                name: 'Vidi pagagordojn ...',
                options: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        name: '... por ' + name,
                        id: 'pay.read.' + org,
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Pagoj por ' + name,
                        options: [
                            {
                                name: 'Legi',
                                id: 'pay.payment_intents.read.' + org,
                                implies: ['pay.read.' + org],
                            },
                            {
                                name: 'Redakti',
                                id: 'pay.payment_intents.update.' + org,
                                implies: ['pay.payment_intents.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'pay.payment_intents.create.' + org,
                                implies: ['pay.payment_intents.update.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Pag-agoj por ' + name,
                        options: [
                            {
                                name: 'Marki kiel sendita',
                                id: 'pay.payment_intents.submit.' + org,
                            },
                            {
                                name: 'Nuligi',
                                id: 'pay.payment_intents.cancel.' + org,
                            },
                            {
                                name: 'Marki kiel repagita',
                                id: 'pay.payment_intents.mark_refunded.' + org,
                            },
                            {
                                name: 'Marki kiel disputita',
                                id: 'pay.payment_intents.mark_disputed.' + org,
                            },
                            {
                                name: 'Marki kiel fintraktita',
                                id: 'pay.payment_intents.mark_succeeded.' + org,
                            },
                        ],
                    };
                }),
            },
            {
                type: 'switch',
                name: 'Aliri sentemajn paginformojn ...',
                options: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        name: '... por ' + name,
                        id: 'pay.payment_intents.sensitive_data.' + org,
                        implies: ['pay.payment_intents.read.' + org],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Pagorganizoj por ' + name,
                        options: [
                            {
                                name: 'Redakti',
                                id: 'pay.payment_orgs.update.' + org,
                                implies: ['pay.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'pay.payment_orgs.create.' + org,
                                implies: ['pay.payment_orgs.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'pay.payment_orgs.delete.' + org,
                                implies: ['pay.payment_orgs.create.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Pagmetodoj por ' + name,
                        options: [
                            {
                                name: 'Redakti',
                                id: 'pay.payment_methods.update.' + org,
                                implies: ['pay.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'pay.payment_methods.create.' + org,
                                implies: ['pay.payment_methods.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'pay.payment_methods.delete.' + org,
                                implies: ['pay.payment_methods.create.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Aldonebloj por ' + name,
                        options: [
                            {
                                name: 'Redakti',
                                id: 'pay.payment_addons.update.' + org,
                                implies: ['pay.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'pay.payment_addons.create.' + org,
                                implies: ['pay.payment_addons.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'pay.payment_addons.delete.' + org,
                                implies: ['pay.payment_addons.create.' + org],
                            },
                        ],
                    };
                }),
            },
        ],
    },
    {
        type: 'category',
        name: 'Membreco',
        children: [
            {
                type: 'switch',
                name: 'Aliĝiloj',
                options: [
                    {
                        name: 'Legi',
                        id: 'registration.options.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'registration.options.update',
                        implies: ['registration.options.read'],
                    },
                    {
                        name: 'Forigi',
                        id: 'registration.options.delete',
                        implies: ['registration.options.update'],
                    },
                ],
            },
            {
                type: 'switch',
                name: 'Aliĝintoj',
                requires: [
                    'registration.options.read',
                    'codeholders.read',
                ],
                options: [
                    {
                        name: 'Legi',
                        id: 'registration.entries.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'registration.entries.update',
                        implies: ['registration.entries.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'registration.entries.create',
                        implies: ['registration.entries.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'registration.entries.delete',
                        implies: ['registration.entries.create'],
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Kongresoj',
        children: [
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Kongresoj de ' + name,
                        options: [
                            {
                                name: 'Legi',
                                id: 'congresses.read.' + org,
                            },
                            {
                                name: 'Redakti',
                                id: 'congresses.update.' + org,
                                implies: ['congresses.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'congresses.create.' + org,
                                implies: ['congresses.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'congresses.delete.' + org,
                                implies: ['congresses.create.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                name: 'Kongresaj okazoj',
                children: [
                    ...Object.entries(baseOrgs).map(([org, name]) => {
                        return {
                            type: 'switch',
                            name: 'Kongresaj okazoj de ' + name,
                            options: [
                                {
                                    name: 'Legi',
                                    id: 'congress_instances.read.' + org,
                                },
                                {
                                    name: 'Redakti',
                                    id: 'congress_instances.update.' + org,
                                    implies: ['congress_instances.read.' + org],
                                },
                                {
                                    name: 'Krei',
                                    id: 'congress_instances.create.' + org,
                                    implies: ['congress_instances.update.' + org],
                                },
                                {
                                    name: 'Forigi',
                                    id: 'congress_instances.delete.' + org,
                                    implies: ['congress_instances.create.' + org],
                                },
                            ],
                        };
                    }),
                    {
                        type: 'group',
                        name: 'Kongresaj aliĝintoj',
                        children: Object.entries(baseOrgs).map(([org, name]) => {
                            return {
                                type: 'switch',
                                name: 'Kongresaj aliĝintoj de kongresoj de ' + name,
                                options: [
                                    {
                                        name: 'Legi',
                                        id: 'congress_instances.participants.read.' + org,
                                    },
                                    {
                                        name: 'Redakti',
                                        id: 'congress_instances.participants.update.' + org,
                                        implies: ['congress_instances.participants.read.' + org],
                                    },
                                    {
                                        name: 'Krei',
                                        id: 'congress_instances.participants.create.' + org,
                                        implies: ['congress_instances.participants.update.' + org],
                                    },
                                    {
                                        name: 'Forigi',
                                        id: 'congress_instances.participants.delete.' + org,
                                        implies: ['congress_instances.participants.create.' + org],
                                    },
                                ],
                            };
                        }),
                    },
                ],
            },
        ],
    },
    {
        type: 'category',
        name: 'Revuoj',
        children: [
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Revuoj de ' + name,
                        options: [
                            {
                                name: 'Legi',
                                id: 'magazines.read.' + org,
                            },
                            {
                                name: 'Redakti',
                                id: 'magazines.update.' + org,
                            },
                            {
                                name: 'Krei',
                                id: 'magazines.create.' + org,
                                implies: ['magazines.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'magazines.delete.' + org,
                                implies: ['magazines.create.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Revuaj dosieroj de ' + name,
                        requires: ['magazines.read.' + org],
                        options: [
                            {
                                name: 'Redakti',
                                id: 'magazines.files.update.' + org,
                            },
                            {
                                name: 'Forigi',
                                id: 'magazines.files.delete.' + org,
                                implies: ['magazines.files.update.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Revuaj sondosieroj de ' + name,
                        requires: ['magazines.read.' + org],
                        options: [
                            {
                                name: 'Redakti',
                                id: 'magazines.recitations.update.' + org,
                            },
                            {
                                name: 'Forigi',
                                id: 'magazines.recitations.delete.' + org,
                                implies: ['magazines.recitations.update.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Simplaj abonoj de ' + name,
                        requires: ['magazines.read.' + org],
                        options: [
                            {
                                name: 'Legi',
                                id: 'magazines.subscriptions.read.' + org,
                            },
                            {
                                name: 'Redakti',
                                id: 'magazines.subscriptions.update.' + org,
                                implies: ['magazines.subscriptions.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'magazines.subscriptions.create.' + org,
                                implies: ['magazines.subscriptions.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'magazines.subscriptions.delete.' + org,
                                implies: ['magazines.subscriptions.create.' + org],
                            },
                        ],
                    };
                }),
            },
            {
                type: 'group',
                children: Object.entries(baseOrgs).map(([org, name]) => {
                    return {
                        type: 'switch',
                        name: 'Abonantaj listoj de revuoj de ' + name,
                        requires: ['magazines.read.' + org, 'codeholders.read'],
                        options: [
                            {
                                name: 'Legi',
                                id: 'magazines.snapshots.read.' + org,
                            },
                            {
                                name: 'Redakti',
                                id: 'magazines.snapshots.update.' + org,
                                implies: ['magazines.snapshots.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'magazines.snapshots.create.' + org,
                                implies: ['magazines.snapshots.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'magazines.snapshots.delete.' + org,
                                implies: ['magazines.snapshots.create.' + org],
                            },
                        ],
                    };
                }),
            },
        ],
    },
    {
        type: 'category',
        name: 'Delegita Reto',
        children: Object.entries({ uea: 'UEA' }).map(([org, name]) => {
            return {
                type: 'group',
                name: 'Delegita Reto de ' + name,
                requires: ['codeholders.read'],
                children: [
                    {
                        type: 'switch',
                        name: 'Delegoj',
                        options: [
                            {
                                name: 'Legi',
                                id: 'codeholders.delegations.read.' + org,
                                implies: ['geodb.read'],
                            },
                            {
                                name: 'Redakti',
                                id: 'codeholders.delegations.update.' + org,
                                implies: ['codeholders.delegations.read.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'codeholders.delegations.delete.' + org,
                                implies: ['codeholders.delegations.update.' + org],
                            },
                        ],
                    },
                    {
                        type: 'perm.country',
                        name: 'Redakti delegojn por specifa lando',
                        implies: ['codeholders.delegations.read.' + org],
                        id: 'codeholders.delegations.update_country_delegates.' + org,
                    },
                    {
                        type: 'switch',
                        name: 'Delegaj kandidatiĝoj',
                        options: [
                            {
                                name: 'Legi',
                                id: 'delegations.applications.read.' + org,
                                implies: ['codeholders.delegations.read.' + org],
                            },
                            {
                                name: 'Redakti',
                                id: 'delegations.applications.update.' + org,
                                implies: ['delegations.applications.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'delegations.applications.create.' + org,
                                implies: ['delegations.applications.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'delegations.applications.delete.' + org,
                                implies: ['delegations.applications.create.' + org],
                            },
                        ],
                    },
                    {
                        type: 'switch',
                        name: 'Delegaj fakoj',
                        options: [
                            {
                                name: 'Legi',
                                id: 'delegations.subjects.read.' + org,
                                implies: ['geodb.read'],
                            },
                            {
                                name: 'Redakti',
                                id: 'delegations.subjects.update.' + org,
                                implies: ['delegations.subjects.read.' + org],
                            },
                            {
                                name: 'Krei',
                                id: 'delegations.subjects.create.' + org,
                                implies: ['delegations.subjects.update.' + org],
                            },
                            {
                                name: 'Forigi',
                                id: 'delegations.subjects.delete.' + org,
                                implies: ['delegations.subjects.create.' + org],
                            },
                        ],
                    },
                ],
            };
        }),
    },
    {
        type: 'category',
        name: 'Bultenoj',
        children: Object.entries(baseOrgs).map(([org, name]) => {
            return {
                type: 'switch',
                name: 'Bultenoj de ' + name,
                options: [
                    {
                        name: 'Legi',
                        id: 'newsletters.' + org + '.read',
                    },
                    {
                        name: 'Redakti',
                        id: 'newsletters.' + org + '.update',
                        implies: ['newsletters.' + org + '.read'],
                    },
                    {
                        name: 'Krei',
                        id: 'newsletters.' + org + '.create',
                        implies: ['newsletters.' + org + '.update'],
                    },
                    {
                        name: 'Forigi',
                        id: 'newsletters.' + org + '.delete',
                        implies: ['newsletters.' + org + '.create'],
                    },
                    {
                        name: 'Sendi',
                        id: 'newsletters.' + org + '.send',
                        implies: ['newsletters.' + org + '.read'],
                    },
                ],
            };
        }),
    },
    {
        type: 'switch',
        name: 'Reteja listo de perantoj',
        options: [
            {
                name: 'Legi',
                id: 'intermediaries.read',
            },
            {
                name: 'Krei kaj redakti',
                id: 'intermediaries.update',
                implies: ['intermediaries.read'],
            },
            {
                name: 'Forigi',
                id: 'intermediaries.delete',
                implies: ['intermediaries.update'],
            },
        ],
    },
    {
        type: 'category',
        name: 'Bultenoj',
        children: Object.entries({uea: 'UEA'}).map(([org, name]) => {
            return {
                type: 'perm.country',
                name: 'Submeti spezfoliojn de ' + name + ' por specifa lando',
                id: 'pay.payment_intents.intermediary.' + org,
            };
        }),
    },
    {
        type: 'perm.country',
        name: 'Krei aliĝojn por specifa lando',
        id: 'registration.entries.intermediary',
    },
];

/*
TODO: Missing fields

*/

/*

    {
        type: 'category',
        name: 'i just need these real quick ty',
        children: [
            {
                type: 'perm',
                name: 'registration entries intermediary',
                id: 'registration.entries.intermediary',
            },
            {
                type: 'perm.country',
                name: 'pay payment intents intermediary uea',
                id: 'pay.payment_intents.intermediary.uea',
            },
        ],
    },
*/

export const memberFieldsAll = 'Ĉiuj kampoj';
export const memberFieldsRead = 'Vidi';
export const memberFieldsWrite = 'Redakti';

/** List of member fields. Some member fields may correspond to multiple API fields. */
export const memberFieldsList = [
    [null, { title: 'Ĝenerale' }],
    ['code', { name: 'Kodo', fields: ['newCode', 'oldCode'] }],
    ['enabled', { name: 'Kontoŝalteco', fields: ['enabled'] }],
    ['codeholderType', { name: 'Membrospeco', fields: ['codeholderType'] }],
    ['creationTime', { name: 'Horo de kreiĝo', fields: ['creationTime'] }],
    ['hasPassword', { name: 'Ĉu kreis konton', fields: ['hasPassword'] }],
    ['files', { name: 'Alkroĉitaj dosieroj', fields: ['files'] }],
    ['logins', { name: 'Historio de ensalutoj', fields: ['logins'] }],
    ['roles', { name: 'Roloj', fields: ['roles'] }],
    ['notes', { name: 'Notoj', fields: ['notes'] }],

    [null, { title: 'Nomo' }],
    [
        'name',
        {
            name: 'Nomo',
            fields: ['firstName', 'firstNameLegal', 'lastName', 'lastNameLegal', 'honorific', 'fullName', 'fullNameLocal', 'careOf', 'nameAbbrev'],
        },
    ],
    ['honorific', { name: 'Titolo', fields: ['honorific'], impliesFields: ['codeholderType'] }],
    ['firstName', { name: 'Persona nomo', fields: ['firstName'], impliesFields: ['codeholderType'] }],
    ['firstNameLegal', { name: 'Persona nomo jura', fields: ['firstNameLegal'], impliesFields: ['codeholderType'] }],
    ['lastName', { name: 'Familia nomo', fields: ['lastName'], impliesFields: ['codeholderType'] }],
    ['lastNameLegal', { name: 'Familia nomo jura', fields: ['lastNameLegal'], impliesFields: ['codeholderType'] }],
    ['fullName', { name: 'Plena nomo de organizo', fields: ['fullName'], impliesFields: ['codeholderType'] }],
    ['fullNameLocal', { name: 'Plena, loka nomo de organizo', fields: ['fullNameLocal'], impliesFields: ['codeholderType'] }],
    ['careOf', { name: 'p/a', fields: ['careOf'], impliesFields: ['codeholderType'] }],
    ['nameAbbrev', { name: 'Organiza mallongigo', fields: ['nameAbbrev'], impliesFields: ['codeholderType'] }],
    ['lastNamePublicity', { name: 'Publikeco de familia nomo', fields: ['lastNamePublicity'], impliesFields: ['codeholderType'] }],
    ['searchName', { name: 'Plena, serĉebla nomo', fields: ['searchName'], impliesFields: ['codeholderType'] }],

    [null, { title: 'Membreco' }],
    ['membership', { name: 'Membreco', fields: ['membership'] }],
    ['isActiveMember', { name: 'Ĉu aktiva membro', fields: ['isActiveMember'] }],
    ['feeCountry', { name: 'Paglando', fields: ['feeCountry'] }],

    [null, { title: 'Adreso' }],
    ['address', { name: 'Adreso', fields: ['address', 'addressLatin', 'searchAddress'] }],
    ['addressCountry', { name: 'Lando', fields: ['address.country', 'addressLatin.country'] }],
    ['addressCountryArea', { name: 'Regiono', fields: ['address.countryArea', 'addressLatin.countryArea'] }],
    ['addressCity', { name: 'Urbo', fields: ['address.city', 'addressLatin.city'] }],
    ['addressCityArea', { name: 'Urboparto', fields: ['address.cityArea', 'addressLatin.cityArea'] }],
    ['addressStreetAddress', { name: 'Stratadreso', fields: ['address.streetAddress', 'addressLatin.streetAddress'] }],
    ['addressPostalCode', { name: 'Poŝtkodo', fields: ['address.postalCode', 'addressLatin.postalCode'] }],
    ['addressSortingCode', { name: 'Ordigkodo', fields: ['address.sortingCode', 'addressLatin.sortingCode'] }],
    ['searchAddress', { name: 'Plena, serĉebla adreso', fields: ['searchAddress'] }],
    ['addressPublicity', { name: 'Publikeco de adreso', fields: ['addressPublicity'] }],

    [null, { title: 'Kontaktinformoj' }],
    ['email', { name: 'Retpoŝtadreso', fields: ['email'] }],
    ['officePhone', { name: 'Oficeja telefono', fields: ['officePhone', 'officePhoneFormatted'] }],
    ['landlinePhone', { name: 'Hejma telefono', fields: ['landlinePhone', 'landlinePhoneFormatted'] }],
    ['cellphone', { name: 'Poŝtelefono', fields: ['cellphone', 'cellphoneFormatted'] }],
    ['emailPublicity', { name: 'Publikeco de retpoŝtadreso', fields: ['emailPublicity'] }],
    ['officePhonePublicity', { name: 'Publikeco de oficeja telefono', fields: ['officePhonePublicity'] }],
    ['landlinePhonePublicity', { name: 'Publikeco de hejma telefono', fields: ['landlinePhonePublicity'] }],
    ['cellphonePublicity', { name: 'Publikeco de poŝtelefono', fields: ['cellphonePublicity'] }],

    [null, { title: 'Aĝo' }],
    ['birthdate', { name: 'Naskiĝdato', fields: ['birthdate'] }],
    ['isDead', { name: 'Morteco', fields: ['isDead'] }],
    ['deathdate', { name: 'Mortdato', fields: ['deathdate'] }],
    ['age', { name: 'Aĝo', fields: ['age', 'agePrimo'] }],

    [null, { title: 'Aldonaj informoj' }],
    ['profilePicture', { name: 'Profilbildo', fields: ['profilePicture', 'profilePictureHash'] }],
    ['profilePicturePublicity', { name: 'Publikeco de profilbildo', fields: ['profilePicturePublicity'] }],
    ['website', { name: 'Retejo', fields: ['website'] }],
    ['biography', { name: 'Biografio', fields: ['biography'] }],
    ['profession', { name: 'Profesio', fields: ['profession'] }],
];

export const memberFields = Object.fromEntries(memberFieldsList.filter(item => !!item[0]));

/**
 * Builds a map from permission id to node.
 * Also sifts down requirements.
 */
function buildReverseMap (spec, mapping, path = [], reqs = []) {
    if (spec.type === 'category' || spec.type === 'group') {
        reqs = reqs.concat(spec.requires || []);
        for (let i = 0; i < spec.children.length; i++) {
            buildReverseMap(spec.children[i], mapping, path.concat([i]), reqs);
        }
    } else if (spec.type === 'switch') {
        reqs = reqs.concat(spec.requires || []);
        let i = 0;
        for (const opt of spec.options) {
            mapping[opt.id] = { path: path.concat([i++]), type: 'option', node: opt, requires: reqs };
        }
    } else if (spec.type === 'perm') {
        reqs = reqs.concat(spec.requires || []);
        mapping[spec.id] = { path, type: 'perm-node', node: spec, requires: reqs };
    } else if (spec.type === 'perm.country') {
        reqs = reqs.concat(spec.requires || []);
        // for the purposes of the mapping, we will consider this to be the "all countries"
        // permission, since this mapping is mostly used for wildcard handling
        mapping[spec.id + '.*'] = { path, type: 'perm-node', node: spec, requires: reqs };
    } else if (typeof spec === 'string' || spec.type.startsWith('!')) {
        // nope
    } else {
        throw new Error('unknown spec type ' + spec.type);
    }

    return mapping;
}

export const reverseMap = buildReverseMap({ type: 'category', children: spec }, {});

export const reverseImplicationGraph = new Map();
export const reverseFieldsImplicationGraph = new Map();
export const reverseRequirementGraph = new Map();
for (const perm in reverseMap) {
    const { node, requires } = reverseMap[perm];
    const implied = [];

    if (node.implies) implied.push(...node.implies);
    if (perm.endsWith('.*')) {
        const prefix = perm.substr(0, perm.length - 1);
        for (const p of Object.keys(reverseMap).filter(x => x.startsWith(prefix))) {
            if (p === perm) continue; // don’t imply self
            implied.push(p);
        }
    }

    for (const perm of implied) {
        if (!reverseImplicationGraph.has(perm)) reverseImplicationGraph.set(perm, new Set());
        reverseImplicationGraph.get(perm).add(node.id);
    }

    for (const field in (node.impliesFields || {})) {
        if (!reverseFieldsImplicationGraph.has(field)) reverseFieldsImplicationGraph.set(field, new Map());
        const fieldMap = reverseFieldsImplicationGraph.get(field);

        const flags = node.impliesFields[field].split('');
        for (const flag of flags) {
            if (!fieldMap.has(flag)) fieldMap.set(flag, new Set());
            fieldMap.get(flag).add(node.id);
        }
    }

    for (const perm of requires) {
        if (!reverseRequirementGraph.has(perm)) reverseRequirementGraph.set(perm, new Set());
        reverseRequirementGraph.get(perm).add(node.id);
    }
}
for (const [, field] of memberFieldsList) {
    for (const f of (field.impliesFields || [])) {
        if (!reverseFieldsImplicationGraph.has(f)) reverseFieldsImplicationGraph.set(f, new Map());
        const fieldMap = reverseFieldsImplicationGraph.get(f);
        if (!fieldMap.has('r')) fieldMap.set('r', new Set());
        if (!fieldMap.has('w')) fieldMap.set('w', new Set());
        for (const id of field.fields) {
            fieldMap.get('r').add('@.' + id + '.r');
            fieldMap.get('w').add('@.' + id + '.w');
        }
    }
}
