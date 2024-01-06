import { h, Component } from 'preact';
import { lazy, Suspense, Fragment } from 'preact/compat';
import { Checkbox, CircularProgress, Button, Spring } from 'yamdl';
import { LoginAuthStates } from '../../../protocol';
import { Form, Field, ValidatedTextField } from '../../components/form';
import { login as locale } from '../../locale';

const TotpSetup = lazy(() => import(/* webpackChunkName: "totp-setup" */ './totp-setup'));

/**
 * The TOTP code input page.
 *
 * # Props
 * - core: core ref
 * - authState: core auth state
 * - onHeightChange: callback called when the height changes
 * - totpSetupRequired: bool
 */
export default class TotpPage extends Component {
    state = {
        secret: null,
        code: '',
        remember: false,
    };

    #codeValidator;
    #codeField;

    focus () {
        if (this.props.totpSetupRequired) return;
        this.#codeField.focus();
    }

    #submitting = false;
    #onSubmit = () => {
        if (this.#submitting) return;
        this.#submitting = true;
        this.props.core.createTask('login/totp', {
            secret: this.props.totpSetupRequired ? this.state.secret : null,
        }, {
            code: this.state.code,
            remember: this.state.remember,
        }).runOnceAndDrop().catch(err => {
            let error = locale.genericTotpError;
            if (err.code === 400 || err.code === 401) {
                // conflating 400 (probably a schema error) and 401 (invalid login)
                // because invalid emails will also return schema errors and showing the
                // generic error isn’t really appropriate
                error = locale.invalidTotp;
            }

            this.#codeValidator.shake();
            this.#codeField.setError(error);
        }).finally(() => {
            this.#submitting = false;
        });
    };

    render ({ authState, onHeightChange, totpSetupRequired, ueaCode }) {
        const isLoading = authState === LoginAuthStates.VERIFYING_TOTP;

        const contents = (
            <Fragment>
                <p>
                    {locale.totpDescription}
                </p>
                <Field ref={view => this.#codeValidator = view}>
                    <ValidatedTextField
                        class="form-field totp-input"
                        ref={view => this.#codeField = view}
                        outline
                        center
                        label={locale.totp}
                        value={this.state.code}
                        placeholder="000000"
                        // \d* seems to be the only way to get a numpad input on iOS
                        pattern="\d*"
                        inputmode="numeric"
                        type="text"
                        onKeyDown={e => {
                            if (e.ctrlKey || e.altKey || e.metaKey) return;
                            if (!e.key.match(/\d/) && !e.key.match(/^[A-Z]/)) {
                                e.preventDefault();
                            }
                            if (e.key === 'Enter') this.form.submit();
                        }}
                        onChange={value => this.setState({
                            code: value.replace(/\D/g, '').substr(0, 6),
                        })}
                        validate={() => {
                            if (!this.state.code || !this.state.code.match(/^\d{6}$/)) {
                                return locale.invalidTotpFormat;
                            }
                        }} />
                </Field>
                <TotpRememberSwitch
                    value={this.state.remember}
                    onChange={remember => this.setState({ remember })}
                    onHeightChange={onHeightChange} />
            </Fragment>
        );

        return (
            <Form ref={node => this.form = node} onSubmit={this.#onSubmit}>
                {totpSetupRequired ? (
                    <Suspense
                        fallback={
                            <div class="totp-setup-loading">
                                <CircularProgress indeterminate />
                            </div>
                        }>
                        <TotpSetup
                            onHeightChange={onHeightChange}
                            onGenerateSecret={secret => this.setState({ secret })}
                            ueaCode={ueaCode}
                            contents={contents} />
                    </Suspense>
                ) : contents}
                <footer class="form-footer">
                    <div class="help-links">
                        {!totpSetupRequired && (
                            <a
                                class="help-link"
                                href="#"
                                onClick={e => {
                                    e.preventDefault();
                                    this.props.core.createTask('info', {
                                        message: locale.lostTotpDescription,
                                    });
                                }}>
                                {locale.lostTotp}
                            </a>
                        )}
                    </div>
                    <Button
                        type="submit"
                        raised
                        disabled={isLoading}>
                        <CircularProgress
                            class="progress-overlay"
                            indeterminate={isLoading}
                            small />
                        <span>{locale.continueTotp}</span>
                    </Button>
                </footer>
            </Form>
        );
    }
}

class TotpRememberSwitch extends Component {
    heightSpring = new Spring(1, 0.3);

    state = {
        height: 0,
    };

    constructor (props) {
        super(props);
        this.heightSpring.on('update', height => {
            this.setState({ height });
            this.props.onHeightChange();
        });
    }

    componentDidMount () {
        this.updateHeight();
        setImmediate(() => this.heightSpring.finish());
    }

    updateHeight () {
        const height = this.node.style.height;
        this.node.style.height = '';
        this.heightSpring.target = this.node.offsetHeight;
        this.node.style.height = height;
        this.heightSpring.start();
    }

    componentWillUnmount () {
        this.heightSpring.stop();
    }

    render ({ value, onChange }, { height }) {
        return (
            <p
                class="totp-bypass-container"
                ref={node => this.node = node}
                style={{ height }}>
                <Checkbox
                    class="totp-bypass-switch"
                    id="totp-bypass-switch"
                    checked={value}
                    onChange={value => {
                        onChange(value);
                        requestAnimationFrame(() => this.updateHeight());
                    }} />
                <label
                    class="totp-bypass-label"
                    for="totp-bypass-switch">
                    {locale.rememberTotp}
                </label>
                <p class={'totp-bypass-description' + (value ? '' : ' hidden')}>
                    {locale.rememberTotpDescription}
                </p>
            </p>
        );
    }
}
