import { h, Component } from 'preact';
import { useState } from 'preact/compat';
import { Button, Dialog } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';
import SearchIcon from '@material-ui/icons/Search';
import StaticOverviewList from '../lists/overview-list-static';
import { ueaCode } from '../data';
import { coreContext } from '../../core/connection';
import { codeholders as locale } from '../../locale';
import FIELDS from '../../features/pages/codeholders/table-fields'; // FIXME: dont ximport
import './codeholder-picker.less';

const REDUCED_FIELD_IDS = ['type', 'code', 'name'];
const REDUCED_FIELDS = Object.fromEntries(REDUCED_FIELD_IDS.map(id => [id, FIELDS[id]]));

/**
 * Picks a codeholder and displays their UEA code.
 *
 * # Props
 * - value/onChange
 * - limit: if set, will limit number of selectable codeholders
 * - disabled
 * - jsonFilter
 */
export default class CodeholderPicker extends Component {
    state = {
        addDialogOpen: false,
        // cached id -> uea code mappings
        codeCache: {},
    };

    static contextType = coreContext;

    componentDidMount () {
        for (const id of this.props.value) this.loadCodeForId(id);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value) {
            for (const id of this.props.value) this.loadCodeForId(id);
        }
    }

    loadCodeForId (id) {
        if (this.state.codeCache[id]) return;
        return new Promise((resolve, reject) => {
            const view = this.context.createDataView('codeholders/codeholder', {
                id,
                fields: ['code'],
                lazyFetch: true,
            });
            view.on('update', () => {
                // HACK: mutate object directly to avoid lost updates
                const codeCache = this.state.codeCache;
                if (!view.data.code) return; // try again...
                codeCache[id] = view.data.code.new;
                this.setState({ codeCache });
                view.drop();
                resolve();
            });
            view.on('error', () => {
                view.drop();
                reject();
            });
        });
    }

    open () {
        this.setState({ addDialogOpen: true });
    }

    render ({ value, onChange, limit, disabled, jsonFilter }, { addDialogOpen }) {
        const canAddMore = !this.props.limit || value.length < this.props.limit;

        return (
            <div class={'codeholder-picker' + (disabled ? ' is-disabled' : '')} data-limit={limit}>
                <div class="selected-codeholders">
                    {value.map(id => (
                        <div class="codeholder-item" key={id}>
                            <Button
                                disabled={disabled}
                                class="remove-button"
                                icon
                                small
                                onClick={e => {
                                    e.stopPropagation();
                                    const value = this.props.value.slice();
                                    value.splice(value.indexOf(id), 1);
                                    onChange(value);
                                }}>
                                <RemoveIcon />
                            </Button>
                            {this.state.codeCache[id]
                                ? <ueaCode.inlineRenderer value={this.state.codeCache[id]} />
                                : `(${id})`}
                        </div>
                    ))}
                    {(!value.length && this.props.limit !== 1) && (
                        <span class="selected-empty">
                            {locale.picker.none}
                        </span>
                    )}

                    {canAddMore ? (
                        <Button
                            disabled={disabled}
                            class="add-button"
                            small
                            icon
                            onClick={e => {
                                e.stopPropagation();
                                this.open();
                            }}>
                            <AddIcon style={{ verticalAlign: 'middle' }} />
                        </Button>
                    ) : null}

                    <PickerDialog
                        limit={this.props.limit}
                        open={canAddMore && addDialogOpen}
                        filter={jsonFilter}
                        value={value}
                        onChange={onChange}
                        onClose={() => this.setState({ addDialogOpen: false })} />
                </div>
            </div>
        );
    }
}

export function PickerDialog ({ value, onChange, limit, open, onClose, filter, ...extra }) {
    return (
        <Dialog
            class="codeholder-picker-add-dialog"
            backdrop
            fullScreen={width => width < 600}
            title={limit === 1 ? locale.picker.addOne : locale.picker.add}
            open={open}
            onClose={onClose}
            actions={onClose && [{ label: locale.picker.done, action: onClose }]}
            {...extra}>
            <AddDialogInner
                value={value}
                onChange={onChange}
                onClose={onClose}
                filter={filter}
                limit={this.props.limit} />
        </Dialog>
    );
}

function AddDialogInner ({ value, onChange, limit, onClose, filter }) {
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState('');

    const selection = {
        add: id => {
            if (value.includes('' + id)) return;
            onChange(value.concat(['' + id]));
            if (value.length + 1 >= limit) onClose();
        },
        has: id => value.includes('' + id),
        delete: id => {
            if (!value.includes('' + id)) return;
            const newValue = value.slice();
            newValue.splice(value.indexOf('' + id), 1);
            onChange(newValue);
        },
    };

    return (
        <div>
            <div class="codeholder-picker-search">
                <div class="search-icon-container">
                    <SearchIcon />
                </div>
                <input
                    class="search-inner"
                    placeholder={locale.picker.search}
                    value={search}
                    onChange={e => setSearch(e.target.value)} />
            </div>
            <StaticOverviewList
                compact
                task="codeholders/list"
                view="codeholders/codeholder"
                search={{ field: 'nameOrCode', query: search }}
                jsonFilter={filter}
                fields={REDUCED_FIELDS}
                sorting={{ code: 'asc' }}
                offset={offset}
                onSetOffset={setOffset}
                selection={limit === 1 ? null : selection}
                onItemClick={id => {
                    if (value.includes('' + id)) {
                        selection.delete(id);
                    } else {
                        selection.add(id);
                    }
                }}
                limit={10}
                locale={locale.fields} />
        </div>
    );
}
