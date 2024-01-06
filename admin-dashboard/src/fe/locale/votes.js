export const votes = {
    title: 'Voĉdonoj',
    templatesTitle: 'Ŝablonoj',
    detailTitle: 'Voĉdono',
    templateDetailTitle: 'Ŝablono',
    templates: {
        menuItem: 'Ŝablonoj',
        createVote: 'Krei voĉdonon surbaze de la ŝablono',
    },
    search: {
        placeholders: {
            name: 'Serĉi nomon',
            description: 'Serĉi priskribon',
        },
    },
    fields: {
        org: 'Organizo',
        type: 'Speco',
        name: 'Nomo',
        state: 'Ŝtato',
        description: 'Priskribo',
        voterCodeholders: 'Voĉdonantoj',
        voterCodeholdersMemberFilter: 'Membrofiltrilo de voĉdonantoj',
        viewerCodeholders: 'Rigardantoj',
        viewerCodeholdersMemberFilter: 'Membrofiltrilo de rigardantoj',
        timespan: 'Daŭro',
        timeStart: 'Komenciĝo',
        timeEnd: 'Finiĝo',
        ballotsSecret: 'Sekretaj balotiloj',
        config: 'Agordoj',
        // template fields
        vote: 'Voĉdonagordoj',
    },
    voterCodeholdersDescription: 'Voĉdonantoj estas JSON-filtrilo de membroj, kiuj rajtas voĉdoni.',
    viewerCodeholdersDescription: 'Rigardantoj estas JSON-filtrilo de membroj, kiuj rajtas rigardi la voĉdonon (sed ne nepre voĉdoni).',
    viewerCodeholdersSame: 'Nur voĉdonantoj',
    filters: {
        org: 'AKSO-organizo',
        timeStart: 'Komenĉiĝo',
        timeEnd: 'Finiĝo',
        timeRangeStart: 'Komenco',
        timeRangeEnd: 'Fino',
        state: 'Ŝtato',
        type: 'Speco',
        orgTypes: {
            tejo: 'TEJO',
            uea: 'UEA',
            none: 'ne gravas',
        },
        stateTypes: {
            pending: 'ankoraŭ ne komenciĝis',
            active: 'aktiva',
            ended: 'finiĝis',
            none: 'ne gravas',
        },
        noneType: 'ne gravas',
    },
    cannotEditActive: 'Ne eblas redakti aktivan voĉdonon',
    cannotEditEnded: '[[Cannot edit vote that has ended]]',
    bool: {
        yes: 'Jes',
        no: 'Ne',
    },
    rational: {
        numerator: 'Numeratoro',
        denominator: 'Denominatoro',
    },
    state: {
        hasNotStarted: 'Ankoraŭ ne komenciĝis',
        isActive: 'Voĉdono malfermita',
        hasEnded: 'Voĉdono finiĝis,\natendas rezultojn',
        hasResults: 'Rezultoj pretas',
        hasResultsTiebreaker: 'Rezultoj pretas,\nuzis egalecrompanton',
    },
    config: {
        ballotsSecret: 'Sekretaj balotiloj',
        quorum: 'Necesa kvorumo',
        majorityBallots: 'Plimulto de voĉdonintoj',
        majorityVoters: 'Plimulto de rajtantoj',
        majorityMustReachBoth: 'Devas esti plimulto de kaj voĉdonintoj kaj rajtintoj',
        blankBallotsLimit: 'Maksimuma kvanto de blankaj balotiloj',
        numChosenOptions: 'Kvanto de venkontaj opcioj',
        mentionThreshold: 'Minimuma postulata kvanto de mencioj por kandidato',
        maxOptionsPerBallot: 'Maksimuma kvanto de elektitaj opcioj sur balotilo',
        tieBreakerCodeholder: 'Egalecrompanto',
        publishVoters: 'Publikigi nomojn de voĉdonintoj',
        publishVotersPercentage: 'Publikigi procentaĵon de voĉdonintoj',
        publishResults: 'Publikigi rezultojn',
        options: 'Opcioj',

        noMaxOptions: 'Bv. indiki la maksimuman kvanton de elekteblaj opcioj',
        tieBreakerRequired: 'Necesas egalecrompanto',
    },
    inclusive: 'Inkluziva', // checkbox label
    options: {
        simple: 'Simpla opcio',
        codeholder: 'Membro',
        name: 'Nomo',
        descriptionPlaceholder: 'Priskribo',
    },
    types: {
        yn: 'Jes/Ne',
        ynb: 'Jes/Ne/Sindetene',
        rp: 'TEJO-Paroranga Sistemo',
        stv: 'TEJO-Unuopa Transdonebla Voĉo',
        tm: 'UEA-Unuvica Plurnoma Majoritata Balotsistemo',
    },
    stats: {
        ballots: (n, m, p) => `${n}/${m} (${p}%) rajtinto${m === 1 ? '' : 'j'} voĉdonis`,
        eligible: n => `${n} voĉdonrajtinto${n === 1 ? '' : 'j'}`,
    },
    results: {
        link: 'Vidi rezultojn',
        title: 'Rezultoj',
        statuses: {
            undefined: 'Eraro',
            'success': 'Sukcesis',
            'tie-breaker-needed': 'Necesas egalecrompanto',
            'tie': 'Finiĝis en egaleco',
            'majority-empty': 'La plejmulto de balotoj restis malplenaj',
            'no-quorum': 'Ne atingis kvorumon',
            'too-many-blanks': 'Tro da blankaj balotiloj',
        },
        ballots: {
            title: 'Nombrigo de balotiloj',
            blanks: n => `${n} blanka${n === 1 ? '' : 'j'} balotilo${n === 1 ? '' : 'j'}`,
            voters: n => `${n} voĉdoninto${n === 1 ? '' : 'j'}`,
            nonVoters: n => `${n} nevoĉdoninto${n === 1 ? '' : 'j'}`,
        },
        mentions: {
            candidateIncludedWithCount: n => `${n} mencio${n === 1 ? '' : 'j'}`,
            candidateExcludedWithCount: n => `${n} mencio${n === 1 ? '' : 'j'} (nekonsiderata)`,
        },

        winner: 'Venkinto',
        winners: 'Venkintoj',

        optionListEmpty: '(neniuj)',

        ynbResults: {
            resultPass: 'La voĉdono sukcesis',
            resultFail: 'La voĉdono ne sukcesis',
            majorityPass: 'Estis sufiĉa plimulto de voĉdonintoj.',
            majorityFail: 'NE estis sufiĉa plimulto de voĉdonintoj.',
            votersPass: 'Estis sufiĉa plimulto de voĉdonrajtintoj.',
            votersFail: 'NE estis sufiĉa plimutlo de voĉdonrajtintoj.',
        },
        ynbOptions: {
            yes: 'Jes',
            no: 'Ne',
            blank: 'Blanka',
        },

        rpTieBreakerNeeded: {
            description: 'Necesas egalecrompanto pro la sekvaj paroj:',
        },
        rpRounds: {
            title: 'Raŭndoj',
            diff: 'Diferenco',
            winner: 'Venkinto',
            pair: 'Paro',
        },

        stvTieBreakerNeeded: {
            description: 'Necesas egalecromapnto pro egaleco inter la sekvaj opcioj:',
        },
        stvEvents: {
            electWithQuota: quota => `Elektis voĉdoneblojn kun la kvoto ${quota}`,
            electWithQuotaDescription: 'Voĉdonebloj kies favoraj balotoj superis la kvoton estis elektitaj kaj la kromvoĉoj estis movitaj.',
            electingValuesDescription: 'La kromvoĉoj de la markitaj voĉdonebloj estos movitaj al la sekvaj preferoj:',

            electRest: 'Elektis ĉiujn restantajn voĉdoneblojn',
            electRestDescription: 'Restis same multe da restantaj voĉdonebloj kiel restantaj lokoj, tial ĉiuj restantaj voĉdonebloj estis elektitaj.',

            eliminate: 'Malelektis voĉdoneblon',
            eliminateDescription: 'Neniu voĉdoneblo estis elektita, tial la maplej populara voĉdoneblo devas esti malelektita.',
            eliminatedValuesDescription: 'La plena valoro de la favoraj voĉdoj de la voĉdoneblo estis movita al la sekvaj preferoj:',

            elected: 'Elektis',
            eliminated: 'Malelektis',
        },

        tmTie: {
            title: 'Egalaj voĉdonebloj',
            sortedNodes: 'Parta voĉdonrezulto',
            nodeIsTied: 'Egala',
        },

        exportAsImage: 'Elporti kiel bildon',
        exportAsImageFileName: 'rezultoj',
        exportAsImageError: 'Eraro',
    },
    create: {
        menuItem: 'Krei',
        title: 'Krei voĉdonon',
        templateTitle: 'Krei ŝablonon',
        button: 'Krei',
        pages: {
            template: 'Ŝablono',
            general: 'Ĝenerale',
            vote: 'Voĉdono',
            voters: 'Voĉdonantoj',
            config: 'Agordoj',
        },
        continue: 'Daŭrigi',

        nameRequired: 'Necesas nomo',
        requiresSelection: 'Vi devas elekti opcion',
        emptyTimespan: 'La tempointervalo estas malplena',
    },
    numberRequired: 'Bv. enmeti nombron',
    optionsRequired: 'Bv. enmeti voĉdonopciojn',
    sendCastBallotNotif: 'Sendi sciigon pri voĉdonado',
    sendCastBallotNotifDescription: 'Sendas sciigon al ĉiuj voĉdonrajtantoj, kiuj ne jam voĉdonis.',
    sendCastBallotNotifMessage: n => `Sendos sciigon al ${n} voĉdonrajtanto${n === 1 ? '' : 'j'}, kiu${n === 1 ? '' : 'j'} ne jam voĉdonis.`,
    update: {
        menuItem: 'Redakti',
        title: 'Redakti voĉdonon',
        templateTitle: 'Redakti ŝablonon',
        button: 'Aktualigi',
    },
    delete: {
        menuItem: 'Forigi',
        title: 'Forigi voĉdonon',
        templateTitle: 'Forigi ŝablonon',
        button: 'Forigi',
        description: 'Ĉu vi certas, ke vi volas forigi la voĉdonon? Ne eblas malfari tiun ĉi agon.',
        templateDescription: 'Ĉu vi certas, ke vi volas forigi la ŝablonon? Ne eblas malfari tiun ĉi agon.',
    },
    csvFilename: 'vochdonoj',
};

