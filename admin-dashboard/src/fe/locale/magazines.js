export const magazines = {
    title: 'Revuoj',
    detailTitle: 'Revuo',
    search: {
        fields: {
            name: 'Nomo',
            description: 'Priskribo',
        },
        placeholders: {
            name: 'Serĉi nomon',
            description: 'Serĉi priskribon',
        },
    },
    fields: {
        org: 'Organizo',
        name: 'Nomo',
        description: 'Priskribo',
        issn: 'ISSN-numero',
        subscribers: 'Abonantoj',
    },
    create: {
        title: 'Krei revuon',
        button: 'Krei',
        menuItem: 'Krei revuon',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti revuon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi revuon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la revuon? Ne eblas malfari tiun ĉi agon.',
    },

    subscribers: {
        access: 'Retaj alirantoj',
        paper: 'Paperaj ricevantoj',

        everyone: 'Ĉiuj ensalutintoj',
        noone: 'Neniu',
        complex: 'Vd. sube',

        filterFieldDesc: 'Laŭ filtrilo. Vi povas akiri filtrilon el la sekcio “Membroj” alklakante je “Konverti al JSON-filtrilo”',
        filterView: 'Vidi trovitojn',

        members: 'Membroj',
        membersDesc: 'IMoj kiuj povas aliri la revuon',
        membersAll: 'Ĉiuj IMoj',
        membersNone: 'Neniu IMo',
        membersFilter: 'Laŭ filtrilo',

        membersFilterInner: 'Ena membrofiltrilo',
        membersFilterInnerDesc: 'Aldone filtru laŭ membreco',
        membersFilterInnerFieldDesc: 'Vi povas akiri filtrilon el la sekcio “Membreco▸Kategorioj” alklakante je “Konverti al JSON-filtrilo”',
        membersFilterInnerDefault: 'Defaŭlta valoro: nur membrokategorioj, kiuj estas membrecdonaj.',

        membersIncludeLastYear: 'Eksmembra alirdaŭro',
        membersIncludeLastYearNone: 'Nenio',
        membersIncludeLastYearDesc: 'Kiom longe IMoj kaj abonantoj de la pasinta jaro (kiuj ne jam re-aliĝis/reabonis) povas aliri la ĉi-jarajn revuojn.',

        filter: 'Simpla alirfiltrilo',
        enableFilter: 'Ŝalti filtrilon',
        filterDesc: 'Filtrilo de tiuj kiuj povas aliri la revuon sendepende de membreco.',

        excludeFilter: 'Ekskludfiltrilo',
        excludeFilterDesc: 'Filtrilo de kodposedantoj, kiuj neniam estas inkluditaj sendepende de ĉiuj aliaj agordoj.',

        freelyAvailableAfter: 'Libere alirebla post',
        freelyAvailableAfterDesc: 'Revuaj eldonoj iĝos libera alireblaj de la publiko post tiom ĉi da tempo. Por neniam, enmetu 0.',
    },
};

export const magazineEditions = {
    title: 'Revuaj numeroj',
    detailTitle: 'Revua numero',
    search: {
        fields: {
            idHuman: 'Numero',
            description: 'Priskribo',
        },
        placeholders: {
            idHuman: 'Serĉi numeron',
            description: 'Serĉi priskribon',
        },
    },
    fields: {
        idHuman: 'Numero',
        date: 'Dato',
        published: 'Publikigita',
        description: 'Priskribo',
        subscribers: 'Abonantoj',
        subscribersOverride: 'Superskribi revuajn agordojn',

        dateFreelyAvailable: {
            access: 'La reta versio libere alireblas post',
        },
    },
    create: {
        title: 'Krei numeron',
        button: 'Krei',
        menuItem: 'Krei numeron',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti numeron',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi numeron',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi numeron? Ne eblas malfari tiun ĉi agon.',
    },
    deleteThumbnail: {
        title: 'Forigi bildon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la bildon? Ne eblas malfari tiun ĉi agon.',
    },
    files: {
        update: {
            title: 'Alŝuti dosieron',
            button: 'Alŝuti',
        },
        delete: {
            title: 'Forigi dosieron',
            description: 'Ĉu vi certas, ke vi volas forigi la dosieron? Ne eblas malfari tiun ĉi agon.',
            button: 'Forigi',
        },
        upload: 'Alŝuti',
        download: 'Elŝuti',
        downloads: n => `${n} elŝuto${n == 1 ? '' : 'j'}`,
    },
    picker: {
        prompt: 'Elekti revuan numeron',
        editionPrompt: 'Elekti revuan numeron',
    },
};

export const magazineToc = {
    title: 'Enhavo',
    detailTitle: 'Artikolo',
    search: {
        fields: {
            title: 'Titolo',
            author: 'Aŭtoro',
            recitationAuthor: 'Laŭtleginto',
            text: 'Teksto',
        },
        placeholders: {
            idHuman: 'Serĉi numeron',
            description: 'Serĉi priskribon',
            title: 'Serĉi titolon',
            author: 'Serĉi aŭtoron',
            recitationAuthor: 'Serĉi laŭtleginton',
            text: 'Serĉi en teksto',
        },
    },
    fields: {
        page: 'Paĝo',
        title: 'Titolo',
        author: 'Aŭtoro',
        recitationAuthor: 'Laŭtleginto',
        text: 'Teksto',
        highlighted: 'Aparte leginda',
    },
    create: {
        title: 'Aldoni artikolon',
        button: 'Aldoni',
        menuItem: 'Aldoni artikolon',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti artikolon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi artikolon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi artikolon? Ne eblas malfari tiun ĉi agon.',
    },
    recitations: {
        title: 'Voĉlego',
        update: {
            title: 'Alŝuti voĉlegon',
            button: 'Alŝuti',
        },
        delete: {
            title: 'Forigi voĉlegon',
            description: 'Ĉu vi certas, ke vi volas forigi la voĉlegon? Ne eblas malfari tiun ĉi agon.',
            button: 'Forigi',
        },
    },
};

export const magazineSubs = {
    title: 'Simplaj abonoj revuaj',
    detailTitle: 'Simpla abono',
    search: {
        placeholders: {
            internalNotes: 'Internaj notoj',
        },
        filters: {
            paperVersion: 'Papera versio',
            paperVersionTypes: {
                yes: 'jes',
                no: 'ne',
                none: 'ne gravas',
            },
        },
    },
    fields: {
        magazineId: 'Revua identigilo',
        codeholderId: 'Membro',
        year: 'Jaro',
        createdTime: 'Horo de kreiĝo',
        internalNotes: 'Internaj notoj',
        paperVersion: 'Papera versio',
    },
    create: {
        title: 'Krei simplan abonon revuan',
        button: 'Krei',
        menuItem: 'Krei abonon',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti simplan abonon revuan',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi simplan abonon revuan',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi simplan abonon revuan? Ne eblas malfari tiun ĉi agon.',
    },
    buttonLabel: count => count ? `${count} simpla${count === 1 ? '' : 'j'} abono${count === 1 ? '' : 'j'}` : `Simplaj abonoj`,
};

export const magazineSnaps = {
    title: 'Momentaj abonantoj',
    detailTitle: 'Momenta rigardo je abonantoj',
    fields: {
        time: 'Horo',
        name: 'Nomo',
    },
    codeholders: {
        compare: 'Kompari al alia momenta rigardo',
        comparing: 'Montras nur trovitojn, kiuj ne estis en la antaŭa momenta rigardo.',
        empty: 'Neniu kodposedanto troviĝis en tiu ĉi momenta rigardo.',
        compareEmpty: 'Neniu kodposedanto troviĝis kompare al la antaŭa momenta rigardo.',
        missingData: id => `Vi ne rajtas vidi la konton id=${id}`,
    },
    create: {
        title: 'Kreado de momenta rigardo',
        button: 'Krei',
        menuItem: 'Krei momentan rigardon',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti momentan rigardon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi momentan rigardon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi momentan rigardon? Ne eblas malfari tiun ĉi agon.',
    },
    csvFilename: 'momenta_rigardo',
    countryCount: {
        menuItem: 'CSV de lando-kvantoj',
        title: 'CSV de lando-kvantoj',
        beginExport: 'Elporti',
        download: 'Elŝuti CSV',
        columns: {
            countryName: 'Lando',
            countryCode: 'Landokodo',
            count: 'Kvanto',
        },
        filename: 'lando_kvantoj',
    },
    memberInclusionInfo: {
        editionDate: 'Dato de la eldono',
        includeLastYearCutoffDate: 'Inkludas pasintjarajn membrojn ĝis',
        includesLastYear: 'Tiu ĉi momenta rigardo inkludas pastintjarajn membrojn.',
        doesNotIncludeLastYear: 'Pastintjaraj membroj ne estas inkludataj en tiu ĉi momenta rigardo.',
        editInfo: [
            'Se vi bezonas ŝanĝi tiun agordon, redaktu la abon-agordojn de',
            'la eldono',
            ' aŭ la ',
            'revuo',
            '.',
        ],
    },
};
