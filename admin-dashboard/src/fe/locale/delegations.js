export const delegations = {
    title: 'Delegitoj',
    titleInCodeholder: 'Delegoj',
    detailTitle: 'Delegitoj',
    search: {
        fields: {
            'hosting.description': 'Gastigada priskribo',
        },
        placeholders: {
            'hosting.description': 'Serĉi en gastigadaj priskriboj',
        },
        filters: {
            org: 'Organizo',
            approvedBy: 'Aprobinto',
            subjects: 'Fakoj',
            cities: 'Urboj',
            countries: 'Landaj delegoj',
            countryLevels: 'Nivelo de landa delego',
            countryLevelsDontCare: 'ne gravas',
            hostingMaxDays: 'Maksimuma gastigada daŭro',
            hostingMaxPersons: 'Maksimumaj gastigadaj gastoj',
            orgFilterNone: 'ne gravas',
        },
    },
    fields: {
        org: 'Organizo',
        codeholderId: 'Membro',
        approvedBy: 'Aprobinto',
        approvedTime: 'Aprobita je',
        cities: 'Urboj',
        cityCountries: 'Landoj de urboj',
        countries: 'Landaj delegoj',
        subjects: 'Fakoj',
        hosting: 'Gastigado',
        tos: 'Kondiĉoj',
    },
    approvalTimeFindMatching: 'Trovi kandidatiĝon',
    hosting: {
        maxDays: 'Maksimuma daŭro',
        maxPersons: 'Maksimumaj gastoj',
        maxDaysUnit: n => n == 1 ? 'tago' : 'tagoj',
        maxPersonsUnit: n => n == 1 ? 'homo' : 'homoj',
        description: 'Priskribo',
        psProfileURL: 'Ligilo al Pasporta Servo',
        maxDaysNone: 'Nenia limo indikita',
        maxPersonsNone: 'Nenia limo indikita',
        psProfileURLInvalid: 'Tio ne aspektas kiel valida adreso de profilo ĉe Pasporta Servo',
    },
    tos: {
        docDataProtectionUEA: 'Ĝenerala Regularo pri Datumprotekto de UEA',
        docDelegatesUEA: 'Regularo pri Delegitoj',
        docDelegatesDataProtectionUEA: 'Datumprotekto de Delegitoj',
        paperAnnualBook: 'Apero en papera jarlibro',

        fieldTime: 'Farita je',
    },
    create: {
        title: 'Delegi membron',
        button: 'Delegi',
        menuItem: 'Aldoni delegiton',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti delegon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi delegon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la delegon de tiu ĉi membro? Ne eblas malfari tiun ĉi agon.',
    },
    countrySelectTitle: 'Elekti landajn delegojn',
    countryLevelsTitle: 'Nivelo',
    countryLevels: [
        'Ĉefdelegito',
        'Vicdelegito',
    ],
    cityPicker: {
        pick: 'Elekti urbojn',
        pickOne: 'Elekti urbon',
        search: 'Serĉi urbon laŭ nomo',

        // TODO: move this out
        fields: {
            nativeLabel: 'Loka nomo',
            eoLabel: 'E-nomo',
            subdivision_nativeLabel: 'Loka nomo de regiono',
            subdivision_eoLabel: 'E-nomo de regiono',
            id: 'Identigilo',
            country: 'Lando',
            population: 'Loĝantoj',
            ll: 'Koordinatoj',
            subdivision_iso: 'Regiona ISO-kodo',
        },
    },
    buttonLabel: count => count ? `${count} delego${count === 1 ? '' : 'j'}` : `Delegoj`,
    export: {
        menuItem: 'Elporti por jarlibro',
        title: 'Jarlibra elportado',
        start: 'Elporti',
        retry: 'Reprovi',
        fileName: 'delegitoj-jarlibro.zip',
        downloadFile: 'Konservi zip-dosieron',
        settings: {
            useFilter: 'Uzi filtrilojn de serĉ-paĝo',
            ignoreTos: 'Inkluzivi delegitojn kiuj ne akceptis aperi en papera jarlibro',
        },
        files: {
            countries: 'landoj',
            cities: 'urboj',
            subjects: 'fakoj',
            delegates: 'delegitoj',
            codeholders: 'membroj',
        },
        progress: {
            messages: {
                error: 'Okazis nekonata eraro. Bonvolu reprovi.',
                loadCountries: 'Trovas landojn',
                loadDelegates: 'Trovas delegitojn',
                loadCodeholders: 'Trovas membrodatumojn',
                loadDelegatesSub: 'Trovas delegito-datumojn',
                loadCities: 'Trovas urbojn',
                loadSubjects: 'Trovas fakojn',
                csvCountries: 'Konservas landojn',
                csvCities: 'Konservas urbojn',
                csvSubjects: 'Konservas fakojn',
                csvDelegates: 'Konservas delegitojn',
                csvCodeholders: 'Konservas membro-datumojn',
            },
        },
    },
};

export const delegationSubjects = {
    title: 'Fakoj',
    detailTitle: 'Delegita fako',
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
    },
    create: {
        title: 'Krei novan fakon',
        button: 'Krei',
        menuItem: 'Krei fakon',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti fakon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi fakon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi delegitan fakon? Ne eblas malfari tiun ĉi agon.',
    },
    picker: {
        pick: 'Elekti delegitajn fakojn',
        search: 'Serĉi fakon laŭ nomo',
    },
};

export const delegationApplications = {
    title: 'Kandidatiĝoj',
    detailTitle: 'Kandidatiĝo',
    search: {
        fields: {
            internalNotes: 'Internaj notoj',
        },
        placeholders: {
            internalNotes: 'Serĉi en internaj notoj',
        },
        filters: {
            status: 'Stato',
            codeholderId: 'Membro',
            statusTime: 'Horo de stato',

            statusAny: 'ne gravas',
            timeRangeStart: 'Komenco',
            timeRangeEnd: 'Fino',
        },
    },
    fields: {
        org: 'Organizo',
        codeholderId: 'Membro',
        status: 'Stato',
        approvedBy: 'Aprobinto',
        approvedTime: 'Aprobita je',
        cities: 'Urboj',
        subjects: 'Fakoj',
        hosting: 'Gastigado',
        applicantNotes: 'Notoj de la kandidato',
        internalNotes: 'Internaj notoj',
        tos: 'Kondiĉoj',
    },
    status: {
        pending: 'Atendanta',
        approved: 'Aprobita',
        denied: 'Malaprobita',
        changedBy: 'Laste ŝanĝita de',
        time: 'Sendita je',
        approve: 'Aprobi',
        deny: 'Malaprobi',
    },
    create: {
        title: 'Krei kandidatiĝon',
        button: 'Krei',
        menuItem: 'Krei kandidatiĝon',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti kandidatiĝon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi kandidatiĝon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la kandidatiĝon? Ne eblas malfari tiun ĉi agon.',
    },
    approve: {
        title: 'Aprobo de kandidatiĝo',
        button: 'Aprobi',
        description: 'Aprobante tiun ĉi kandidatiĝon vi samtempe delegas la membron laŭ la kandidatiĝo. La membro ne estos aŭtomate sciigita pri ties delegitiĝo, do vi poste permane mem sendu al tiu retmesaĝon kun informoj por novaj delegitoj.',
    },
    deny: {
        title: 'Malaprobo de kandidatiĝo',
        button: 'Malaprobi',
        description: 'La membro ne estos aŭtomate sciigita pri la malaprobo de ties kandidatiĝo. Tial vi permane sendu al tiu retmesaĝon kun klarigo.',
    },
};
