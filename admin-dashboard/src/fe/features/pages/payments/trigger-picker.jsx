import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, Dialog } from 'yamdl';
import AddIcon from '@material-ui/icons/Add';
import {
    paymentIntents as locale,
    membershipEntries as entriesLocale,
    congressParticipants as participantLocale,
} from '../../../locale';
import StaticOverviewList from '../../../components/lists/overview-list-static';
import { FIELDS as ENTRY_FIELDS } from '../memberships/entries/fields';
import { FIELDS as CONGRESS_FIELDS } from '../congresses/fields';
import { FIELDS as INSTANCE_FIELDS } from '../congresses/instances/fields';
import { FIELDS as PARTICIPANT_FIELDS } from '../congresses/instances/participants/fields';
import './trigger-picker.less';

const REDUCED_ENTRY_FIELDS = Object.fromEntries(['id', 'timeSubmitted', 'year', 'codeholderData', 'status'].map(x => ([x, ENTRY_FIELDS[x]])));
const REDUCED_INSTANCE_FIELDS = Object.fromEntries(['humanId', 'name'].map(x => ([x, INSTANCE_FIELDS[x]])));
const REDUCED_PARTICIPANT_FIELDS = Object.fromEntries(['dataId', 'createdTime'].map(x => ([x, PARTICIPANT_FIELDS[x]])));

class RegistrationEntryPicker extends PureComponent {
    state = { offset: 0 };
    render ({ onChange }, { offset }) {
        return (
            <StaticOverviewList
                task="memberships/listEntries"
                view="memberships/entry"
                fields={REDUCED_ENTRY_FIELDS}
                sorting={{ timeSubmitted: 'asc' }}
                offset={offset}
                onSetOffset={offset => this.setState({ offset })}
                limit={10}
                locale={entriesLocale.fields}
                onItemClick={id => onChange(id)}
                emptyLabel={locale.triggerPicker.empty.registration_entry}
                compact />
        );
    }
}

class CongressRegistrationPicker extends PureComponent {
    state = { offset: 0, congress: null, instance: null };
    render ({ onChange }, { offset, congress, instance }) {
        return (
            <StaticOverviewList
                task={instance ? 'congresses/listParticipants' : congress ? 'congresses/listInstances' : 'congresses/list'}
                options={{ congress, instance }}
                viewOptions={{ congress, instance }}
                userData={{}}
                view={instance ? 'congresses/participant' : congress ? 'congresses/instance' : 'congresses/congress'}
                fields={instance ? REDUCED_PARTICIPANT_FIELDS : congress ? REDUCED_INSTANCE_FIELDS : CONGRESS_FIELDS}
                sorting={{ [instance ? 'dataId' : congress ? 'name' : 'name']: 'asc' }}
                offset={offset}
                onSetOffset={offset => this.setState({ offset })}
                limit={10}
                locale={instance ? participantLocale.fields : {}}
                onItemClick={id => {
                    this.setState({ offset: 0 });
                    if (!congress) this.setState({ congress: id });
                    else if (!instance) this.setState({ instance: id });
                    else onChange(id);
                }}
                emptyLabel={locale.triggerPicker.empty.congress_registration}
                compact />
        );
    }
}

const PICKER_TYPES = {
    registration_entry: RegistrationEntryPicker,
    congress_registration: CongressRegistrationPicker,
};

export default class TriggerPicker extends PureComponent {
    state = {
        pickerOpen: false,
    };

    onOpenPicker = () => {
        this.setState({ pickerOpen: true });
    };

    render ({ type, onChange }) {
        if (!PICKER_TYPES[type]) return null;
        const ContentType = PICKER_TYPES[type] || (() => null);

        return (
            <Button icon small class="payment-trigger-picker" onClick={this.onOpenPicker}>
                <AddIcon style={{ verticalAlign: 'middle' }} />
                <Dialog
                    class="payment-trigger-picker-dialog"
                    backdrop
                    title={locale.triggerPicker.titles[type]}
                    open={this.state.pickerOpen}
                    onClose={() => this.setState({ pickerOpen: false })}>
                    <ContentType onChange={id => {
                        onChange(id);
                        this.setState({ pickerOpen: false });
                    }} />
                </Dialog>
            </Button>
        );
    }
}
