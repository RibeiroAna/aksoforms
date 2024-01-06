import { h } from 'preact';
import { Button, TextField } from 'yamdl';
import CloseIcon from '@material-ui/icons/Close';
import { congresses as locale } from '../../../locale';

export default function LatLonEditor ({ value, editing, onChange, onDelete, required }) {
    if (editing) {
        const lat = value ? value[0] : 0;
        const lon = value ? value[1] : 0;

        let deletion = null;
        if (value && onDelete) {
            deletion = (
                <Button icon small onClick={onDelete}>
                    <CloseIcon style={{ verticalAlign: 'middle' }} />
                </Button>
            );
        }

        return (
            <span class="congress-ll-field is-editing">
                <TextField
                    required={required}
                    outline
                    label={locale.misc.llLat}
                    inputmode="numeric"
                    value={value ? ('' + lat) : ''}
                    trailing={deletion}
                    onChange={v => v
                        ? onChange([+v, lon])
                        : onChange(null)} />
                {' '}
                <TextField
                    required={required}
                    outline
                    label={locale.misc.llLon}
                    inputmode="numeric"
                    value={value ? ('' + lon) : ''}
                    trailing={deletion}
                    onChange={v => v
                        ? onChange([lat, +v])
                        : onChange(null)} />
            </span>
        );
    }
    if (!value) return null;
    return (
        <span class="congress-ll-field">
            {locale.misc.llLat} {value[0]}{', '}
            {locale.misc.llLon} {value[1]}
        </span>
    );
}
