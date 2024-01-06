import { h } from 'preact';
import OverviewPage from '../../../../components/overview/overview-page';
import OverviewList from '../../../../components/lists/overview-list';
import { congressParticipations as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class Participations extends OverviewPage {
    state = {
        parameters: {
            fields: [
                { id: 'congressId', sorting: 'none', fixed: true },
                { id: 'congressInstanceHumanId', sorting: 'none', fixed: true },
                { id: 'congressInstanceLocation', sorting: 'none', fixed: true },
                { id: 'congressInstanceId', sorting: 'desc', fixed: true },
                { id: 'dataId', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
    };

    locale = locale;

    renderContents (_, { parameters }) {
        const codeholder = +this.props.matches.codeholder[1];

        return (
            <OverviewList
                task="codeholders/congressParticipations"
                view="codeholders/congressParticipation"
                useDeepCmp
                options={{ id: codeholder }}
                viewOptions={{ codeholder }}
                parameters={parameters}
                fields={FIELDS}
                onGetItemLink={(_, { congressId, congressInstanceId, dataId }) =>
                    `/kongresoj/${congressId}/okazigoj/${congressInstanceId}/alighintoj/${dataId}`}
                outOfTree
                onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                locale={locale.fields} />
        );
    }
}