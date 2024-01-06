import { h } from 'preact';
import { useState } from 'preact/compat';
import { Button } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import CloseIcon from '@material-ui/icons/Close';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ItemPicker from '../../../components/pickers/item-picker-dialog';
import OverviewListItem from '../../../components/lists/overview-list-item';
import { FIELDS as MAG_FIELDS } from './fields';
import { FIELDS as EDITION_FIELDS } from './editions/fields';
import { magazines as magLocale, magazineEditions as editionLocale } from '../../../locale/magazines';
import './edition-picker.less';

const SELECTED_MAG_FIELDS = [
    { id: 'org', sorting: 'none' },
    { id: 'name', sorting: 'none' },
];
const REDUCED_MAG_FIELDS = {
    org: MAG_FIELDS.org,
    name: MAG_FIELDS.name,
};

const SELECTED_EDITION_FIELDS = [
    { id: 'idHuman', sorting: 'none' },
    { id: 'date', sorting: 'none' },
];
const REDUCED_EDITION_FIELDS = {
    idHuman: EDITION_FIELDS.idHuman,
    date: EDITION_FIELDS.date,
    published: EDITION_FIELDS.published,
};

export default function MagazineEditionPicker ({
    magazine,
    edition,
    onMagazineChange,
    onEditionChange,
    magazineJsonFilter,
    ...extra
}) {
    const [pickingMagazine, setPickingMagazine] = useState(false);
    const [pickingEdition, setPickingEdition] = useState(false);

    let contents;
    if (magazine) {
        let editionContents;
        if (edition) {
            editionContents = (
                <Button class="edition-item" onClick={() => {
                    setPickingEdition(true);
                }}>
                    <OverviewListItem
                        doFetch compact
                        view="magazines/edition"
                        options={{ magazine }}
                        skipAnimation
                        key={magazine + '-' + edition}
                        id={edition}
                        selectedFields={SELECTED_EDITION_FIELDS}
                        fields={EDITION_FIELDS}
                        index={0}
                        locale={editionLocale.fields} />
                </Button>
            );
        } else {
            editionContents = (
                <Button class="pick-edition" small onClick={() => setPickingEdition(true)}>
                    <AddIcon style={{ verticalAlign: 'middle' }} />
                    {' '}
                    {editionLocale.picker.editionPrompt}
                </Button>
            );
        }

        contents = (
            <div class="selected-magazine">
                <Button icon small class="remove-picked" onClick={() => {
                    onEditionChange(null);
                    // do this next tick so onChange handlers can catch up
                    requestAnimationFrame(() => {
                        onMagazineChange(null);
                    });
                }}>
                    <CloseIcon style={{ verticalAlign: 'middle' }} />
                </Button>
                <Button class="magazine-item" onClick={() => {
                    setPickingMagazine(true);
                }}>
                    <OverviewListItem
                        doFetch compact
                        view="magazines/magazine"
                        skipAnimation
                        key={magazine}
                        id={magazine}
                        selectedFields={SELECTED_MAG_FIELDS}
                        fields={MAG_FIELDS}
                        index={0}
                        locale={magLocale.fields} />
                </Button>
                <div class="selected-edition-chevron">
                    <ChevronRightIcon />
                </div>
                {editionContents}
            </div>
        );
    } else {
        contents = (
            <Button class="pick-magazine" onClick={() => setPickingMagazine(true)}>
                <AddIcon style={{ verticalAlign: 'middle' }} />
                {' '}
                {editionLocale.picker.prompt}
            </Button>
        );
    }

    extra.class = (extra.class || '') + ' magazine-edition-picker';

    return (
        <div {...extra}>
            {contents}

            <ItemPicker
                open={pickingMagazine}
                onClose={() => setPickingMagazine(false)}
                title={magLocale.title}
                limit={1}
                value={[]}
                onChange={v => {
                    if (v.length) {
                        if (v[0] !== magazine) {
                            onEditionChange(null);
                        }
                        requestAnimationFrame(() => {
                            onMagazineChange(v[0]);
                            setPickingMagazine(false);
                            setPickingEdition(true);
                        });
                    }
                }}
                task="magazines/listMagazines"
                view="magazines/magazine"
                filter={magazineJsonFilter}
                sorting={{ name: 'asc' }}
                fields={REDUCED_MAG_FIELDS}
                locale={magLocale.fields} />
            <ItemPicker
                open={pickingEdition}
                onClose={() => setPickingEdition(false)}
                title={editionLocale.title}
                limit={1}
                value={[]}
                onChange={v => {
                    if (v.length) {
                        onEditionChange(v[0]);
                        setPickingEdition(false);
                    }
                }}
                options={{ magazine }}
                viewOptions={{ magazine }}
                task="magazines/listEditions"
                view="magazines/edition"
                sorting={{ date: 'desc' }}
                fields={REDUCED_EDITION_FIELDS}
                locale={editionLocale.fields} />
        </div>
    );
}
