import { PureComponent } from 'preact/compat';
import { connect } from '../../../../core/connection';

/**
 * Calls back with the given payment org's org.
 *
 * # Props
 * - onGetOrg
 */
export default connect(({ id }) => [
    'payments/org',
    { id },
])(data => ({ data }))(class PaymentOrgOrg extends PureComponent {
    componentDidUpdate () {
        if (!this.props.data) return;
        this.props.onGetOrg(this.props.data.org);
    }
    render () {
        return null;
    }
});
