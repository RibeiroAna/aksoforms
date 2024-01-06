export const adminGroups = {
    title: 'Administraj grupoj',
    detailTitle: 'Administra grupo',
    permsTitle: 'Permesoj',
    add: 'Aldoni grupon',
    addButton: 'Aldoni',
    removeButton: 'Elpreni',
    edit: 'Redakti',
    editGroup: 'Redakti grupon',
    editUpdate: 'Konservi',
    delete: {
        menuItem: 'Forigi',
        button: 'Forigi',
        title: 'Forigi grupon',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi administran grupon? Ne eblas malfari tiun ĉi agon.',
    },
    search: {
        placeholders: {
            name: 'Serĉi nomojn de grupoj',
        },
    },
    fields: {
        name: 'Nomo',
        description: 'Priskribo',
        memberRestrictions: 'Membrodatumaj restriktoj',
    },
    tabs: {
        codeholders: 'Membroj',
        clients: 'API-klientoj',
    },
    editPerms: 'Redakti permesojn',
    viewPerms: 'Vidi permesojn',
    deleteSelection: 'Forigi elektitojn',

    addingMembers: 'Aldonas membrojn',
    removingMembers: 'Forigas membrojn',
    pickerSearch: 'Serĉi laŭ nomo',

    addCodeholders: 'Aldoni membron',
    addCodeholdersCount: n => `${n} membro${n === 1 ? '' : 'j'} elektitaj`,
    removeCodeholders: n => `Elpreni ${n} membro${n === 1 ? '' : 'j'}n el grupo`,
    removeCodeholdersAreYouSure: n => `Ĉu vi certas, ke vi volas elpreni ${n} membro${n === 1 ? '' : 'j'}n?`,
    addCodeholdersDone: 'Aldoni elektitojn',
    addClients: 'Aldoni API-klientojn',
    removeClients: n => `Elpreni ${n} API-kliento${n === 1 ? '' : 'j'}n el grupo`,
    addClientsCount: n => `${n} API-kliento${n === 1 ? '' : 'j'} elektitaj`,
    removeCancel: 'Nuligi',
    removeConfirm: 'Elpreni',
    addClientsDone: 'Aldoni elektitojn',
    removeClientsAreYouSure: n => `Ĉu vi certas, ke vi volas elpreni ${n} API-kliento${n === 1 ? '' : 'j'}n?`,
    filterToGroup: 'Montri nur membrojn de la grupo',

    nameRequired: 'Necesas nomo',

    csvFilename: 'administraj-grupoj',
};

export const clients = {
    title: 'API-klientoj',
    detailTitle: 'API-kliento',
    secret: {
        title: 'Sekreta API-ŝlosilo',
        description: 'Tio ĉi estas la sekreta API-ŝlosilo. Konservu ĝin aŭ ĝi estos perdita.',
        done: 'Fermi',
    },
    search: {
        placeholders: {
            name: 'Serĉi laŭ nomo',
            apiKey: 'Serĉi ekzaktan API-ŝlosilon',
            ownerName: 'Serĉi laŭ nomo de posedanto',
            ownerEmail: 'Serĉi laŭ retpoŝtadreso',
        },
    },
    fields: {
        name: 'Nomo',
        apiKey: 'API-ŝlosilo',
        ownerName: 'Nomo de posedanto',
        ownerEmail: 'Retpoŝtadreso',
    },

    nameRequired: 'Necesas nomo',
    ownerNameRequired: 'Necesas nomo de posedanto',
    ownerEmailRequired: 'Necesas retpoŝtadreso',

    create: {
        title: 'Aldoni API-klienton',
        button: 'Aldoni',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Konservi',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi API-klienton',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi API-klienton? Ne eblas malfari tiun ĉi agon.',
    },

    perms: {
        editPerms: 'Redakti permesojn',
        viewPerms: 'Vidi permesojn',
        title: 'Permesoj',
    },
    csvFilename: 'api-klientoj',
};

export const httpLog = {
    title: 'API-protokolo',
    detailTitle: 'HTTP-peto',
    search: {
        placeholders: {
            userAgent: 'Serĉi retumilon',
            userAgentParsed: 'Serĉi legeblan retumilon',
        },
        filters: {
            codeholders: 'Membroj',
            time: 'Horo',
            apiKey: 'API-ŝlosilo',
            ip: 'IP-adreso',
            origin: 'Fonto',
            method: 'Metodo',
            path: 'Adreso',
            resStatus: 'Rezulta stato',
            resTime: 'Daŭro (ms)',

            originPlaceholder: 'Ekz. https://admin.akso.org',
            pathEq: 'egalas ekzakte',
            pathStartsWith: 'komenciĝas je',
            pathInverted: 'ne komenciĝas je',
            pathPlaceholder: 'Ekz. /auth',
            resStatusPlaceholder: 'Ekz. 200',

            timeRangeStart: 'Komenco',
            timeRangeEnd: 'Fino',
        },
    },
    fields: {
        time: 'Horo',
        identity: 'Uzanto',
        ip: 'IP-adreso',
        origin: 'Fonto',
        userAgent: 'Retumilo',
        userAgentParsed: 'Retumilo (legebla)',
        method: 'Metodo',
        path: 'Adreso',
        query: 'Peto',
        resStatus: 'Rezulta stato',
        resTime: 'Daŭro',
        resLocation: 'Rezulta loko',
    },
    query: {
        some: 'Havas peton',
        none: '',
    },
    viewCodeholder: 'Vidi membron',
    viewClient: 'Vidi API-klienton',
    csvFilename: 'protokolo',
};

export const countries = {
    title: 'Landoj',
    detailTitle: 'Lando',
    search: {
        placeholders: {
            name_eo: 'Serĉi landojn',
        },
    },
    fields: {
        code: 'Landokodo',
        enabled: 'Ŝaltita',
        name_eo: 'Nomo en Esperanto',
        name_en: 'Nomo en la angla',
        name_fr: 'Nomo en la franca',
        name_es: 'Nomo en la hispana',
        name_nl: 'Nomo en la nederlanda',
        name_pt: 'Nomo en la portugala',
        name_sk: 'Nomo en la slovaka',
        name_zh: 'Nomo en la ĉina',
        name_de: 'Nomo en la germana',
    },
    update: {
        title: 'Redakti landojn',
        button: 'Aktualigi',
    },
    csvFilename: 'landoj',
    enabled: {
        true: 'ŝaltita',
        false: 'malŝaltita',
    },
};
export const countryGroups = {
    title: 'Landaroj',
    detailTitle: 'Landaro',
    search: {
        placeholders: 'Serĉi landarojn',
    },
    detailSearchPlaceholder: 'Serĉi landojn',
    fields: {
        code: 'Landarokodo',
        name: 'Nomo',
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei landaron',
        button: 'Krei',

        invalidCode: 'Nevalida landokodo',
    },
    update: {
        title: 'Redakti landaron',
        button: 'Aktualigi',
    },
    delete: {
        title: 'Forigi landaron',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la landaron? Ne eblas malfari tiun ĉi agon.',
    },
    csvFilename: 'landaroj',
};

export const adminStatus = {
    title: 'Sistema stato',
    workerQueues: {
        title: 'Atendolisto de procesiloj',
        labels: {
            AKSO_SEND_EMAIL: 'Sendado de retmesaĝoj',
            AKSO_SEND_TELEGRAM: 'Sendado de Telegramo-sciigoj',
            AKSO_ADDRESS_LABELS: 'Adresaj etikedoj',
        },
        pendingMessages: 'Atendantaj taskoj',
        consumers: 'Procesiloj',
        noConsumers: 'Estas ĝuste nun nul procesiloj por tiu ĉi tasko. Bonvolu sciigi sisteman administranton.',
    },
};