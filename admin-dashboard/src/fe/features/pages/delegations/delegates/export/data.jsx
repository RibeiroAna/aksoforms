import Zip from 'jszip';
import { stringify } from 'csv-stringify';
import {
    delegations as locale,
    delegationSubjects as subjectsLocale,
    codeholders as codeholdersLocale,
    countries as countriesLocale,
} from '../../../../../locale';
import { FIELDS as DELEGATE_FIELDS } from '../fields';
import CODEHOLDER_FIELDS from '../../../codeholders/table-fields';

function loadDataView (core, ...args) {
    return new Promise((resolve, reject) => {
        const view = core.createDataView(...args);
        view.on('update', data => {
            resolve(data);
            view.drop();
        });
        view.on('error', err => {
            reject(err);
            view.drop();
        });
    });
}

async function loadCities (onProgress, core, ids) {
    onProgress('loadCities', 0, ids.length);

    const cities = {};
    let cityCount = 0;
    let offset = 0;
    while (offset < ids.length) {
        const result = await core.createTask('geoDb/listCities', {}, {
            jsonFilter: { filter: { id: { $in: ids.slice(offset, offset + 100).map(id => +id.substr(1)) } } },
            offset,
            limit: 100,
        }).runOnceAndDrop();
        offset += 100;
        for (const id of result.items) {
            const data = await loadDataView(core, 'geoDb/city', { id, noFetch: true });
            cities[id] = data;
            onProgress('loadCities', ++cityCount, ids.length);
        }
    }
    return cities;
}

async function loadSubjects (onProgress, core, ids) {
    onProgress('loadSubjects', 0, ids.length);

    const subjects = {};
    let subjectCount = 0;
    let offset = 0;
    while (offset < ids.length) {
        const result = await core.createTask('delegations/listSubjects', {}, {
            jsonFilter: { filter: { id: { $in: ids.slice(offset, offset + 100) } } },
            offset,
            limit: 100,
        }).runOnceAndDrop();
        offset += 100;
        for (const id of result.items) {
            const data = await loadDataView(core, 'delegations/subject', { id, noFetch: true });
            subjects[id] = data;

            onProgress('loadSubjects', ++subjectCount, ids.length);
        }
    }
    return subjects;
}

const CODEHOLDER_FIELD_NAMES = [
    'id', 'type', 'name', 'lastNamePublicity', 'profilePictureHash',
    'profilePicturePublicity', 'mainDescriptor', 'website', 'factoids', 'biography',
    'publicEmail', 'email', 'emailPublicity', 'officePhone', 'officePhonePublicity',
    'address', 'addressPublicity',
];

async function loadData (onProgress, core, org, filter, ignoreTos) {
    onProgress('loadCountries', 0, 0);
    const countries = await loadDataView(core, 'countries/countries');
    onProgress('loadCountries', Object.keys(countries).length, Object.keys(countries).length);
    const delegates = [];

    const cityIds = new Set();
    const subjectIds = new Set();

    onProgress('loadDelegates', 0, 0);

    let offset = 0;
    let totalItems = Infinity;
    while (offset < totalItems) {
        let jsonFilter = { org };
        if (!ignoreTos) jsonFilter['tos.paperAnnualBook'] = true;
        if (filter?.jsonFilter) jsonFilter = { $and: [jsonFilter, filter?.jsonFilter.filter] };

        const delegatesList = await core.createTask('delegations/listDelegatesExt', {}, {
            filters: filter?.filters,
            jsonFilter: { filter: jsonFilter },
            offset,
            limit: 100,
        }).runOnceAndDrop();

        totalItems = delegatesList.total;
        offset += delegatesList.items.length;

        onProgress('loadDelegates', offset, totalItems);
        onProgress('loadCodeholders', 0, delegatesList.items.length);

        const codeholderList = await core.createTask('codeholders/list', {}, {
            jsonFilter: { filter: { id: { $in: delegatesList.items } } },
            fields: CODEHOLDER_FIELD_NAMES.map(id => ({ id, sorting: 'none' })),
            limit: 100,
        }).runOnceAndDrop();

        const codeholders = {};
        for (const id of codeholderList.items) {
            codeholders[id] = await loadDataView(core, 'codeholders/codeholder', { id, noFetch: true });

            onProgress('loadCodeholders', Object.keys(codeholders).length, delegatesList.items.length);
        }

        onProgress('loadDelegatesSub', delegates.length, totalItems);

        for (const id of delegatesList.items) {
            const delegation = await loadDataView(core, 'codeholders/delegation', { id, noFetch: true });
            if (codeholders[delegation.codeholderId]) {
                delegates.push({
                    codeholder: codeholders[delegation.codeholderId],
                    delegation,
                });
                for (const city of delegation.cities) cityIds.add(city);
                for (const subject of delegation.subjects) subjectIds.add(subject);

                onProgress('loadDelegatesSub', delegates.length, totalItems);
            } else {
                console.warn(`delegates export: missing codeholder ${id}`, id); // eslint-disable-line no-console
            }
        }
    }

    const cities = await loadCities(onProgress, core, [...cityIds]);
    const subjects = await loadSubjects(onProgress, core, [...subjectIds]);

    return { countries, cities, subjects, delegates };
}

async function stringifyFields (core, fields, data) {
    const result = {};
    for (const key in data) {
        if (fields[key] && fields[key].stringify) {
            result[key] = await fields[key].stringify(data[key], data, Object.keys(data), {
                // HACK: needed for codeholders
                countryLocale: 'eo',
            }, core);
        } else result[key] = data[key];
    }
    return result;
}

export async function load (onProgress, core, org, filter, ignoreTos) {
    const { countries, cities, subjects, delegates } = await loadData(onProgress, core, org, filter, ignoreTos);

    const zip = new Zip();

    const makeFile = (fileName) => {
        const stringifier = stringify({ delimiter: ',' });
        const rows = [];
        stringifier.on('readable', () => {
            let row;
            while ((row = stringifier.read())) rows.push(row);
        });
        stringifier.on('error', err => {
            console.error(err); // eslint-disable-line no-console
            onProgress('error', 0, Infinity);
        });
        stringifier.on('finish', () => {
            zip.file(fileName + '.csv', rows.join(''));
        });
        return stringifier;
    };

    const writeData = async (fileName, progressId, fields, localizedFields, data, map = (data => data)) => {
        const file = makeFile(fileName);
        file.write(fields.map(field => localizedFields[field]));
        const totalItems = Object.keys(data).length;
        onProgress(progressId, 0, totalItems);
        let count = 0;
        for (const k in data) {
            if (count % 50 === 0) {
                // give other things a chance to run
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            const item = await map(data[k]);
            file.write(fields.map(field => item[field]));
            onProgress(progressId, ++count, totalItems);
        }
        file.end();
    };

    await Promise.all([
        writeData(
            locale.export.files.countries,
            'csvCountries',
            ['code', 'name_eo'],
            countriesLocale.fields,
            countries,
        ),
        writeData(
            locale.export.files.cities,
            'csvCities',
            [
                'id', 'country', 'population', 'nativeLabel', 'eoLabel', 'll',
                'subdivision_nativeLabel', 'subdivision_eoLabel', 'subdivision_iso',
            ],
            locale.cityPicker.fields,
            cities,
        ),
        writeData(
            locale.export.files.subjects,
            'csvSubjects',
            ['id', 'name', 'description'],
            subjectsLocale.fields,
            subjects,
        ),
        writeData(
            locale.export.files.delegates,
            'csvDelegates',
            [
                'codeholderId',
                'org',
                'cities',
                'countries',
                'subjects',
                'hosting',
            ],
            locale.fields,
            delegates,
            data => stringifyFields(core, DELEGATE_FIELDS, data.delegation),
        ),
        writeData(
            locale.export.files.codeholders,
            'csvCodeholders',
            CODEHOLDER_FIELD_NAMES,
            codeholdersLocale.fields,
            delegates,
            data => stringifyFields(core, CODEHOLDER_FIELDS, data.codeholder),
        ),
    ]);

    return await zip.generateAsync({ type: 'blob' });
}
