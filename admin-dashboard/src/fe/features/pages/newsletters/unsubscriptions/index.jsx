import { h } from 'preact';
import OverviewList from '../../../../components/lists/overview-list';
import OverviewPage from '../../../../components/overview/overview-page';
import { newsletterUnsubs as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class NewsletterUnsubscriptions extends OverviewPage {
    state = {
        parameters: {
            fields: [
                { id: 'time', sorting: 'desc', fixed: true },
                { id: 'reason', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
    };

    locale = locale;
    filters = {};

    get newsletter () {
        return +this.props.matches.newsletter[1];
    }

    renderActions () {
        return [];
    }

    renderContents (_, { parameters }) {
        return (
            <OverviewList
                task="newsletters/listUnsubscriptions"
                view="newsletters/unsubscription"
                useDeepCmp options={{ newsletter: this.newsletter }}
                viewOptions={{ newsletter: this.newsletter }}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={id => `/bultenoj/${this.newsletter}/malabonoj/${id}`}
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}
