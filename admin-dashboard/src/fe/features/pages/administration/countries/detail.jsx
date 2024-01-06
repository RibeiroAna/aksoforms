import { h } from 'preact';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { FIELDS } from './fields';
import { countries as locale, detail as detailLocale } from '../../../../locale';
import { connectPerms } from '../../../../perms';
import './style.less';

export default connectPerms(class CountryPage extends DetailPage {
    locale = locale;

    get id () {
        return this.props.match[1];
    }

    createCommitTask = (changedFields, edit) => {
        return this.context.createTask('countries/update', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    };

    renderActions ({ perms }) {
        const id = this.id;
        const actions = [];

        if (perms.hasPerm('countries.update')) {
            actions.push({
                label: detailLocale.edit,
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                action: () => this.props.onNavigate(`/administrado/landoj/${id}/redakti`, true),
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        const id = this.id;
        return (
            <DetailView
                view="countries/country"
                id={id}
                fields={FIELDS}
                locale={locale}
                edit={edit}
                onEditChange={edit => this.setState({ edit })}
                editing={editing}
                onEndEdit={this.onEndEdit}
                onCommit={this.onCommit} />
        );
    }
});
