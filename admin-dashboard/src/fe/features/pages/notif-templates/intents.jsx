import { notifTemplateIntentExamples as examples } from '../../../locale';

const NULL = 'u';
const BOOL = 'b';
const NUMBER = 'n';
const STRING = 's';
const MATRIX = 'm';
const TIMESTAMP = 'timestamp';

export function getFormVarsForIntent (intent) {
    if (intent === 'codeholder') return spec2Vars(CODEHOLDER_SPEC);
    else if (intent === 'newsletter') return spec2Vars(CODEHOLDER_SPEC);
    else if (intent === 'newsletter_magazine') return spec2Vars(NEWSLETTER_MAGAZINE_SPEC);
    else if (intent === 'congress') return spec2Vars(CONGRESS_SPEC);
    else if (intent === 'congress_registration') return spec2Vars(CONGRESS_SPEC);
    else if (intent === 'vote_cast_ballot') return spec2Vars(VOTE_CAST_BALLOT_SPEC);
    return [];
}

function spec2Vars (spec) {
    const vars = [];
    const visit = (node, name = '') => {
        if (typeof node === 'object' && !Array.isArray(node) && !(node instanceof Date)) {
            for (const k in node) {
                visit(node[k], name + (name ? '.' : '') + k);
            }
        } else {
            const value = node;
            let type = NULL;
            if (typeof value === 'boolean') type = BOOL;
            else if (typeof value === 'number') type = NUMBER;
            else if (typeof value === 'string') type = STRING;
            else if (Array.isArray(value)) type = MATRIX;
            else if (value instanceof Date) type = TIMESTAMP;
            vars.push({ name, type, value });
        }
    };
    visit(spec);
    return vars;
}

const CODEHOLDER_SPEC = {
    codeholder: examples.codeholder,
};

const NEWSLETTER_MAGAZINE_SPEC = {
    magazine: examples.magazine,
    edition: examples.edition,
    toc: examples.toc,
};

const CONGRESS_SPEC = {
    registrationEntry: examples.registrationEntry,
};

const VOTE_CAST_BALLOT_SPEC = {
    vote: examples.vote,
};
