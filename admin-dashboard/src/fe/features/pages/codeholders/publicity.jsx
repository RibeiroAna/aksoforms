import { h } from 'preact';
import { memo, useState } from 'preact/compat';
import { Button, Menu } from 'yamdl';
import LockIcon from '@material-ui/icons/Lock';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import PublicIcon from '@material-ui/icons/Public';
import { codeholders as locale } from '../../../locale';

const TYPES = ['private', 'members', 'public'];

function getIcon (type) {
    if (type === 'private') return LockIcon;
    if (type === 'members') return LockOpenIcon;
    if (type === 'public') return PublicIcon;
    return () => {};
}

/**
 * Field publicity indicator/editor.
 *
 * # Props
 * - value/onChange: one of 'private', 'members', 'public'
 * - editing: bool
 * - style: currently only 'icon'
 * - disabled: bool
 * - types: list of allowed types. Undefined for all
 */
export default memo(function Publicity ({ value, editing, onChange, style, disabled, types: userTypes }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);

    if (!value) return null;

    const isStatic = !onChange;
    const types = userTypes || TYPES;

    if (style === 'icon') {
        const Icon = getIcon(value);
        if (editing) {
            const openMenu = e => {
                if (isStatic) return;
                const button = e.currentTarget;
                const buttonRect = button.getBoundingClientRect();
                const x = buttonRect.left + buttonRect.width / 2;
                const y = buttonRect.top + buttonRect.height / 2;
                setMenuPosition([x, y]);
                const typeIndex = Math.max(0, types.indexOf(value));
                const anchorY = 0.5 / types.length + typeIndex / types.length;
                setMenuAnchor([0.5, anchorY]);
                setMenuOpen(true);
            };

            return (
                <Button
                    icon small raised
                    title={locale.publicity[value]}
                    disabled={disabled || isStatic}
                    class={'codeholder-field-publicity is-editing' + (isStatic ? ' is-static' : '')}
                    onClick={openMenu}>
                    <Icon style={{ verticalAlign: 'middle' }} />

                    <Menu
                        open={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        position={menuPosition}
                        anchor={menuAnchor}
                        cascadeUp={menuAnchor && menuAnchor[1] > 0.5}
                        items={types.map(type => ({
                            leadingIcon: h(getIcon(type)),
                            label: locale.publicity[type],
                            selected: type === value,
                            action: () => onChange(type),
                        }))} />
                </Button>
            );
        }

        return (
            <span class="codeholder-field-publicity" title={locale.publicity[value]}>
                <Icon style={{ verticalAlign: 'middle' }} />
            </span>
        );
    }
});
