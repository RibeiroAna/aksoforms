import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import ErrorIcon from '@material-ui/icons/Error';
import { connect } from '../../../../core/connection';
import TinyProgress from '../../../../components/controls/tiny-progress';
import { Link } from '../../../../router';
import './subject.less';

export default connect(
    ({ id }) => ['delegations/subject', { id }],
    ['id']
)((data, _, err) => ({ data, err }))(class Subject extends PureComponent {
    render ({ data, err, id, interactive }) {
        if (err) return <ErrorIcon style={{ verticalAlign: 'middle' }} />;
        if (!data) return <TinyProgress />;

        if (interactive) {
            return (
                <Link outOfTree target={`/delegitoj/fakoj/${id}`} class="delegation-subject is-interactive">
                    {data.name}
                </Link>
            );
        }

        return (
            <span class="delegation-subject">
                {data.name}
            </span>
        );
    }
});
