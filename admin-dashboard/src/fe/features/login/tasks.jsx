import { h } from 'preact';
import { useRef } from 'preact/compat';
import { Dialog, CircularProgress, Button } from 'yamdl';
import { UEACode } from '@tejo/akso-client';
import { Form, Field, ValidatedTextField } from '../../components/form';
import { login as locale } from '../../locale';
import './style.less';

export default {
    initCreatePassword: ({ open, core, task }) => {
        const buttonContainer = useRef(null);

        const { create } = task.options;
        const { login } = task.parameters;

        const description = create
            ? locale.createPasswordDescription(login)
            : locale.resetPasswordDescription;

        return (
            <Dialog
                backdrop
                class="login-task-init-create-password"
                open={open}
                onClose={() => task.drop()}>
                <Form class="init-create-password-form" onSubmit={() => {
                    task.runOnce().then(() => {
                        core.createTask('info', {
                            message: create
                                ? locale.createPasswordSent
                                : locale.resetPasswordSent,
                        });
                    }).catch(() => {
                        buttonContainer.current.shake();
                    });
                }}>
                    <p>
                        {description}
                    </p>
                    <Field>
                        <ValidatedTextField
                            class="form-field"
                            outline
                            label={locale.login}
                            type={login.includes('@') ? 'email' : 'text'}
                            autocapitalize="none"
                            spellcheck="false"
                            value={login}
                            onChange={login => task.update({ login })}
                            validate={value => {
                                if (!value.includes('@') && !UEACode.validate(value)) {
                                    return locale.invalidUEACode;
                                }
                            }} />
                    </Field>
                    <Field ref={buttonContainer} class="form-footer">
                        <span class="footer-spacer" />
                        <Button
                            component={Button}
                            raised
                            type="submit"
                            disabled={task.running}
                            validate={() => {}}>
                            <CircularProgress
                                class="progress-overlay"
                                indeterminate={task.running}
                                small />
                            <span>
                                {create
                                    ? locale.sendPasswordSetup
                                    : locale.sendPasswordReset}
                            </span>
                        </Button>
                    </Field>
                </Form>
            </Dialog>
        );
    },
    logOut ({ open, task }) {
        return (
            <Dialog
                backdrop
                class="login-task-logout"
                open={open}
                onClose={() => task.drop()}>
                <CircularProgress indeterminate />
            </Dialog>
        );
    },
};
