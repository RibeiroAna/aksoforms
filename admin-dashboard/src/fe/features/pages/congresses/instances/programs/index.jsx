import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import ListIcon from '@material-ui/icons/List';
import TimelineIcon from '@material-ui/icons/DateRange';
import RoomIcon from '@material-ui/icons/Room';
import SearchFilters from '../../../../../components/overview/search-filters';
import OverviewList from '../../../../../components/lists/overview-list';
import DetailShell from '../../../../../components/detail/detail-shell';
import { congressPrograms as locale } from '../../../../../locale';
import ProgramTimeline from './timeline';
import { FIELDS } from './fields';
import { FILTERS } from './filters';
import './index.less';
import Segmented from '../../../../../components/controls/segmented';

const TIMELINE_VIEW = 'timeline';
const LIST_VIEW = 'list';
const ROOM_VIEW = 'rooms';

/**
 * Shows an overview over programs, with a map
 *
 * # Props
 * - congress: congress id
 * - instance: instance id
 * - push: proxy for navigation API
 */
export default class ProgramsView extends PureComponent {
    state = {
        parameters: {
            search: {
                field: 'title',
                query: '',
            },
            filters: {},
            jsonFilter: {
                _disabled: true,
                filter: {},
            },
            fields: [
                { id: 'title', sorting: 'none', fixed: true },
                { id: 'description', sorting: 'none', fixed: true },
                { id: 'timeFrom', sorting: 'asc', fixed: true },
                { id: 'location', sorting: 'none', fixed: true },
            ],
            offset: 0,
            limit: 10,
        },
        expanded: false,
        dateFrom: null,
        dateTo: null,
        tz: null,
        view: TIMELINE_VIEW,

        printingProgram: false,
    };

    #searchInput;

    componentDidMount () {
        if (this.#searchInput) this.#searchInput.focus(500);
    }

    render ({ congress, instance }, { parameters, dateFrom, dateTo, tz, view, expanded }) {
        const contents = [];
        if (view === LIST_VIEW) {
            contents.push(
                <SearchFilters
                    value={parameters}
                    searchFields={[
                        'title',
                        'description',
                    ]}
                    filters={FILTERS}
                    onChange={parameters => this.setState({ parameters })}
                    locale={{
                        searchPlaceholders: locale.search.placeholders,
                        searchFields: locale.fields,
                        filters: locale.search.filters,
                    }}
                    expanded={expanded}
                    onExpandedChange={expanded => this.setState({ expanded })}
                    inputRef={view => this.#searchInput = view}
                    userData={{ congress, instance, tz }} />,
                <OverviewList
                    expanded={expanded}
                    useDeepCmp options={{ congress, instance }}
                    viewOptions={{ congress, instance }}
                    task="congresses/listPrograms"
                    view="congresses/program"
                    updateView={['congresses/sigPrograms', { congress, instance }]}
                    parameters={parameters}
                    fields={FIELDS}
                    onGetItemLink={id => `/kongresoj/${congress}/okazigoj/${instance}/programeroj/${id}`}
                    onSetFields={fields => this.setState({ parameters: { ...parameters, fields }})}
                    onSetOffset={offset => this.setState({ parameters: { ...parameters, offset }})}
                    onSetLimit={limit => this.setState({ parameters: { ...parameters, limit }})}
                    locale={locale.fields}
                    userData={{ congress, instance, tz }} />,
            );
        } else if (view === TIMELINE_VIEW) {
            contents.push(
                <ProgramTimeline
                    key="timeline"
                    congress={congress}
                    instance={instance}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    tz={tz} />
            );
        } else if (view === ROOM_VIEW) {
            contents.push(
                <ProgramTimeline
                    key="timeline-room"
                    byRoom
                    congress={congress}
                    instance={instance}
                    dateFrom={dateFrom}
                    dateTo={dateTo}
                    tz={tz} />
            );
        }

        return (
            <div class="congresses-instance-programs">
                <div class="switch-button-container">
                    <Segmented
                        class="smaller"
                        selected={view}
                        onSelect={view => this.setState({ view })}>
                        {[
                            { id: TIMELINE_VIEW, label: <TimelineIcon /> },
                            { id: ROOM_VIEW, label: <RoomIcon /> },
                            { id: LIST_VIEW, label: <ListIcon /> },
                        ]}
                    </Segmented>
                </div>
                {contents}
                <DetailShell
                    /* hack for getting some fields about the instance */
                    view="congresses/instance"
                    options={{ congress }}
                    id={instance}
                    fields={{}}
                    locale={{}}
                    onData={data => data && this.setState({
                        dateFrom: data.dateFrom,
                        dateTo: data.dateTo,
                        tz: data.tz,
                    })} />
            </div>
        );
    }
}
