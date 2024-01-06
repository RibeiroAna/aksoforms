import { h } from 'preact';
import { Button } from 'yamdl';
import RemoveIcon from '@material-ui/icons/Remove';
import MdField from '../../../../components/controls/md-field';
import { country } from '../../../../components/data';
import CodeholderPicker from '../../../../components/pickers/codeholder-picker';
import RearrangingList from '../../../../components/lists/rearranging-list';
import { IdUEACode } from '../../../../components/data/uea-code';
import { Link } from '../../../../router';
import { intermediaries as locale } from '../../../../locale';
import './fields.less';

export const FIELDS = {
    countryCode: {
        sortable: true,
        slot: 'title',
        weight: 0.5,
        wantsCreationLabel: true,
        component ({ value, onChange, slot }) {
            if (slot === 'create') {
                return <country.editor value={value} onChange={onChange} />;
            }
            return <country.renderer value={value} />;
        },
    },
    codeholders: {
        slot: 'body',
        weight: 1,
        wantsCreationLabel: true,
        component ({ value, editing, onChange, slot }) {
            value = value || [];

            const items = [];
            for (let i = 0; i < value.length; i++) {
                const index = i;
                const { codeholderId, paymentDescription } = value[index];

                if (editing || slot === 'detail') {
                    const removeItem = () => {
                        const newValue = value.slice();
                        newValue.splice(index, 1);
                        onChange(newValue);
                    };
                    const onPaymentDescChange = (paymentDescription) => {
                        const newValue = value.slice();
                        newValue[index] = { ...value[index], paymentDescription };
                        onChange(newValue);
                    };

                    items.push(
                        <div class="inner-codeholder-item" key={codeholderId}>
                            <div class="inner-header">
                                {editing && (
                                    <Button icon small onClick={removeItem}>
                                        <RemoveIcon style={{ verticalAlign: 'middle' }} />
                                    </Button>
                                )}
                                <Link class="intermediary-codeholder-link" outOfTree target={`/membroj/${codeholderId}`}>
                                    <IdUEACode id={codeholderId} />
                                </Link>
                            </div>
                            {(paymentDescription || editing) ? (
                                <div class="inner-field-label">
                                    {locale.fields.paymentDescription}
                                </div>
                            ) : null}
                            {(paymentDescription || editing) ? (
                                <div class="inner-payment-desc">
                                    <PaymentDescription
                                        value={paymentDescription}
                                        editing={editing}
                                        onChange={onPaymentDescChange} />
                                </div>
                            ) : null}
                        </div>
                    );
                } else {
                    items.push(
                        <span class="inner-compact-codeholder-item">
                            <IdUEACode key={codeholderId} id={codeholderId} />
                        </span>
                    );
                }
            }

            if (editing) {
                items.push(
                    <div class="inner-add" key="_add">
                        <CodeholderPicker
                            value={[]}
                            onChange={v => {
                                if (v.length) {
                                    const codeholderId = +v[0];
                                    onChange(value.concat([
                                        {
                                            codeholderId,
                                            paymentDescription: null,
                                        },
                                    ]));
                                }
                            }}
                            limit={1} />
                    </div>
                );
            }

            if (editing) {
                const onMove = (fromPos, toPos) => {
                    const newValue = value.slice();
                    newValue.splice(toPos, 0, newValue.splice(fromPos, 1)[0]);
                    onChange(newValue);
                };

                return (
                    <RearrangingList
                        class="intermediary-field-codeholders"
                        isItemDraggable={i => i < value.length}
                        canMove={toPos => toPos < value.length}
                        onMove={onMove}>
                        {items}
                    </RearrangingList>
                );
            }

            return (
                <div class="intermediary-field-codeholders">
                    {items}
                </div>
            );
        },
    },
};

function PaymentDescription ({ value, editing, onChange }) {
    return (
        <MdField
            ignoreLiveUpdates
            rules={['emphasis', 'strikethrough', 'link', 'list', 'table']}
            value={value || ''}
            editing={editing}
            onChange={v => onChange(v || null)} />
    );
}
