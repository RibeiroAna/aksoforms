export const errors = {
    unknown: 'Okazis nekonata eraro',
    network: 'Vi ne estas konektita al la interreto. Bonvolu kontroli vian interretan konekton kaj tiam reŝarĝu la paĝon.',
    invalidSearchQuery: {
        pre: [
            'La serĉkriterio ne estas valida. Ĉiuj signoj ne literaj aŭ numeraj estas ignoritaj.',
            'Eblas uzi la jenajn kontrolsignojn por fari malsimplan serĉon:',
        ],
        list: [
            ['*', ' post vorto por permesi ajnajn sekvantajn signojn post la vorto'],
            ['+', ' antaŭ vorto por postuli ĝian ekziston'],
            ['-', ' antaŭ vorto por postuli ĝian malekziston'],
            ['""', '-citilojn ĉirkaŭ frazo aŭ vorto por postuli la ekzaktan kombinon de la vortoj'],
        ],
        post: ['Serĉoj kun kontrolsignoj ne rajtas enhavi vortojn malpli longajn ol tri signoj.'],
    },
    'search-query-too-short': 'Bonvolu skribi almenaŭ du literojn por ekserĉi.',
    'unknown-field': err => `Nekonata kampo ${err.field}`,
    'unknown-filter': err => `Nekonata kampo ${err.filter}`,
    'bad-request': 'La aplikaĵo sendis nevalidan peton. Bonvolu reŝarĝi la paĝon.',
    'unauthorized': 'La aplikaĵo ne bonorde ensalutis. Bonvolu reŝarĝi la paĝon.',
    'forbidden': 'Vi ne (plu) rajtas aliri tiun ĉi paĝon. Bonvolu reŝarĝi la paĝon.',
    'not-found': 'Tiu ĉi paĝo ne estis trovita. Bonvolu kontroli la adreson se vi ĝin permane entajpis.',
    'conflict': 'Okazis interna konflikto, bonvolu reprovi vian agon.',
    'payload-too-large': 'La alŝutita dosiero estis tro granda, bonvolu reprovi kun malpli granda dosiero.',
    'internal-server-error': 'Okazis interna eraro. Bonvolu reŝarĝi la paĝon.',
    'service-unavailable': 'AKSO estas nealirebla pro bontenado. Bonvolu reprovi je posta momento.',
    'object-exists': 'Jam ekzistas resurso kun tiu nomo. Bonvolu reiri por reprovi.',
    'email-taken': 'Tiu retpoŝtadreso estas jam uzata.',
    'unsupported-media-type': 'Tiu tipo de dosiero ne estas subtenata.',

    // see payments/createIntent
    'payment-exceeds-max': 'Ne eblas krei pagojn por pli ol 500.000 USD',
    // see congresses/createParticipant
    'congresses-already-registered': 'Jam ekzistas aliĝo por tiu ĉi membro',
    // see clients/list
    'invalid-api-key': 'Nevalida API-ŝlosilo',

    schema: {
        nthItem: n => `${n}-a`,
        keywords: {
            required: p => `Mankas la deviga kampo ${p.missingProperty}`,
            additionalProperties: p => `Aperas nekonata kampo ${p.additionalProperty}`,
            minLength: p => `Ne estu pli mallonga ol ${p.limit}`,
            minItems: p => `Ne estu malpli ol ${p.limit} suberoj`,
            oneOf: () => `Estu identa al almenaŭ unu el la jenaj skemoj`,
            enum: p => `Estu unu el: ${p.allowedValues.join(', ')}`,
            const: p => `Estu ekzakte ${p.allowedValue}`,
            type: p => `Estu de la speco “${p.type}”`,
        },
    },
};

