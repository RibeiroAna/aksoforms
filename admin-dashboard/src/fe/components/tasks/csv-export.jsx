import { h } from 'preact';
import { PureComponent, Fragment } from 'preact/compat';
import { Button, LinearProgress } from 'yamdl';
import { stringify } from 'csv-stringify';
import { coreContext } from '../../core/connection';
import DialogSheet from './dialog-sheet';
import DisplayError from '../utils/error';
import Select from '../controls/select';
import Segmented from '../controls/segmented';
import { csvExport as locale } from '../../locale';
import './csv-export.less';

const LIMIT = 100;

/**
 * The CSV export dialog.
 *
 * # Props
 * - open/onClose: bool
 * - task: task name
 * - options: current task options
 * - parameters: current task parameters. Is expected to confirm
 * - detailView: view name. If not given, will assume the task already contains item data
 * - detailViewOptions: id => options
 * - filenamePrefix: file name prefix for the csv
 * - locale: object like { fields: { ... } }
 * - fields: field renderers (mainly, stringify)
 * - userOptions:
 *   User-defined options for CSV export.
 *   Should be an object of `id => spec`, where spec is an object with a `type` field. Types:
 *   - `select`: will render a select with options given by the `options` field in the spec.
 *     Each option should be an (array) tuple like `[id, label]`.
 * - extraOptions: extra options for CSV export, in addition to userOptions
 *
 * # Strictly Optional Props
 * - compileFields: (parameters, transientFields) => string[]
 * - localizeFieldName: id => string?
 *     - if used, `locale` is no longer required
 * - getFieldStringifier: id => Function
 *     - if used, `fields` is no longer required
 */
export default class CSVExport extends PureComponent {
    static contextType = coreContext;

    state = {
        data: [],
        page: 0,
        total: 0,
        exporting: false,
        endingExport: false,
        error: null,
        objectURL: null,
        mode: 'csv',
        options: {},
        transientFields: [],
        completedRows: 0,
    };

    beginExport () {
        this.setState({
            data: [],
            page: 0,
            total: 0,
            exporting: true,
            endingExport: false,
            error: null,
            objectURL: null,
            completedRows: 0,
        }, () => {
            this.loadOne();
        });
    }

    loadOne () {
        const { task, options } = this.props;
        const parameters = typeof this.props.parameters === 'function'
            ? this.props.parameters(this.state.options)
            : { ...this.props.parameters };
        parameters.offset = this.state.page * LIMIT;
        parameters.limit = LIMIT;
        this.context.createTask(task, options || {}, parameters).runOnceAndDrop().then(res => {
            this.setState({
                data: this.state.data.concat(res.items),
                transientFields: res.transientFields || [],
                total: res.total,
                error: null,
            }, () => {
                if (this.state.page < Math.floor(res.total / LIMIT)) {
                    this.setState({ page: this.state.page + 1 }, () => {
                        this.loadOne();
                    });
                } else this.endExport();
            });
        }).catch(error => {
            this.setState({ error: '' + error, exporting: false });
        });
    }

    resumeExport = () => {
        if (this.state.error) this.loadOne();
        else this.beginExport();
    };

    abortExport = () => {
        this.setState({ exporting: false, error: null });
    };

    /** Compiles selected fields */
    compileFields () {
        const parameters = typeof this.props.parameters === 'function'
            ? this.props.parameters(this.state.options)
            : this.props.parameters;

        if (this.props.compileFields) {
            return this.props.compileFields(parameters, this.state.transientFields);
        }

        const compiledFields = [];
        // first, push fixed fields
        for (const field of parameters.fields) if (field.fixed) compiledFields.push(field.id);
        // then transient fields
        for (const id of this.state.transientFields) {
            if (!compiledFields.includes(id)) compiledFields.push(id);
        }
        // finally, push user fields
        for (const field of parameters.fields) {
            if (!field.fixed) {
                if (!compiledFields.includes(field.id)) compiledFields.push(field.id);
            }
        }
        return compiledFields;
    }

    localizeFieldName (id) {
        if (this.props.localizeFieldName) return this.props.localizeFieldName(id);
        return this.props.locale.fields[id];
    }

    getFieldStringifier (id) {
        if (this.props.getFieldStringifier) return this.props.getFieldStringifier(id);
        const fieldSpec = this.props.fields[id];
        if (!fieldSpec) throw new Error(`missing field spec for ${id}`);
        if (!fieldSpec.stringify) throw new Error(`missing stringify for ${id}`);
        return fieldSpec.stringify;
    }

    async endExport () {
        try {
            this.abortExport();
            this.setState({ exporting: true, endingExport: true });

            const stringifier = stringify({
                delimiter: this.state.mode === 'csv' ? ',' : '\t',
            });
            let rowCount = 0;
            const rows = [];
            stringifier.on('readable', () => {
                let row;
                while ((row = stringifier.read())) rows.push(row);
            });
            stringifier.on('error', err => {
                this.setState({ exporting: false, error: err });
            });
            stringifier.on('finish', () => {
                const ext = this.state.mode;
                const mime = this.state.mode === 'csv' ? 'text/csv' : 'text/tab-separated-values';
                const blob = new Blob(rows, { type: mime });
                const objectURL = URL.createObjectURL(blob);
                const filename = `${this.props.filenamePrefix}-${new Date().toISOString()}.${ext}`;
                this.setState({ objectURL, filename, exporting: false });
            });

            const compiledFields = this.compileFields();

            // write header
            stringifier.write(compiledFields.map(id => {
                const localized = this.localizeFieldName(id);
                if (!localized) throw new Error(`missing field name for ${id}`);
                return localized;
            }));

            const options = { ...this.state.options, ...(this.props.extraOptions || {}) };

            // write data
            for (const itemId of this.state.data) {
                this.setState({ completedRows: rowCount });
                rowCount++;
                const data = [];

                let itemData;
                if (this.props.detailView) {
                    itemData = await new Promise((resolve, reject) => {
                        // get data from the appropriate detail data view
                        const dv = this.context.createDataView(
                            this.props.detailView,
                            this.props.detailViewOptions(itemId)
                        );
                        dv.on('update', data => {
                            if (data !== null) {
                                dv.drop();
                                resolve(data);
                            }
                        });
                        dv.on('error', () => {
                            dv.drop();
                            reject();
                        });
                    });
                } else {
                    itemData = itemId;
                }

                for (const id of compiledFields) {
                    const stringifyField = this.getFieldStringifier(id);
                    const stringified = stringifyField(
                        itemData[id],
                        itemData,
                        compiledFields,
                        options,
                        this.context,
                    );
                    if (stringified instanceof Promise) data.push(await stringified);
                    else data.push(stringified);
                }

                stringifier.write(data);
            }
            stringifier.end();
        } catch (err) {
            console.error(err); // eslint-disable-line no-console
            this.setState({ error: err, exporting: false });
        }
    }

    onClose = () => {
        this.abortExport();
        if (this.state.objectURL) this.setState({ objectURL: null });
        if (this.props.onClose) this.props.onClose();
    };

    render () {
        return (
            <DialogSheet
                open={this.props.open}
                backdrop
                class="csv-export-dialog"
                onClose={this.onClose}
                title={locale.title}>
                {!this.state.exporting ? (
                    this.state.error ? (
                        <Fragment>
                            <div className="export-error">
                                <DisplayError error={this.state.error} />
                            </div>
                            <div class="action-button-container">
                                <Button
                                    key="resume"
                                    class="action-button"
                                    raised
                                    onClick={this.resumeExport}>
                                    {locale.tryResumeExport}
                                </Button>
                            </div>
                        </Fragment>
                    ) : this.state.objectURL ? (
                        <Fragment>
                            <p>
                                {locale.summary(this.state.total)}
                            </p>
                            <div class="action-button-container">
                                <Button
                                    key="download"
                                    class="action-button"
                                    raised
                                    href={this.state.objectURL}
                                    download={this.state.filename}>
                                    {locale.download}
                                </Button>
                            </div>
                        </Fragment>
                    ) : (
                        <Fragment>
                            <div class="mode-switch-container">
                                <Segmented
                                    class="mode-switch"
                                    selected={this.state.mode}
                                    onSelect={mode => this.setState({ mode })}>
                                    {[
                                        {
                                            id: 'csv',
                                            label: locale.commaSeparated,
                                        },
                                        {
                                            id: 'tsv',
                                            label: locale.tabSeparated,
                                        },
                                    ]}
                                </Segmented>
                            </div>
                            <UserOptions
                                options={this.props.userOptions || {}}
                                value={this.state.options}
                                onChange={options => this.setState({ options })} />
                            <div class="action-button-container">
                                <Button
                                    key="begin"
                                    raised
                                    class="action-button"
                                    onClick={this.resumeExport}>
                                    {locale.beginExport}
                                </Button>
                            </div>
                        </Fragment>
                    )
                ) : (
                    <Fragment>
                        <LinearProgress
                            class="progress-bar"
                            progress={this.state.data.length / this.state.total}
                            indeterminate={this.state.endingExport} />
                        <p class="export-status">
                            {this.state.endingExport
                                ? locale.endingExport(this.state.completedRows, this.state.total)
                                : locale.status(this.state.data.length, this.state.total)}
                        </p>
                        <div class="action-button-container">
                            {!this.state.error && <Button
                                key="abort"
                                raised
                                class="action-button"
                                onClick={this.abortExport}>
                                {locale.abortExport}
                            </Button>}
                        </div>
                    </Fragment>
                )}
            </DialogSheet>
        );
    }
}

/**
 * Renders user-defined options. See CSV Export docs above for details.
 *
 * # Props
 * - options
 * - value/onChange
 */
class UserOptions extends PureComponent {
    componentDidMount () {
        this.updateValue();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.options !== this.props.options) this.updateValue();
    }

    updateValue () {
        const value = { ...this.props.value };
        let didChange = false;

        for (const key in this.props.options) {
            if (!(key in value)) {
                value[key] = this.props.options[key].default;
                didChange = true;
            }
        }

        if (didChange) this.props.onChange(value);
    }

    render () {
        const options = [];

        for (const key in this.props.options) {
            if (!(key in this.props.value)) continue;

            const spec = this.props.options[key];
            let control;

            if (spec.type === 'select') {
                control = (
                    <Select
                        value={this.props.value[key]}
                        onChange={value => {
                            this.props.onChange({
                                ...this.props.value,
                                [key]: value,
                            });
                        }}
                        items={spec.options.map(([id, label]) => ({
                            value: id,
                            label,
                        }))} />
                );
            } else {
                throw new Error('unknown option type');
            }

            options.push(
                <tr className="option" key={key}>
                    <td className="option-label">{spec.name}</td>
                    <td className="option-control">{control}</td>
                </tr>
            );
        }

        if (!options.length) return null;

        return (
            <table className="user-options">
                <tbody>
                    {options}
                </tbody>
            </table>
        );
    }
}
