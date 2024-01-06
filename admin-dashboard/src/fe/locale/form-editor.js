export const formEditor = {
    settings: {
        title: 'Agordoj',
        flags: {
            allowUse: 'Malfermita',
            allowUseDesc: 'Ĉu la aliĝilo estas malfermita kaj eblas aliĝi',
            allowGuests: 'Gastoj permesataj',
            allowGuestsDesc: 'Ĉu ne-ensalutintoj povas aliĝi',
            editable: 'Redaktebla',
            editableDesc: 'Ĉu aliĝintoj povas poste redakti sian aliĝon',
            cancellable: 'Nuligebla',
            cancellableDesc: 'Ĉu aliĝintoj povas mem nuligi sian aliĝon',
            manualApproval: 'Permana aprobo',
            manualApprovalDesc: 'Ĉu aliĝoj devas esti permane aprobitaj de administranto por esti valida',
        },
        price: {
            enabled: 'Pagendaj aliĝoj',
            variable: 'Variablo de AKSO-Skripto',
            minUpfront: 'Minimuma antaŭpago',
            pricePreview: 'Nuna prezo laŭ skripto:',
            notANumber: 'ne estas nombro',
            description: 'Ĉiuj valutoj indikas prezon en sia plej malgranda unuo (ekz. cendoj). Tiel 1,50 EUR skribiĝu kiel 150 kaj 900 JPY kiel 900.',
            currencyChangeDisabled: '[[The currency cannot be changed anymore because there are participants who have paid the registration fee in this currency.]]',
        },
        confirmationNotifTemplateId: {
            label: 'Ŝablono por aliĝkonfirmilo',
            description: 'Amasmesaĝa ŝablono sendata al ĉiuj novaj aliĝintoj.',
        },
        sequenceIds: {
            enabled: 'Asigni kongresajn numerojn',
            startAt: 'Komenci je',
            requireValid: 'Postuli validan aliĝon',
            requireValidDesc: 'Ĉu postuli validan aliĝon kaj antaŭpagon por asigni kongresan numeron',
        },
        variables: {
            title: 'Kampovariabloj',
            noVariableSelected: 'Neniu variablo estis elektita',
            identifierName: 'Variablo kun nomo',
            identifierEmail: 'Variablo kun retpoŝtadreso',
            identifierCountryCode: 'Variablo kun landokodo',
        },
    },

    customFormVars: {
        title: 'Propraj variabloj',
        types: {
            boolean: 'Buleo',
            number: 'Nombro',
            text: 'Teksto',
        },
        defaultValue: 'Defaŭlto',
        useDefaultValue: 'Uzi defaŭlton',
        bool: {
            null: 'NUL',
            false: 'ne',
            true: 'jes',
        },
        emptyDefault: 'Neniu defaŭlto',
    },

    itemTypes: {
        input: 'Eniga kampo',
        text: 'Teksto',
        script: 'Skripto',
    },
    inputTypes: {
        boolean: 'Buleo',
        number: 'Nombro',
        text: 'Teksto',
        money: 'Monsumo',
        enum: 'Listo',
        country: 'Lando',
        date: 'Dato',
        time: 'Horo',
        datetime: 'Dato kaj horo',
        boolean_table: 'Tabelo de buleoj',
    },
    templating: {
        insertTitle: 'Enmeti ŝablonaĵon',
    },

    inputPreview: 'Test-valoro',
    testInputsBar: {
        title: 'Test-valoroj',
        validate: 'Validigi',
        clear: 'Forviŝi',
    },

    removeItem: {
        title: 'Forigi',
        confirmation: 'Ĉu vi certas, ke vi volas forigi tiun ĉi eron?',
        hint: 'Tenu la shift-butonon por forigi sen vidi tiun ĉi konfirmilon.',
        cancel: 'Nuligi',
        confirm: 'Forigi',
    },

    editInputFieldTitle: 'Redakti',
    inputFields: {
        name: 'Kodnomo',
        nameDesc: 'La interna nomo de la kampo. Devas esti unika.',
        oldName: 'Malnova nomo',
        label: 'Etikedo',
        labelDesc: 'La etikedo ĉe la kampo, montrota al la aliĝanto',
        description: 'Priskribo',
        default: 'Defaŭlto',
        required: 'Deviga',
        disabled: 'Malŝaltita',
        hideIfDisabled: 'Kaŝi se malŝaltita',
        hiddenIfDisabled: 'Kaŝita se malŝaltita',
        editable: 'Redaktebla',
        editableDesc: 'Ĉu la kampo estas redaktebla post aliĝo',

        placeholder: 'Lok-okupa teksto',
        step: 'Paŝo',
        stepEmpty: '1', // this is what browsers will assume if step is not set
        min: 'Minimumo',
        minEmpty: 'Neniu minimumo',
        max: 'Maksimumo',
        maxEmpty: 'Neniu maksimumo',
        minMaxRange: 'Intervalo',
        variant: 'Varianto',
        variants: {
            input: 'Enigkampo',
            slider: 'Ŝovilo',
            text: 'Tekstlinio',
            textarea: 'Tekstkampo',
            tel: 'Telefonnumero',
            email: 'Retpoŝtadreso',
            uri: 'Retadreso',
            select: 'Listo',
            radio: 'Elekta butono',
        },
        pattern: 'Regula esprimo',
        patternError: 'Nevalida regula esprimo',
        minLength: 'Minimuma longeco',
        minLengthEmpty: 'Neniu minimuma longeco',
        maxLength: 'Maksimuma longeco',
        maxLengthEmpty: 'Neniu maksimuma longeco',
        chAutofill: 'Sugesti membrodatumojn',
        chAutofillFields: {
            // note that these are slightly different from codeholders.fields
            birthdate: 'Naskiĝdato',
            email: 'Retpoŝtadreso',
            phone: 'Telefono',
            landlinePhone: 'Hejma telefono',
            cellphone: 'Poŝtelefono',
            officePhone: 'Oficeja telefono',
            website: 'Retejo',
            profession: 'Profesio',
            name: 'Nomo',
            honorific: 'Titolo',
            firstName: 'Persona nomo',
            lastName: 'Familia nomo',
            address: 'Adreso',
            feeCountry: 'Paglando',
            country: 'Lando',
            countryArea: 'Regiono',
            city: 'Urbo',
            cityArea: 'Urboparto',
            streetAddress: 'Stratadreso',
            postalCode: 'Poŝtkodo',
            sortingCode: 'Ordigkodo',
        },
        currency: 'Valuto',
        options: 'Opcioj',
        optionsName: 'Etikedo',
        optionsValue: 'Valoro',
        optionsDisabled: {
            true: 'Neelektebla',
            onlyExisting: 'Nur jamelektintoj',
            false: 'Elektebla',
        },
        optionsOnlyExisting: 'Nur aliĝintoj kiuj jam antaŭe elektis tiun ĉi opcion rajtas elekti ĝin',
        exclude: 'Malŝaltitaj landoj',
        tz: 'Horzono',
        rows: 'Vicoj',
        cols: 'Kolumnoj',
        minSelect: 'Minimuma elekto',
        minSelectEmpty: 'Neniu minimumo',
        maxSelect: 'Maksimuma elekto',
        maxSelectEmpty: 'Neniu maksimumo',
        headerTop: 'Supra kapo',
        headerLeft: 'Maldekstra kapo',
        excludeCells: 'Malŝaltitaj ĉeloj',

        namePatternError: 'Kodnomoj nur povas enhavi la signojn de Esperanto, ciferojn, streketojn kaj dupunktojn',
    },

    errors: {
        fieldIsRequired: 'Tiu ĉi kampo estas deviga',
        numericRange: (a, b) => a === null
            ? `Devas esti maksimume ${b}`
            : b === null
                ? `Devas esti minimume ${a}`
                : `Devas esti inter ${a} kaj ${b}`,
        numericStep: n => `Devas esti oblo de ${n}`,
        textPatternGeneric: 'La enmetita valoro ne estas valida',
        textLenRange: (a, b) => a === null
            ? `La teksto devas esti maksimume ${b} signojn longa`
            : b === null
                ? `La teksto devas esti minimume ${b} signojn longa`
                : `La teksto devas esti iter ${a} kaj ${b} signojn longa`,
        enumNotInSet: 'Nevalida opcio estis elektita',
        dateTimeInvalid: 'Nevalida format',
        dateTimeRange: (a, b) => a === null
            ? `Ne estu post ${b}`
            : b === null
                ? `Ne estu antaŭ ${a}`
                : `Estu inter ${a} kaj ${b}`,
        boolTableSelectRange: (a, b) => a === null
            ? `Elektu ne pli ol ${b} ĉelojn`
            : b === null
                ? `Elektu almenaŭ ${a} ĉelojn`
                : `Elektu inter ${a} kaj ${b} ĉelojn`,
    },
};
