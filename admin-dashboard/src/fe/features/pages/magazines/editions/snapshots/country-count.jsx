import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, LinearProgress } from 'yamdl';
import { stringify } from 'csv-stringify/browser/esm';
import DialogSheet from '../../../../../components/tasks/dialog-sheet';
import DisplayError from '../../../../../components/utils/error';
import { coreContext } from '../../../../../core/connection';
import { magazineSnaps as locale } from '../../../../../locale';

export default function CSVCountryCount ({
    open,
    onClose,
    magazine,
    edition,
    snapshot,
}) {
    return (
        <DialogSheet
            backdrop
            open={open}
            onClose={onClose}
            title={locale.countryCount.title}>
            <CountryCount
                magazine={magazine}
                edition={edition}
                snapshot={snapshot} />
        </DialogSheet>
    );
}

class CountryCount extends PureComponent {
    state = {
        loading: false,
        progress: null,
        result: null,
        filename: null,
    };

    static contextType = coreContext;

    async load () {
        const countries = {};

        const countryNames = await this.context.viewData('countries/countries');

        let totalItems = Infinity;
        for (let i = 0; i < totalItems; i += 100) {
            this.setState({ progress: i / totalItems });

            const result = await this.context.createTask('magazines/snapshotCodeholders', {
                magazine: this.props.magazine,
                edition: this.props.edition,
                id: this.props.snapshot,
            }, {
                offset: i,
                limit: 100,
                countriesOnly: true,
            }).runOnceAndDrop();

            totalItems = result.total;

            for (const item of result.items) {
                if (typeof item !== 'object') continue;
                const country = item.address?.country;
                if (country) {
                    if (!countries[country]) countries[country] = 0;
                    countries[country]++;
                }
            }
        }

        this.setState({ progress: 1 });

        const rows = Object.entries(countries)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([code, count]) => [
                code,
                countryNames[code].name_eo,
                count,
            ]);

        rows.unshift([
            locale.countryCount.columns.countryCode,
            locale.countryCount.columns.countryName,
            locale.countryCount.columns.count,
        ]);

        const csvData = await new Promise((resolve, reject) => {
            stringify(rows, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        const blob = new Blob([csvData], { type: 'text/csv' });
        if (this.blobURL) URL.revokeObjectURL(this.blobURL);
        this.blobURL = URL.createObjectURL(blob);
        return this.blobURL;
    }

    beginExport = () => {
        if (this.state.loading) return;
        this.setState({ loading: true, result: null, error: null, progress: 0 });
        this.load().then(result => {
            const filename = `${locale.countryCount.filename}-${new Date().toISOString()}.csv`;
            this.setState({ result, filename });
        }).catch(error => {
            console.log(error); // eslint-disable-line no-console
            this.setState({ error });
        }).finally(() => {
            this.setState({ loading: false });
        });
    };

    componentWillUnmount () {
        if (this.blobURL) URL.revokeObjectURL(this.blobURL);
    }

    render () {
        return (
            <div>
                {this.state.loading ? (
                    <LinearProgress progress={this.state.progress} />
                ) : this.state.error ? (
                    <div>
                        <DisplayError error={this.state.error} />
                        <Button raised onClick={this.beginExport}>{locale.countryCount.beginExport}</Button>
                    </div>
                ) : this.state.result ? (
                    <div>
                        <Button raised link href={this.state.result} download={this.state.filename}>
                            {locale.countryCount.download}
                        </Button>
                    </div>
                ) : (
                    <div>
                        <Button raised onClick={this.beginExport}>{locale.countryCount.beginExport}</Button>
                    </div>
                )}
            </div>
        );
    }
}
