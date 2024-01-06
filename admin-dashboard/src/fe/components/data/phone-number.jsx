import { h } from 'preact';
import { lazy, Suspense } from 'preact/compat';
import TinyProgress from '../controls/tiny-progress';
import './style.less';

// we have separate renderers using libphonenumber because libphonenumber is huuuuge
const PhoneNumberRenderer = lazy(() => import(/* webpackChunkName: "libphonenumber" */ './phone-number--render'));
const PhoneNumberEditor = lazy(() => import(/* webpackChunkName: "libphonenumber" */ './phone-number--editor'));

const fallbackPhoneNumberRenderer = allowInteractive => function FPhoneNumberRenderer ({ value }) {
    return allowInteractive
        ? <a class="data phone-number" href={`tel:${value.value}`}>{value.formatted ?? value.value}</a>
        : <span class="data phone-number not-interactive">{value.formatted ?? value.value}</span>;
};

const phoneNumberRendererShim = allowInteractive => {
    const FallbackRenderer = fallbackPhoneNumberRenderer(allowInteractive);

    return function PhoneNumberRendererShim ({ value }) {
        if (!value) return null;

        return (
            <Suspense fallback={<FallbackRenderer value={value} />}>
                <PhoneNumberRenderer value={value} allowInteractive={allowInteractive} />
            </Suspense>
        );
    };
};

function PhoneNumberEditorShim (props) {
    return (
        <Suspense fallback={<TinyProgress />}>
            <PhoneNumberEditor {...props} />
        </Suspense>
    );
}

export default {
    renderer: phoneNumberRendererShim(true),
    inlineRenderer: phoneNumberRendererShim(),
    editor: PhoneNumberEditorShim,
};
