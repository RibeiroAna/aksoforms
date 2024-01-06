import { h } from 'preact';
import { Fragment } from 'preact/compat';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../../components/detail/detail-page';
import DetailView from '../../../../../components/detail/detail';
import CSVExport from '../../../../../components/tasks/csv-export';
import { FIELDS, Footer } from './fields';
import ORIG_CODEHOLDER_FIELDS from '../../../codeholders/table-fields';
import AddrLabelGen from '../../../codeholders/addr-label-gen';
import CSVCountryCount from './country-count';
import { GetMagazineData } from '../../utils';
import {
    search as searchLocale,
    magazineSnaps as locale,
    codeholders as codeholderLocale,
} from '../../../../../locale';

const CODEHOLDER_FIELDS = {
    ...ORIG_CODEHOLDER_FIELDS,
    address: {
        stringify (value, item, fields, options, core) {
            return ORIG_CODEHOLDER_FIELDS.address.stringify(value, item, fields, {
                ...options,
                useNative: true,
            }, core);
        },
    },
    addressLatin: {
        stringify (value, item, ...etc) {
            const addr = {};
            for (const k in item.address) {
                if (k.endsWith('Latin')) {
                    addr[k.substr(0, k.length - 5)] = item.address[k];
                }
            }
            return ORIG_CODEHOLDER_FIELDS.address.stringify(addr, item, ...etc);
        },
    },
    formattedAddress: {
        stringify (value) {
            return value;
        },
    },
    country: {
        stringify (value) {
            return value?.address || '';
        },
    },
};

export default class Snapshot extends DetailPage {
    state = {
        org: null,
        labelGenOptions: null,
        snapshotCompare: null,
    };

    locale = locale;

    get magazine () {
        return +this.props.matches.magazine[1];
    }

    get edition () {
        return +this.props.matches.edition[1];
    }

    get id () {
        return this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('magazines/updateSnapshot', {
            magazine: this.magazine,
            edition: this.edition,
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm(`magazines.snapshots.update.${this.state.org}`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        actions.push({
            label: searchLocale.csvExport,
            action: () => this.setState({ csvExportOpen: true }),
            overflow: true,
        });

        actions.push({
            label: locale.countryCount.menuItem,
            action: () => this.setState({ countryCountOpen: true }),
            overflow: true,
        });

        actions.push({
            label: codeholderLocale.addrLabelGen.menuItem,
            action: () => this.setState({
                labelGenOptions: {
                    snapshot: { magazine: this.magazine, edition: this.edition, id: this.id },
                    snapshotCompare: this.state.snapshotCompare,
                },
            }),
            overflow: true,
        });

        if (perms.hasPerm(`magazines.snapshots.delete.${this.state.org}`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('magazines/deleteSnapshot', {
                    magazine: this.magazine,
                    edition: this.edition,
                    id: this.id,
                }),
                overflow: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailView
                    view="magazines/snapshot"
                    options={{ magazine: this.magazine, edition: this.edition, id: this.id }}
                    id={this.id}
                    fields={FIELDS}
                    footer={Footer}
                    userData={{
                        magazine: this.magazine,
                        edition: this.edition,
                        id: this.id,
                        compare: this.state.snapshotCompare,
                        setCompare: c => this.setState({ snapshotCompare: c }),
                    }}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete} />

                <GetMagazineData
                    id={this.magazine}
                    onData={data => data && this.setState({ org: data.org })} />

                <CSVExport
                    open={this.state.csvExportOpen}
                    task="magazines/snapshotCodeholders"
                    options={{ magazine: this.magazine, edition: this.edition, id: this.id }}
                    parameters={({ countryLocale }) => ({
                        fields: [
                            'name',
                            'code',
                            'address',
                            'addressLatin',
                            'formattedAddress',
                            'country',
                        ].map(id => ({ id })),
                        countryLocale,
                    })}
                    onClose={() => this.setState({ csvExportOpen: false })}
                    fields={CODEHOLDER_FIELDS}
                    locale={{
                        fields: {
                            ...codeholderLocale.fields,
                            formattedAddress: codeholderLocale.postalAddress,
                        },
                    }}
                    filenamePrefix={locale.csvFilename}
                    userOptions={{
                        countryLocale: {
                            name: codeholderLocale.csvOptions.countryLocale,
                            type: 'select',
                            options: Object.entries(codeholderLocale.csvOptions.countryLocales),
                            default: 'eo',
                        },
                    }} />
                <CSVCountryCount
                    open={this.state.countryCountOpen}
                    onClose={() => this.setState({ countryCountOpen: false })}
                    magazine={this.magazine}
                    edition={this.edition}
                    snapshot={this.id} />

                <AddrLabelGen
                    open={!!this.state.labelGenOptions}
                    options={this.state.labelGenOptions}
                    onClose={() => this.setState({ labelGenOptions: null })} />
            </Fragment>
        );
    }
}
