import { h, Component } from 'preact';
import { Button, CircularProgress } from 'yamdl';
import { UEACode } from '@tejo/akso-client';
import { LoginAuthStates } from '../../../protocol';
import { Form, Field, ValidatedTextField } from '../../components/form';
import { login as locale } from '../../locale';
import { Mode } from './is-special-page';

/**
 * Details page in the login dialog.
 *
 * # Props
 * - core: core ref
 * - authState: core auth state
 * - isAdmin: core isAdmin state
 * - mode: login mode
 * - token: password creation token (if given)
 * - login/onLoginChange: login name
 */
export default class DetailsPage extends Component {
    state = {
        password: '',
        confirmPassword: '',

        // if true, the user is not an admin, but used this interface to
        // reset/create their password, so the “you can’t enter” text will
        // also note that their password was reset successfully
        notAdminButPasswordSuccess: false,
    };

    #passwordValidator;
    #loginField;
    #passwordField;
    #passwordField2;
    #form;

    #spawnInitCreatePassword = () => {
        this.props.core.createTask('login/initCreatePassword', {
            create: true,
        }, {
            login: this.props.login,
        });
    };

    #nopwCheckTimeout;
    shouldContinuouslyCheckPassword = false; // disable this feature for now, it seems to cause issues
    #checkHasPassword = () => {
        if (!this.shouldContinuouslyCheckPassword) return;
        if (this.props.mode !== Mode.NORMAL) return;
        if (!this.props.login) return;
        clearTimeout(this.#nopwCheckTimeout);

        const login = this.props.login.includes('@')
            ? this.props.login
            : new UEACode(this.props.login).code;

        this.props.core.createTask('login/hasPassword', {}, {
            login,
        }).runOnceAndDrop().then(hasPassword => {
            if (!hasPassword) this.#spawnInitCreatePassword();
        }).catch(() => {});
    };

    #submitting = false;
    #onSubmit = () => {
        if (this.#submitting) return;
        let task;

        const login = this.props.login.includes('@')
            ? this.props.login
            : new UEACode(this.props.login).code;

        if (this.props.mode === Mode.NORMAL) {
            task = this.props.core.createTask('login/login', {}, {
                login,
                password: this.state.password,
                allowNonAdmin: this.props.allowsNonAdmin,
            });
        } else {
            task = this.props.core.createTask('login/createPassword', {
                login,
                token: this.props.token,
            }, {
                password: this.state.password,
                allowNonAdmin: this.props.allowsNonAdmin,
            });
        }

        this.#submitting = true;
        task.runOnceAndDrop().then(res => {
            const nope = !res.isAdmin && !this.props.allowsNonAdmin;
            if (this.props.mode !== Mode.NORMAL) {
                // special page; need to reset URL
                window.history.pushState(null, null, '/');

                if (nope) {
                    this.props.onSetNormalMode();
                    this.setState({ notAdminButPasswordSuccess: true });
                }
            } else if (nope) {
                const error = new Error('is not admin');
                error.code = 'is-not-admin';
                throw error;
            }
        }).catch(err => {
            let error = locale.genericError;
            if (err.code === 400 || err.code === 401) {
                // conflating 400 (probably a schema error) and 401 (invalid login)
                // because invalid emails will also return schema errors and showing the
                // generic error isn’t really appropriate
                error = this.props.login.includes('@')
                    ? locale.invalidLogin.email
                    : locale.invalidLogin.ueaCode;
            } else if (err.code === 'needs-password-setup') {
                this.#spawnInitCreatePassword();
            } else if (err.code === 'is-not-admin') {
                error = locale.notAdminShort;
            }

            console.error(err); // eslint-disable-line no-console

            this.#passwordValidator.shake();
            this.#passwordField.setError(error);
        }).finally(() => {
            this.#submitting = false;
        });
    };

    focus () {
        if (this.#loginField) this.#loginField.focus();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.authState !== this.props.authState
            || prevProps.isAdmin !== this.props.isAdmin) {
            this.props.onHeightChange();
        }
    }

    render ({ mode, authState, ueaCode, isAdmin }) {
        const needsPasswordValidation = mode !== Mode.NORMAL;
        const shouldShowHelpLinks = mode === Mode.NORMAL;

        const isLoading = authState === LoginAuthStates.AUTHENTICATING
            || authState === LoginAuthStates.LOGGING_OUT;

        if (authState >= LoginAuthStates.AUTHENTICATED && !isAdmin) {
            return (
                <div class="login-not-admin">
                    <p>{locale.loggedInAs(ueaCode)}</p>
                    <p>{locale.notAdmin}</p>
                    {this.state.notAdminButPasswordSuccess ? <p>{locale.notAdminPWR}</p> : null}
                    <p>{locale.notAdminLogout}</p>
                    <footer class="form-footer">
                        <span class="phantom" style={{ flex: 1 }} />
                        <Button
                            raised
                            disabled={isLoading}
                            onClick={() => {
                                this.props.core.createTask('login/logOut').runOnceAndDrop();
                            }}>
                            <CircularProgress
                                class="progress-overlay"
                                indeterminate={isLoading}
                                small />
                            <span>{locale.logOut}</span>
                        </Button>
                    </footer>
                </div>
            );
        }

        return (
            <Form ref={form => this.#form = form} onSubmit={this.#onSubmit}>
                <Field>
                    <ValidatedTextField
                        class="form-field"
                        ref={view => this.#loginField = view}
                        outline
                        label={locale.login}
                        type={this.props.login.includes('@') ? 'email' : 'text'}
                        autocapitalize="none"
                        spellcheck="false"
                        value={this.props.login}
                        onChange={v => {
                            this.props.onLoginChange(v);
                            clearTimeout(this.#nopwCheckTimeout);
                            this.#nopwCheckTimeout = setTimeout(this.#checkHasPassword, 2000);
                        }}
                        onBlur={() => {
                            clearTimeout(this.#nopwCheckTimeout);
                            this.#checkHasPassword();
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (!this.state.password) {
                                    // instead of submitting; focus the password field
                                    e.preventDefault();
                                    this.#passwordField.focus();
                                } else {
                                    this.#form.submit();
                                }
                            }
                        }}
                        validate={() => {
                            if (!this.props.login.includes('@') && !UEACode.validate(this.props.login)) {
                                return locale.invalidUEACode;
                            }
                        }} />
                </Field>
                <Field ref={view => this.#passwordValidator = view}>
                    <ValidatedTextField
                        class="form-field"
                        ref={view => this.#passwordField = view}
                        outline
                        label={locale.password}
                        value={this.state.password}
                        type="password"
                        placeholder={this.props.mode === Mode.CREATING_PASSWORD
                            ? locale.createPasswordPlaceholder
                            : null}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (!needsPasswordValidation) this.#form.submit();
                                else this.#passwordField2.focus();
                            }
                        }}
                        onChange={password => this.setState({ password })}
                        validate={() => null} />
                </Field>
                {needsPasswordValidation ? (
                    <Field>
                        <ValidatedTextField
                            ref={view => this.#passwordField2 = view}
                            class="form-field"
                            outline
                            label={locale.confirmPassword}
                            value={this.state.confirmPassword}
                            type="password"
                            placeholder={locale.confirmPasswordPlaceholder}
                            onChange={confirmPassword => this.setState({ confirmPassword })}
                            onKeyDown={e => {
                                if (e.key === 'Enter') this.#form.submit();
                            }}
                            validate={() => {
                                if (this.state.confirmPassword !== this.state.password) {
                                    return locale.passwordMismatch;
                                }
                            }} />
                    </Field>
                ) : null}
                <footer class="form-footer">
                    {shouldShowHelpLinks ? (
                        <div class="help-links">
                            <a
                                class="help-link"
                                href="#"
                                onClick={e => {
                                    e.preventDefault();
                                    this.props.core.createTask('login/initCreatePassword', {}, {
                                        login: this.props.login,
                                    });
                                }}>
                                {locale.forgotPassword}
                            </a>
                            <br />
                            <a
                                class="help-link"
                                href="#"
                                onClick={e => {
                                    e.preventDefault();
                                    this.props.core.createTask('info', {
                                        message: locale.forgotCodeDescription,
                                    });
                                }}>
                                {locale.forgotCode}
                            </a>
                        </div>
                    ) : <div class="help-links" />}
                    <Button
                        type="submit"
                        raised
                        disabled={isLoading}>
                        <CircularProgress
                            class="progress-overlay"
                            indeterminate={isLoading}
                            small />
                        <span>{locale.continue}</span>
                    </Button>
                </footer>
            </Form>
        );
    }
}
