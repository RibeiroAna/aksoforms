import { h } from 'preact';
import { Fragment } from 'preact/compat';
import EditIcon from '@material-ui/icons/Edit';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { intermediaries as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class Intermediary extends DetailPage {
    locale = locale;

    get id () {
        return this.props.match[1];
    }

    createCommitTask (changedFields, edit) {
        return this.context.createTask('intermediaries/update', {
            id: this.id,
            _changedFields: changedFields,
        }, edit);
    }

    renderActions ({ perms }) {
        const actions = [];

        if (perms.hasPerm(`intermediaries.update`)) {
            actions.push({
                icon: <EditIcon style={{ verticalAlign: 'middle' }} />,
                label: locale.update.menuItem,
                action: this.onBeginEdit,
            });
        }

        if (perms.hasPerm(`intermediaries.delete`)) {
            actions.push({
                label: locale.delete.menuItem,
                action: () => this.context.createTask('intermediaries/delete', { id: this.id }),
                overflow: true,
                danger: true,
            });
        }

        return actions;
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailView
                    compact
                    view="intermediaries/intermediary"
                    id={this.id}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onData={data => data && this.setState({ org: data.org })}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete} />
            </Fragment>
        );
    }
}
