import { h, Component } from 'preact';
import { CircularProgress } from 'yamdl';
import { generateTotp } from '@tejo/akso-client';
import { login as locale } from '../../locale';

/**
 * The TOTP setup page.
 *
 * # Props
 * - onGenerateSecret: (secret) => void callback that will be called when the TOTP secret is
 *   generated
 * - onHeightChange
 */
export default class TotpSetup extends Component {
    state = {
        secrets: null,
    };

    componentDidMount () {
        this.props.onHeightChange();

        const ueaCode = this.props.ueaCode;

        generateTotp(ueaCode).then(secrets => {
            this.setState({ secrets }, () => {
                this.props.onGenerateSecret(secrets.secret);
                this.props.onHeightChange();
            });
        });
    }

    render () {
        const { secrets } = this.state;

        if (!secrets) {
            return (
                <div class="totp-setup is-generating">
                    <CircularProgress indeterminate />
                </div>
            );
        }

        return (
            <div class="totp-setup">
                <p>
                    {locale.totpSetupDescription}
                </p>
                <p>
                    {locale.totpAppDescriptionPre}
                    <a
                        href={locale.totpAppHref(navigator.userAgent)}
                        target="_blank"
                        rel="noopener noreferrer">
                        {locale.totpAppName}
                    </a>
                    {locale.totpAppDescriptionPost}
                </p>
                <div class="totp-setup-instruction">
                    {locale.totpSetupInstrCode}
                </div>
                <div class="totp-setup-qr-container">
                    <img
                        class="totp-qr"
                        draggable={false}
                        src={secrets.qrCode}
                        onLoad={this.props.onHeightChange} />
                </div>
                <div class="totp-setup-otpauth-link">
                    {locale.totpSetupInstrOr}
                    {' '}
                    <a href={secrets.otpURL}>
                        {locale.totpSetupInstrOtpauthLink}
                    </a>
                </div>
                {this.props.contents}
            </div>
        );
    }
}
