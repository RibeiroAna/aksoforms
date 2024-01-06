import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import DomainIcon from '@material-ui/icons/Domain';
import { LinkButton } from '../../../../router';
import { congressParticipations as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';
import './button.less';

export default class ParticipationsButton extends PureComponent {
    state = {
        loading: false,
        count: 0,
    };

    static contextType = coreContext;

    load () {
        this.setState({ loading: true, error: null });
        this.context.createTask('codeholders/congressParticipations', {
            id: this.props.id,
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
        const target = `/membroj/${this.props.id}/kongresoj`;

        return (
            <span class="info-button-container codeholder-congress-participations-button-container">
                <LinkButton target={target} class="info-button codeholder-congress-participations-button" raised>
                    <span class="inner-icon-container">
                        <DomainIcon style={{ verticalAlign: 'middle' }} />
                    </span>
                    {locale.buttonLabel(this.state.count)}
                </LinkButton>
            </span>
        );
    }
}
