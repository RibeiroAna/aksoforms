import { h } from 'preact';
import { PureComponent, useState } from 'preact/compat';
import { Button } from 'yamdl';
import SearchIcon from '@material-ui/icons/Search';
import CloseIcon from '@material-ui/icons/Close';
import { FIELDS } from '../notif-templates/fields';
import StaticOverviewList from '../../../components/lists/overview-list-static';
import OverviewListItem from '../../../components/lists/overview-list-item';
import { notifTemplates, codeholders as locale } from '../../../locale';
import './picker.less';

const SELECTED_FIELDS = [
    { id: 'org', sorting: 'none' },
    { id: 'intent', sorting: 'none' },
    { id: 'name', sorting: 'asc' },
    { id: 'description', sorting: 'none' },
];
const REDUCED_FIELDS = {
    org: FIELDS.org,
    intent: FIELDS.intent,
    name: FIELDS.name,
    description: FIELDS.description,
};

/** Big notif template picker used in the "send notification" page. */
export default class NotifTemplatePicker extends PureComponent {
    render ({ value, disabled, onChange, onLoadData, jsonFilter }) {
        const onRemove = () => {
            onChange(null);
            onLoadData && onLoadData(null);
        };

        let contents = null;
        if (value) {
            contents = <TemplatePreview id={value} disabled={disabled} onRemove={onRemove} onLoadData={onLoadData} />;
        } else if (!disabled) {
            contents = <TemplatePicker onChange={onChange} jsonFilter={jsonFilter} />;
        } else {
            contents = <div class="empty-value">—</div>;
        }

        return (
            <div class="notif-template-picker">
                {contents}
            </div>
        );
    }
}

function TemplatePreview ({ id, onLoadData, onRemove, disabled }) {
    return (
        <div class="notif-template-picked">
            {!disabled && (
                <Button icon small class="remove-picked" onClick={onRemove}>
                    <CloseIcon style={{ verticalAlign: 'middle' }} />
                </Button>
            )}
            <OverviewListItem
                doFetch compact
                view="notifTemplates/template"
                skipAnimation
                id={id}
                selectedFields={SELECTED_FIELDS}
                fields={FIELDS}
                index={0}
                locale={notifTemplates.fields}
                onData={data => onLoadData && onLoadData(data)} />
        </div>
    );
}

function TemplatePicker ({ onChange, jsonFilter }) {
    const [offset, setOffset] = useState(0);
    const [query, setQuery] = useState('');

    return (
        <div class="notif-template-picker-inner">
            <div class="template-search">
                <div class="search-icon-container">
                    <SearchIcon />
                </div>
                <input
                    class="search-input"
                    placeholder={notifTemplates.search.placeholders.name}
                    value={query}
                    onChange={e => setQuery(e.target.value)} />
            </div>
            <StaticOverviewList
                task="notifTemplates/list"
                view="notifTemplates/template"
                fields={REDUCED_FIELDS}
                sorting={{ name: 'asc' }}
                search={{ field: 'name', query }}
                jsonFilter={jsonFilter}
                offset={offset}
                onSetOffset={setOffset}
                limit={10}
                locale={notifTemplates.fields}
                onItemClick={id => {
                    onChange(id);
                }}
                emptyLabel={query ? locale.notifTemplates.emptyWithQuery : locale.notifTemplates.empty}
                compact />
        </div>
    );
}
