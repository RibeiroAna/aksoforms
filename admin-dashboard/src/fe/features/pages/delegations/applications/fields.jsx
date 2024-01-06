import { h } from 'preact';
import { Button } from 'yamdl';
import { FIELDS as DELEGATE_FIELDS } from '../delegates/fields';
import TextArea from '../../../../components/controls/text-area';
import DiffAuthor from '../../../../components/diff-author';
import { timestamp } from '../../../../components/data';
import { delegationApplications as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';

const readOnly = field => ({
    ...field,
    component ({ slot, editing, ...rest }) {
        if (slot !== 'create') editing = false;
        return <field.component slot={slot} editing={editing} {...rest} />;
    },
});

const notesField = {
    wantsCreationLabel: true,
    component ({ value, editing, onChange }) {
        if (editing) {
            return <TextArea value={value} onChange={onChange} />;
        }
        return (
            <div class="delegation-application-notes-field">
                {(value || '').split('\n').map((x, i) => <div key={i}>{x}</div>)}
            </div>
        );
    },
};

export const FIELDS = {
    status: {
        sortable: true,
        component ({ value, item, slot }) {
            return (
                <div class="delegation-application-status">
                    {locale.status[value]}
                    {(slot === 'detail' && item.statusBy) ? (
                        <div class="status-by">
                            {locale.status.changedBy}: <DiffAuthor author={item.statusBy} interactive />
                        </div>
                    ) : null}
                    {(slot === 'detail' && item.statusTime) ? (
                        <div class="status-time">
                            {locale.status.time}: <timestamp.renderer value={item.statusTime} />
                        </div>
                    ) : null}
                    {(slot === 'detail' && value === 'pending') ? (
                        <coreContext.Consumer>
                            {core => (
                                <div class="status-pending">
                                    <Button onClick={() => core.createTask('delegations/approveApplication', { id: item.id }, item)}>
                                        {locale.status.approve}
                                    </Button>
                                    <Button danger onClick={() => core.createTask('delegations/denyApplication', { id: item.id })}>
                                        {locale.status.deny}
                                    </Button>
                                </div>
                            )}
                        </coreContext.Consumer>
                    ) : null}
                </div>
            );
        },
        shouldHide: (_, editing) => editing,
    },
    org: DELEGATE_FIELDS.org,
    codeholderId: DELEGATE_FIELDS.codeholderId,
    subjects: readOnly(DELEGATE_FIELDS.subjects),
    cities: readOnly(DELEGATE_FIELDS.cities),
    hosting: readOnly(DELEGATE_FIELDS.hosting),
    tos: readOnly(DELEGATE_FIELDS.tos),
    applicantNotes: notesField,
    internalNotes: notesField,
};
