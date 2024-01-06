import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { NewspaperIcon } from '../../../../components/icons';
import { LinkButton } from '../../../../router';
import { magazineSubs as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';
import './button.less';

export default class SubscriptionsButton extends PureComponent {
    state = {
        loading: false,
        count: 0,
    };

    static contextType = coreContext;

    load () {
        this.setState({ loading: true, error: null });
        this.context.createTask('magazines/listCodeholderSubscriptions', {
            codeholder: this.props.id,
        }, {
            offset: 0,
            limit: 1,
        }).runOnceAndDrop().then(({ total }) => {
            this.setState({ count: total });
        }).catch(error => {
            this.setState({ error });
        }).then(() => {
            this.setState({ loading: false });
        });
    }

    componentDidMount () {
        this.load();
    }

    render () {
        const target = `/membroj/${this.props.id}/simplaj-abonoj`;

        return (
            <span class="info-button-container codeholder-magazine-subscriptions-button-container">
                <LinkButton target={target} class="info-button codeholder-subscriptions-button" raised>
                    <span class="inner-icon-container">
                        <NewspaperIcon />
                    </span>
                    {locale.buttonLabel(this.state.count)}
                </LinkButton>
            </span>
        );
    }
}
