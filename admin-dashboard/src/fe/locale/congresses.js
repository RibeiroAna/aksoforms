export const congresses = {
    title: 'Kongresoj',
    detailTitle: 'Kongreso',
    search: {
        placeholders: {
            name: 'Serĉi kongresan nomon',
            abbrev: 'Serĉi kongresan mallongigon',
        },
    },
    fields: {
        name: 'Nomo',
        abbrev: 'Mallongigo',
        org: 'Organizo',
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei kongreson',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti kongreson',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi kongreson',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la kongreson? Ne eblas malfari tiun ĉi agon.',
    },
    misc: {
        llLat: 'Lat.',
        llLon: 'Lon.',
    },
};

export const congressInstances = {
    detailTitle: 'Kongresa okazigo',
    registrationFormLink: 'Vidi aliĝilon',
    search: {
        placeholders: {
            name: 'Serĉi nomon de kongresa okazigo',
            locationName: 'Serĉi nomon de kongresa loko',
            locationNameLocal: 'Serĉi lokan nomon de kongresa loko',
        },
    },
    fields: {
        name: 'Nomo',
        humanId: 'Homa ID',
        dateFrom: 'Komenciĝdato',
        dateTo: 'Finiĝdato',
        locationName: 'Loko',
        locationNameLocal: 'Loka nomo de loko',
        locationCoords: 'Koordinatoj de loko',
        locationAddress: 'Adreso de loko',
        tz: 'Horzono',

        locationPrefix: 'en',
    },
    tabs: {
        locations: 'Lokoj',
        programs: 'Programeroj',
        participants: 'Aliĝintoj',
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei okazigon',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti okazigon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi okazigon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la okazigon? Ne eblas malfari tiun ĉi agon.',
    },
    general: {
        tagPicker: {
            search: 'Serĉi…',
            empty: 'Neniu etikedo',
        },
    },
};

export const congressLocations = {
    detailTitle: 'Kongresa loko',
    search: {
        placeholders: {
            name: 'Serĉi nomon',
            description: 'Serĉi priskribon',
        },
        filters: {
            type: 'Tipo',
            externalLoc: 'Ekstera loko',
            open: 'Malfermita',
            tags: 'Etikedoj',

            openType: {
                date: 'je horo ...',
                none: 'sen malfermaj horoj',
            },
        },
    },
    fields: {
        name: 'Nomo',
        type: 'Tipo',
        description: 'Priskribo',
        address: 'Adreso',
        ll: 'Koordinatoj',
        rating: 'Taksa valoro',
        icon: 'Bildeto',
        externalLoc: 'Ekstera loko',
        openHours: 'Malfermaj horoj',

        ratingInfixOf: 'el',
        ratingInvalid: 'Nevalida taksa valoro',
        nameRequired: 'Necesas nomo',

        location: 'Loko',
        internalLocations: 'Internaj lokoj',

        types: {
            external: 'Ekstera loko',
            internal: 'Interna loko',
            none: 'ne gravas',
        },
        openHoursClosed: 'Fermita',
    },
    locatedWithinExternalLoc: 'situas ene de', // prefix
    locatedWithinNowhere: 'nenie', // if externalLoc is null
    locationPicker: {
        pick: 'Elekti lokon',
        empty: '[[No locations]]',
        search: 'Serĉi…',
    },
    congressAddress: 'Adreso de la kongreso',
    iconPicker: {
        empty: 'Neniu bildeto',
        pick: 'Elekti bildeton',
        labels: {
            GENERIC: 'Ĝenerala',
            STAR: 'Kongresejo',
            BUS: 'Aŭtobushaltejo',
            TRAIN: 'Trajnstacio',
            AIRPORT: 'Flughaveno',
            TAXI: 'Taksihaltejo',
            METRO: 'Metrostacio',
            TRAM: 'Tramhaltejo',
            FERRY: 'Pramŝipejo',
            BIKE_RENTAL: 'Luejo de bicikloj',
            PARKING: 'Parkejo',
            GAS_STATION: 'Benzinstacio',
            ATM: 'Monaŭtomato',
            HOSPITAL: 'Malsanulejo',
            PHARMACY: 'Apoteko',
            PRINT_SHOP: 'Presvendejo',
            MALL: 'Amasvendejo',
            LAUNDRY_SERVICE: 'Lavejo',
            POST_OFFICE: 'Poŝtoficejo',
            TOURIST_INFORMATION: 'Turisma informejo',
            POLICE: 'Policejo',
            RESTAURANT: 'Restoracio',
            FAST_FOOD: 'Rapidmanĝejo',
            CAFE: 'Kafejo',
            BAR: 'Drinkejo',
            GROCERY_STORE: 'Superbazaro',
            CONVENIENCE_STORE: 'Rapidvendejo',
            STORE: 'Vendejo',
            MUSEUM: 'Muzeo',
            MOVIE_THEATER: 'Kinejo',
            THEATER: 'Teatro',
            CULTURAL_CENTER: 'Kultura centro',
            LIBRARY: 'Biblioteko',
            POINT_OF_INTEREST: 'Vidindaĵo',
            HOTEL: 'Hotelo',
            HOSTEL: 'Hostelo',
        },
    },
    create: {
        menuItem: 'Krei lokon',
        title: 'Krei lokon',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti lokon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi lokon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la lokon? Ne eblas malfari tiun ĉi agon.',
    },
    deleteThumbnail: {
        title: 'Forigi bildon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la bildon? Ne eblas malfari tiun ĉi agon.',
    },
};

export const congressPrograms = {
    detailTitle: 'Kongresa programero',
    search: {
        placeholders: {
            title: 'Programa titolo',
            description: 'Priskribo',
        },
        filters: {
            location: 'Loko',

            timeSlice: 'Tempointervalo',
            timeSliceFrom: 'ekde',
            timeSliceTo: 'ĝis',

            tags: 'Etikedoj',
        },
    },
    fields: {
        title: 'Titolo',
        description: 'Priskribo',
        owner: 'Respondeculo(j)',
        timeFrom: 'Ekde',
        timeTo: 'Ĝis',
        location: 'Loko',
    },
    timeline: {
        empty: 'Okazas neniu programero en tiu ĉi tago',
    },
    create: {
        menuItem: 'Krei programeron',
        duplicateMenuItem: 'Kopii',
        title: 'Krei programeron',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti programeron',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi programeron',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la programeron? Ne eblas malfari tiun ĉi agon.',
    },

    print: {
        menuItem: 'Presi',
        dialog: {
            title: 'Presi programon',
            load: 'Ŝarĝi',
            print: 'Presi',
        },
        failedToOpenPrintWindow: 'Ne sukcesis malfermi la presilan fenestron',
        print: 'Presi',
        printTitle: instanceName => `Programo de ${instanceName}`,
    },
};

export const congressParticipants = {
    title: 'Aliĝintoj',
    detailTitle: 'Aliĝinto',
    search: {
        placeholders: {
            notes: 'Serĉi notojn',
        },
        filters: {
            approval: 'Permana aprobo',
            approvalTypes: {
                true: 'aprobita',
                false: 'ne aprobita',
                none: 'ne gravas',
            },
            validity: 'Valideco',
            validityTypes: {
                true: 'valida',
                false: 'ne valida',
                none: 'ne gravas',
            },
            canceled: 'Nuligita',
            canceledTypes: {
                true: 'nuligita',
                false: 'ne nuligita',
                none: 'ne gravas',
            },
            createdTime: 'Kreita je',
            timeRangeStart: 'Komenciĝhoro',
            timeRangeEnd: 'Finiĝhoro',
            amountPaid: 'Monsumo pagita',
            hasPaidMinimum: 'Antaŭpagis',
            paidMinimumTypes: {
                true: 'jes',
                false: 'ne',
                none: 'ne gravas',
            },

            checkInTime: 'Alvenhoro',
            checkInTimeOptions: {
                none: 'ne gravas',
                no: 'ne alvenis',
                yes: 'alvenis',
                useRange: 'laŭ horo',
                rangeStart: 'komenco',
                rangeEnd: 'fino',
            },

            dataId: 'Aliĝidentigilo',
            dataIdDescription: 'Enmetu aliĝidentigilojn; po unu en unu vico.',

            data: 'Aliĝdatumoj',

            dataVerbs: {
                eq: { is: 'estas', isnt: 'ne estas' },
                ord: {
                    is: 'estas',
                    isnt: 'ne estas',
                    lt: 'estas malpli ol',
                    gt: 'estas pli ol',
                },
                set: { in: 'enestas', nin: 'ne enestas' },
            },
        },
    },
    noParticipation: 'Estas neniu aliĝilo',
    fields: {
        dataId: 'Aliĝidentigilo',
        identity: 'Identeco',
        approved: 'Aprobita',
        notes: 'Notoj',
        price: 'Aliĝkotizo',
        paid: 'Sumo pagita', // amountPaid + hasPaidMinimum
        isValid: 'Valideco de aliĝo',
        sequenceId: 'Kongresa numero',
        cancelledTime: 'Nuligita',
        createdTime: 'Kreita je',
        editedTime: 'Laste redaktita je',
        checkInTime: 'Alvenhoro',
        data: 'Datumoj',
        customFormVars: 'Propraj variabloj',

        statuses: {
            pending: 'Atendanta',
            canceled: 'Nuligita',
            valid: 'Valida',
        },
        invalidDataId: 'Nevalida aliĝidentigilo',
        dataAllowInvalid: 'Permesi nevalidajn datumojn',

        codeholderIdViewCodeholder: 'Vidi membron',
        hasPaidMinimumShort: 'min',
        hasPaidMinimumDescription: 'Aliĝinto antaŭpagis',
        viewPayments: 'Vidi pagojn',
        actions: {
            createPaymentIntent: 'Aldoni pagon',
            createPaymentIntentData: {
                title: 'Kongresa aliĝo',
            },
            approveManually: 'Permane aprobi',
            cancel: 'Nuligi',
            setCheckedIn: 'Marki kiel alveninta',
            unsetCheckedIn: 'Marki kiel nealveninta',

            checkInConfirmWithoutFullPayment: 'Tiu ĉi aliĝinto ne pagis sian plenan kotizon. Ĉu vi certas, ke vi volas registri rin kiel alveninta? Se vi volas registri kontantan pagon, faru tion unue.',
            checkInConfirmCancel: 'Reveni',
            checkInConfirmConfirm: 'Konfirmi',
        },

        customFormVarsEmpty: 'Neniu superskribo',
    },
    spreadsheet: {
        title: 'Aliĝintoj',
        exportCsv: 'Elŝuti CSV',
        bool: {
            true: 'jes',
            false: 'ne',
            null: '-',
        },
        searchQueryNotice: 'Vi havas aktivan serĉon. La elŝutotaj aliĝintoj estos filtritaj laŭ tiu filtrilo.',
    },
    create: {
        menuItem: 'Krei aliĝinton',
        title: 'Krei aliĝinton',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti aliĝinton',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi aliĝinton',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi ne volas anstataŭe nuligi la aliĝon, kaj ke vi volas nepre forigi la aliĝon? Ne eblas malfari tiun ĉi agon.',
    },
    resendConfirmation: {
        menuItem: 'Resendi aliĝkonfirmilon',
        title: 'Resendo de aliĝkonfirmilo',
        description: 'Farante tion ĉi vi sendos retpoŝtmesaĝon al',
        button: 'Sendi',
        sent: 'Resendis aliĝkonfirmilon.',
    },
    sendNotifTemplate: 'Sendi amasmesaĝon',
    sendNotifTemplateMessage: n => `Sendos sciigon al ${n} aliĝinto${n === 1 ? '' : 'j'}.`,
    csvFilename: 'alighintoj',

    openTableView: 'Malfermi tabelan montron',
    findParticipantById: {
        menuItem: 'Trovi laŭ ID',
        title: 'Trovi aliĝinton laŭ aliĝidentigilo',
        find: 'Trovi',
    },
};

export const congressRegistrationForm = {
    title: 'Aliĝilo',
    editingTitle: 'Redakti aliĝilon',
    create: 'Krei',
    noForm: 'Estas neniu aliĝilo', // when user doesn't have permissions to create
    update: {
        menuItem: 'Redakti',
        title: 'Redakti aliĝilon',
        button: 'Aktualigi',
    },
    copyFrom: {
        menuItem: 'Kopii de ...',
        title: 'Kopii aliĝilon de ...',
        description: 'Tio ĉi kopios aliĝilon de alia kongresa okazigo. Farante tion, vi plene superskribos la aliĝilon de la nuna kongreso (se ekzistas).',
        button: 'Ŝarĝi',
        unknownError: 'Nekonata eraro',
        hasNoForm: 'Tiu kongresa okazigo ne havas aliĝilon.',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi aliĝilon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la aliĝilon? Ne eblas malfari tiun ĉi agon.',
    },
};

export const congressParticipations = {
    title: 'Kongresaj aliĝoj',
    fields: {
        congressId: 'Kongreso',
        congressInstanceHumanId: 'Homa ID',
        congressInstanceLocation: 'Loko',
        congressInstanceId: 'Kongresa okazigo',
        dataId: 'Aliĝidentigilo',
    },
    buttonLabel: n => n === 0 ? `Kongresoj` : n === 1 ? `1 Kongreso` : `${n} Kongresoj`,
};
