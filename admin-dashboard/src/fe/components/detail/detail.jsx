import { h } from 'preact';
import DetailShell from './detail-shell';
import DetailFields from './detail-fields';

/**
 * Renders a detail view.
 *
 * This opens a connection to a core data view and optionally to a core task to edit the data.
 *
 * # Props
 * - view: data view name. The data view should expect an `id` option.
 *   The view may use the `extra` field and pass `'delete'` to trigger onDelete.
 * - editing/onEndEdit: editing state
 * - onCommit: should commit and end edit (or not, if the user cancels the task).
 *   will be passed an array of changed field ids
 * - edit/onEditChange: editing copy. Is not necessarily synchronized with `editing`
 * - id: detail view id
 * - options: additional view options; will *not* cause a reload on update
 * - fields: object { [client field id]: field spec }, with field spec being an object:
 *    - component: field editor component { value, onChange, editing, item }
 *    - isEmpty: field value => bool
 * - header: like a field editor component, but without value, and with onItemChange
 * - footer: like header
 * - locale: object { fields: { field names... } }
 * - makeHistoryLink: if set, should be a callback that returns the url for the given field’s
 *   history
 * - onDelete: called when the item is deleted
 * - userData: arbitrary user data passed to fields
 * - onData: will be called with data when it loads
 * - wideExtra: bool, if true will make extra space wider
 */
export default function DetailView (props) {
    return (
        <DetailShell {...props}>
            {data => <DetailFields {...props} data={data} />}
        </DetailShell>
    );
}
