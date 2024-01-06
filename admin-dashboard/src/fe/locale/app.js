export const app = {
    title: p => p ? `${p} | AKSO-Administranto` : 'AKSO-Administranto',
    logOut: 'Elsaluti',

    // literally any error that causes the UI to fail to render
    genericErrorTitle: 'Eraro',
    genericError: 'Okazis neatendita eraro. Bonvolu poste reprovi. Se tiu ĉi eraro okazadas indus kontakti administranton.',
    genericErrorReload: 'Reŝarĝi la paĝon',
    genericErrorViewDetails: 'Montri teĥnikajn detalojn',

    notFound: 'Ni ne sukcesis trovi tiun ĉi paĝon. Eventuale kontrolu ĉu vi mistajpis adreson.',
    forbidden: 'Vi ne rajtas aliri tiun ĉi paĝon.',
    goHome: 'Hejmen',

    debugPageInfo: 'Se vi ne scias kio estas tio ĉi, ne zorgu kaj alklaku sur \'Hejmo\' en la menuo.',

    dirtyConfirmation: {
        description: 'Estas nekonservitaj ŝanĝoj. Ĉu vi certas ke vi volas forlasi la paĝon kaj perdi la malneton?',
    },

    globalErrors: {
        serviceUnavailable: {
            title: 'AKSO estas nealirebla pro bontenado',
            description: `Ni nun prizorgas bontenadon de AKSO. Pro tio ĝi nun ne estas alirebla. Kutime nealireblaj periodoj daŭras mallonge. Eventuale kontrolu la statuspaĝon por ĝisdatigoj.`,
            openStatusPage: 'Malfermi statuspaĝon',
            statusPage: 'https://viva.akso.org',
        },
    },
};

export const pages = {
    home: 'Hejmo',
    ch: 'Membroj',
    codeholders: 'Membroj',
    'change-requests': 'Ŝanĝopetoj',
    delegations: 'Delegitoj',
    statistics: 'Statistiko',
    membership: 'Membreco',
    'membership-categories': 'Kategorioj',
    'membership-registration': 'Aliĝiloj',
    'membership-entries': 'Aliĝoj',
    roles: 'Roloj',
    email: 'Amasmesaĝoj',
    magazines: 'Revuoj',
    congresses: 'Kongresoj',
    votes: 'Voĉdonoj',
    newsletters: 'Bultenoj',
    payments: 'AKSO-Pago',
    'payment-intents': 'Pagoj',
    'payment-orgs': 'Pagorganizoj',
    intermediaries: 'Perantoj',
    'intermediaries-intermediaries': 'Perantoj',
    'intermediaries-reports': 'Spezfolioj',
    administration: 'Administrado',
    'administration-groups': 'Administraj grupoj',
    'administration-clients': 'API-klientoj',
    'administration-log': 'API-protokolo',
    'administration-countries': 'Landoj',
    'administration-country-groups': 'Landaroj',
    'administration-status': 'Sistema stato',
    lists: 'Listoj',
    reports: 'Raportoj',
    documents: 'Ŝpureblaj dokumentoj',
};

export const index = {
    tasks: {
        title: 'Taskoj',
        empty: 'Neniu tasko',
        tabs: {
            aksopay: 'AKSO-Pago',
            intermediary: 'Spezfolioj',
            registration: 'Aliĝoj',
            changeRequests: 'Ŝanĝopetoj',
            delegateApplications: 'Delegitaj kandidatiĝoj',
            delegateMissingCities: 'Malaperintaj delegiturboj',
            magPaperNoAddress: 'Revuaj abonantoj sen adreso',
        },
        otherTabs: n => `alia${n === 1 ? '' : 'j'} tasko${n === 1 ? '' : 'j'}`,
    },
    admin: {
        title: 'Asisto',
        description:
`Se vi spertas problemojn pri AKSO-Administranto, vi ĉiam povas sendi retmesaĝon al [helpo@akso.org](mailto:helpo@akso.org).
Bonvolu indiki detale la problemon, prefere aldonante ekranfotojn. Se tio sencas, bonvolu respondu ĉiujn jenajn demandojn:

1. Kion vi faris por atingi la problemon? Eventuale aldonu la URL-on de la paĝo kie okazis la problemo.
2. Kion vi atendis, ke okazus?
3. Kio fakte okazis?
4. Se vi ricevis erarmesaĝon de la sistemo, metu ĝin ĉi tie.
5. Ĉu la problemo okazas ĉiufoje?


En la mesaĝo vi nepre ĉiam aldonu eventualajn erarmesaĝojn donitajn al vi de la sistemo kaj la ĉi-subajn sistemajn informojn.`,
        systemInfo: {
            title: 'Informoj pri via sistemo',
            copy: 'Kopii',
        },
    },
    notices: {
        title: 'Novaj informoj',
        markAllRead: 'Mi legis ĉion',
        markRead: 'Mi legis',
        markedRead: 'Legita',
        noticeExpand: 'Montri pli',
        noticeCollapse: 'Fermi',
    },
};

