import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import InfoIcon from '@material-ui/icons/Info';
import ScriptItem from '../../../../components/form-editor/script-item';
import Select from '../../../../components/controls/select';
import MdField from '../../../../components/controls/md-field';
import { RefNameView } from '../../../../components/form-editor/script-views';
import { membershipOptions as locale } from '../../../../locale';
import './price.less';

export default class OfferPrice extends PureComponent {
    state = {
        editingScript: false,
    };

    render ({ value, editing, onChange, noDescription, hasCurrencyVar }) {
        if (!value) {
            return (
                <div class="membership-option-price is-none">
                    <div class="none-label">
                        {locale.offers.price.na}
                    </div>
                    {editing && (
                        <Button icon small onClick={() => {
                            if (noDescription) {
                                onChange({ script: {}, var: null });
                            } else {
                                onChange({ description: null, script: {}, var: null });
                            }
                        }}>
                            <AddIcon />
                        </Button>
                    )}
                </div>
            );
        }

        const variables = [];
        if (value.var === null) variables.push({ value: null, label: '—' });
        for (const v in value.script) {
            if (v.startsWith('_')) continue;
            variables.push({
                value: v,
                label: v, // TODO: use fancy icons
            });
        }

        const prevNodes = [
            {
                defs: {},
                formVars: [
                    // TODO: what to do with these values?
                    { name: 'age', type: 'n', value: 25 },
                    { name: 'agePrimo', type: 'n', value: 24 },
                    { name: 'birthdate', type: 's', value: '1999-04-21' },
                    { name: 'feeCountry', type: 's', value: 'nl' },
                    { name: 'feeCountryGroups', type: 'm', value: ['x01'] },
                    { name: 'isActiveMember', type: 'b', value: true },
                    hasCurrencyVar && { name: 'currency', type: 's', value: 'EUR' },
                ].filter(x => x),
            },
        ];

        return (
            <div class="membership-option-price">
                <div class="offer-price-title">
                    <span class="title-contents">
                        {locale.offers.price.title}
                    </span>
                    {editing && (
                        <Button class="remove-button" onClick={() => onChange(null)}>
                            {locale.offers.price.remove}
                        </Button>
                    )}
                </div>
                <ScriptItem
                    previousNodes={prevNodes}
                    editable={editing}
                    editing={this.state.editingScript}
                    onEditingChange={editingScript => this.setState({ editingScript })}
                    item={value}
                    onChange={onChange} />
                <div class="price-variable">
                    <span class="price-var-label">{locale.offers.price.varLabel}:</span>
                    <div class="price-var-contents">
                        {!editing ? (
                            <RefNameView name={value.var} />
                        ) : (
                            <Select
                                value={value.var}
                                onChange={v => onChange({ ...value, var: v })}
                                items={variables} />
                        )}
                    </div>
                </div>
                {editing && (
                    <div class="price-variable-info">
                        <InfoIcon className="info-icon" />
                        <span class="info-text">{locale.offers.price.info}</span>
                    </div>
                )}
                <div class="price-variable-info">
                    <InfoIcon className="info-icon" />
                    <span class="info-text">{locale.offers.price.info100}</span>
                </div>
                {!noDescription && (
                    <div class="price-description-label">
                        {locale.offers.price.description}
                    </div>
                )}
                {!noDescription && (
                    <MdField
                        class="offer-price-description"
                        value={value.description}
                        editing={editing}
                        onChange={description => onChange({ ...value, description: description || null })}
                        rules={['emphasis', 'strikethrough']} />
                )}
            </div>
        );
    }
}
