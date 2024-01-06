import { h } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/compat';
import { Button, Checkbox, TextField } from 'yamdl';
import moment from 'moment';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import TinyProgress from '../../../../../components/controls/tiny-progress';
import DataList from '../../../../../components/lists/data-list';
import ItemPickerDialog from '../../../../../components/pickers/item-picker-dialog';
import { date, timestamp } from '../../../../../components/data';
import { connect, coreContext } from '../../../../../core/connection';
import { magazineSnaps as locale } from '../../../../../locale';
import CH_FIELDS from '../../../codeholders/table-fields';
import { parseIsoDuration } from '../../../../../components/data/timespan';
import permsContext from '../../../../../perms';
import { Link } from '../../../../../router';
import './fields.less';

export const FIELDS = {
    time: {
        component ({ value }) {
            return <timestamp.renderer value={value} />;
        },
    },
    name: {
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return (
                    <TextField
                        outline
                        label={slot === 'create' ? locale.fields.name : null}
                        value={value}
                        onChange={v => onChange(v || null)} />
                );
            }
            return value;
        },
    },
};

export function Footer ({ editing, userData }) {
    if (editing) return null;

    const core = useContext(coreContext);
    const [comparing, setComparing] = useState(false);
    const { compare, setCompare } = userData;
    const dataList = useRef(null);

    const chkId = Math.random().toString(36);

    return (
        <div class="magazine-snapshot-footer">
            <div class="compare-control">
                <div class="compare-check-container">
                    <Checkbox
                        class="inner-checkbox"
                        id={chkId}
                        checked={comparing}
                        onChange={comparing => {
                            setComparing(comparing);
                            if (!comparing) setCompare(null);
                        }} />
                    <label for={chkId}>
                        {locale.codeholders.compare}
                    </label>
                </div>
                {comparing && (
                    <SnapshotPicker
                        magazine={userData.magazine}
                        edition={userData.edition}
                        value={compare}
                        onChange={setCompare} />
                )}
            </div>
            {compare ? (
                <div class="comparing-note">
                    {locale.codeholders.comparing}
                </div>
            ) : null}
            <DataList
                ref={dataList}
                emptyLabel={compare ? locale.codeholders.compareEmpty : locale.codeholders.empty}
                renderItem={item => <CodeholderItem codeholder={item} />}
                onLoad={(offset, limit) => core.createTask('magazines/snapshotCodeholders', {
                    magazine: userData.magazine,
                    edition: userData.edition,
                    id: userData.id,
                    compare,
                }, { offset, limit }).runOnceAndDrop()} />
        </div>
    );
}

function SnapshotPicker ({ magazine, edition, value, onChange }) {
    const [open, setOpen] = useState(false);

    return (
        <div class="pick-snapshot">
            {value ? (
                <div class="item-preview">
                    <div class="item-remove">
                        <Button class="remove-button" icon small onClick={() => onChange(null)}>
                            <RemoveIcon />
                        </Button>
                    </div>
                    <SnapshotItem magazine={magazine} edition={edition} id={value} />
                </div>
            ) : (
                <Button class="add-button" icon small onClick={() => setOpen(true)}>
                    <AddIcon />
                </Button>
            )}

            <ItemPickerDialog
                open={open}
                onClose={() => setOpen(false)}
                limit={1}
                value={value ? [value] : []}
                onChange={value => onChange(value[0] || null)}
                task="magazines/listSnapshots"
                view="magazines/snapshot"
                options={{ magazine, edition }}
                viewOptions={{ magazine, edition }}
                fields={FIELDS}
                locale={locale.fields} />
        </div>
    );
}

const SnapshotItem = connect(({ magazine, edition, id }) => ['magazines/snapshot', {
    magazine,
    edition,
    id,
}])(data => ({ data }))(function SnapshotItem ({ data }) {
    if (!data) return <TinyProgress />;

    return (
        <div class="snapshot-item">
            <div class="snapshot-timestamp">
                <timestamp.renderer value={data.time} />
            </div>
            <div class="snapshot-name">
                {data.name}
            </div>
        </div>
    );
});

const SNAPSHOT_FIELDS = ['code', 'name', 'address'];
function CodeholderItem ({ codeholder }) {
    if (typeof codeholder !== 'object') {
        // this means the codeholder couldn't be found.
        // this is probably because the user doesn't have permission

        return (
            <div class="snapshot-codeholder is-missing">
                {locale.codeholders.missingData(codeholder)}
            </div>
        );
    }

    return (
        <div class="snapshot-codeholder">
            {SNAPSHOT_FIELDS.map(id => {
                const Field = CH_FIELDS[id].component;
                return (
                    <div class="codeholder-field" data-id={id} key={id}>
                        <Field
                            value={codeholder[id]}
                            item={codeholder}
                            fields={SNAPSHOT_FIELDS} />
                    </div>
                );
            })}
        </div>
    );
}

export function MemberInclusionInfo ({ magazine, edition, onLinkClick }) {
    const core = useContext(coreContext);
    const perms = useContext(permsContext);
    const [ilyInterval, setIlyInterval] = useState(null);
    const [editionData, setEditionData] = useState(null);
    const [magazineData, setMagazineData] = useState(null);

    useEffect(() => {
        let canceled = false;
        (async () => {
            const editionData = await core.viewData('magazines/edition', { magazine, id: edition });
            const magazineData = await core.viewData('magazines/magazine', { id: magazine });

            const subscribers = editionData.subscribers || magazineData.subscribers;

            return { editionData, magazineData, ilyInterval: subscribers?.access?.membersIncludeLastYear };
        })().then(({ editionData, magazineData, ilyInterval }) => {
            if (canceled) return;
            setEditionData(editionData);
            setMagazineData(magazineData);
            setIlyInterval(ilyInterval);
        });
        return () => canceled = true;
    }, [magazine, edition]);

    if (ilyInterval && editionData?.date) {
        const { years, months, days } = parseIsoDuration(ilyInterval);
        const lastYear = moment(editionData.date).subtract(1, 'years').year();
        const cutOffDate = moment(editionData.date).subtract(years, 'years').subtract(months, 'months').subtract(days, 'days');
        const includesLastYear = cutOffDate.year() === lastYear;

        const canEdit = perms?.hasPerm(`magazines.update.${magazineData?.org}`);

        return (
            <div class="magazine-snapshot-members-inclusion-info">
                <div class="inner-field">
                    <div class="inner-label">
                        {locale.memberInclusionInfo.editionDate}
                    </div>
                    <div class="inner-value">
                        <date.renderer value={editionData.date} />
                    </div>
                </div>
                <div class="inner-field">
                    <div class="inner-label">
                        {locale.memberInclusionInfo.includeLastYearCutoffDate}
                    </div>
                    <div class="inner-value">
                        <date.renderer value={cutOffDate} />
                    </div>
                </div>
                <div class="inner-verdict">
                    {includesLastYear
                        ? locale.memberInclusionInfo.includesLastYear
                        : locale.memberInclusionInfo.doesNotIncludeLastYear}
                </div>
                {canEdit && (
                    <div class="inner-edit-info">
                        {locale.memberInclusionInfo.editInfo[0]}
                        <Link target={`/revuoj/${magazine}/numero/${edition}/redakti`} onClick={onLinkClick}>
                            {locale.memberInclusionInfo.editInfo[1]}
                        </Link>
                        {locale.memberInclusionInfo.editInfo[2]}
                        <Link target={`/revuoj/${magazine}/redakti`} onClick={onLinkClick}>
                            {locale.memberInclusionInfo.editInfo[3]}
                        </Link>
                        {locale.memberInclusionInfo.editInfo[4]}
                    </div>
                )}
            </div>
        );
    }

    return null;
}
