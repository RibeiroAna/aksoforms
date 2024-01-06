import { h } from 'preact';
import { Button, TextField } from 'yamdl';
import { CopyIcon } from '../../../../components/icons';
import { apiKey, email } from '../../../../components/data';
import { clients as locale } from '../../../../locale';

export const FIELDS = {
    name: {
        sortable: true,
        slot: 'title',
        component ({ value, editing, onChange, slot }) {
            if (editing) {
                return (
                    <TextField
                        required
                        outline
                        label={slot === 'create' ? locale.fields.name : null}
                        value={value}
                        onChange={onChange} />
                );
            }

            if (slot === 'title') return <b>{value}</b>;
            return value;
        },
        shouldHide: (_, editing) => !editing,
        stringify: v => v,
    },
    apiKey: {
        sortable: true,
        skipLabel: true,
        component ({ value, slot }) {
            if (slot === 'detail') {
                return (
                    <div class="api-key-container">
                        <apiKey.renderer value={value} />

                        {navigator.clipboard && navigator.clipboard.writeText ? (
                            <Button class="api-key-copy-button" icon small onClick={() => {
                                const valueString = Buffer.from(value).toString('hex');
                                navigator.clipboard.writeText(valueString).catch(console.error); // eslint-disable-line no-console
                                // TODO: create toast
                            }}>
                                <CopyIcon style={{ verticalAlign: 'middle' }} />
                            </Button>
                        ) : null}
                    </div>
                );
            }
            return <apiKey.inlineRenderer value={value} />;
        },
        shouldHide: (_, editing) => editing,
        stringify: v => Buffer.from(v).toString('hex'),
    },
    ownerName: {
        sortable: true,
        component ({ value, onChange, editing, slot }) {
            if (!editing) return value;
            return (
                <TextField
                    required
                    outline
                    label={slot === 'create' ? locale.fields.ownerName : null}
                    value={value}
                    onChange={onChange} />
            );
        },
        stringify: v => v,
    },
    ownerEmail: {
        sortable: true,
        component ({ value, onChange, editing, slot }) {
            if (!editing) {
                if (slot === 'detail') return <email.renderer value={value} />;
                return <email.inlineRenderer value={value} />;
            }
            return (
                <TextField
                    required
                    outline
                    label={slot === 'create' ? locale.fields.ownerEmail : null}
                    type="email"
                    value={value}
                    onChange={onChange} />
            );
        },
        stringify: v => v,
    },
};

