import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { ChangeRequestIcon, ChangeRequestNewIcon } from '../../../components/icons';
import { codeholderChgReqs as locale } from '../../../locale';
import { coreContext } from '../../../core/connection';
import { LinkButton } from '../../../router';
import './button.less';

/** Shows codeholder change requests. */
export default class ChangeRequestsButton extends PureComponent {
    state = {
        loading: false,
        preview: false,
        error: null,
        items: [],
        count: 0,
    };

    static contextType = coreContext;

    load () {
        this.setState({ loading: true, error: null });
        this.context.createTask('codeholders/changeRequests', {
            id: this.props.id,
        }, {
            offset: 0,
            limit: 1,
            jsonFilter: { filter: { status: 'pending' } },
        }).runOnceAndDrop().then(({ items, total }) => {
            this.setState({ items, count: total });
        }).catch(error => {
            this.setState({ error });
        }).then(() => {
            this.setState({ loading: false });
        });
    }

    componentDidMount () {
        this.load();
    }

    render ({ id }) {
        return (
            <div class="info-button-container codeholder-change-requests-button-container">
                <LinkButton class="info-button change-reqs-button" raised target={`/membroj/${id}/shanghopetoj`}>
                    <span class="reqs-icon-container">
                        {this.state.count ? <ChangeRequestNewIcon class="req-icon" /> : <ChangeRequestIcon class="req-icon" />}
                    </span>
                    {locale.buttonLabel(this.state.count)}
                </LinkButton>
            </div>
        );
    }
}
