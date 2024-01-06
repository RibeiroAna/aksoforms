import { h } from 'preact';
import { CircularProgress } from 'yamdl';
import InfoIcon from '@material-ui/icons/Info';
import Page from '../../../../components/page';
import { coreContext } from '../../../../core/connection';
import Meta from '../../../meta';
import { codeholders as locale } from '../../../../locale';
import DiffAuthor from '../../../../components/diff-author';
import { timestamp } from '../../../../components/data';
import { fields as detailFields } from '../detail-fields';
import './index.less';

export default class FieldHistory extends Page {
    static contextType = coreContext;

    state = {
        items: [],
        loading: false,
    };

    #loadTask = null;
    #reloadTimeout = null;

    load () {
        if (this.#loadTask) return;
        this.setState({ loading: true });
        this.#loadTask = this.context.createTask('codeholders/fieldHistory', {
            // get codeholder id from the match above
            id: +this.props.matches.codeholder[1],
            field: this.props.query,
        }).runOnceAndDrop().then(({ items }) => {
            this.setState({ items, loading: false });
        }).catch(err => {
            console.error('Failed to fetch field history', err); // eslint-disable-line no-console
            this.#reloadTimeout = setTimeout(() => this.load(), 1000);
        }).then(() => this.#loadTask = null);
    }

    componentDidMount () {
        this.load();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.query !== this.props.query) {
            this.load();
        }
    }

    componentWillUnmount () {
        clearTimeout(this.#reloadTimeout);
    }

    render () {
        const fieldName = (locale.fields[this.props.query] || '???').toLowerCase();

        return (
            <div class="codeholder-field-history">
                <Meta title={locale.fieldHistory.title(fieldName)} />
                {this.state.loading ? (
                    <div class="history-loading-container">
                        <CircularProgress indeterminate />
                    </div>
                ) : (
                    <div class="history-retention-note">
                        <InfoIcon className="inner-icon" />
                        <div class="inner-note">
                            {locale.fieldHistory.dataRetentionNote}
                        </div>
                    </div>
                )}
                <div class="history-items">
                    {this.state.items.length === 1 ? (
                        <div class="history-items-no-changes">
                            {locale.fieldHistory.noChanges}
                        </div>
                    ) : null}
                    {this.state.items.map(item => <FieldHistoryItem
                        key={item.id}
                        item={item}
                        field={this.props.query} />)}
                </div>
            </div>
        );
    }
}

function FieldHistoryItem ({ item, field }) {
    let className = 'field-history-item';
    if (!item.author) className += ' initial';

    if (!detailFields[field]) return `?${field}?`;

    const Renderer = detailFields[field].component;

    return (
        <div class={className}>
            <div class="item-value">
                <Renderer value={item.data[field]} item={item.data} isHistory />
            </div>
            {item.author ? (
                <div class="item-meta">
                    {item.comment ? (
                        <div class="item-comment">
                            {locale.fieldHistory.comment}: {item.comment}
                        </div>
                    ) : null}
                    <div class="item-additional">
                        {locale.fieldHistory.changedBy} <DiffAuthor author={item.author} interactive />
                        {' · '}
                        <timestamp.inlineRenderer value={item.time} />
                    </div>
                </div>
            ) : (
                <div class="item-meta">
                    {locale.fieldHistory.initial}
                </div>
            )}
        </div>
    );
}
