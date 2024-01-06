import { h, Component } from 'preact';
import { lazy, Suspense, useState } from 'preact/compat';
import { Button, Dialog } from 'yamdl';
import SearchIcon from '@material-ui/icons/Search';
import HelpIcon from '@material-ui/icons/Help';
import Select from '../controls/select';
import { search as locale } from '../../locale';
import './search-input.less';

const MdField = lazy(() => import('../controls/md-field'));

export default class SearchInputFocusable extends Component {
    #node;
    #input;

    #scheduledFocus;

    focus (delay) {
        if (!this.#node) return;

        // MINOR HACK: don’t focus on android because it will open the soft keyboard
        if (navigator.userAgent.includes('Android')) return;

        this.#node.classList.remove('focus-animation');
        clearTimeout(this.#scheduledFocus);
        this.#scheduledFocus = setTimeout(() => {
            this.#node.classList.add('focus-animation');
            this.#input.focus();
        }, delay);
    }

    componentWillUnmount () {
        clearTimeout(this.#scheduledFocus);
    }

    render (props) {
        return <SearchInput
            {...props}
            innerRef={node => this.#node = node}
            inputRef={input => this.#input = input} />;
    }
}

/**
 * Primary search field.
 *
 * # Props
 * - value/onChange: request params -> search
 *   looks like `{ field, query }`
 * - searchFields: (string | { id: string, label: string })[] or null: available search fields
 * - expanded: bool
 * - localizedFields: object
 * - localizedPlaceholders: object, or string if no searchFields are given
 * - onSubmit: submit callback
 * - compact: if true, will use compact view
 */
function SearchInput ({
    value,
    onChange,
    searchFields,
    expanded,
    localizedFields,
    localizedPlaceholders,
    onSubmit,
    innerRef,
    inputRef,
    compact,
}) {
    const [showingHelp, setShowHelp] = useState(false);

    return (
        <div class={'search-input' + (compact ? ' is-compact' : '')} ref={innerRef}>
            {!!searchFields && searchFields.length > 1 && (
                <Select
                    class="search-field"
                    value={value.field || ''}
                    onClick={e => !expanded && e.stopPropagation()}
                    onChange={field => onChange({ ...value, field })}
                    items={searchFields.map(field => ({
                        value: field.id || field,
                        label: field.label || localizedFields[field],
                    }))} />
            )}
            <div class="search-query-container">
                <input
                    ref={inputRef}
                    class="search-query"
                    value={value.query}
                    onChange={e => onChange({ ...value, query: e.target.value })}
                    onClick={e => !expanded && e.stopPropagation()}
                    placeholder={searchFields
                        ? localizedPlaceholders[value.field]
                        : localizedPlaceholders}
                    onKeyDown={e => {
                        if (e.key === 'Enter') onSubmit();
                    }} />
                <Button
                    icon
                    small
                    class="search-action search-help"
                    onClick={() => setShowHelp(true)}>
                    <HelpIcon />
                    <Dialog
                        title={locale.searchHelp.title}
                        open={showingHelp}
                        onClose={() => setShowHelp(false)}>
                        <SearchHelpContents />
                    </Dialog>
                </Button>
                <Button
                    icon
                    small
                    class="search-action search-submit"
                    tabIndex={-1} // submit with enter
                    onClick={onSubmit}>
                    <SearchIcon />
                </Button>
            </div>
        </div>
    );
}

function SearchHelpContents () {
    return (
        <Suspense fallback={'...'}>
            <MdField
                value={locale.searchHelp.contents}
                rules={['emphasis', 'strikethrough', 'backticks', 'list']} />
        </Suspense>
    );
}
