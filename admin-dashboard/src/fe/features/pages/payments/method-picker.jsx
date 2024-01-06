import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, MenuIcon, Dialog, Ripple } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import { coreContext } from '../../../core/connection';
import { paymentOrgs as orgLocale, paymentMethods as methodLocale } from '../../../locale';
import { FIELDS as ORG_FIELDS } from './orgs/fields';
import { FIELDS as METHOD_FIELDS } from './orgs/methods/fields';
import StaticOverviewList from '../../../components/lists/overview-list-static';
import OverviewListItem from '../../../components/lists/overview-list-item';
import DynamicHeightDiv from '../../../components/layout/dynamic-height-div';
import './method-picker.less';

const METHOD_FIELD_IDS = [{ id: 'type' }, { id: 'name' }, { id: 'internalDescription' }];
const REDUCED_METHOD_FIELDS = Object.fromEntries(METHOD_FIELD_IDS
    .map(({ id }) => [id, METHOD_FIELDS[id]]));

/**
 * Picker for payment methods.
 *
 * # Props
 * - value/onChange
 * - org/onOrgChange
 * - onGetCurrencies
 * - type: 'any' | 'manual' | 'intermediary'
 * - disabled
 */
export default class PaymentMethodPicker extends PureComponent {
    state = {
        pickerOpen: false,
        orgOffset: 0,
        methodOffset: 0,
    };

    static contextType = coreContext;

    #open = () => {
        this.setState({ pickerOpen: true });
    };

    #ripple = null;

    #onPointerDown = e => {
        if (!this.#ripple) return;
        this.#ripple.onPointerDown(e);
    };

    render ({
        value,
        onChange,
        org,
        onOrgChange,
        onGetCurrencies,
        type,
        disabled,
    }, { pickerOpen, orgOffset, methodOffset }) {
        let contents, orgItem;

        if (org && value) {
            contents = (
                <div class="picker-content-wrapper">
                    <Button
                        disabled={disabled}
                        class="remove-button"
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => {
                            e.stopPropagation();
                            onOrgChange(null);
                            onChange(null);
                        }}>
                        <MenuIcon type="close" />
                    </Button>
                    <OverviewListItem
                        disabled={disabled}
                        doFetch compact view="payments/method"
                        skipAnimation
                        id={value}
                        key={`${org}-${value}`}
                        options={{ org }}
                        selectedFields={METHOD_FIELD_IDS}
                        fields={REDUCED_METHOD_FIELDS}
                        index={0}
                        locale={methodLocale.fields}
                        onData={method => {
                            if (method.currencies) {
                                onGetCurrencies && onGetCurrencies(method.currencies);
                            }
                            if (this.props.onItemData) this.props.onItemData(method);
                        }} />
                </div>
            );
        } else {
            contents = (
                <div class="picker-placeholder-content">
                    <AddIcon />
                </div>
            );
        }

        if (org) {
            const orgFields = ['org', 'name'].map(f => ({ id: f }));

            orgItem = (
                <div class="picker-chosen-org">
                    <div class="picker-back-container">
                        <Button icon onClick={() => onOrgChange(null)}>
                            <MenuIcon type="back" />
                        </Button>
                    </div>
                    <OverviewListItem
                        doFetch compact view="payments/org"
                        id={org}
                        selectedFields={orgFields}
                        fields={ORG_FIELDS}
                        index={0}
                        locale={orgLocale.fields}
                        skipAnimation />
                </div>
            );
        }

        return (
            <span
                class="payment-method-picker"
                onPointerDown={this.#onPointerDown}
                onClick={this.#open}>
                <Ripple ref={ripple => this.#ripple = ripple} />
                <DynamicHeightDiv useFirstHeight lazy>
                    {contents}
                </DynamicHeightDiv>
                <Dialog
                    class="payment-method-picker-dialog"
                    backdrop
                    title={methodLocale.methodPicker.title}
                    fullScreen={width => width < 400}
                    open={pickerOpen}
                    onClose={() => this.setState({ pickerOpen: false })}>
                    <DynamicHeightDiv class="picker-org-item-container">
                        {orgItem}
                    </DynamicHeightDiv>
                    <StaticOverviewList
                        task={org ? 'payments/listMethods' : 'payments/listOrgs'}
                        options={org ? { org } : null}
                        view={org ? 'payments/method' : 'payments/org'}
                        viewOptions={org ? { org } : null}
                        fields={org ? REDUCED_METHOD_FIELDS : ORG_FIELDS}
                        sorting={{ name: 'asc' }}
                        offset={org ? methodOffset : orgOffset}
                        onSetOffset={offset => {
                            if (org) this.setState({ methodOffset: offset });
                            else this.setState({ orgOffset: offset });
                        }}
                        limit={10}
                        jsonFilter={org
                            ? (type === 'any' ? {} : { type })
                            : null}
                        locale={org ? methodLocale.fields : orgLocale.fields}
                        onItemClick={id => {
                            if (!org) {
                                if (org !== id) {
                                    onOrgChange(id);
                                    this.setState({ methodOffset: 0 });
                                }
                            } else {
                                onChange(id);
                                this.setState({ pickerOpen: false });
                            }
                        }}
                        emptyLabel={org
                            ? methodLocale.methodPicker.empty[type]
                            : methodLocale.methodPicker.orgsEmpty}
                        compact />
                </Dialog>
            </span>
        );
    }
}
