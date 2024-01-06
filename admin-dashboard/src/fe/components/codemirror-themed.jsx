import { h } from 'preact';
import { forwardRef, useState, useEffect, useMemo, useRef } from 'preact/compat';
import { CodeMirror } from './codemirror';
import { xcodeLight, xcodeDark } from '@uiw/codemirror-theme-xcode';

const themeQuery = window.matchMedia('(prefers-color-scheme: light)');

export default forwardRef(({ value, onChange, forceDark, ...extra }, ref) => {
    const [useLightTheme, setUseLightTheme] = useState(themeQuery.matches);

    useEffect(() => {
        const onThemeChange = () => {
            setUseLightTheme(themeQuery.matches);
        };
        themeQuery.addEventListener('change', onThemeChange);
        return () => {
            themeQuery.removeEventListener('change', onThemeChange);
        };
    });

    const theme = (!forceDark && useLightTheme) ? xcodeLight : xcodeDark;

    const onChangeState = useRef({ onChange, value });
    onChangeState.current = { onChange, value };

    // memoize this so we dont reconfigure the editor every time
    const editorOnChange = useMemo(() => newValue => {
        const { onChange, value } = onChangeState.current;

        if (newValue === value) return;
        onChange(newValue);
    }, [extra.readOnly || false]);

    return (
        <CodeMirror
            ref={ref}
            value={value}
            onChange={editorOnChange}
            theme={theme}
            {...extra} />
    );
});
