import { h } from 'preact';
import { PureComponent, useState } from 'preact/compat';
import { Dialog } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CloseIcon from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import DetailShell from '../../../../components/detail/detail-shell';
import StaticOverviewList from '../../../../components/lists/overview-list-static';
import ItemPicker from '../../../../components/pickers/item-picker-dialog';
import { LinkButton } from '../../../../router';
import { congressLocations as locale } from '../../../../locale';
import { FIELDS } from './locations/fields';
import './location-picker.less';

/**
 * Location picker.
 *
 * # Props
 * - congress, instance: ids
 * - externalOnly: will only show external locations if set
 * - value/onChange: id
 * - editing: editing state
 * - disabled: will disable interaction
 * - adding: if true, will show + instead of "nowhere v" if empty, and the value cannot
 *   be edited without removing it first.
 */
export default class LocationPicker extends PureComponent {
    state = {
        pickerOpen: false,
    };

    render ({ congress, instance, value, editing, onChange, externalOnly, disabled, adding }, { pickerOpen }) {
        let preview;
        if (value) {
            preview = (
                <DetailShell
                    inline
                    view="congresses/location"
                    options={{ congress, instance }}
                    id={value}
                    locale={{}}>
                    {data => (editing || disabled) ? (
                        <div class="picker-selected-inner">
                            {data.type === 'external' ? (
                                <FIELDS.icon.component value={data.icon} />
                            ) : null}
                            <FIELDS.name.component value={data.name} />
                        </div>
                    ) : (
                        <LinkButton
                            target={`/kongresoj/${congress}/okazigoj/${instance}/lokoj/${value}`}
                            class="picker-selected-inner">
                            {data.type === 'external' ? (
                                <FIELDS.icon.component value={data.icon} />
                            ) : null}
                            <FIELDS.name.component value={data.name} />
                        </LinkButton>
                    )}
                </DetailShell>
            );
        } else if (adding) {
            preview = (
                <AddIcon style={{ verticalAlign: 'middle' }} />
            );
        } else {
            preview = locale.locatedWithinNowhere;
        }

        return (
            <div
                class={'congress-location-picker'
                    + (editing ? ' is-editing' : '')
                    + (disabled ? ' is-disabled' : '')}
                tabIndex={editing ? 0 : undefined}
                onClick={() => {
                    if (!disabled && editing && (!value || !adding)) {
                        this.setState({ pickerOpen: true });
                    }
                }}>
                <div class="picker-selected">
                    {preview}
                </div>
                {(editing && value) ? (
                    <div class="clear-button" onClick={e => {
                        e.stopPropagation();
                        onChange(null);
                    }}>
                        <CloseIcon />
                    </div>
                ) : (editing && !adding) ? (
                    <div class="editable-indicator">
                        <ExpandMoreIcon />
                    </div>
                ) : null}

                <Dialog
                    class="congress-location-picker-dialog"
                    backdrop
                    open={pickerOpen}
                    onClose={() => this.setState({ pickerOpen: false })}
                    fullScreen={width => width < 600}
                    title={locale.locationPicker.pick}>
                    <ItemPicker
                        open={pickerOpen}
                        onClose={() => this.setState({ pickerOpen: false })}
                        limit={1}
                        value={value ? [value] : []}
                        onChange={v => {
                            if (v.length) onChange(v[0]);
                            else onChange(null);
                        }}
                        task="congresses/listLocations"
                        view="congresses/location"
                        options={{ congress, instance, externalOnly }}
                        viewOptions={{ congress, instance }}
                        emptyLabel={locale.locationPicker.empty}
                        fields={REDUCED_FIELDS}
                        locale={locale.fields}
                        search={{ field: 'name', placeholder: locale.locationPicker.search }}
                    />
                </Dialog>
            </div>
        );
    }
}

const REDUCED_FIELDS = Object.fromEntries(['name', 'icon', 'description'].map(id => [id, FIELDS[id]]));
