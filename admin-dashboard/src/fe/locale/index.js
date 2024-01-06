import { buildTime } from 'akso:config';

const startYear = 2019;
const thisYear = new Date(buildTime).getUTCFullYear();
const copyrightYear = `${startYear}–${thisYear}`;

export const timestampFormat = 'LLL [UTC]';
export const timestampTzFormat = 'LLL';
// for dates that are today
export const timestampFormatToday = '[hodiaŭ] LT [UTC]';
export const timestampTzFormatToday = '[hodiaŭ] LT';

export const osmAddressSearchEndpoint = 'https://nominatim.openstreetmap.org/search?';

export const insecureContext = 'La paĝo ne estas sekura (http)!';
export const getAuthSureIsTakingAWhile = 'Niaj penoj konekti al AKSO daŭras tre tre longe. Povas esti, ke via interretkonekto ne bone fartas. Se post reŝarĝo de la paĝo vi daŭre ne sukcesas konektiĝi, bv. tiam kontrolu |https://viva.akso.org| por vidi ĉu ni konscias pri la problemo.';
export const getAuthTryCounter = n => `${n} provo${n === 1 ? '' : 'j'}`;

export const meta = {
    copyright: `© ${copyrightYear}`,
    copyrightHolder: 'TEJO',
    copyrightHref: 'https://tejo.org',
    license: 'MIT-Permesilo',
    sourceHref: 'https://github.com/AksoEo',
    source: 'GitHub',

    feVersion: 'AKSO-Admin versio',
    feVersionBuilt: 'kompilita',
    apiVersion: 'API versio',
};

export * from './data';
export * from './errors';
export * from './login';
export * from './app';
export * from './codeholders';
export * from './congresses';
export * from './delegations';
export * from './intermediaries';
export * from './memberships';
export * from './magazines';
export * from './newsletters';
export * from './notif-templates';
export * from './roles';
export * from './statistics';
export * from './payments';
export * from './admin';
export * from './lists';
export * from './votes';
export * from './form-editor';
export * from './country-currencies';
