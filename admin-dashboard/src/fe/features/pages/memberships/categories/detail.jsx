import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailView from '../../../../components/detail/detail';
import { membershipCategories as locale } from '../../../../locale';
import { FIELDS } from './fields';
import DetailPage from '../../../../components/detail/detail-page';

export default class Membership extends DetailPage {
    locale = locale;

    createCommitTask (changedFields, edit) {
        return this.context.createTask('memberships/updateCategory', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    get id () {
        return +this.props.match[1];
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm('membership_categories.update')) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm('membership_categories.delete')) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('memberships/deleteCategory', { id: this.id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <DetailView
                view="memberships/category"
                id={this.id}
                fields={FIELDS}
                locale={locale}
                edit={edit}
                onEditChange={edit => this.setState({ edit })}
                editing={editing}
                onEndEdit={this.onEndEdit}
                onCommit={this.onCommit}
                onDelete={this.onDelete} />
        );
    }
}
