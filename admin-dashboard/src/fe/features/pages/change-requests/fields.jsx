import { h } from 'preact';
import ApprovedIcon from '@material-ui/icons/CheckCircleOutline';
import DeniedIcon from '@material-ui/icons/HighlightOff';
import PendingIcon from '@material-ui/icons/HourglassEmpty';
import CanceledIcon from '@material-ui/icons/NotInterested';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import TextArea from '../../../components/controls/text-area';
import TinyProgress from '../../../components/controls/tiny-progress';
import { timestamp } from '../../../components/data';
import { IdUEACode } from '../../../components/data/uea-code';
import { codeholderChgReqs as locale, codeholders as chLocale } from '../../../locale';
import { connectPerms } from '../../../perms';
import { connect } from '../../../core/connection';
import { Link } from '../../../router';
import { fields as CH_FIELDS } from '../codeholders/detail-fields';
import './fields.less';

export const FIELDS = {
    codeholderId: {
        weight: 0.3,
        slot: 'title',
        component ({ value, slot }) {
            if (!value) return '—';
            if (slot === 'detail') {
                return (
                    <Link class="codeholder-change-request-codeholder-link" target={`/membroj/${value}`} outOfTree>
                        <IdUEACode id={value} />
                    </Link>
                );
            }
            return <IdUEACode id={value} />;
        },
    },
    time: {
        sortable: true,
        weight: 0.5,
        slot: 'title',
        component ({ value }) {
            return <timestamp.inlineRenderer value={value} />;
        },
    },
    status: {
        sortable: true,
        weight: 0.5,
        slot: 'icon',
        component ({ value, slot }) {
            let icon;
            if (value === 'approved') icon = <ApprovedIcon />;
            else if (value === 'denied') icon = <DeniedIcon />;
            else if (value === 'canceled') icon = <CanceledIcon />;
            else icon = <PendingIcon />;
            return (
                <div class="codeholder-change-request-status" data-slot={slot} data-status={value}>
                    <span class="status-icon-container">
                        {icon}
                    </span>
                    {slot !== 'icon' && (
                        <span class="status-label">
                            {locale.fields.statuses[value]}
                        </span>
                    )}
                </div>
            );
        },
    },
    codeholderDescription: {
        skipLabel: true,
        component ({ value }) {
            return (
                <div class="codeholder-change-request-chdesc">
                    {value ? (
                        value.split('\n').map((ln, i) => (
                            <div class="chdesc-line" key={i}>{ln}</div>
                        ))
                    ) : <span class="chdesc-empty">{locale.fields.codeholderDescriptionEmpty}</span>}
                </div>
            );
        },
    },
    internalNotes: {
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextArea value={value} onChange={onChange} />;
            }
            if (!value) return '—';
            return (
                <div class="codeholder-change-request-internal-notes">
                    {(value || '').split('\n').map((ln, i) => (
                        <div class="chnotes-line" key={i}>{ln}</div>
                    ))}
                </div>
            );
        },
    },
    data: {
        component ({ value, item }) {
            return (
                <div class="codeholder-change-request-data">
                    <ChangedFields data={value} codeholder={item.codeholderId} isPending={item.status === 'pending'} />
                </div>
            );
        },
    },
};

const ChangedFields = connectPerms(function ChangedFields ({ data, perms, codeholder, isPending }) {
    if (!data) return null;
    if (isPending && perms.hasPerm('codeholders.read')) {
        return <CompareChangedFields codeholder={codeholder} data={data} />;
    } else {
        const fields = [];
        for (const field in data) {
            fields.push(<ChangedField key={field} field={field} data={data} />);
        }
        return <div class="changed-fields">{fields}</div>;
    }
});

const CompareChangedFields = connect(({ codeholder, data }) => [
    'codeholders/codeholder',
    { id: codeholder, fields: Object.keys(data) },
])(oldData => ({ oldData }))(function CompareChangedFields ({ data, oldData }) {
    const fields = [];
    for (const field in data) {
        fields.push(
            <ChangedField
                key={field}
                field={field}
                data={data}
                oldDataAvailable
                oldData={oldData} />
        );
    }

    return (
        <div class="changed-fields has-comparison">
            {fields}
        </div>
    );
});

function ChangedField ({ field, data, oldDataAvailable, oldData }) {
    const FieldComponent = CH_FIELDS[field] ? CH_FIELDS[field].component : (() => {});
    const userData = {
        forceShowName: true,
        useLocalAddress: true,
    };

    return (
        <div class="changed-field" data-field={field}>
            <div class="field-label">
                {chLocale.fields[field]}
            </div>
            {oldDataAvailable ? (
                <div class="field-values">
                    <div class="old-value">
                        {(oldData && oldData[field] !== undefined) ? (
                            <FieldComponent
                                slot="chgreq"
                                editing={false}
                                value={oldData[field]}
                                item={oldData}
                                userData={userData} />
                        ) : (
                            <TinyProgress />
                        )}
                    </div>
                    <div class="change-arrow">
                        <ArrowForwardIcon />
                    </div>
                    <div class="new-value">
                        <FieldComponent
                            slot="chgreq"
                            editing={false}
                            value={data[field]}
                            item={data}
                            userData={userData} />
                    </div>
                </div>
            ) : (
                <div class="field-value">
                    <FieldComponent
                        slot="chgreq"
                        editing={false}
                        value={data[field]}
                        item={data}
                        userData={userData} />
                </div>
            )}
        </div>
    );
}
