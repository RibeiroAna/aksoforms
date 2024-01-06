import { useDataView } from '../../../core';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/compat';
import { statistics as locale } from '../../../locale';
import { coreContext } from '../../../core/connection';

export const COUNTRY_TOTAL = 'total';
export const CategoryType = {
    All: 'all',
    AllMembershipGiving: 'all-memg',
    AllMembershipNonGiving: 'all-memng',
    AllRoles: 'all-roles',
    Membership: 'mem',
    Role: 'role',
};

export function encodeCategory (type, id) {
    if (type === CategoryType.All) {
        return type;
    } else {
        return [type, id].join(' ');
    }
}
function decodeCategory (encoded) {
    return encoded.split(' ');
}

function dateCmp (a, b) {
    const aDate = new Date(a);
    const bDate = new Date(b);
    return aDate - bDate;
}

export function useStatisticsHistory ({ _unmapped, beforeDate, afterDate, offset, limit }) {
    const core = useContext(coreContext);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const currentLoadKey = useRef(0);
    useEffect(() => {
        let filter = {};
        if (beforeDate) {
            filter = { date: { $lte: beforeDate } };
        } else if (afterDate) {
            filter = { date: { $lte: afterDate } };
        }

        currentLoadKey.current++;
        setLoading(true);
        setError(null);
        const loadKey = currentLoadKey.current;
        core.createTask('statistics/listStatistics', { _unmapped }, {
            fields: [{ id: 'date', sorting: 'desc' }],
            jsonFilter: { filter },
            offset,
            limit,
        }).runOnceAndDrop().then(result => {
            if (loadKey !== currentLoadKey.current) return;
            setResult(result);
        }).catch(error => {
            if (loadKey !== currentLoadKey.current) return;
            setError(error);
        }).finally(() => {
            if (loadKey !== currentLoadKey.current) return;
            setLoading(false);
        });
    }, [offset, beforeDate, afterDate]);

    return [loading, error, result];
}

class Entry {
    constructor (date, country, category, data) {
        this.date = date;
        this.country = country;
        this.category = category;
        this.data = data;
    }

    matches (filter) {
        if (filter.beforeDate  && dateCmp(this.date, filter.beforeDate) > 0) return false;
        if (filter.afterDate && dateCmp(this.date, filter.afterDate) < 0) return false;
        if (filter.date && this.date !== filter.date) return false;
        if (filter.country && filter.country !== COUNTRY_TOTAL && this.country !== filter.country) {
            return false;
        }
        if (filter.category) {
            const [thisType, thisId] = decodeCategory(this.category);
            const [type, id] = decodeCategory(filter.category);

            let matchesAllQ = false;
            if (type === CategoryType.All) matchesAllQ = true;
            if (type === CategoryType.AllMembershipGiving
                && thisType === CategoryType.Membership
                && this.getItem()?.givesMembership) {
                matchesAllQ = true;
            }
            if (type === CategoryType.AllMembershipNonGiving
                && thisType === CategoryType.Membership
                && !this.getItem()?.givesMembership) {
                matchesAllQ = true;
            }
            if (type === CategoryType.AllRoles && thisType === CategoryType.Role) {
                matchesAllQ = true;
            }
            if (!matchesAllQ) {
                if (type !== thisType) return false;
                if (id !== thisId) return false;
            }
        }
        return true;
    }

    /** Like matches(filter), but for counting everything only once. */
    matchesCountingOnce (filter) {
        if (!this.matches(filter)) return false;

        const filterCountry = filter.country ?? COUNTRY_TOTAL;
        // total country is its own item
        if (this.country !== filterCountry) return false;

        return true;
    }

    getItem () {
        const [thisType] = decodeCategory(this.category);
        if (thisType === CategoryType.Membership) {
            return this.data.membershipCategory;
        } else if (thisType === CategoryType.Role) {
            return this.data.role;
        }
        return {};
    }
}

export class StatisticsData {
    datesAvailable = new Set();
    categories = new Map();
    countries = new Set();
    entries = [];

    static use () {
        return useMemo(() => new StatisticsData(), []);
    }

    /** Adds statistics data from API. */
    addFromApi (data) {
        if (this.datesAvailable.has(data.date)) return;
        this.datesAvailable.add(data.date);

        this.countries = new Set(this.countries);
        this.categories = new Map(this.categories);

        for (const country in data.data) {
            this.countries.add(country);
            const countryData = data.data[country];
            for (const category of countryData.membershipCategories) {
                const categoryId = encodeCategory(CategoryType.Membership, category.membershipCategoryId);
                const entry = new Entry(data.date, country, categoryId, category);
                this.entries.push(entry);
                this.categories.set(categoryId, entry.getItem());
            }
            for (const role of countryData.roles) {
                const categoryId = encodeCategory(CategoryType.Role, role.roleId);
                const entry = new Entry(data.date, country, categoryId, role);
                this.entries.push(entry);
                this.categories.set(categoryId, entry.getItem());
            }
        }
    }

    getCategoriesForSelect () {
        const catItems = [...this.categories]
            .map(([k, v]) => [k, decodeCategory(k), v])
            .map(([value, [type], item]) => {
                if (type === CategoryType.All) {
                    return null;
                } else {
                    const label = [
                        item.nameAbbrev,
                        item.name,
                    ].filter(x => x).join(' ');
                    return { value, label };
                }
            })
            .filter(x => x)
            .sort((a, b) => a.label.localeCompare(b.label));

        return [{
            value: CategoryType.All,
            label: locale.membershipsAndRoles.allCategories,
        }].concat(catItems);
    }

    hasDataForDate (date) {
        return this.datesAvailable.has(date);
    }

    getByCategory (filter) {
        const membershipGivingItems = new Map();
        const membershipNonGivingItems = new Map();
        const roleItems = new Map();

        for (const entry of this.entries) {
            if (!entry.matches(filter)) continue;
            const [type] = decodeCategory(entry.category);
            if (type === CategoryType.All) continue;

            const item = entry.getItem();
            if (type === CategoryType.Membership) {
                if (item.givesMembership) {
                    membershipGivingItems.set(entry.category, entry);
                } else {
                    membershipNonGivingItems.set(entry.category, entry);
                }
            } else if (type === CategoryType.Role) {
                roleItems.set(entry.category, entry);
            }
        }

        return { membershipGivingItems, membershipNonGivingItems, roleItems };
    }

    getByCountry (filter) {
        const countryItems = new Map();

        for (const entry of this.entries) {
            if (!entry.matches(filter)) continue;
            countryItems.set(entry.country, entry);
        }

        return countryItems;
    }

    /** Returns the dates used for a date diff from the current date. Some of the dates may not exist. */
    getDateDiffDates (currentDate) {
        const thisYear = currentDate && currentDate.split('-')[0];
        const lastYearDate = thisYear && `${thisYear - 1}-12-31`;
        const aYearAgoDate = thisYear && `${thisYear - 1}-${currentDate.split('-').slice(1).join('-')}`;
        let thirtyDaysAgoDate = null;
        if (thisYear) {
            thirtyDaysAgoDate = new Date(thisYear + 'T00:00:00Z');
            thirtyDaysAgoDate.setUTCDate(thirtyDaysAgoDate.getUTCDate() - 30);
            if (thirtyDaysAgoDate.getUTCFullYear() !== thisYear) {
                // we are in last year...undo that
                thirtyDaysAgoDate = new Date(thisYear + '-01-01');
            }
            thirtyDaysAgoDate = thirtyDaysAgoDate.toISOString().split('T')[0];
        }

        return { lastYearDate, aYearAgoDate, thirtyDaysAgoDate };
    }

    /** Issues a React hook to use the statistics data for a date. */
    useDataForDate (date) {
        const [loading, error, data] = useDataView('statistics/statistics', date && { date });
        useEffect(() => {
            if (!data) return;
            this.addFromApi(data);
        }, [data]);

        return [loading, error];
    }

    /** Issues a React hook to use the statistics data for all dates required for a date diff. */
    useDataForDateDiff (currentDate) {
        const { lastYearDate, aYearAgoDate, thirtyDaysAgoDate } = this.getDateDiffDates(currentDate);
        const [loading1, error1] = this.useDataForDate(currentDate);
        const [loading2] = this.useDataForDate(lastYearDate);
        const [loading3] = this.useDataForDate(aYearAgoDate);
        const [loading4] = this.useDataForDate(thirtyDaysAgoDate);
        // we don't care if old data is unavailable
        return [loading1 || loading2 || loading3 || loading4, error1];
    }

    /** @internal Adds date diffs to an item. */
    addDateDiffs (item) {
        item.yearDiff = item.current !== null && item.lastYear !== null
            ? item.current - item.lastYear
            : null;
        item.yearRatio = item.current !== null && item.lastYear !== null
            ? item.current / item.lastYear
            : null;
        item.thirtyDayDiff = item.thirtyDaysAgo !== null
            ? item.current - item.thirtyDaysAgo
            : null;
    }

    getAgeBuckets (filter, currentDate) {
        filter = { ...filter, date: currentDate };

        const buckets = new Map();
        for (const entry of this.entries) {
            if (!entry.matchesCountingOnce(filter)) continue;
            for (const [k, v] of Object.entries(entry.data.agePrimo.counts)) {
                if (!buckets.has(k)) buckets.set(k, 0);
                buckets.set(k, buckets.get(k) + v);
            }
        }
        return buckets;
    }

    getTotalCount (filter) {
        let count = 0;
        for (const entry of this.entries) {
            if (!entry.matchesCountingOnce(filter)) continue;
            if (filter.tejo) {
                count += entry.data.countTEJO;
            } else {
                count += entry.data.count;
            }
        }
        return count;
    }

    /** Returns date diff data by category. */
    getDateDiffByCategory (currentDate, filter) {
        const { lastYearDate, aYearAgoDate, thirtyDaysAgoDate } = this.getDateDiffDates(currentDate);

        const countField = filter.tejo ? 'countTEJO' : 'count';

        const membershipGivingItems = new Map();
        const membershipNonGivingItems = new Map();
        const roleItems = new Map();

        const mergeOne = (target, source, key) => {
            for (const [k, v] of source) {
                if (!target.has(k)) {
                    target.set(k, {
                        current: null,
                        lastYear: null,
                        aYearAgo: null,
                        thirtyDaysAgo: null,

                        filter: {
                            country: v.country,
                            tejo: filter.tejo,
                            category: v.category,
                        },
                        navigationTarget: { byFieldType: 'country', category: v.category },
                        item: v.getItem(),
                    });
                }
                if (target.get(k)[key] === null) target.get(k)[key] = 0;
                target.get(k)[key] += v.data[countField];
            }
        };
        const merge = (date, key) => {
            if (!date) return;
            const newFilter = { ...filter, beforeDate: null, afterDate: null, date };
            const {
                membershipGivingItems: mGiving,
                membershipNonGivingItems: mNonGiving,
                roleItems: role,
            } = this.getByCategory(newFilter);

            mergeOne(membershipGivingItems, mGiving, key);
            mergeOne(membershipNonGivingItems, mNonGiving, key);
            mergeOne(roleItems, role, key);
        };

        merge(currentDate, 'current');
        merge(lastYearDate, 'lastYear');
        merge(aYearAgoDate, 'aYearAgo');
        merge(thirtyDaysAgoDate, 'thirtyDaysAgo');

        for (const item of membershipGivingItems.values()) this.addDateDiffs(item);
        for (const item of membershipNonGivingItems.values()) this.addDateDiffs(item);
        for (const item of roleItems.values()) this.addDateDiffs(item);

        const addCategoryTotal = (items, filter, item) => {
            if (!items.size) return;
            const total = {
                current: null,
                lastYear: null,
                aYearAgo: null,
                thirtyDaysAgo: null,
                filter,
                item,
                isTotal: true,
            };
            for (const item of items.values()) {
                const add = key => {
                    if (item[key] !== null) {
                        if (total[key] === null) total[key] = 0;
                        total[key] += item[key];
                    }
                };
                add('current');
                add('lastYear');
                add('aYearAgo');
                add('thirtyDaysAgo');
            }
            items.set(encodeCategory(CategoryType.All), total);
        };

        addCategoryTotal(membershipGivingItems, {
            country: filter.country,
            tejo: filter.tejo,
            category: encodeCategory(CategoryType.AllMembershipGiving, null),
        }, { name: locale.membershipsAndRoles.total });
        addCategoryTotal(membershipNonGivingItems, {
            country: filter.country,
            tejo: filter.tejo,
            category: encodeCategory(CategoryType.AllMembershipNonGiving, null),
        }, { name: locale.membershipsAndRoles.total });
        addCategoryTotal(roleItems, {
            country: filter.country,
            tejo: filter.tejo,
            category: encodeCategory(CategoryType.AllRoles, null),
        }, { name: locale.membershipsAndRoles.total });

        return [
            (membershipGivingItems.size + membershipNonGivingItems.size) && {
                type: 'section',
                label: locale.membershipsAndRoles.sectionTitles.membershipCategories,
            },
            membershipGivingItems.size && {
                type: 'section',
                label: locale.membershipsAndRoles.sectionTitles.membershipGivingCategories,
            },
            { type: 'items', items: [...membershipGivingItems.values()] },
            membershipNonGivingItems.size && {
                type: 'section',
                label: locale.membershipsAndRoles.sectionTitles.membershipNonGivingCategories,
            },
            { type: 'items', items: [...membershipNonGivingItems.values()] },
            roleItems.size && {
                type: 'section',
                label: locale.membershipsAndRoles.sectionTitles.roles,
            },
            { type: 'items', items: [...roleItems.values()] },
        ].filter(x => x);
    }

    /** Returns date diff data by category. */
    getDateDiffByCountry (currentDate, filter) {
        const { lastYearDate, aYearAgoDate, thirtyDaysAgoDate } = this.getDateDiffDates(currentDate);

        const countField = filter.tejo ? 'countTEJO' : 'count';

        const items = new Map();

        const merge = (date, key) => {
            if (!date) return;
            const newFilter = { ...filter, beforeDate: null, afterDate: null, date };
            const countryItems = this.getByCountry(newFilter);

            for (const [k, v] of countryItems) {
                if (!items.has(k)) {
                    items.set(k, {
                        current: null,
                        lastYear: null,
                        aYearAgo: null,
                        thirtyDaysAgo: null,

                        filter: {
                            country: v.country,
                            tejo: filter.tejo,
                            category: v.category,
                        },
                        navigationTarget: { byFieldType: 'category', country: v.country },
                        item: { country: k },
                        isTotal: k === COUNTRY_TOTAL,
                    });
                }
                if (items.get(k)[key] === null) items.get(k)[key] = 0;
                items.get(k)[key] += v.data[countField];
            }
        };

        merge(currentDate, 'current');
        merge(lastYearDate, 'lastYear');
        merge(aYearAgoDate, 'aYearAgo');
        merge(thirtyDaysAgoDate, 'thirtyDaysAgo');

        for (const item of items.values()) this.addDateDiffs(item);

        return [{ type: 'items', items: [...items.values()] }];
    }

    useHistoryCounts (filter, limit) {
        const [loading, error, data] = useStatisticsHistory({
            _unmapped: true,
            beforeDate: filter.beforeDate,
            afterDate: filter.afterDate,
            offset: 0,
            limit: 100,
        });

        for (const item of (data?.items || [])) {
            this.addFromApi(item);
        }

        const counts = [];

        let date = filter.beforeDate || filter.afterDate;
        for (let i = 0; i < limit; i++) {
            const count = this.getTotalCount({ ...filter, date });
            counts.push({ date, count });

            if (filter.beforeDate) {
                // go backwards
                const date2 = new Date(date);
                date2.setUTCDate(date2.getUTCDate() - 1);
                date = date2.toISOString().split('T')[0];
            } else {
                // go forwards
                const date2 = new Date(date);
                date2.setUTCDate(date2.getUTCDate() + 1);
                date = date2.toISOString().split('T')[0];
            }
        }

        counts.sort((a, b) => new Date(a.date) - new Date(b.date));

        return [loading, error, counts];
    }
}