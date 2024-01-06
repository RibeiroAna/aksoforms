export const login = {
    title: 'Ensaluti',
    details: 'Ensaluti',
    createPassword: 'Krei pasvorton',
    resetPassword: 'Rekrei pasvorton',

    login: 'UEA-kodo aŭ retpoŝtadreso',
    password: 'Pasvorto',
    confirmPassword: 'Pasvorto denove',
    createPasswordPlaceholder: 'Skribu pasvorton',
    confirmPasswordPlaceholder: 'Skribu pasvorton denove',
    forgotPassword: 'Mi forgesis mian pasvorton',
    forgotCode: 'Mi forgesis mian UEA-kodon',
    continue: 'Daŭrigi',

    genericError: 'Ne sukcesis ensaluti, bv. reprovi poste',
    invalidUEACode: 'Nevalida UEA-kodo aŭ retpoŝtadreso',
    passwordMismatch: 'Bonvolu skribi la saman pasvorton dufoje',
    invalidLogin: {
        ueaCode: 'Nevalida UEA-kodo aŭ pasvorto',
        email: 'Nevalida retpoŝtadreso aŭ pasvorto',
    },

    loggedInAs: code => `Vi estas ensalutinta kiel ${code}.`,
    notAdminShort: 'Vi ne estas administranto',
    notAdmin: 'Nur administrantoj povas uzi tiun ĉi retejon.',
    notAdminPWR: 'Sed via pasvorto estis sukcese nuligita.',
    notAdminLogout: 'Bonvolu elsaluti kaj reensaluti per konto de administranto se vi volas uzi la administran sistemon.',
    logOut: 'Elsaluti',

    totpSetupDescription: 'Bonvolu skani la QR-kodon per via aplikaĵo por agordi dua-faktoran ensaluton. Vi ankaŭ povas alklaki la ĉi-suban ligilon se en via nuna aparato estas aplikaĵo por dua-faktora aŭtentiko.',
    totpAppDescriptionPre: 'Se vi ne havas dua-faktoran aplikaĵon, ni rekomendas ',
    totpAppName: 'Authy',
    totpAppHref: userAgent => {
        void userAgent;
        return 'https://authy.com/download/';
    },
    totpAppDescriptionPost: '.',
    totpSetupInstrCode: 'Skanu tiun ĉi kodon',
    totpSetupInstrOr: 'aŭ',
    totpSetupInstrOtpauthLink: 'Malfermi en aplikaĵo',

    totp: 'Sekurkodo',
    totpDescription: 'Bonvolu enmeti sekurkodon generitan de via duafaktora aplikaĵo.',
    rememberTotp: 'Memori tiun ĉi aparaton dum 60 tagoj',
    rememberTotpDescription: 'Nur uzu tiun ĉi funkcion ĉe personaj komputiloj.',
    lostTotp: 'Mi ne povas generi sekurkodon',
    continueTotp: 'Ensaluti',

    createPasswordDescription: login => `Via konto ${login} ŝajne ne havas pasvorton. Bv. alklaki por sendi retpoŝtmesaĝon kun instrukcioj pri kiel agordi vian konton.`,
    resetPasswordDescription: 'Se vi forgesis vian pasvorton, bv. enmeti viajn ensalutinformojn kaj premi la butonon por sendi pasvort-nuligligilon al via retpoŝtadreso.',
    sendPasswordReset: 'Sendi retpoŝtmesaĝon',
    sendPasswordSetup: 'Sendi retpoŝtmesaĝon',
    createPasswordSent: 'Sendis retpoŝtmesaĝon. Bonvolu kontroli vian retpoŝtkeston (kaj spamujon).',
    resetPasswordSent: 'Sendis retpoŝtmesaĝon. Bonvolu kontroli vian retpoŝtkeston (kaj spamujon).',

    forgotCodeDescription: 'Unue provu ensaluti per via retpoŝtadreso anstataŭ vian UEA-kodon. Se tiel vi ne sukcesas, bv. kontakti AKSO-administranton ĉe helpo@akso.org indikante vian plenan nomon kaj loĝadreson.',

    lostTotpDescription: 'Bv. kontakti AKSO-administranton ĉe helpo@akso.org indikante vian UEA-kodon.',

    genericTotpError: 'Ne sukcesis ensaluti, bv. reprovi poste',
    invalidTotp: 'Nevalida sekurkodo',
    invalidTotpFormat: 'Bonvolu enmeti vian sesciferan sekurkodon',
};

export const oneTimeToken = {
    unknownContext: '[[unknown context]]',
    close: 'Fermi',

    deleteEmailAddress: {
        title: '[[Delete Email Address]]',
        description: '[[Press the button to remove your email address from our database. If you do not wish to do this, simply close the page.]]',
        confirm: '[[Delete]]',
        confirmed: '[[Your email address has been deleted.]]',
    },
    unsubscribeNewsletter: {
        title: '[[Unsubscribe Newsletter]]',
        description: '[[Press the button to unsubscribe from the newsletter. If you do not wish to do this, simply close the page.]]',
        reasonDescription: 'Ni estus aparte dankemaj, se vi indikus kialon de via malabono.',
        confirm: '[[Unsubscribe]]',
        confirmed: '[[You have been unsubscribed successfully.]]',
    },
};
