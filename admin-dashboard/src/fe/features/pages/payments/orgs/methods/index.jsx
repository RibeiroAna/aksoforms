import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import OverviewList from '../../../../../components/lists/overview-list';
import { paymentMethods as locale } from '../../../../../locale';
import { FIELDS } from './fields';

export default class MethodsTab extends PureComponent {
    state = {
        parameters: {
            fields: [
                { id: 'type', sorting: 'none', fixed: true },
                { id: 'name', sorting: 'asc', fixed: true },
                { id: 'internalDescription', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
    };

    render ({ org }, { parameters }) {
        return (
            <div class="payment-methods-tab">
                <OverviewList
                    task="payments/listMethods"
                    view="payments/method"
                    updateView={['payments/sigMethods', { org }]}
                    options={{ org }}
                    viewOptions={{ org }}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/aksopago/organizoj/${org}/metodoj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields} />
            </div>
        );
    }
}
