export const currencies = {
    USD: 'Usonaj Dolaroj (USD)',
    AUD: 'Aŭstraliaj Dolaroj (AUD)',
    CAD: 'Kanadaj Dolaroj (CAD)',
    CHF: 'Svisaj Frankoj (CHF)',
    DKK: 'Danaj Kronoj (DKK)',
    EUR: 'Eŭroj (EUR)',
    GBP: 'Britaj Pundoj (GBP)',
    HKD: 'Honkonga Dolaro (HKD)',
    JPY: 'Japana Eno (JPY)',
    MXN: 'Meksika Peso (MXN)',
    MYR: 'Malajzia Ringito (MYR)',
    NOK: 'Norvega Krono (NOK)',
    NZD: 'Nov-Zelanda Dolaro (NZD)',
    PLN: 'Polaj Zlotoj (PLN)',
    SEK: 'Svedaj Kronoj (SEK)',
    SGD: 'Singapuraj Dolaroj (SGD)',
};

export const paymentOrgs = {
    title: 'Pagorganizoj',
    detailTitle: 'Pagorganizo',
    fields: {
        org: 'Organizo',
        name: 'Nomo',
        description: 'Priskribo',
    },
    detailTabs: {
        org: 'Pri la pagorganizo',
        addons: 'Aldonebloj',
        methods: 'Pagmetodoj',
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei pagorganizon',
        button: 'Krei',
        orgs: {
            tejo: 'TEJO',
            uea: 'UEA',
        },
    },
    createAddon: 'Krei aldoneblon',
    createMethod: 'Krei pagmetodon',
    update: {
        menuItem: 'Redakti',
        title: 'Ĝisdatigi',
        button: 'Konservi',
        nameRequired: 'Necesas nomo',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi pagorganizon',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi pagorganizon?',
        button: 'Forigi',
    },
};
export const paymentAddons = {
    detailTitle: 'Aldonebloj',
    fields: {
        name: 'Nomo',
        description: 'Priskribo',
    },
    create: {
        title: 'Krei aldoneblon',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Ĝisdatigi',
        button: 'Konservi',
        nameRequired: 'Necesas nomo',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi aldoneblon',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi aldoneblon?',
        button: 'Forigi',
    },
};
export const paymentMethods = {
    detailTitle: 'Pagmetodo',
    fields: {
        type: 'Pagmaniero',
        stripeMethods: 'Stripe-metodoj',
        name: 'Nomo',
        internalDescription: 'Internaj notoj',
        descriptionPreview: 'Publika antaŭ-priskribo',
        description: 'Publika post-priskribo',
        currencies: 'Valutoj',
        internal: 'Interna',
        paymentValidity: 'Valideco de neplenumitaj pagoj',
        isRecommended: 'Rekomendita',
        stripeSecretKey: 'Sekreta ŝlosilo de Stripe',
        stripePublishableKey: 'Publika ŝlosilo de Stripe',
        fee: 'Kotizo',
        feeFixed: 'Fiksa kotizo',
        feePercent: 'Elcenta kotizo',
        fees: {
            fixed: 'Fiksa kotizo',
            percent: 'Elcenta kotizo',
            description: 'La fiksaj kaj elcentaj kotizoj estos kunaldonitaj',
        },

        descriptionPreviewDescription: 'Montrata antaŭ ol kliento elektas pagmanieron. Ĝi inkluzivu nur ĝeneralajn informojn pri la pagmaniero, sed precipe neniuj informoj pri kiel fari la pagon.',
        descriptionDescription: 'Montrata al klientoj post kiam ili elektis pagmanieron. Ĝi inkluzivu informojn pri kiel sendi la pagon, ekz. IBAN aŭ PayPal-retpoŝtadreson.',

        types: {
            manual: 'Permana',
            stripe: 'Stripe™',
            intermediary: 'Peranta',
        },
        stripeMethodValues: {
            card: 'Karto',
        },
        noCurrenciesSelected: 'Neniu valuto estis elektita',
        paymentValidityTypes: {
            limited: 'Validas dum ...',
            forever: 'Neniam eksvalidiĝas',
        },
        paymentValidityWarning: 'Ni rekomendas ŝalti eksvalidiĝon',

        prices: 'Kotizoj',

        maxAmount: 'Maksimuma sumo',
        maxAmountEnable: 'Uzi maksimuman sumon',
        maxAmountErrMinAmount: 'La maksimuma sumo ne rajtas esti malpli ol 1 USD.',

        internalMethodNotice: 'Notu: Internaj pagmanieroj ne sendas retpoŝtmesaĝojn kun instrukcioj pri kiel plenumi pagon.',
    },
    prices: {
        addYear: 'Aldoni jaron',
        addYearAdd: 'Aldoni',
        membershipCategories: {
            title: 'Membreckategorioj',
            addCategory: 'Aldoni kategorion',
            commission: 'Depreno',
            price: 'Kotizo',
        },
        magazines: {
            title: 'Revuoj',
            addMagazine: 'Aldoni revuon',
            prices: {
                paper: 'Papera ricevanto',
                access: 'Reta aliro',
            },
        },
    },
    create: {
        title: 'Krei pagmetodon',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Ĝisdatigi',
        button: 'Konservi',
        nameRequired: 'Necesas nomo',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi pagmetodon',
        description: 'Ĉu vi certas, ke vi volas forigi tiun ĉi pagmetodon?',
        button: 'Forigi',
    },
    deleteThumbnail: {
        title: 'Forigi bildon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la bildon? Ne eblas malfari tiun ĉi agon.',
    },
    methodPicker: {
        title: 'Elekti pagmetodon',
        orgsEmpty: 'Ekzistas neniu pagorganizo',
        empty: {
            any: 'Tiu ĉi pagorganizo ne enhavas ajnan pagmetodon',
            manual: 'Tiu ĉi pagorganizo ne enhavas ajnan permanan pagmetodon',
            intermediary: 'Tiu ĉi pagorganizo ne enhavas ajnan perantan pagmetodon',
        },
    },
};
export const paymentIntents = {
    openInStripePrefix: 'Malfermi ĉe',
    stripeIntentLink: id => `https://dashboard.stripe.com/payments/${id}`,

    title: 'Pagoj',
    detailTitle: 'Pago',
    filters: {
        customerName: 'Nomo de Kliento',
        customerEmail: 'Retpoŝtadreso de Kliento',
        paymentOrg: 'Pagorganizo',
        paymentMethod: 'Pagmetodo',
        org: 'AKSO-Organizo',
        currencies: 'Valutoj',
        status: 'Stato',
        purposeType: 'Speco de pagcelo',
        purposeTrigger: 'Enhavas AKSO-agon',
        purposeTriggerStatus: 'Stato de AKSO-ago',
        purposeDataId: 'Aktivigas aliĝidentigilon',
        timeCreated: '[[TimeCreated]]',
        statusTime: '[[Time of last change]]',
        succeededTime: '[[SucceededTime]]',
        refundedTime: '[[RefundedTime]]',

        purposeInvalid: 'Enhavas nevalidan pagcelon',
        purposeInvalidNo: 'ne',
        purposeInvalidYes: 'jes',

        currenciesNone: 'ne gravas',

        orgs: {
            tejo: 'TEJO',
            uea: 'UEA',
            '': 'ne gravas',
        },
        statuses: {
            '': 'ne gravas',
            pending: 'ankoraŭ ne plenumita',
            processing: 'traktata de sistemo',
            submitted: 'pago sendita de kliento',
            canceled: 'nuligita',
            succeeded: 'fintraktita',
            abandoned: 'eksvalidiĝis',
            disputed: 'disputita',
            refunded: 'mono redonita',
        },
        shortStatuses: {
            pending: 'ne plen.',
            processing: 'traktata',
            submitted: 'sendita',
            canceled: 'nuligita',
            succeeded: 'traktita',
            abandoned: 'eksvalida',
            disputed: 'disputita',
            refunded: 'repagita',
        },
        optionNone: 'ne gravas',

        timeRange: {
            start: 'Komenco',
            end: 'Fino',
        },
    },
    fields: {
        customer: 'Kliento',
        customerName: 'Nomo',
        customerEmail: 'Retpoŝtadreso',
        customerId: 'Ligita Membro',
        method: 'Pagmetodo',
        org: 'Organizo',
        currency: 'Valuto',
        status: 'Stato',
        events: 'Okazintaĵoj',
        timeCreated: 'Kreiĝhoro',
        statusTime: 'Horo de lasta okazintaĵo',
        internalNotes: 'Internaj notoj',
        customerNotes: 'Notoj de la kliento',
        foreignId: 'Eksterna identigilo',
        stripePaymentIntentId: 'Identigilo ĉe Stripe (PaymentIntent ID)',
        stripeClientSecret: 'Sekreta klientŝlosilo ĉe Stripe (Client Secret)',
        purposes: 'Pagceloj',
        totalAmount: 'Sumo',
        amountRefunded: 'Sumo redonita',
        createdBy: 'Kreita de',

        intermediary: 'Peranto',
        intermediaryCountry: 'Peranta lando',
        intermediaryYear: 'Jaro',
        intermediaryNumber: 'Numero',
        intermediaryIdFmt: (year, number) => `A${number}/${year}`,
        intermediaryIdCountryInfix: 'por',

        statuses: {
            created: 'Kreita', // not a real status; used in event log
            pending: 'Ankoraŭ ne plenumita',
            processing: 'Traktata de sistemo',
            submitted: 'Pago sendita de kliento',
            canceled: 'Nuligita',
            succeeded: 'Fintraktita',
            abandoned: 'Eksvalidiĝis',
            disputed: 'Disputita',
            refunded: 'Mono redonita',
            willBeAbandoned: 'Eksvalidiĝos', // used to indicate future abandonment
        },
        purposeTypes: {
            trigger: 'AKSO-ago',
            manual: 'Permana',
            addon: 'Aldoneblo',
        },
        purpose: {
            invalid: 'Nevalidigita',
            triggerAmount: 'Ŝaltota monsumo',
            originalAmount: 'Nerabatita prezo',
            triggerStatuses: {
                awaiting: 'Atendas sukcesan pagon',
                processing: 'Traktas AKSO-agon',
                triggered: 'Fintraktita',
            },
            menu: {
                invalidate: 'Nevalidigi',
                validate: 'Revalidigi',
            },
        },
    },
    detailTo: 'al', // X currency >to< org
    detailViewCodeholder: 'Montri membron',
    detailNoCodeholder: 'Neniu ligita membro',
    detailRefundSuffix: 'redonita', // goes after the refunded amount
    detailViewMethod: 'Montri pagmetodon',
    actions: {
        cancel: {
            title: 'Nuligi',
            description: 'Ĉu vi certas, ke vi volas nuligi tiun ĉi pagon?',
            button: 'Nuligi',
        },
        cancelIntermediary: {
            title: 'Nuligi',
            description: 'Ĉu vi certas, ke vi volas nuligi tiun ĉi spezfolion?',
            button: 'Nuligi',
        },
        markDisputed: {
            title: 'Krei disputon',
            description: 'Ĉu vi certas, ke vi volas krei disputon pri tiu ĉi pago? Bv. aldoni detalojn pri la disputo en la internaj notoj.',
            button: 'Krei disputon',

            stripeTitle: 'Tio ĉi eblas nur en la retejo de Stripe',
            stripeDescription: 'Nur eblas krei disputojn en la retejo de Stripe. AKSO aŭtomate ĝisdatiĝas surbaze de la informoj de Stripe.',
            stripeButton: 'Iri al Stripe',
        },
        markRefunded: {
            title: 'Indiki pagon redonita',
            description: 'Ĉu vi certas, ke vi volas indiki, ke mono estis redonita el tiu ĉi pago? Bv. aldoni detalojn pri la redonita mono en la internaj notoj.',
            amount: 'Redonita monkvanto',
            button: 'Indiki',

            stripeTitle: 'Tio ĉi eblas nur en la retejo de Stripe',
            stripeDescription: 'Redonado de mono nur eblas per la platformo de Stripe. Kiam la mono estas redonita pere de Stripe, AKSO aŭtomate estos ĝidatigita.',
            stripeButton: 'Iri al Stripe',

            // errors
            lowerBound: 'Ne eblas redoni negativan monkvanton',
            upperBound: 'Ne eblas redoni pli ol estis pagita',
        },
        markSucceeded: {
            title: 'Indiki pagon ricevita',
            description: 'Ĉu vi certas, ke la mono estis ricevita? Bv. aldoni la eksternan identigilon de la pago se eblas.',
            button: 'Indiki',
            sendReceipt: 'Sendi kvitancon',
        },
        markSucceededIntermediary: {
            title: 'Akcepti spezfolion',
            description: 'Ĉu vi certas, ke la mono estis ricevita?',
            button: 'Indiki',
            sendReceipt: 'Sendi kvitancon',
        },
        submit: {
            title: 'Indiki monon sendita',
            description: 'Ĉu vi certas, ke la mono estis sendita (eĉ se ankoraŭ ne ricevita)?',
            button: 'Indiki',
        },
        submitIntermediary: {
            title: 'Indiki monon sendita',
            description: 'Ĉu vi certas, ke la mono estis sendita (eĉ se ankoraŭ ne ricevita)?',
            button: 'Indiki',
        },
        intermediary: {
            cancel: 'Nuligi spezfolion',
            markSucceeded: 'Akcepti spezfolion',
            submit: 'Ensendi',
        },
    },
    transitionUnavailabilityReasons: {
        stripe: 'Ne eblas fari tion ĉi por pagoj faritaj per Stripe.', // fallback

        // current state -> new state
        // the following table is for MANUAL methods. If something is allowed in manual but not
        // in stripe, the stripe fallback above will be shown
        pending: {
            submitted: '', // allowed
            canceled: '', // allowed
            succeeded: 'Ne eblas indiki, ke pago estis ricevita antaŭ ol ĝi estis sendita.',
            disputed: 'Ne eblas krei disputon pri pago, kiu ankoraŭ ne estis sendita.',
            refunded: '', // allowed
        },
        processing: 'Bonvolu atendi, la pago estas nuntempe traktata de la sistemo.',
        submitted: {
            submitted: 'La pago estis jam indikita kiel sendita.',
            canceled: '', // allowed
            succeeded: '', // allowed
            disputed: '', // allowed
            refunded: '', // allowed
        },
        canceled: {
            submitted: 'La pago estis nuligita; tial ne eblas indiki, ke la pago estis sendita. Se mono tamen estis sendita post nuligo, la mono estu resendita.',
            canceled: 'La pago estis jam nuligita.',
            succeeded: 'La pago estis nuligita; tial ne eblas indiki, ke la pago estis sukcese ricevita. Se mono tamen estis sendita post nuligo, la mono estu resendita.',
            disputed: 'La pago estis nuligita; tial ne eblas krei disputon.',
            refunded: 'La pago estis nuligita; tial ne eblas repagi ĝin.',
        },
        abandoned: 'La pago eksvalidiĝis; tial ne eblas agi pri ĝi.',
        succeeded: {
            submitted: 'La pago estis sukcesa; ne necesas indiki ke la mono estis sendita.',
            canceled: 'La pago estis sukcesa; ne eblas nun nuligi ĝin. Eblas redoni la monon aŭ krei disputon.',
            succeeded: 'La pago jam estis indikita kiel sukcesa.',
            disputed: '', // allowed
        },
        disputed: {
            submitted: 'La pago jam havas disputon; kaj do jam estas indikita, ke la pago estis ricevita. Se vi volas fini la disputon, elektu inter sukcesa kaj redonita.',
            canceled: '', // allowed
            succeeded: '', // allowed
            disputed: 'Tiu ĉi pago jam estas disputata.',
            refunded: '', // allowed
        },
        refunded: {
            submitted: 'La pago estis redonita; kaj do ne plu eblas indiki sendadon de la mono.',
            canceled: 'La pago estis redonita; kaj do ne eblas nun ĝin nuligi.',
            succeeded: 'La pago estis redonita; kaj do ne plu eblas indiki sukcesan ricevon de la mono.',
            disputed: 'La pago estis redonita; kaj do ne plu eblas krei disputon.',
            refunded: '', // allowed
        },
    },
    search: {
        fields: {
            customerEmail: 'Retpoŝtadreso de la kliento',
            customerName: 'Nomo de la kliento',
            internalNotes: 'Internaj notoj',
            customerNotes: 'Notoj de la kliento',
        },
        placeholders: {
            customerEmail: 'ekz. zamenhof@akso.org',
            customerName: 'ekz. Zamenhof',
            internalNotes: 'Traserĉi internajn notojn',
            customerNotes: 'Traserĉi notojn de klientoj',
        },
    },
    purposesPicker: {
        addTitle: 'Aldoni celon de la pago',
        selectMethodFirst: 'Unue necesas elekti pagmetodon',
        selectCurrencyFirst: 'Unue necesas elekti valuton',
        addPurposeButton: 'Aldoni pagcelon',
        useOriginalAmount: 'Sumo estas rabatita',
        originalAmount: 'Nerabatita prezo',
        useTriggerAmount: 'Indiki alian ŝaltotan sumon',
        types: {
            manual: 'Permana',
            addon: 'Aldoneblo',
            trigger: 'AKSO-ago',
        },
        manual: {
            title: 'Titolo',
            description: 'Priskribo',
        },
        noAddons: 'Tiu ĉi pagorganizo havas neniun aldoneblon',
        dataId: 'Aliĝidentigilo',
        invalidDataId: 'Nevalida aliĝidentigilo',
    },
    triggers: {
        registration_entry: 'Aliĝo',
        congress_registration: 'Kongresa aliĝo',
    },
    triggerPicker: {
        titles: {
            registration_entry: 'Elekti aliĝon',
            congress_registration: 'Elekti kongresan aliĝon',
        },
        empty: {
            registration_entry: 'Neniu aliĝo',
            congress_registration: 'Neniu kongresa aliĝo',
        },
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei pagon',
        button: 'Krei',

        noCurrencySelected: 'Neniu valuto estis elektita',
        paymentMethod: 'Pagmetodo',
        purposes: 'Pagceloj',
        autoSubmit: 'Aŭtomate marki pagon kiel ensendita',
        total: 'Sumo',
        totalNote: 'La sumo estas supozo, la ver valoro estos la ekvivalento de minimume 1 USD/maksimume 500.000 USD',
        totalOverMaxAmount: 'La pagenda sumo estas pli granda ol la maksimuma sumo de tiu ĉi pagmaniero. Bonvolu elekti alian pagmanieron.',
        hardMaxAmountUsd: 50000000,
    },
    update: {
        menuItem: 'Redakti',
        title: 'Ĝisdatigi',
        button: 'Konservi',
    },
    resendReceipt: {
        menuItem: 'Resendi kvitancon',
        title: 'Resendado de AKSO-pago-kvitanco',
        description: 'Se la kliento ne ricevis sian kvitancon aŭ se tiu petis novan kvitancon, vi povas resendi ĝin.',
        email: 'Anstataŭa ricevanta retpoŝtadreso',
        noEmail: 'Retpoŝtadreso estas deviga',
        button: 'Sendi',
    },
    setPurposeValidity: {
        title: 'Agordi validecon de pagcelo',
        description: 'Agordos la validecon de la pagcelo kiel',
        optValid: 'valida',
        optInvalid: 'nevalida',
        button: 'Konservi',
    },

    report: {
        title: 'Raporto',

        startTime: 'Komenciĝhoro',
        endTime: 'Finiĝhoro',

        total: 'Sume',
        totalEarned: 'enspezita', // suffix
        totalRefunded: 'redonita', // suffix

        byCurrency: 'Laŭ valuto',

        paymentOrg: 'Pagorganizo',
        paymentMethod: 'Pagmetodo',
        paymentAddon: 'Aldoneblo',

        currencyHeader: 'Valuto', // table header
        totalHeader: 'Sume', // table header

        addonsNote: 'Ne eblas ŝpuri redonojn de aldonebloj; tial nevalidigitaj aldonebloj ne estas inkluzivitaj.',

        totals: {
            // prefixes
            earned: 'Enspezis',
            refunded: 'Redonis',
            // suffixes
            count: n => `${n} pago${n === 1 ? '' : 'j'}n`,
            refunds: n => `${n} redono${n === 1 ? '' : 'j'}n`,
        },

        print: 'Presi',
        failedToOpenPrintWindow: 'Ne sukcesis malfermi la presilan fenestron',
    },
};

