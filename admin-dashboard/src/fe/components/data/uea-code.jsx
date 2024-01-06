import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { CircularProgress } from 'yamdl';
import { UEACode as AKSOUEACode, bannedCodes } from '@tejo/akso-client';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import ErrorIcon from '@material-ui/icons/Error';
import { coreContext } from '../../core/connection';
import { data as locale } from '../../locale';
import SuggestionField from '../controls/suggestion-field';
import TinyProgress from '../controls/tiny-progress';
import './style.less';
import { useDataView } from '../../core';
import { usePerms } from '../../perms';

/** Renders a single UEA code. Props: `value`, `old`. */
export function UEACode ({ value, old, ...extra }) {
    if (!value) return null;
    if (old) {
        const oldCodeCheckLetter = new AKSOUEACode(value).getCheckLetter();
        return <span class="data uea-code is-old" {...extra}>{value}-{oldCodeCheckLetter}</span>;
    } else {
        return <span class="data uea-code" {...extra}>{value}</span>;
    }
}

function BothUEACodes ({ value, value2 }) {
    let isSameCode = true;
    try {
        if (value2) {
            isSameCode = `${value2}-${new AKSOUEACode(value2).getCheckLetter()}` === value
        }
    } catch { /* */ }

    if (isSameCode) return <UEACode value={value} />;
    return (
        <span class="data both-uea-codes">
            <UEACode value={value} />
            {!!value2 && ' '}
            <UEACode value={value2} old />
        </span>
    );
}

/**
 * Renders a UEA code by ID.
 *
 * # Props
 * - id: codeholder id
 */
export function IdUEACode ({ id, errorLabel }) {
    const perms = usePerms();
    if (!perms.hasCodeholderFields('r', 'oldCode', 'newCode')) {
        return <span class="data uea-code-no-perm-replacement">{id}</span>;
    }
    const [loading, error, data] = useDataView('codeholders/codeholder', {
        id,
        fields: ['code'],
        lazyFetch: true,
    });

    if (error) {
        if (errorLabel) return errorLabel;

        return (
            <span class="data uea-code-load-error" title={locale.ueaCode.idFailed} data-id={id}>
                <ErrorIcon style={{ verticalAlign: 'middle' }} />
            </span>
        );
    }

    if (loading) return <TinyProgress />;
    if (data?.code) return <UEACode value={data.code.new} />;
    return null;
}

function isBannedCode (value) {
    for (const bannedCode of bannedCodes) {
        if (value.includes(bannedCode)) return true;
    }
    return false;
}

/**
 * Also pass `id` to enable checking if it’s taken.
 * Also pass an array to `suggestions` to show a list of suggestions.
 * Alternatively, pass `suggestionParameters` to automatically suggest some codes.
 * Also pass `keepSuggestions` to keep suggestions from being filtered above in suggestion params.
 */
class UEACodeEditor extends PureComponent {
    state = {
        takenState: null,
        suggestions: [],
    };

    static contextType = coreContext;

    checkTaken () {
        let isNewCode = false;
        try {
            isNewCode = new AKSOUEACode(this.props.value).type === 'new';
        } catch (_) {
            //
        }
        if (!this.props.id || !isNewCode || isBannedCode(this.props.value)) {
            this.setState({ takenState: null });
            return;
        }
        this.setState({ takenState: 'loading' });
        return this.context.createTask('codeholders/list', {}, {
            jsonFilter: { filter: { newCode: this.props.value, id: { $neq: this.props.id } } },
            offset: 0,
            limit: 1,
        }).runOnceAndDrop().then(({ items }) => {
            if (this.doNotUpdate) return;
            if (items.length) this.setState({ takenState: 'taken' });
            else this.setState({ takenState: 'available' });
        }).catch(err => {
            if (this.doNotUpdate) return;
            console.error(err); // eslint-disable-line no-console
            this.setState({ takenState: null });
        });
    }

    updateSuggestions () {
        if (!this.props.suggestionParameters) return;
        const task = this.context.createTask('codeholders/codeSuggestions', {
            keep: this.props.keepSuggestions || [],
        }, this.props.suggestionParameters);
        task.runOnceAndDrop().then(items => {
            this.setState({ suggestions: items });
        }).catch(console.error); // eslint-disable-line no-console
    }

    originalValue = null;
    componentDidMount () {
        this.updateSuggestions();
        this.originalValue = this.props.value;
    }

    componentDidUpdate (prevProps) {
        if (prevProps.value !== this.props.value) this.checkTaken();
    }

    componentWillUnmount () {
        this.doNotUpdate = true;
    }

    render ({ value, onChange, skipValidationIfUnchanged, ...extraProps }) {
        let trailing;
        if (this.state.takenState === 'loading') {
            trailing = <CircularProgress class="taken-state is-loading" small indeterminate />;
        } else if (this.state.takenState === 'available') {
            trailing = <CheckIcon className="taken-state is-available" />;
        } else if (this.state.takenState === 'taken') {
            trailing = <CloseIcon className="taken-state is-taken" />;
        }

        const suggestions = extraProps.suggestionParameters
            ? this.state.suggestions
            : extraProps.suggestions;
        delete extraProps.suggestionParameters;
        delete extraProps.suggestions;
        const className = 'data uea-code-editor' + (extraProps.class ? ' ' + extraProps.class : '');
        delete extraProps.class;

        if (!extraProps.error && this.state.takenState === 'taken') {
            extraProps.error = locale.ueaCode.codeTaken;
        }

        return <SuggestionField
            class={className}
            value={value}
            suggestions={suggestions || []}
            onChange={onChange}
            maxLength={6}
            placeholder="xxxxxx"
            label={locale.ueaCode.newCode + (this.props.required ? '*' : '')}
            onFocus={() => this.updateSuggestions()}
            validate={() => {
                if (skipValidationIfUnchanged && value === this.originalValue) {
                    return null;
                }

                try {
                    const code = new AKSOUEACode(value);
                    if (code.type !== 'new') throw 0;
                } catch (_) {
                    return locale.ueaCode.invalidUEACode;
                }
                if (this.state.takenState === 'taken') {
                    return locale.ueaCode.codeTaken;
                }
                if (isBannedCode(value)) {
                    return locale.ueaCode.bannedCode;
                }
            }}
            trailing={trailing}
            {...extraProps} />;
    }
}

export default {
    renderer: BothUEACodes,
    inlineRenderer: BothUEACodes,
    editor: UEACodeEditor,
};
