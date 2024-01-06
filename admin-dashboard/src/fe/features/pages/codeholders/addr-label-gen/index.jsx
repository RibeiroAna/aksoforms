import { h } from 'preact';
import { useState, Fragment, PureComponent, useContext } from 'preact/compat';
import { Button, Checkbox, Dialog, TextField } from 'yamdl';
import RemoveIcon from '@material-ui/icons/Remove';
import Select from '../../../../components/controls/select';
import Segmented from '../../../../components/controls/segmented';
import DataList from '../../../../components/lists/data-list';
import DialogSheet from '../../../../components/tasks/dialog-sheet';
import { coreContext } from '../../../../core/connection';
import { codeholders as locale } from '../../../../locale';
import { connectPerms } from '../../../../perms';
import './index.less';

export default function AddrLabelGenContainer ({
    open, lvIsCursed, options, onClose,
}) {
    const [showSuccess, setShowSuccess] = useState(false);

    return (
        <Fragment>
            <DialogSheet
                class="codeholders-addr-label-gen-dialog"
                backdrop
                open={open}
                onClose={onClose}
                title={locale.addrLabelGen.title}>
                <AddrLabelGen
                    lvIsCursed={lvIsCursed}
                    options={options}
                    onSuccess={() => {
                        onClose();
                        setShowSuccess(true);
                    }} />
            </DialogSheet>
            <Dialog
                backdrop
                open={showSuccess}
                onClose={() => setShowSuccess(false)}
                actions={[
                    {
                        label: locale.addrLabelGen.closeDialog,
                        action: () => setShowSuccess(false),
                    },
                ]}>
                {locale.addrLabelGen.success}
            </Dialog>
        </Fragment>
    );
}

function AddrLabelGen ({ lvIsCursed, onSuccess, options }) {
    const core = useContext(coreContext);
    const [settings, setSettings] = useState({
        language: 'eo',
        latin: false,
        includeCode: true,
        paper: 'A4',
        margins: {
            top: 72,
            left: 72,
            right: 72,
            bottom: 72,
        },
        cols: 2,
        rows: 5,
        colGap: 72,
        rowGap: 72,
        cellPadding: 8,
        fontSize: 12,
        drawOutline: false,
    });
    const [view, setView] = useState({
        unit: 'pt',
    });
    const [filterInvalid, setFilterInvalid] = useState(true);
    const [isLoading, setLoading] = useState(false);
    const [resultOpen, setResultOpen] = useState(false);

    const sendRequest = () => {
        setLoading(true);

        let sendOptions = options;

        if (filterInvalid) {
            sendOptions = { ...sendOptions };

            const extraFilter = { addressInvalid: false };
            if (!sendOptions.jsonFilter._disabled) {
                sendOptions.jsonFilter = {
                    filter: {
                        $and: [sendOptions.jsonFilter, extraFilter],
                    },
                };
            } else {
                sendOptions.jsonFilter = {
                    filter: extraFilter,
                };
            }
        }

        core.createTask('codeholders/makeAddressLabels', sendOptions, settings)
            .runOnceAndDrop()
            .then(onSuccess).catch(err => {
                console.error(err); // eslint-disable-line no-console
                setResultOpen(true);
            }).then(() => setLoading(false));
    };

    return (
        <div class="codeholders-addr-label-gen">
            <div class="addr-label-gen-desc">
                {locale.addrLabelGen.description}
            </div>
            {lvIsCursed ? <div class="cursed-notice">
                {locale.addrLabelGen.cursedNotice}
            </div> : null}
            <div class="addr-label-gen-inner">
                <GenPreview value={settings} options={options} />
                <GenSettings
                    value={settings}
                    onChange={setSettings}
                    view={view}
                    onViewChange={setView} />
            </div>
            <div class="addr-label-gen-request-settings">
                <Checkbox
                    id="addr-label-gen-filter-invalid"
                    checked={filterInvalid}
                    onChange={setFilterInvalid} />
                {' '}
                <label for="addr-label-gen-filter-invalid">
                    {locale.addrLabelGen.filterInvalidAddresses}
                </label>
            </div>
            <footer class="addr-label-gen-footer">
                <span class="phantom" />
                <Button raised class="generate-btn" onClick={sendRequest} disabled={isLoading}>
                    {locale.addrLabelGen.generate}
                </Button>
            </footer>
            <Dialog
                backdrop
                open={!!resultOpen}
                onClose={() => setResultOpen(false)}
                actions={[
                    {
                        label: locale.addrLabelGen.closeDialog,
                        action: () => setResultOpen(false),
                    },
                ]}>
                {locale.addrLabelGen.genericError}
            </Dialog>
        </div>
    );
}

/* eslint-disable react/display-name */

const ValCheckbox = ({ value, onChange }) => <Checkbox checked={value} onChange={onChange} />;
const boundedNumber = (min, max, step, unit) => ({ value, onChange }) => {
    const [editingText, setEditingText] = useState(value);
    const [isFocused, setFocused] = useState(false);

    return (
        <TextField
            type="number"
            class={unit === 'mm' ? 'is-mm' : ''}
            step={step}
            trailing={unit}
            min={min}
            max={max}
            value={isFocused ? editingText : +value.toFixed(1)}
            onChange={v => {
                setEditingText(v);
                if (Number.isFinite(+v)) onChange(+v);
            }}
            onFocus={() => {
                setFocused(true);
                setEditingText(+value.toFixed(1));
            }}
            onBlur={() => setImmediate(() => {
                setFocused(false);
                let value = parseFloat(editingText);
                if (!Number.isFinite(value)) value = 0;

                const bounded = Math.max(min, Math.min(value, max));
                onChange(bounded);
                setEditingText(bounded);
            })} />
    );
};

function UnitSwitch ({ value, onChange }) {
    return (
        <div class="unit-switch">
            <Segmented
                selected={value.unit}
                onSelect={unit => onChange({ ...value, unit })}>
                {[
                    { id: 'pt', label: 'pt' },
                    { id: 'mm', label: 'mm' },
                ]}
            </Segmented>
        </div>
    );
}

const U16PtEditorRaw = boundedNumber(0, 65535, 1, 'pt');
const ptToIn = pt => pt / 72;
const ptFromIn = i => i * 72;
const ptToMm = pt => ptToIn(pt) * 25.4;
const ptFromMm = mm => ptFromIn(mm / 25.4);
const U16MmEditorRaw = boundedNumber(ptToMm(0), ptToMm(65535), 0.1, 'mm');

function U16PtEditor ({ value, onChange, view }) {
    if (view.unit === 'pt') return <U16PtEditorRaw value={Math.round(value)} onChange={onChange} />;
    else if (view.unit === 'mm') {
        const projectedValue = ptToMm(value);
        const projectedOnChange = v => onChange(ptFromMm(v));
        return <U16MmEditorRaw value={projectedValue} onChange={projectedOnChange} />;
    }
    return '??';
}

const SETTINGS = {
    language: ({ value, onChange }) => (
        <Select
            value={value}
            onChange={onChange}
            items={Object.entries(locale.csvOptions.countryLocales)
                .map(([id, label]) => ({ value: id, label }))} />
    ),
    latin: ValCheckbox,
    includeCode: ValCheckbox,
    paper: ({ value, onChange }) => (
        <Select
            value={value}
            onChange={onChange}
            items={Object.entries(locale.addrLabelGen.paperSizes)
                .map(([id, label]) => ({ value: id, label }))} />
    ),
    _unitSwitch: UnitSwitch,
    margins: MarginsEditor,
    cols: boundedNumber(1, 20, 1),
    rows: boundedNumber(1, 50, 1),
    colGap: U16PtEditor,
    rowGap: U16PtEditor,
    cellPadding: U16PtEditor,
    fontSize: boundedNumber(8, 30, 1, 'pt'),
    drawOutline: ValCheckbox,
};
const CLIENT_FIELDS = ['language', 'latin', 'includeCode', '_unitSwitch'];

function GenSettings ({ value, onChange, view, onViewChange }) {
    const items = Object.entries(SETTINGS).map(([id, Editor]) => {
        if (id.startsWith('_')) {
            return (
                <div class="settings-item" key={id} data-id={id}>
                    <Editor value={view} onChange={onViewChange} />
                </div>
            );
        }
        return (
            <div class="settings-item" key={id} data-id={id}>
                <label class="item-label">{locale.addrLabelGen.labels[id]}</label>
                <Editor
                    value={value[id]}
                    onChange={v => onChange({ ...value, [id]: v })}
                    view={view} />
            </div>
        );
    });

    return (
        <div class="gen-settings">
            <GenPresets value={value} onChange={onChange} />
            {items}
        </div>
    );
}

const PresetPicker = connectPerms(function PresetPicker ({ open, onClose, core, onLoad, perms }) {
    const canDelete = perms.hasPerm('address_label_templates.delete');

    return (
        <Dialog
            backdrop
            open={open}
            onClose={onClose}
            title={locale.addrLabelGen.presets.pick}
            class="address-label-preset-picker">
            <DataList
                onLoad={(offset, limit) => core.createTask('codeholders/listAddrLabelPresets', {}, {
                    offset,
                    limit,
                }).runOnceAndDrop()}
                renderItem={item => (
                    <div class="preset-item">
                        {item.name}
                    </div>
                )}
                onItemClick={item => onLoad(item)}
                onRemove={canDelete
                    ? (item => core.createTask('codeholders/deleteAddrLabelPreset', { id: item.id }).runOnceAndDrop())
                    : null}
                emptyLabel={locale.addrLabelGen.presets.empty} />
        </Dialog>
    );
});


const GenPresets = connectPerms(function GenPresets ({ value, onChange, perms }) {
    const [loadedPreset, setLoadedPreset] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    if (!perms.hasPerm('address_label_templates.read')) return null;

    let loaded;
    if (loadedPreset) {
        loaded = (
            <span class="loaded-preset">
                <Button icon small class="preset-unlink-button" onClick={() => {
                    setLoadedPreset(null);
                }}>
                    <RemoveIcon style={{ verticalAlign: 'middle' }} />
                </Button>
                <span class="preset-name">{loadedPreset.name}</span>
            </span>
        );
    }

    const canSavePreset = loadedPreset
        ? perms.hasPerm('address_label_templates.update')
        : perms.hasPerm('address_label_templates.create');

    const load = preset => {
        setLoadedPreset(preset);
        setPickerOpen(false);
        const newValue = { ...value };
        for (const k in preset) if (k in newValue) newValue[k] = preset[k];
        onChange(newValue);
    };

    const store = core => {
        const apiValue = {};
        for (const k in value) {
            if (!CLIENT_FIELDS.includes(k)) apiValue[k] = value[k];
        }

        let task;
        if (loadedPreset) {
            task = core.createTask('codeholders/updateAddrLabelPreset', { id: loadedPreset.id }, {
                name: loadedPreset.name,
                ...apiValue,
            });
        } else {
            task = core.createTask('codeholders/createAddrLabelPreset', {}, {
                name: '',
                ...apiValue,
            });
        }
        task.on('success', id => {
            setLoadedPreset({ id, ...task.parameters });
        });
    };

    return (
        <coreContext.Consumer>{core => (
            <div class="gen-presets">
                <div class="presets-title">
                    {loaded
                        ? locale.addrLabelGen.presets.titleLoaded
                        : locale.addrLabelGen.presets.title}
                </div>
                <div class="presets-inner">
                    {loaded ? loaded : (
                        <Button
                            class="load-preset"
                            onClick={() => setPickerOpen(true)}>
                            {locale.addrLabelGen.presets.load}
                        </Button>
                    )}
                    {canSavePreset ? <Button
                        class="store-preset"
                        onClick={() => store(core)}>
                        {loaded
                            ? locale.addrLabelGen.presets.update.menuItem
                            : locale.addrLabelGen.presets.create.menuItem}
                    </Button> : null}

                    <PresetPicker
                        open={pickerOpen}
                        onClose={() => setPickerOpen(false)}
                        onLoad={load}
                        core={core} />
                </div>
            </div>
        )}</coreContext.Consumer>
    );
});

function MarginsEditor ({ value, onChange, view }) {
    return (
        <div class="margins">
            <div class="margins-line">
                <U16PtEditor value={value.top} onChange={v => onChange({ ...value, top: v })} view={view} />
            </div>
            <div class="margins-line is-line-two">
                <U16PtEditor value={value.left} onChange={v => onChange({ ...value, left: v })} view={view} />
                <U16PtEditor value={value.right} onChange={v => onChange({ ...value, right: v })} view={view} />
            </div>
            <div class="margins-line">
                <U16PtEditor value={value.bottom} onChange={v => onChange({ ...value, bottom: v })} view={view} />
            </div>
        </div>
    );
}

// From: https://github.com/foliojs/pdfkit/blob/
// b13423bf0a391ed1c33a2e277bc06c00cabd6bf9/lib/page.coffee#L72-L122
const PAGE_SIZES = {
    A3: [841.89, 1190.55],
    A4: [595.28, 841.89],
    A5: [419.53, 595.28],
    LETTER: [612.00, 792.00],
    LEGAL: [612.00, 1008.00],
    FOLIO: [612.00, 936.00],
    EXECUTIVE: [521.86, 756.00],
};

function GenPreview ({ value, options }) {
    const [width, height] = PAGE_SIZES[value.paper];
    const viewBox = `0 0 ${width} ${height}`;

    const items = [];
    const itemWidth = (width - value.margins.left - value.margins.right
        - (value.cols - 1) * value.colGap) / value.cols;
    const itemHeight = (height - value.margins.top - value.margins.bottom
        - (value.rows - 1) * value.rowGap) / value.rows;
    for (let y = 0; y < value.rows; y++) {
        for (let x = 0; x < value.cols; x++) {
            const posX = value.margins.left + x * (value.colGap + itemWidth);
            const posY = value.margins.top + y * (value.rowGap + itemHeight);
            const key = `${posX}-${posY}`;

            items.push(
                <rect
                    key={key + 'r'}
                    x={posX}
                    y={posY}
                    width={itemWidth}
                    height={itemHeight}
                    stroke-width="3" // eslint-disable-line react/no-unknown-property
                    stroke-dasharray="20" // eslint-disable-line react/no-unknown-property
                    stroke="#ddd"
                    fill="none" />
            );

            items.push(
                <rect
                    key={key + 'ri'}
                    x={posX + value.cellPadding}
                    y={posY + value.cellPadding}
                    width={itemWidth - 2 * value.cellPadding}
                    height={itemHeight - 2 * value.cellPadding}
                    stroke-width="3" // eslint-disable-line react/no-unknown-property
                    stroke-dasharray={value.drawOutline ? null : '10'} // eslint-disable-line react/no-unknown-property
                    stroke={value.drawOutline ? '#000' : '#999'}
                    fill="none" />
            );

            const lines = [[4, 1], [9, 0], [7, 0], [4, 0], [5, 0]];

            if (!value.includeCode) {
                lines.shift(); // remove first line
            }

            const lineHeight = value.fontSize;
            const lineSpacing = Math.max(-lineHeight, Math.min(
                lineHeight / 2,
                (itemHeight - 2 * value.cellPadding
                    - lines.length * lineHeight) / (lines.length - 1)
            ));

            let dy = 0;
            for (const [lineLength, lineAlignment] of lines) {
                let x;
                const width = Math.min(itemWidth - 2 * value.cellPadding, lineHeight * lineLength);
                if (lineAlignment === 0) {
                    x = posX + value.cellPadding;
                } else {
                    x = posX + itemWidth - value.cellPadding - width;
                }

                items.push(
                    <rect
                        key={key + 'rl' + dy}
                        x={x}
                        y={posY + value.cellPadding + dy * (lineSpacing + lineHeight)}
                        width={width}
                        height={lineHeight}
                        fill="#000"
                        rx={lineHeight / 2} />
                );
                dy++;
            }
        }
    }

    return (
        <div class="gen-preview">
            <svg class="gen-preview-inner" viewBox={viewBox}>
                {items}
            </svg>
            <AddrLabelStats value={value} options={options} />
        </div>
    );
}

class AddrLabelStats extends PureComponent {
    state = {
        withAddresses: null,
        total: null,
        actualTotal: null,
    };

    static contextType = coreContext;

    updateMembersWithAddresses () {
        if (this.loadingMembers) return;
        this.loadingMembers = true;

        const options = { ...this.props.options };
        const addressFilter = { 'addressLatin.city': { $neq: null } };
        const jsonFilter = { ...(options.jsonFilter && options.jsonFilter.filter || {}) };
        options.jsonFilter = {
            filter: options.jsonFilter && !options.jsonFilter._disabled
                ? { $and: [jsonFilter, addressFilter] }
                : addressFilter,
        };
        options.offset = 0;
        options.limit = 1;

        let promise;
        let maxTotal = Infinity;
        if (options.snapshot) {
            promise = this.context.createTask('magazines/snapshotCodeholders', {
                magazine: options.snapshot.magazine,
                edition: options.snapshot.edition,
                id: options.snapshot.id,
                compare: options.snapshotCompare,
                idsOnly: true,
            }).runOnceAndDrop().then(({ total, items }) => {
                this.setState({ actualTotal: total });

                options.jsonFilter = {
                    filter: {
                        $and: [
                            options.jsonFilter.filter,
                            { id: { $in: items } },
                        ],
                    },
                };

                maxTotal = total;
            });
        } else {
            promise = Promise.resolve();
        }

        promise.then(() => {
            return this.context.createTask('codeholders/list', {}, options).runOnceAndDrop();
        }).then(({ total }) => {
            this.setState({ withAddresses: total });
        }).then(() => {
            const options = { ...this.props.options };
            options.offset = 0;
            options.limit = 1;
            return this.context.createTask('codeholders/list', {}, options).runOnceAndDrop();
        }).then(({ total }) => {
            total = Math.min(maxTotal, total);
            this.setState({ total });
        }).catch(err => {
            console.error(err); // eslint-disable-line no-console
            this.reloadTimeout = setTimeout(() => this.updateMembersWithAddresses(), 1000);
        }).then(() => this.loadingMembers = false);
    }

    componentDidMount () {
        // do this a bit later so the url query filter can be decoded first
        // as we might get incongruent data otherwise
        setImmediate(() => this.updateMembersWithAddresses());
    }

    componentWillUnmount () {
        clearTimeout(this.reloadTimeout);
    }

    render () {
        if (this.state.total === null) return;
        const { value } = this.props;
        const { total, withAddresses } = this.state;
        return (
            <div class="stats">
                {locale.addrLabelGen.stats({
                    total,
                    withAddresses,
                    perPage: value.rows * value.cols,
                    pages: Math.ceil(withAddresses / (value.rows * value.cols)),
                })}
                {(this.state.total < this.state.actualTotal) ? (
                    <div>
                        <br />
                        {locale.addrLabelGen.statsFiltered({
                            filtered: this.state.total,
                            total: this.state.actualTotal,
                        })}
                    </div>
                ) : null}
            </div>
        );
    }
}
