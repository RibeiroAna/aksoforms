import { h } from 'preact';
import { detail as locale } from '../../locale';
import './changed-fields.less';

/**
 * Renders a list of changed fields for use in update task dialogs.
 *
 * # Props
 * - changedFields: list of changed fields
 * - locale: localized field names
 */
export default function ChangedFields ({ changedFields, locale: localizedFields }) {
    if (!changedFields) return;
    return (
        <div class="changed-fields">
            <span class="changed-fields-title">
                {locale.diff}
            </span>
            <ul class="changed-fields">
                {changedFields.filter(field => !field.startsWith('_')).map(field => (
                    <li key={field}>
                        {localizedFields[field]}
                    </li>
                ))}
            </ul>
        </div>
    );
}
