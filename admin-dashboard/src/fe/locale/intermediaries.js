export const intermediaries = {
    title: 'Perantoj',
    detailTitle: 'Peranto',
    search: {
        placeholders: 'Serĉi paginstrukciojn ...',
    },
    fields: {
        countryCode: 'Lando',
        codeholders: 'Membroj',
        codeholderId: 'Membro',
        paymentDescription: 'Paginstrukcioj',
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei peranton',
        button: 'Krei',
    },
    update: {
        menuItem: 'Redakti',
        title: 'Redakti peranton',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi peranton',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la peranton? Ne eblas malfari tiun ĉi agon.',
    },
};

export const intermediaryReports = {
    title: 'Spezfolio',
    detailTitle: 'Spezfolio',
    failedToLoadMethod: 'Okazis eraro dum ŝarĝado de necesaj perantaj informoj. Bonvolu reŝarĝi la paĝon post kelkaj momentoj.',
    failedToLoadYear: 'Okazis eraro dum ŝarĝado de necesaj spezfoliaj informoj. Bonvolu reŝarĝi la paĝon post kelkaj momentoj.',
    idFmt: (year, number) => `A${number}/${year}`,
    idCountryInfix: 'por',
    createdBy: 'Kreita de',
    intentStatuses: {
        '': 'ne gravas',
        pending: 'Malneta',
        submitted: 'Ensendita',
        canceled: 'Nuligita',
        succeeded: 'Aprobita',
        abandoned: 'Eksvalidiĝis',
    },
    intentStatusesShort: {
        pending: 'Malneta',
        submitted: 'Sendita',
        canceled: 'Nuligita',
        succeeded: 'Aprobita',
        abandoned: 'Eksvalida',
    },
    entries: {
        title: 'Aliĝoj',
        edit: {
            title: 'Redakti aliĝon',
            confirm: 'Konservi',
        },
        add: {
            button: 'Aldoni aliĝon',
        },
        autoInternalNotes: (year, number, country) => `Parto de spezfolio A${number}/${year} por ${country}`,
        purposeTitle: 'Aliĝo',
        magazinePrefix: 'Revuo',
        openDetail: 'Montri plenan aliĝon',

        missingFields: 'Mankas kampoj',
        missingFieldsDesc: 'Bonvolu plenigi la jena(j)n kampo(j)n por aldoni la aliĝon:',
        missingFieldsClose: 'Fermi',
        fields: {
            codeholderData: 'Membrodatumoj',
            'codeholderData.name': 'Membrodatumoj ▸ Nomo',
            'codeholderData.address': 'Membrodatumoj ▸ Adreso',
            'codeholderData.feeCountry': 'Membrodatumoj ▸ Paglando',
            'codeholderData.email': 'Membrodatumoj ▸ Retpoŝtadreso',
            'codeholderData.birthdate': 'Membrodatumoj ▸ Naskiĝdato',
        },

        entryNotFound: 'Tiu aliĝo ne estis trovita, ĝi verŝajne estis forigita.',

        yearUnavailable: {
            title: '[[Registration unavailable]]',
            description: {
                notFound: '[[Registration data for this year does not exist.]]',
                disabled: '[[Registration is not enabled for this year.]]',
            },
            mustRemoveEntries: '[[You must remove all entries before submitting.]]',
            removeEntries: '[[Remove all]]',
        },
    },
    addons: {
        title: 'Donacoj',
        edit: {
            title: 'Redakti donacon',
            confirm: 'Konservi',
            description: 'Priskribo',
            descriptionPlaceholder: 'Informoj pri la donaco, ekz. la nomo de la donacanto(j)',
        },
        add: {
            button: 'Aldoni donacon',
            empty: 'Ĉiuj specoj de donacoj jam estas en la spezfolio',
        },
    },
    expenses: {
        title: 'Elspezoj aprobitaj de la Ĝenerala Direktoro',
        item: {
            title: 'Titolo',
        },
        add: {
            button: 'Aldoni',
        },
    },
    totals: {
        headers: {
            commission: 'Depreno',
            commissionTitle: 'Depreno',
            count: 'Kvanto',
            desc: 'Priskribo',
            price: 'Prezo', // if net/gross is not visible
            perItem: 'Kotizo',
            gross: 'Malneto',
            net: 'Neto',
        },
        sum: '',
        final: 'Sumo',
    },
    create: {
        menuItem: 'Krei spezfolion',
        reset: 'Malplenigi formularon',
        resetConfirm: 'Ĉu vi certas, ke vi volas forigi ĉiujn viajn enskribojn de la formularo?',
        title: 'Krei spezfolion',
        currency: 'Valuto',
        setup: {
            method: 'Spezfolia speco',
            country: 'Lando',
            year: 'Jaro',
            confirm: 'Konfirmi',
        },
        submit: {
            button: 'Ensendi',
            description: 'Ĉu vi volas nun ensendi la spezfolion?',
            commit: 'Ensendi',
            cancel: 'Nuligi',

            entries: 'Konservas aliĝojn ...',
            intent: 'Ensendas spezfolion ...',
        },
    },
    update: {
        menuItem: 'Nuligi kaj rekrei',
        title: 'Nuligi kaj rekrei',
        description: 'Ĉu vi volas nuligi tiun ĉi spezfolion kaj krei novan kun la samaj informoj?',
        cancel: 'Nuligi',
        confirm: 'Reverki',
        errorClose: 'Fermi',
        steps: {
            countries: 'Ŝarĝas landojn ...',
            intent: 'Ŝarĝas spezfolion ...',
            method: 'Legas spezfoliajn informojn ...',
            regYear: 'Kontrolas spezfolian numeron ...',
            entries: 'Ŝarĝas aliĝojn ...',
            addons: 'Kontrolas donacojn ...',
            delEntries: 'Nuligas malnetajn aliĝojn ...',
            delIntent: 'Nuligas malnetan spezfolion ...',
            // we will attempt to remove the payment fee item by checking if the last manual purpose
            // has a title matching this regex
            matchPaymentFee: /kotizo pro pagmaniero/i,

            error: 'Eraro',
            yearUnavailable: 'Tiu spezfolia jaro ne estas uzebla.',
            unknownPurpose: 'Tiu spezfolio enhavas ne-spezfoliajn AKSO-agojn.',
            entryInvalidStatus: 'Tiu spezfolio jam estis (parte) traktita.',
        },
    },
};
