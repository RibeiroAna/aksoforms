import { h } from 'preact';
import { Button } from 'yamdl';
import { codeholders as locale } from '../../../../locale';
import { coreContext } from '../../../../core/connection';
import Page from '../../../../components/page';
import DataList from '../../../../components/lists/data-list';
import { timestamp } from '../../../../components/data';
import Meta from '../../../meta';
import './index.less';

export default class LoginsPage extends Page {
    static contextType = coreContext;

    render () {
        // get codeholder id from the match above
        const id = +this.props.matches.codeholder[1];

        return (
            <div class="codeholder-logins-page">
                <Meta title={locale.logins.title} />
                <DataList
                    onLoad={(offset, limit) =>
                        this.context.createTask('codeholders/listLogins', {
                            id,
                        }, { offset, limit }).runOnceAndDrop()}
                    emptyLabel={locale.logins.empty}
                    renderItem={item => <LoginItem item={item} />} />
            </div>
        );
    }
}

function LoginItem ({ item }) {
    const osmLink = locale.logins.osmLink(item.area, item.ll[0], item.ll[1]);

    return (
        <div class="login-item" data-id={item.id}>
            <div class="login-time">
                <timestamp.inlineRenderer value={item.time} />
                {' '}
                {locale.logins.inTimezone}
                {' '}
                {item.timezone}
            </div>
            <div class="login-id">
                {item.ip}
                {' '}
                {item.userAgentParsed}
            </div>
            <div class="login-loc">
                {item.country}
                {' '}
                {item.region}
                {' '}
                {item.city}
                <Button class="login-loc-map-link" target="_blank" rel="noopener noreferrer" href={osmLink}>
                    {locale.logins.viewInOSM}
                </Button>
            </div>
        </div>
    );
}
