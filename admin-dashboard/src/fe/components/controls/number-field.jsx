import { h } from 'preact';
import { useEffect, useState } from 'preact/compat';
import { TextField } from 'yamdl';

const DISALLOWED_CHARS_REGEX = /[^\d\s'.,+-]/g;

export default function NumberField ({ value, onChange, onBlur, onFocus, decimal, ...extra }) {
    const [editingValue, setEditingValue] = useState(null);

    useEffect(() => {
        if (editingValue !== null && value !== null) setEditingValue(value.toString());
    }, [value]);

    return (
        <TextField
            type="text"
            {...extra}
            inputmode={decimal ? 'decimal' : 'numeric'}
            value={editingValue !== null ? editingValue : value}
            onKeyDown={e => {
                if (e.ctrlKey || e.altKey || e.metaKey) return;
                if (e.key.length === 1 && e.key.match(DISALLOWED_CHARS_REGEX)) e.preventDefault();
            }}
            onChange={v => setEditingValue(v.replace(DISALLOWED_CHARS_REGEX, ''))}
            onFocus={(e) => {
                if (onFocus) onFocus(e);
                setEditingValue(Number.isFinite(value) ? value.toString() : '');
            }}
            onBlur={(e) => {
                if (onBlur) onBlur(e);
                let value = editingValue || '';
                value = value.replace(/,/g, '.');
                if (value.endsWith('.')) value += '0';
                if (!value) {
                    onChange(null);
                } else if (Number.isFinite(+value)) {
                    onChange(+value);
                }
                setEditingValue(null);
            }} />
    );
}
