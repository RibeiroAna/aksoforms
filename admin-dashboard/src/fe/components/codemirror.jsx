// from https://github.com/uiwjs/react-codemirror/blob/b2341d3f8fb94345cbb759382870d81c61606812/
// core/src/useCodeMirror.ts

import { h } from 'preact';
import { forwardRef, useRef, useEffect, useImperativeHandle, useState } from 'preact/compat';
import { EditorState, StateEffect } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { basicSetup } from '@uiw/codemirror-extensions-basic-setup';

/** Do not import this directly; use codemirror-themed */
export function useCodeMirror (props) {
    const {
        value,
        selection,
        onChange,
        // onStatistics,
        onCreateEditor,
        onUpdate,
        extensions = [],
        autoFocus,
        theme = 'light',
        height = '',
        minHeight = '',
        maxHeight = '',
        placeholder: placeholderStr = '',
        width = '',
        minWidth = '',
        maxWidth = '',
        editable = true,
        readOnly = false,
        indentWithTab: defaultIndentWithTab = true,
        basicSetup: defaultBasicSetup = true,
        root,
        initialState,
    } = props;
    const [container, setContainer] = useState();
    const [view, setView] = useState();
    const [state, setState] = useState();
    const defaultThemeOption = EditorView.theme({
        '&': {
            height,
            minHeight,
            maxHeight,
            width,
            minWidth,
            maxWidth,
        },
    });
    const updateListener = EditorView.updateListener.of((vu) => {
        if (vu.docChanged && typeof onChange === 'function') {
            const doc = vu.state.doc;
            const value = doc.toString();
            onChange(value, vu);
        }
        // onStatistics && onStatistics(getStatistics(vu));
    });

    let getExtensions = [updateListener, defaultThemeOption];
    if (defaultIndentWithTab) {
        getExtensions.unshift(keymap.of([indentWithTab]));
    }
    if (defaultBasicSetup) {
        if (typeof defaultBasicSetup === 'boolean') {
            getExtensions.unshift(basicSetup());
        } else {
            getExtensions.unshift(basicSetup(defaultBasicSetup));
        }
    }

    if (placeholderStr) {
        getExtensions.unshift(placeholder(placeholderStr));
    }

    if (theme) getExtensions.push(theme);

    if (editable === false) {
        getExtensions.push(EditorView.editable.of(false));
    }
    if (readOnly) {
        getExtensions.push(EditorState.readOnly.of(true));
    }

    if (onUpdate && typeof onUpdate === 'function') {
        getExtensions.push(EditorView.updateListener.of(onUpdate));
    }
    getExtensions = getExtensions.concat(extensions);

    useEffect(() => {
        if (container && !state) {
            const config = {
                doc: value,
                selection,
                extensions: getExtensions,
            };
            const stateCurrent = initialState
                ? EditorState.fromJSON(initialState.json, config, initialState.fields)
                : EditorState.create(config);
            setState(stateCurrent);
            if (!view) {
                const viewCurrent = new EditorView({
                    state: stateCurrent,
                    parent: container,
                    root,
                });
                setView(viewCurrent);
                onCreateEditor && onCreateEditor(viewCurrent, stateCurrent);
            }
        }
        return () => {
            if (view) {
                setState(undefined);
                setView(undefined);
            }
        };
    }, [container, state]);

    useEffect(() => setContainer(props.container), [props.container]);

    useEffect(
        () => () => {
            if (view) {
                view.destroy();
                setView(undefined);
            }
        },
        [view],
    );

    useEffect(() => {
        if (autoFocus && view) {
            view.focus();
        }
    }, [autoFocus, view]);

    useEffect(() => {
        if (view) {
            view.dispatch({ effects: StateEffect.reconfigure.of(getExtensions) });
        }
    }, [
        theme,
        extensions,
        height,
        minHeight,
        maxHeight,
        width,
        minWidth,
        maxWidth,
        placeholderStr,
        editable,
        readOnly,
        defaultIndentWithTab,
        defaultBasicSetup,
        onChange,
        onUpdate,
    ]);

    // don't useEffect on this so we can avoid desync
    {
        const currentValue = view ? view.state.doc.toString() : '';
        if (view && value !== currentValue) {
            view.dispatch({
                changes: { from: 0, to: currentValue.length, insert: value || '' },
            });
        }
    }

    return { state, setState, view, setView, container, setContainer };
}

export const CodeMirror = forwardRef((props, ref) => {
    const {
        class: className,
        value = '',
        selection,
        extensions = [],
        onChange,
        // onStatistics,
        onCreateEditor,
        onUpdate,
        autoFocus,
        theme = 'light',
        height,
        minHeight,
        maxHeight,
        width,
        minWidth,
        maxWidth,
        basicSetup,
        placeholder,
        indentWithTab,
        editable,
        readOnly,
        root,
        initialState,
        ...other
    } = props;
    const editor = useRef();
    const { state, view, container, setContainer } = useCodeMirror({
        container: editor.current,
        root,
        value,
        autoFocus,
        theme,
        height,
        minHeight,
        maxHeight,
        width,
        minWidth,
        maxWidth,
        basicSetup,
        placeholder,
        indentWithTab,
        editable,
        readOnly,
        selection,
        onChange,
        // onStatistics,
        onCreateEditor,
        onUpdate,
        extensions,
        initialState,
    });
    useImperativeHandle(
        ref,
        () => ({ editor: editor.current, state, view }),
        [editor, container, state, view],
    );

    // sometimes this doesn't update properly on creation
    useEffect(() => {
        if (!container && editor.current) {
            setContainer(editor.current);
        }
    });

    const defaultClassNames = 'cm-theme';
    return <div ref={editor} class={`${defaultClassNames} ${className || ''}`} {...other}></div>;
});
